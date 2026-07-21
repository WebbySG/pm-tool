-- ─────────────────────────────────────────────────────────────────────────────
-- Task activity log + comment edit history — schema migration
--
-- Run this ONCE in the Supabase SQL editor of the LIVE pm-tool project
-- (tfhzuruaaymfhqmeiusr — the one os.webby.sg talks to). Do NOT run it via a
-- Supabase MCP unless you have verified it reaches tfhzuruaaymfhqmeiusr — the
-- MCP has historically pointed at the WRONG project (Omnipulse). See CLAUDE.md
-- "Known Recurring Mistake #10".
--
-- What it does:
--   1. pm_task_activity  — an audit trail. A trigger on pm_tasks records every
--      INSERT / UPDATE / DELETE, capturing auth.uid() as the actor and one row
--      per changed field. Lets the admin review what staff (or anyone) did.
--   2. pm_task_comment_versions — snapshots the PREVIOUS body of a task comment
--      whenever it is edited, so the admin (and the comment's own author) can
--      read prior versions.
--   3. RLS: task activity is admin-only; comment versions are visible to the
--      admin OR the version's author. Both are written only by SECURITY DEFINER
--      triggers, so clients can never forge or tamper with log rows.
--
-- Reuses public.pm_is_admin() (created for the credentials module).
-- Safe to re-run: every step is idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- Safety: the comment-edit feature needs edited_at (added 2026-07-21). Harmless
-- if already present.
alter table public.pm_task_comments
  add column if not exists edited_at timestamptz;

-- ── 1. Task activity log ────────────────────────────────────────────────────
-- task_id is nullable + ON DELETE SET NULL so a deleted task's history SURVIVES.
-- project_id and task_title are snapshots (kept even after the task is gone).
create table if not exists public.pm_task_activity (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid references public.pm_tasks(id) on delete set null,
  project_id  uuid,
  task_title  text,
  actor_id    uuid,                 -- auth.uid() of whoever made the change
  action      text not null,        -- 'created' | 'updated' | 'moved' | 'deleted'
  field       text,                 -- for 'updated': which field changed
  old_value   text,
  new_value   text,
  created_at  timestamptz not null default now()
);

create index if not exists pm_task_activity_task_idx    on public.pm_task_activity (task_id);
create index if not exists pm_task_activity_created_idx  on public.pm_task_activity (created_at desc);
create index if not exists pm_task_activity_project_idx  on public.pm_task_activity (project_id);

-- Trigger: diff pm_tasks rows and write activity entries.
-- SECURITY DEFINER (owned by postgres = table owner) so the insert always lands
-- regardless of the caller's RLS. auth.uid() still resolves to the real caller.
create or replace function public.pm_log_task_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.pm_task_activity (task_id, project_id, task_title, actor_id, action)
    values (new.id, new.project_id, new.title, v_actor, 'created');
    return new;

  elsif tg_op = 'DELETE' then
    insert into public.pm_task_activity (task_id, project_id, task_title, actor_id, action)
    values (null, old.project_id, old.title, v_actor, 'deleted');
    return old;

  elsif tg_op = 'UPDATE' then
    -- Moved to another project (moveTaskToProject rewrites project_id).
    if new.project_id is distinct from old.project_id then
      insert into public.pm_task_activity (task_id, project_id, task_title, actor_id, action, field, old_value, new_value)
      values (new.id, new.project_id, new.title, v_actor, 'moved', 'project', old.project_id::text, new.project_id::text);
    end if;

    if new.title is distinct from old.title then
      insert into public.pm_task_activity (task_id, project_id, task_title, actor_id, action, field, old_value, new_value)
      values (new.id, new.project_id, new.title, v_actor, 'updated', 'title', old.title, new.title);
    end if;

    if new.status is distinct from old.status then
      insert into public.pm_task_activity (task_id, project_id, task_title, actor_id, action, field, old_value, new_value)
      values (new.id, new.project_id, new.title, v_actor, 'updated', 'status', old.status, new.status);
    end if;

    if new.priority is distinct from old.priority then
      insert into public.pm_task_activity (task_id, project_id, task_title, actor_id, action, field, old_value, new_value)
      values (new.id, new.project_id, new.title, v_actor, 'updated', 'priority', old.priority::text, new.priority::text);
    end if;

    if new.assignee_id is distinct from old.assignee_id then
      insert into public.pm_task_activity (task_id, project_id, task_title, actor_id, action, field, old_value, new_value)
      values (new.id, new.project_id, new.title, v_actor, 'updated', 'assignee', old.assignee_id::text, new.assignee_id::text);
    end if;

    if new.due_date is distinct from old.due_date then
      insert into public.pm_task_activity (task_id, project_id, task_title, actor_id, action, field, old_value, new_value)
      values (new.id, new.project_id, new.title, v_actor, 'updated', 'due_date', old.due_date::text, new.due_date::text);
    end if;

    if new.type is distinct from old.type then
      insert into public.pm_task_activity (task_id, project_id, task_title, actor_id, action, field, old_value, new_value)
      values (new.id, new.project_id, new.title, v_actor, 'updated', 'type', old.type, new.type);
    end if;

    if new.recurring is distinct from old.recurring then
      insert into public.pm_task_activity (task_id, project_id, task_title, actor_id, action, field, old_value, new_value)
      values (new.id, new.project_id, new.title, v_actor, 'updated', 'recurring', old.recurring::text, new.recurring::text);
    end if;

    if new.tags is distinct from old.tags then
      insert into public.pm_task_activity (task_id, project_id, task_title, actor_id, action, field, old_value, new_value)
      values (new.id, new.project_id, new.title, v_actor, 'updated', 'tags',
              array_to_string(coalesce(old.tags, '{}'), ', '),
              array_to_string(coalesce(new.tags, '{}'), ', '));
    end if;

    -- Description bodies can be large HTML; record only that it changed.
    if new.description is distinct from old.description then
      insert into public.pm_task_activity (task_id, project_id, task_title, actor_id, action, field)
      values (new.id, new.project_id, new.title, v_actor, 'updated', 'description');
    end if;

    -- NB: sort_order / updated_at deliberately NOT tracked, so reordering and
    -- touch-only updates never spam the log.
    return new;
  end if;

  return null;
end;
$$;

drop trigger if exists pm_tasks_log_activity on public.pm_tasks;
create trigger pm_tasks_log_activity
  after insert or update or delete on public.pm_tasks
  for each row execute function public.pm_log_task_activity();

-- RLS: admin-only read. No client insert/update/delete policy — the trigger
-- (SECURITY DEFINER) is the only writer, so the trail is tamper-evident.
alter table public.pm_task_activity enable row level security;
drop policy if exists pm_task_activity_select on public.pm_task_activity;
create policy pm_task_activity_select on public.pm_task_activity
  for select using (public.pm_is_admin());

-- ── 2. Comment edit history ─────────────────────────────────────────────────
create table if not exists public.pm_task_comment_versions (
  id            uuid primary key default gen_random_uuid(),
  comment_id    uuid not null references public.pm_task_comments(id) on delete cascade,
  task_id       uuid,
  body          text not null default '',   -- the PREVIOUS body (pre-edit)
  edited_by     uuid,                        -- the comment's author (only they may edit)
  superseded_at timestamptz not null default now(),  -- when this version was replaced
  created_at    timestamptz not null default now()
);

create index if not exists pm_task_comment_versions_comment_idx
  on public.pm_task_comment_versions (comment_id, superseded_at);

-- Trigger: before a comment's body changes, archive the OLD body.
create or replace function public.pm_snapshot_comment_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.body is distinct from old.body then
    insert into public.pm_task_comment_versions (comment_id, task_id, body, edited_by, superseded_at)
    values (old.id, old.task_id, old.body, old.author_id, now());
  end if;
  return new;
end;
$$;

drop trigger if exists pm_task_comments_snapshot on public.pm_task_comments;
create trigger pm_task_comments_snapshot
  before update on public.pm_task_comments
  for each row execute function public.pm_snapshot_comment_version();

-- RLS: admin sees every comment's history; a staff author sees their own.
alter table public.pm_task_comment_versions enable row level security;
drop policy if exists pm_task_comment_versions_select on public.pm_task_comment_versions;
create policy pm_task_comment_versions_select on public.pm_task_comment_versions
  for select using (public.pm_is_admin() or edited_by = auth.uid());

-- ── 3. Refresh PostgREST schema cache (recurring mistake #7) ─────────────────
notify pgrst, 'reload schema';
