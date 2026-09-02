-- Client tier / package badges on projects.
--
-- Each project can carry ONE package (SEO Starter, Growth SEO, …). The package
-- is rendered as a small coloured icon beside the project everywhere a project
-- is listed, and hovering it shows the scope — how many pages, keywords,
-- backlinks and articles that client is actually paying for — so staff can see
-- the work scope without opening the invoice.
--
-- The tier LIST is data, not code (user decision 2026-09-01): the owner renames
-- packages, changes quotas and adds tiers from Settings -> Client Packages
-- without a deploy. That is why `scope` is free text and `icon`/`color` are
-- plain strings validated in the UI rather than by a CHECK — every CHECK on
-- pm_tasks has needed a live migration to add a value.
--
-- Idempotent — safe to re-run. Re-run on any fresh Supabase project.
-- Applied to the LIVE project (tfhzuruaaymfhqmeiusr) on 2026-09-01.

create table if not exists public.pm_project_tiers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- 1–3 characters shown when there is no room for an icon. Blank = derive the
  -- initial from the name.
  short_label text not null default '',
  -- A lucide icon key from TIER_ICON_KEYS in lib/project-tiers.ts. An unknown
  -- key falls back to the default icon rather than crashing the page.
  icon        text not null default 'Star',
  color       text not null default '#38b6e8',
  -- The work scope staff read off the badge. One item per line; the UI renders
  -- the lines as a list. Free text on purpose — a quota changes with a price
  -- list, not with a release.
  scope       text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Two packages must not share a name — the badge is only readable if the name
-- identifies the package. Case-insensitive, because "Growth SEO" and "growth
-- seo" are the same package to everyone except Postgres.
create unique index if not exists pm_project_tiers_name_key
  on public.pm_project_tiers (lower(name));

create or replace function public.pm_project_tiers_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists pm_project_tiers_touch on public.pm_project_tiers;
create trigger pm_project_tiers_touch
  before update on public.pm_project_tiers
  for each row execute function public.pm_project_tiers_touch();

-- ON DELETE SET NULL: deleting a package must never delete or orphan projects.
-- Those projects simply show no badge until they are relabelled.
alter table public.pm_projects
  add column if not exists tier_id uuid references public.pm_project_tiers(id) on delete set null;

create index if not exists pm_projects_tier_idx on public.pm_projects (tier_id);

alter table public.pm_project_tiers enable row level security;

-- Read by everyone SIGNED IN — the whole point is that staff can see the scope.
-- Not `using (true)`: that is the app's blanket pm_allow_all baseline and it
-- also lets the anon key (which ships in the client bundle) read the table.
-- Writes are admin-only at the DB level, not just a hidden button — the tier
-- list is a shared taxonomy that changes what every board reads — so they reuse
-- pm_is_admin() the way pm_credentials does.
drop policy if exists pm_allow_all on public.pm_project_tiers;
drop policy if exists pm_project_tiers_select on public.pm_project_tiers;
create policy pm_project_tiers_select on public.pm_project_tiers
  for select using (auth.role() = 'authenticated');

drop policy if exists pm_project_tiers_admin_write on public.pm_project_tiers;
create policy pm_project_tiers_admin_write on public.pm_project_tiers
  for all using (public.pm_is_admin()) with check (public.pm_is_admin());

-- Seed the two SEO retainers actually sold, taken from the live
-- pm_invoice_templates scope text so the badge and the quotation agree.
--
-- The monthly PRICE is deliberately not in the scope: staff need the quotas to
-- do the work, but what a client pays is owner-only (see the Owner-Only
-- Financial Data rule). The engagement term is kept — that is scope, not
-- revenue. The admin can add pricing back from Settings if they ever want it.
--
-- Guarded on the table being EMPTY, not on the names: once the owner has
-- renamed or reworked a package, a re-run of this file must not put the
-- original back alongside it.
insert into public.pm_project_tiers (name, short_label, icon, color, scope, sort_order)
select * from (values
  (
    'SEO Starter',
    'S',
    'Sprout',
    '#38bdf8',
    E'6-month engagement\nOn-page optimisation: up to 5 pages\nTarget keywords: up to 10\nBacklinks: 20 starter (citations, directories, contextual)\nContent: 4 SEO blog articles\nAEO: FAQ + answer-style formatting\nLocal SEO: GMB audit, categories, NAP check\nReporting: monthly report + keyword tracking',
    0
  ),
  (
    'Growth SEO',
    'G',
    'TrendingUp',
    '#a78bfa',
    E'Minimum 6-month commitment\nOn-page optimisation: up to 10 pages (service, location, blog)\nTarget keywords: up to 20 across services & locations\nBacklinks: 50 / month (niche + contextual mix)\nContent: up to 4 articles / month with AEO Q&A blocks\nAEO/GEO: content clusters, topical authority, best-answer sections\nLocal SEO: GMB optimisation + 1 GMB post / week, review responses\nCRO: recommendations on top landing pages\nReporting: dashboard + keyword tracking + monthly strategy call',
    1
  )
) as seed(name, short_label, icon, color, scope, sort_order)
where not exists (select 1 from public.pm_project_tiers);

notify pgrst, 'reload schema';
