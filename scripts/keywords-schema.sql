-- Keyword research per project (the "Keywords" project tab).
--
-- The target keywords for a client, with the numbers that decide what to work on
-- (volume, difficulty), where each one is meant to land (target_url), and where
-- it currently sits (current_rank). Rankings are a SINGLE current value that is
-- overwritten on each check — history is deliberately not kept (user decision
-- 2026-08-18); adding it later means a pm_keyword_ranks child table, not a
-- change to this one.
--
-- Idempotent — safe to re-run. Re-run on any fresh Supabase project.
-- Applied to the LIVE project (tfhzuruaaymfhqmeiusr) on 2026-08-18.

create table if not exists public.pm_keywords (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.pm_projects(id) on delete cascade,
  keyword        text not null,
  search_volume  integer,
  difficulty     integer,
  target_url     text,
  -- NULL = not ranking / never checked. rank_checked_at says which it is.
  current_rank   integer,
  rank_checked_at timestamptz,
  -- 'target' | 'in_progress' | 'ranking' | 'dropped' and
  -- 'high' | 'medium' | 'low'. Deliberately UNCONSTRAINED text, same reasoning
  -- as pm_seo_checklist_items.category: the pm_tasks status CHECK has needed a
  -- live migration for every new value. The TS unions in lib/keyword-types.ts
  -- are the source of truth and every lookup falls back gracefully.
  status         text not null default 'target',
  priority       text not null default 'medium',
  notes          text,
  sort_order     integer not null default 0,
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists pm_keywords_project_idx on public.pm_keywords (project_id);

-- Case-insensitive duplicate lookup for the paste importer, which skips
-- keywords the project already has. Intentionally NOT a unique constraint: a
-- re-import should skip quietly, not abort the whole batch partway through.
create index if not exists pm_keywords_project_keyword_idx
  on public.pm_keywords (project_id, lower(keyword));

create or replace function public.pm_keywords_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists pm_keywords_touch on public.pm_keywords;
create trigger pm_keywords_touch
  before update on public.pm_keywords
  for each row execute function public.pm_keywords_touch();

alter table public.pm_keywords enable row level security;

-- Blanket policy, matching pm_tasks / pm_seo_checklist_items. Project delivery
-- data, NOT money or credentials, so it deliberately does not use pm_is_admin()
-- — see the Owner-Only Financial Data rule for what must. "Admin + assigned
-- staff can edit" is enforced in the UI, as elsewhere in the app.
drop policy if exists pm_allow_all on public.pm_keywords;
create policy pm_allow_all on public.pm_keywords
  for all using (true) with check (true);

notify pgrst, 'reload schema';
