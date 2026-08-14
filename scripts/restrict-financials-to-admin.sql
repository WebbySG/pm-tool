-- Lock company financials to admins IN THE DATABASE (2026-08-14)
--
-- Invoices, quotes, payments and renewals were admin-only in the UI ONLY: the
-- sidebar hid the pages and <AdminOnly> blocked the routes, but every one of
-- these tables carried the blanket `pm_allow_all` policy (`using (true)`).
-- RLS is what actually decides who can read a row, so any signed-in staff member
-- could have fetched every invoice, quote, payment amount and client renewal
-- with a hand-rolled PostgREST call — the pages were a curtain, not a lock.
--
-- Owner's instruction (2026-08-14): invoices and expenses are the owner's alone.
-- This makes the database agree with that, reusing the same SECURITY DEFINER
-- helper already protecting pm_credentials and pm_expenses.
--
-- Renewals (pm_billing_reminders) are included: they hold client names, amounts
-- and payment status — the same class of data, and already admin-only in the UI.
--
-- Nothing server-side breaks:
--   * /api/renewals/run uses the SERVICE ROLE key, which bypasses RLS entirely.
--   * pm_run_billing_reminders() (the daily pg_cron notification job) is
--     SECURITY DEFINER, so it also bypasses RLS.
--   * next_invoice_number() / next_quote_number() are SECURITY INVOKER and read
--     pm_invoices, but they are only ever called from the admin-only New
--     Invoice/Quote pages, where pm_is_admin() is true.
--   * No staff code path reads these tables — invoices are NOT in the Zustand
--     store (pages call lib/invoice-db.ts directly), so staff simply never query
--     them. A SELECT under RLS returns zero rows rather than erroring anyway.
--
-- Idempotent. Re-run on any fresh Supabase project.

do $$
declare t text;
begin
  foreach t in array array[
    'pm_invoices',
    'pm_invoice_line_items',
    'pm_invoice_payments',
    'pm_invoice_templates',
    'pm_invoice_template_line_items',
    'pm_invoice_logs',
    'pm_billing_reminders'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    -- Drop the blanket policy and any previous run of this script's policy.
    execute format('drop policy if exists pm_allow_all on public.%I', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
    execute format(
      'create policy %I on public.%I for all using (public.pm_is_admin()) with check (public.pm_is_admin())',
      t || '_admin_all', t
    );
  end loop;
end $$;

notify pgrst, 'reload schema';
