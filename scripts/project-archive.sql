-- Project archive (2026-08-02)
-- Adds pm_projects.archived_at. An archived project (and therefore all of its
-- tasks, which are nested under projects in the store) disappears from every
-- active view because loadAll filters pm_projects on archived_at IS NULL.
-- Unarchiving restores the project with its tasks intact — nothing is deleted.
-- The weekly SEO generator also skips archived projects (their pm_weekly_seo_plans
-- rows stay enrolled and resume when unarchived).
--
-- Idempotent. Applied to the LIVE project (tfhzuruaaymfhqmeiusr) on 2026-08-02.
-- Re-run on any fresh Supabase project.

alter table public.pm_projects add column if not exists archived_at timestamptz;

notify pgrst, 'reload schema';
