-- Weekly Reports table (project Reports tab + public /report/<token> share page)
-- The UI + lib/db.ts helpers (dbGetWeeklyReports / dbCreateWeeklyReport / …) shipped
-- without this table ever being created in the live project, so the Reports tab was
-- silently empty and "Create report" failed. Idempotent — safe to re-run.
-- Applied to the LIVE project (tfhzuruaaymfhqmeiusr) on 2026-07-22.
--
-- Contract expected by lib/db.ts:
--   * insert sends only project_id, week_starting, summary_notes, tasks_snapshot,
--     created_by — so id, share_token, created_at MUST have DB defaults.
--   * share_token backs the PUBLIC report page (anon client, no auth) → anon
--     gets token-gated SELECT only (mirrors pm_articles), never write.

create table if not exists public.pm_weekly_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pm_projects(id) on delete cascade,
  week_starting date not null,
  summary_notes text not null default '',
  tasks_snapshot jsonb not null default '[]'::jsonb,
  share_token text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists pm_weekly_reports_project_idx
  on public.pm_weekly_reports (project_id, week_starting desc);

alter table public.pm_weekly_reports enable row level security;

drop policy if exists pm_weekly_reports_auth_all on public.pm_weekly_reports;
create policy pm_weekly_reports_auth_all on public.pm_weekly_reports
  for all to authenticated using (true) with check (true);

drop policy if exists pm_weekly_reports_anon_read on public.pm_weekly_reports;
create policy pm_weekly_reports_anon_read on public.pm_weekly_reports
  for select to anon using (share_token is not null);

notify pgrst, 'reload schema';
