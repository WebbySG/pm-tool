-- ─────────────────────────────────────────────────────────────────────────────
-- Weekly SEO task engine + task archive — schema
-- APPLIED TO THE LIVE PROJECT (tfhzuruaaymfhqmeiusr) on 2026-07-23 via the
-- mcp__supabase__* MCP (migration `weekly_seo_engine_and_task_archive`).
-- Idempotent — re-run this on any fresh Supabase project for pm-tool.
--
-- • pm_tasks.status gains 'missed' (weekly-article tombstone: slot never posted)
-- • pm_tasks.archived_at — admin archive/unarchive of completed tasks
-- • pm_tasks.seo_week/seo_slot — generator identity (Monday date + slot name:
--   'articles-parent' | 'article-1..3' | 'backlinks' | 'gmb')
-- • pm_weekly_seo_plans — which projects get the weekly SEO set + assignee
-- The generator itself is app/api/weekly-seo/run/route.ts (VPS cron, daily).
-- ─────────────────────────────────────────────────────────────────────────────

alter table pm_tasks drop constraint if exists pm_tasks_status_check;
alter table pm_tasks add constraint pm_tasks_status_check
  check (status = any (array['todo'::text,'in_progress'::text,'pending_review'::text,'revision_required'::text,'done'::text,'missed'::text]));

alter table pm_tasks add column if not exists archived_at timestamptz;
alter table pm_tasks add column if not exists seo_week date;
alter table pm_tasks add column if not exists seo_slot text;

create index if not exists idx_pm_tasks_seo_week on pm_tasks (project_id, seo_week, seo_slot) where seo_week is not null;
create index if not exists idx_pm_tasks_archived on pm_tasks (archived_at) where archived_at is not null;

create table if not exists pm_weekly_seo_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references pm_projects(id) on delete cascade,
  enabled boolean not null default true,
  assignee_id uuid,
  include_articles boolean not null default true,
  include_backlinks boolean not null default true,
  include_gmb boolean not null default true,
  created_at timestamptz not null default now()
);
alter table pm_weekly_seo_plans enable row level security;
drop policy if exists pm_allow_all on pm_weekly_seo_plans;
create policy pm_allow_all on pm_weekly_seo_plans for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
