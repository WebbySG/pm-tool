-- ─────────────────────────────────────────────────────────────────────────────
-- pm_tasks.status_changed_at — when the task last changed status
--
-- Lets the admin tell a NEW "Pending Review" submission from an old one (same
-- recurring task titles resubmit week after week). Maintained by a BEFORE
-- UPDATE trigger so EVERY write path (drawer, kanban drag, tasks page, chat,
-- weekly SEO engine, bulk cascades) stamps it — same rationale as the
-- pm_log_task_activity trigger. The client also stamps it optimistically
-- (statusPatch in lib/store.ts) so the UI is fresh until the next refresh();
-- the DB value is authoritative.
--
-- Backfill: latest field='status' row in pm_task_activity (audit trail exists
-- since 2026-07-21), else created_at. Column default now() is set AFTER the
-- backfill so pre-existing rows get real history, not migration time.
--
-- APPLIED TO THE LIVE PROJECT (tfhzuruaaymfhqmeiusr) — see CLAUDE.md.
-- Idempotent — re-run on any fresh pm-tool project.
-- ─────────────────────────────────────────────────────────────────────────────

alter table pm_tasks add column if not exists status_changed_at timestamptz;

create or replace function pm_set_status_changed_at()
returns trigger language plpgsql security definer as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at = now();
  end if;
  return new;
end $$;

drop trigger if exists pm_tasks_set_status_changed_at on pm_tasks;
create trigger pm_tasks_set_status_changed_at
  before update on pm_tasks
  for each row execute function pm_set_status_changed_at();

-- Backfill existing rows from the audit trail (only rows still NULL, so
-- re-running never overwrites trigger-maintained values).
update pm_tasks t
set status_changed_at = coalesce(
  (select a.created_at from pm_task_activity a
     where a.task_id = t.id and a.field = 'status'
     order by a.created_at desc limit 1),
  t.created_at)
where t.status_changed_at is null;

-- New inserts start their clock at creation.
alter table pm_tasks alter column status_changed_at set default now();

notify pgrst, 'reload schema';
