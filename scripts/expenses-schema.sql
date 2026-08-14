-- Business expenses + receipt capture for IRAS accounting (2026-08-14)
--
-- Purpose: record every deductible business cost with its source document
-- attached, so the year's expenses can be handed to the accountant / filed with
-- IRAS without hunting through email. IRAS requires source documents (receipts,
-- invoices, bank statements) to be RETAINED FOR 5 YEARS from the end of the
-- relevant Year of Assessment — the point of this module is that the receipt
-- lives next to the number, permanently.
--
-- Receipt files themselves go in the existing public `pm-attachments` bucket
-- under `expenses/<expense_id>/...`, exactly like task attachments
-- (pm_task_attachments) and project files (pm_project_media) — no new bucket and
-- no new storage policies needed.
--
-- Idempotent. Re-run on any fresh Supabase project.

create table if not exists public.pm_expenses (
  id             uuid primary key default gen_random_uuid(),

  -- The date on the receipt (when the cost was incurred), NOT when it was keyed
  -- in. This is what decides which financial year / basis period it falls into.
  expense_date   date not null,
  vendor         text not null,

  -- category / payment_method / status are deliberately UNCONSTRAINED text
  -- rather than CHECK-ed enums. The task-status CHECK on pm_tasks has needed a
  -- live migration every single time a value was added (see CLAUDE.md), and an
  -- expense vocabulary grows with the business. The TypeScript unions in
  -- lib/expense-types.ts are the source of truth, and every lookup there falls
  -- back gracefully (categoryMeta/paymentMeta) so an unknown value renders as
  -- "Other" instead of crashing the page.
  category       text not null default 'other',
  payment_method text not null default 'other',
  description    text,

  -- amount = total actually paid, INCLUSIVE of any GST.
  -- gst_amount = the GST portion inside `amount` (input tax). Only meaningful
  -- when the business is GST-registered; leave 0 otherwise, in which case GST
  -- is simply part of the cost. net = amount - gst_amount.
  amount         numeric(12,2) not null default 0 check (amount >= 0),
  gst_amount     numeric(12,2) not null default 0 check (gst_amount >= 0),
  currency       text not null default 'SGD',

  -- Optional link to the client project the cost belongs to (pass-through costs,
  -- ad spend, stock photos). SET NULL so deleting a project never deletes an
  -- accounting record.
  project_id     uuid references public.pm_projects(id) on delete set null,

  -- Is this cost deductible against trade income? Some are not (private-car
  -- running costs, fines/penalties, personal portions) — recording it here keeps
  -- the row in the books while excluding it from the deductible total.
  deductible     boolean not null default true,

  -- 'recorded' → captured in the tool; 'submitted' → handed to the accountant /
  -- included in a filing. "Missing receipt" is NOT stored: it is derived at read
  -- time from whether any pm_expense_receipts row exists (computeExpenseStatus),
  -- so it can never drift out of sync with the actual attachments.
  status         text not null default 'recorded',
  submitted_at   timestamptz,
  submitted_note text,

  notes          text,
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- The GST portion can never exceed the total paid.
  constraint pm_expenses_gst_within_amount check (gst_amount <= amount)
);

create index if not exists pm_expenses_date_idx     on public.pm_expenses (expense_date desc);
create index if not exists pm_expenses_project_idx  on public.pm_expenses (project_id);
create index if not exists pm_expenses_category_idx on public.pm_expenses (category);

create table if not exists public.pm_expense_receipts (
  id          uuid primary key default gen_random_uuid(),
  expense_id  uuid not null references public.pm_expenses(id) on delete cascade,
  name        text not null,
  url         text not null,
  -- "image" | "document" (a photographed receipt vs a PDF tax invoice) —
  -- derived from the MIME type by uploadToBucket()'s inferType().
  type        text not null default 'document',
  -- Human-readable size string ("1.4 MB"), same convention as the other
  -- attachment tables.
  size        text,
  uploaded_by uuid default auth.uid(),
  uploaded_at timestamptz not null default now()
);

create index if not exists pm_expense_receipts_expense_idx
  on public.pm_expense_receipts (expense_id, uploaded_at desc);

-- ── RLS: admin-only, enforced in the DATABASE ────────────────────────────────
-- Company financials are not staff-visible. Following the pm_credentials
-- precedent, these tables do NOT get the blanket `pm_allow_all` policy — they
-- reuse the existing SECURITY DEFINER helper public.pm_is_admin(), so a staff
-- member's browser cannot download expense rows even with a hand-rolled API
-- call. Keep using pm_is_admin() for any further sensitive table.

alter table public.pm_expenses          enable row level security;
alter table public.pm_expense_receipts  enable row level security;

drop policy if exists pm_allow_all on public.pm_expenses;
drop policy if exists pm_expenses_admin_all on public.pm_expenses;
create policy pm_expenses_admin_all on public.pm_expenses
  for all using (public.pm_is_admin()) with check (public.pm_is_admin());

drop policy if exists pm_allow_all on public.pm_expense_receipts;
drop policy if exists pm_expense_receipts_admin_all on public.pm_expense_receipts;
create policy pm_expense_receipts_admin_all on public.pm_expense_receipts
  for all using (public.pm_is_admin()) with check (public.pm_is_admin());

notify pgrst, 'reload schema';
