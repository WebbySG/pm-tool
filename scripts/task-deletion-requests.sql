-- Task deletion approval workflow + creator tracking.
--
-- Adds:
--   * created_by            — auth uid of whoever inserted the task. Auto-stamped
--                             via DEFAULT auth.uid() (PostgREST inserts run in the
--                             caller's auth context), so every creation path (task
--                             drawer, tasks page, project seed, templates) records
--                             the creator without threading a user through the store.
--                             NULL for rows created by the service role / MCP and
--                             for tasks that pre-date this migration.
--   * deletion_requested_by — auth uid of the staff member who requested deletion.
--                             Non-NULL => a deletion is pending admin approval.
--   * deletion_requested_at — when the request was made (for display).
--
-- Staff may request deletion only of tasks they CREATED (created_by = auth.uid());
-- an admin must approve before the row is actually deleted. Enforcement is at the
-- app layer (pm_tasks uses a blanket pm_allow_all policy, same as the existing
-- "Submit for Review" approval flow).
--
-- Idempotent. Apply to the LIVE project (tfhzuruaaymfhqmeiusr).

alter table public.pm_tasks
  add column if not exists created_by uuid default auth.uid(),
  add column if not exists deletion_requested_by uuid,
  add column if not exists deletion_requested_at timestamptz;

-- Refresh the PostgREST schema cache so the new columns are queryable immediately.
notify pgrst, 'reload schema';
