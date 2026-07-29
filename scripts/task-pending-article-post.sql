-- ─────────────────────────────────────────────────────────────────────────────
-- Article-post workflow: pm_tasks.status gains 'pending_article_post' +
-- pm_tasks.article_url / pm_tasks.requires_article_post columns
--
-- Flow: a task flagged requires_article_post is APPROVED by the admin →
-- instead of 'done' it parks in 'pending_article_post' — the assignee must
-- upload the article to the client website and record the live link
-- (article_url) via the task drawer's "Mark as Posted" action, which then
-- completes the task and notifies the admin (type 'article_posted').
--
-- requires_article_post is auto-set (true) by the weekly SEO generator on
-- Article 1/2/3 subtasks, and can be toggled by an admin on any task in the
-- task drawer. 'pending_article_post' is an ACTIVE/open state (not done);
-- staff cannot select it from the status dropdown (set only via admin Approve).
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
    'missed'::text
  ]));

alter table pm_tasks add column if not exists article_url text;
alter table pm_tasks add column if not exists requires_article_post boolean not null default false;

-- Backfill: every weekly SEO article slot task requires posting.
-- ('article-%' matches article-1/2/3 but NOT 'articles-parent' — the 8th char
-- there is 's', not '-'.)
update pm_tasks set requires_article_post = true
  where seo_slot like 'article-%' and requires_article_post = false;

notify pgrst, 'reload schema';
