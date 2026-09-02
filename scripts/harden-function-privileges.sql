-- Lock down database function privileges + pin search_path (2026-09-02)
--
-- Companion to scripts/enable-rls-seo-os-tables.sql. That one closed the
-- ERROR-level advisor findings (tables with RLS off); this closes the WARN-level
-- ones, two of which were NOT cosmetic:
--
--   * migrate_lead_businesses/campaigns/emails/follow_ups/scrape_log — SECURITY
--     DEFINER, callable by ANON, upserting caller-supplied jsonb straight into
--     lead_generator.* via jsonb_populate_recordset. Anyone holding the public
--     anon key could write arbitrary rows into that schema.
--   * trigger_google_ads_daily_sync — SECURITY DEFINER, callable by ANON, fires
--     net.http_post at an external Supabase project's Edge Function.
--   * pm_run_billing_reminders — SECURITY DEFINER, callable by ANON; inserts
--     pm_notifications rows and stamps last_notified_on. Only pg_cron (as
--     postgres) should ever run it; it is never called from app code.
--
-- ⚠ REVOKE FROM `public` TOO, not just anon/authenticated. Postgres grants
-- EXECUTE to PUBLIC by default on every new function, so revoking the two named
-- roles alone is a NO-OP. service_role is granted back explicitly (it is a
-- server-only secret) so any server-side caller keeps working.
--
-- ⚠ pm_is_admin() IS DELIBERATELY EXEMPT — do not "fix" the two remaining
-- advisor warnings about it. 16 RLS policies on the financial and credentials
-- tables call it, and every one applies to role `public` (which includes anon),
-- so the QUERYING role needs EXECUTE to evaluate them. Revoking would turn a
-- clean "0 rows" into `permission denied for function pm_is_admin`. It leaks
-- nothing: SECURITY DEFINER returning a boolean about the CALLER — anon gets
-- false. Verified after this migration: anon still gets `false` from it and a
-- clean `[]` from pm_invoices rather than an error.
--
-- Revoking EXECUTE does NOT stop triggers firing — Postgres checks that
-- privilege at CREATE TRIGGER time, not at fire time. Proven with a throwaway
-- table+trigger in a rolled-back probe BEFORE applying, then re-proven against
-- real data: as role `authenticated`, a pm_tasks status update still moved
-- status_changed_at (pm_set_status_changed_at) and still wrote a
-- pm_task_activity row (pm_log_task_activity).
--
-- APPLIED to the LIVE project (tfhzuruaaymfhqmeiusr) on 2026-09-02.
-- Idempotent — safe to re-run.

-- A) Close every SECURITY DEFINER function in public to the anon key ----------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and p.proname <> 'pm_is_admin'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- B) Pin search_path on every public function that had none -------------------
-- An unpinned SECURITY DEFINER function is the classic search_path-hijack
-- shape: the caller controls name resolution while the body runs as the owner.
-- `public, pg_temp` with pg_temp LAST (per the Postgres docs) so a temp object
-- cannot shadow a real one. NOT '' — several bodies reference public tables
-- unqualified (pm_projects, pm_billing_reminders, google_ads_connections) and
-- every cross-schema reference is already qualified (lead_generator.*,
-- net.http_post), so this resolves exactly as before.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and p.proconfig is null
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;
