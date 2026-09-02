-- ─── Articles overview — an explicit "this task is an article" flag ──────────
-- Identity for the Articles sheet (global /articles page + the per-project
-- Articles tab). NEVER match articles by title: the live data proves why —
-- 109 tasks contain the word "article" but 62 of those are not articles (e.g.
-- "Featured image not showing in single article page"), while 19 genuine
-- articles with live URLs recorded are titled only "Monday" / "wednesday post".
--
-- Set automatically by the weekly SEO generator on its article slots and by
-- "+ Add article" on the sheet; togglable by an admin in the task drawer.
-- Backfilled once for existing tasks by scripts/backfill-article-flag.mjs.
--
-- Idempotent. Applied to the LIVE project (tfhzuruaaymfhqmeiusr) 2026-08-25.

alter table pm_tasks
  add column if not exists is_article boolean not null default false;

-- The sheet always reads "the articles of a project", so the partial index is
-- on project_id and covers only flagged rows (a few dozen out of ~380).
create index if not exists pm_tasks_is_article_idx
  on pm_tasks (project_id)
  where is_article;

-- is_article is deliberately NOT tracked by pm_log_task_activity: flipping the
-- flag is a bookkeeping act, not work on the task, and would only add noise to
-- the audit log (same reasoning as deletion_requested_by).

notify pgrst, 'reload schema';
