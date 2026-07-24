-- ─────────────────────────────────────────────────────────────────────────────
-- pm_tasks.status gains 'pending_client_approval'
--
-- Internally approved work that is now waiting on the CLIENT to sign off.
-- Admin-set only (staff cannot select it — same gate as pending_review/done in
-- the task drawer). Treated as an ACTIVE/open state everywhere (not done),
-- excluded from overdue highlighting (the wait is on the client, not staff).
--
-- APPLIED TO THE LIVE PROJECT (tfhzuruaaymfhqmeiusr) on 2026-07-24 via the
-- mcp__supabase__* MCP. Idempotent — re-run on any fresh pm-tool project.
-- ─────────────────────────────────────────────────────────────────────────────

alter table pm_tasks drop constraint if exists pm_tasks_status_check;
alter table pm_tasks add constraint pm_tasks_status_check
  check (status = any (array[
    'todo'::text,
    'in_progress'::text,
    'pending_review'::text,
    'pending_client_approval'::text,
    'revision_required'::text,
    'done'::text,
    'missed'::text
  ]));

notify pgrst, 'reload schema';
