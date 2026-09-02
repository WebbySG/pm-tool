-- Enable RLS on the leftover Webby SEO OS tables (2026-09-02)
--
-- The Supabase security advisor reported 12 public tables with RLS DISABLED plus
-- one SECURITY DEFINER view. RLS-disabled tables in the `public` schema are fully
-- exposed to the `anon` and `authenticated` roles, and the anon key ships inside
-- every client bundle — so anyone holding it could read AND write all of them.
-- Confirmed exposure before the fix: 1561 ai_usage_logs rows (per-call AI cost
-- data), 62 quality_rules, 39 prompt_learnings, 20 article_idea_suggestions,
-- 12 ai_agent_insights and 3 meta_audit_reports were world-readable/writable.
--
-- ⚠ These are NOT pm-tool tables. The live pm-tool project (tfhzuruaaymfhqmeiusr)
-- also carries a whole Webby SEO OS schema (ads_*, ai_*, article_*, keywords,
-- clients, seo_*). That app moved to the Omnipulse project and the schema here is
-- DEAD: every one of these tables — and their already-RLS-enabled siblings — last
-- took a write in May 2026 (latest 2026-05-11), while pm_tasks is written daily.
-- All 9 `clients` rows are ORPHANS: their user_id points at auth users that do not
-- exist in this project (only the 4 pm-tool staff do), so the sibling policies
-- already match zero rows for every user who can sign in here.
--
-- Safe to apply because: no Edge Functions exist in this project, the pm-tool
-- codebase references none of these tables (grep: 0 files), and service_role
-- bypasses RLS so any future server job is unaffected.
--
-- Policies deliberately mirror the pattern the RLS-ENABLED siblings already use
-- (ads_keywords, keywords, seo_articles, article_categories): ownership through
-- clients.user_id = auth.uid(). Scoped `to authenticated` so anon gets nothing.
--
-- APPLIED to the LIVE project (tfhzuruaaymfhqmeiusr) on 2026-09-02, identity
-- verified first via get_project_url + a pm_tasks/pm_projects row-count probe.
-- Idempotent — safe to re-run, and required on any fresh project.

-- 1) Client-owned tables -----------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'ads_keyword_qs_snapshots','ai_agent_insights','ai_usage_logs',
    'article_exemplars','article_idea_suggestions','article_internal_links',
    'article_learning_insights','article_performance','article_performance_snapshots',
    'meta_audit_reports'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_client_owner', t);
    execute format($f$
      create policy %I on public.%I
        for all to authenticated
        using (client_id in (select id from public.clients where user_id = auth.uid()))
        with check (client_id in (select id from public.clients where user_id = auth.uid()))
    $f$, t || '_client_owner', t);
  end loop;
end $$;

-- 2) prompt_learnings: same ownership rule, but 2 of its 39 rows are GLOBAL
--    (client_id is null — learnings shared across clients). Those stay readable
--    by any signed-in user and writable only by service_role.
alter table public.prompt_learnings enable row level security;

drop policy if exists prompt_learnings_client_owner on public.prompt_learnings;
create policy prompt_learnings_client_owner on public.prompt_learnings
  for all to authenticated
  using (client_id in (select id from public.clients where user_id = auth.uid()))
  with check (client_id in (select id from public.clients where user_id = auth.uid()));

drop policy if exists prompt_learnings_global_read on public.prompt_learnings;
create policy prompt_learnings_global_read on public.prompt_learnings
  for select to authenticated
  using (client_id is null);

-- 3) quality_rules has NO client_id — it is a global rule catalogue (62 rows).
--    Readable by signed-in users; writes are service_role only (no write policy).
alter table public.quality_rules enable row level security;

drop policy if exists quality_rules_read on public.quality_rules;
create policy quality_rules_read on public.quality_rules
  for select to authenticated
  using (true);

-- 4) The view ran as its OWNER (Postgres views are SECURITY DEFINER unless told
--    otherwise), so it read ai_usage_logs underneath RLS. security_invoker makes
--    it honour the caller's own policies instead.
alter view public.ai_usage_monthly_summary set (security_invoker = on);
