-- ─── SEO Setup phase tasks ───────────────────────────────────────────────────
-- The standard SEO work set a project gets when it is labelled SEO (or Web +
-- SEO): a parent "SEO Setup" task plus one task per phase, in the order the
-- work actually happens — competitors → keyword research → technical SEO →
-- on-page fixes.
--
-- Identity is this COLUMN, never the title: titles get renamed and repeat
-- across projects (same rule as pm_tasks.seo_slot for the weekly engine).
-- Values: 'setup' (the parent) | 'competitors' | 'keyword-research' |
-- 'technical-seo' | 'onpage-fixes'. Deliberately UNCONSTRAINED text — every
-- CHECK on pm_tasks has needed a live migration to add a value (see the
-- task-status modules), which is exactly why adding the 'competitors' phase on
-- 2026-08-31 needed NO migration at all.
--
-- Idempotent; safe to re-run.

alter table pm_tasks add column if not exists seo_phase text;

-- One row per phase per project, ever. The app checks before inserting; this is
-- the backstop against a double-click, or two admins labelling at the same time.
create unique index if not exists pm_tasks_seo_phase_unique
  on pm_tasks (project_id, seo_phase)
  where seo_phase is not null;

notify pgrst, 'reload schema';
