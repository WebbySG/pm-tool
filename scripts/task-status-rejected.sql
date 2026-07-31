-- ─────────────────────────────────────────────────────────────────────────────
-- Rejected task status: pm_tasks.status gains 'rejected'
--
-- 'rejected' = the admin reviewed the work and refused it OUTRIGHT — a CLOSED
-- (terminal) state, unlike 'revision_required' which reopens the task for
-- another attempt. Admin-set only (staff cannot select it; no resubmit once
-- set). Set via the task drawer's "Reject" button on a pending_review task
-- (markTaskRejected in lib/store.ts) or the admin status dropdown. Rejecting a
-- parent cascades 'rejected' onto every still-open descendant (done/missed/
-- pending_article_post descendants are left untouched). Excluded from all
-- active-task lists/counts, never overdue-flagged, and the weekly SEO engine
-- treats it as closed (no carry-forward). Rejected top-level tasks can be
-- archived like done ones.
--
-- APPLIED TO THE LIVE PROJECT (tfhzuruaaymfhqmeiusr) — see CLAUDE.md.
-- Idempotent — re-run on any fresh pm-tool project.
-- ─────────────────────────────────────────────────────────────────────────────

alter table pm_tasks drop constraint if exists pm_tasks_status_check;
alter table pm_tasks add constraint pm_tasks_status_check
  check (status = any (array[
    'todo'::text,
    'in_progress'::text,
    'pending_review'::text,
    'pending_client_approval'::text,
    'pending_article_post'::text,
    'revision_required'::text,
    'done'::text,
    'missed'::text,
    'rejected'::text
  ]));

notify pgrst, 'reload schema';
