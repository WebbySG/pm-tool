-- Tier LEVEL on the client packages — the 1 / 2 / 3 the owner actually says.
--
-- The packages already existed (pm_project_tiers, scripts/project-tiers.sql) but
-- they were only ever identified by NAME and icon: "SEO Starter", "Growth SEO".
-- The owner's own vocabulary is a ladder — "tier 1", "tier 2", "tier 3" — and
-- that number appeared nowhere in the app, so the badge beside a project could
-- not answer the question it exists to answer at a glance.
--
-- `level` is the rank on that ladder. NULL is a real and useful value: a package
-- that is not a rung (a one-off web build, say) keeps its badge and its scope
-- without pretending to sit above or below the SEO retainers.
--
-- Deliberately NOT unique. Two packages sharing a level is a mistake, not a
-- corruption, and the same argument as pm_keywords.status / seo_phase applies:
-- a refused write in the middle of relabelling is worse than a duplicate label
-- the admin can see and fix. The Settings editor warns about a clash instead.
--
-- Idempotent — safe to re-run. Re-run on any fresh Supabase project.
-- Applied to the LIVE project (tfhzuruaaymfhqmeiusr) on 2026-09-02.

alter table public.pm_project_tiers
  add column if not exists level integer;

comment on column public.pm_project_tiers.level is
  'Rung on the tier ladder: 1 = first tier, 2 = second, and so on. NULL = a named package that is not a numbered tier. Not unique on purpose; the Settings editor warns about a clash rather than refusing the write.';

-- There is no tier 0 or tier -1. This is the one invariant that can never need
-- widening later, so it is safe as a CHECK (every other CHECK on pm_tasks has
-- needed a live migration to add a value).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pm_project_tiers_level_check'
      and conrelid = 'public.pm_project_tiers'::regclass
  ) then
    alter table public.pm_project_tiers
      add constraint pm_project_tiers_level_check
      check (level is null or level >= 1);
  end if;
end $$;

-- Backfill the ladder from the order the packages were already displayed in,
-- which is exactly what the owner meant by tier 1 and tier 2 (SEO Starter then
-- Growth SEO). Guarded on NO row having a level yet — the same idiom as the
-- seed block in scripts/project-tiers.sql — so a re-run can never overwrite a
-- level the admin has since set, or re-rank a package they deliberately
-- un-ranked.
update public.pm_project_tiers t
   set level = t.sort_order + 1
 where not exists (select 1 from public.pm_project_tiers where level is not null);

notify pgrst, 'reload schema';
