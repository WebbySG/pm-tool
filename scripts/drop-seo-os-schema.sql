-- Drop the dead Webby SEO OS schema from the pm-tool project (2026-09-02)
--
-- Owner instruction, 2026-09-02. This project carried a full copy of the Webby
-- SEO OS schema, left behind when that app moved to the Omnipulse project
-- (wmulemkyjrjetwyzrsqq). It was dead: last write May 2026 (pm_tasks is written
-- daily), and all 9 `clients` rows were orphans pointing at auth users that do
-- not exist here.
--
-- Scope: every table in `public` EXCEPT the 36 pm_* tables and the two
-- unprefixed tables pm-tool genuinely uses. 140 tables, 24,074 rows, 16 MB.
-- Left the schema at 38 tables: 36 pm_* + staff_members + user_roles.
--
-- ⚠ staff_members and user_roles are KEPT. They carry no pm_ prefix but are core
--   pm-tool tables (staff_members referenced in 21 files, user_roles in 3).
--   A blind "drop everything not pm_*" would destroy the app's auth/role model.
--   This is the single most important thing to know before re-running anything
--   like this.
--
-- Verified BEFORE dropping:
--   * pm-tool queries exactly 36 pm_* tables + staff_members + user_roles and
--     nothing else — enumerated by grepping every .from("...") in the codebase,
--     not by eyeballing prefixes.
--   * No FK from any kept table points into the drop set (only into auth.users).
--   * No pg_cron job uses them (the only job is pm-billing-reminders-daily).
--   * No Edge Functions exist in this project.
--   * No triggers on auth.users at all, so dropping `profiles` could not break
--     signup or the staff invite flow (handle_new_user / assign_default_role
--     turned out to be attached to nothing).
--   * Full JSON export of all 140 tables taken and VALIDATED first — 24,074 rows
--     parsed back out of the files, exactly matching the database:
--       C:\Users\Admin\OneDrive\Desktop\seo-os-backup-2026-09-02\
--     (a first attempt silently capped every large table at 1000 rows because of
--     broken shell pagination; always count the restored rows back, don't trust
--     "no errors"). DDL was deliberately NOT exported — the same schema is still
--     live in the Omnipulse project, so only the DATA here was unique.
--
-- Verified AFTER: 38 tables remain, 0 views, and pm-tool data is untouched
-- (421 tasks, 27 projects, 35 invoices, 2236 activity rows, 383 chat messages,
-- 4 staff, 1 user_role). Every pm-tool trigger is still attached and firing.
--
-- CASCADE handles FKs among the dropped tables and the dependent view
-- ai_usage_monthly_summary. The count assertion aborts the whole thing if the
-- drop set is not exactly the 140 tables that were verified and backed up.
do $$
declare r record; n int; dropped int := 0;
begin
  select count(*) into n
    from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
   where ns.nspname = 'public' and c.relkind = 'r'
     and c.relname not like 'pm/_%' escape '/'
     and c.relname not in ('staff_members', 'user_roles');

  if n <> 140 then
    raise exception 'Expected exactly 140 tables in the drop set, found %. Aborting.', n;
  end if;

  for r in
    select c.relname
      from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
     where ns.nspname = 'public' and c.relkind = 'r'
       and c.relname not like 'pm/_%' escape '/'
       and c.relname not in ('staff_members', 'user_roles')
     order by c.relname
  loop
    execute format('drop table if exists public.%I cascade', r.relname);
    dropped := dropped + 1;
  end loop;

  raise notice 'dropped % tables', dropped;
end $$;

-- Still present afterwards, deliberately NOT dropped (harmless, and removing
-- them was not part of the instruction): 8 orphaned functions whose tables are
-- now gone — handle_new_user, notify_orchestrator, trigger_google_ads_daily_sync
-- and migrate_lead_businesses/campaigns/emails/follow_ups/scrape_log — plus the
-- unattached assign_default_role, has_role, set_performance_check_on_publish,
-- pm_seo_checklist_touch and update_updated_at. All of them had EXECUTE revoked
-- from public/anon/authenticated by scripts/harden-function-privileges.sql, so
-- none is reachable with the anon key. Drop them whenever you want a clean sweep.
