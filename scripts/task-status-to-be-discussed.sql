-- ─────────────────────────────────────────────────────────────────────────────
-- "To Be Discussed" task status + admin discussion note
--
-- 'to_be_discussed' = the admin has parked the task pending a discussion
-- (with staff, the client, or internally). Admin-set only (staff cannot
-- select it, and staff clicks on a to_be_discussed subtask open the child
-- drawer instead of mutating status). An OPEN state — counts as active work
-- everywhere — but admin-parked like pending_client_approval: not
-- overdue-flagged, and a descendant submitting for review does not clobber
-- a top parked in it (descendant revision_required still overrides).
--
-- pm_tasks.discussion_note holds the admin's reference note ("why is this
-- parked / what to discuss"), editable in the task drawer's cyan panel while
-- the task sits in this status. The note is TRANSIENT BY DESIGN (user rule
-- 2026-08-02): the pm_tasks_clear_discussion_note BEFORE-UPDATE trigger nulls
-- it whenever status changes to anything other than 'to_be_discussed', so
-- EVERY write path (drawer dropdown, kanban drag, bulk cascades, roll-ups,
-- service-role writes) clears it — same rationale as the status_changed_at
-- trigger. statusPatch() in lib/store.ts mirrors the clear optimistically.
--
-- APPLIED TO THE LIVE PROJECT (tfhzuruaaymfhqmeiusr) on 2026-08-02 — see CLAUDE.md.
-- Idempotent — re-run on any fresh pm-tool project.
-- ─────────────────────────────────────────────────────────────────────────────

alter table pm_tasks drop constraint if exists pm_tasks_status_check;
alter table pm_tasks add constraint pm_tasks_status_check
  check (status = any (array[
    'todo'::text,
    'in_progress'::text,
    'to_be_discussed'::text,
    'pending_review'::text,
    'pending_client_approval'::text,
    'pending_article_post'::text,
    'revision_required'::text,
    'done'::text,
    'missed'::text,
    'rejected'::text
  ]));

alter table pm_tasks add column if not exists discussion_note text;

-- The note lives and dies with the status: leaving 'to_be_discussed' wipes it.
create or replace function pm_clear_discussion_note()
returns trigger language plpgsql security definer as $$
begin
  if new.status is distinct from old.status and new.status <> 'to_be_discussed' then
    new.discussion_note = null;
  end if;
  return new;
end $$;

drop trigger if exists pm_tasks_clear_discussion_note on pm_tasks;
create trigger pm_tasks_clear_discussion_note
  before update on pm_tasks
  for each row execute function pm_clear_discussion_note();

notify pgrst, 'reload schema';
