-- ⚠ DEPRECATED 2026-08-19 — superseded by the SEO Setup phase TASKS.
-- The tick-list this table backed was replaced by real tasks on the project
-- board (a parent "SEO Setup" task with a child per phase: keyword research →
-- technical SEO → on-page fixes). See scripts/seo-setup-phase.sql and
-- lib/seo-setup.ts. Nothing in the app reads pm_seo_checklist_items any more.
--
-- The table is left in place rather than dropped so no data disappears without
-- the owner asking. When you want it gone, run scripts/drop-seo-checklist.sql.
-- Kept below for reference / rollback.

-- Technical / On-Page SEO checklist per project.
--
-- Every client project has a standard set of Technical SEO and On-Page SEO work
-- that has to be done and RECORDED. Each project owns its own rows: the standard
-- list is seeded from lib/seo-checklist.ts, and items can then be added, renamed
-- or removed for that client without touching any other project.
--
-- Idempotent — safe to re-run. Re-run this on any fresh Supabase project.
-- Applied to the LIVE project (tfhzuruaaymfhqmeiusr) on 2026-08-18.

create table if not exists public.pm_seo_checklist_items (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.pm_projects(id) on delete cascade,
  -- 'technical' | 'onpage'. Deliberately UNCONSTRAINED text (no CHECK): the
  -- pm_tasks status CHECK has needed a live migration for every new value, and
  -- an SEO vocabulary grows (off-page, local, ...). The TS union in
  -- lib/seo-checklist.ts is the source of truth and the UI falls back to
  -- rendering an unknown category in its own section rather than crashing.
  category     text not null,
  label        text not null,
  sort_order   integer not null default 0,
  done         boolean not null default false,
  note         text,
  completed_by uuid,
  completed_at timestamptz,
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists pm_seo_checklist_items_project_idx
  on public.pm_seo_checklist_items (project_id);

-- Keep updated_at honest regardless of which client wrote the row.
create or replace function public.pm_seo_checklist_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists pm_seo_checklist_items_touch on public.pm_seo_checklist_items;
create trigger pm_seo_checklist_items_touch
  before update on public.pm_seo_checklist_items
  for each row execute function public.pm_seo_checklist_touch();

alter table public.pm_seo_checklist_items enable row level security;

-- Blanket policy, matching pm_tasks / pm_project_media. This is project delivery
-- data, NOT money or credentials, so it deliberately does NOT use pm_is_admin()
-- — see the Owner-Only Financial Data rule for what does. Staff only ever reach
-- projects they are assigned to, and "admin + assigned staff can edit" is
-- enforced in the UI, consistent with the rest of the app's trust model.
drop policy if exists pm_allow_all on public.pm_seo_checklist_items;
create policy pm_allow_all on public.pm_seo_checklist_items
  for all using (true) with check (true);

notify pgrst, 'reload schema';
