-- Removes the deprecated Technical / On-Page CHECKLIST table.
--
-- APPLIED TO LIVE (tfhzuruaaymfhqmeiusr) 2026-08-19 on the owner instruction
-- ("i dont need the check list so can remove those"). The 52 rows it held were
-- dumped to the session transcript first; every one had done=false and no note.
--
-- Superseded on 2026-08-19 by the SEO Setup phase tasks (scripts/seo-setup-phase.sql):
-- the SEO work is now real tasks on the board, recorded in the task itself, not
-- a tick-list. No application code reads pm_seo_checklist_items any more.
--
-- ⚠ DESTRUCTIVE. Check what is in there before running it:
--     select p.name, count(*) filter (where c.done) as ticked,
--            count(*) filter (where coalesce(c.note,'') <> '') as notes, count(*) as items
--     from pm_seo_checklist_items c join pm_projects p on p.id = c.project_id
--     group by p.name;
-- At the time of writing: 52 rows across 2 projects, 0 ticked, 0 notes — i.e.
-- the standard list seeded while trying the feature out, no recorded work.

drop table if exists pm_seo_checklist_items;

notify pgrst, 'reload schema';
