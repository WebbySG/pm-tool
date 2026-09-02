# Claude Code Development Behaviour Rules

These rules are permanent and must be followed for all future development work in this repository.

Claude must treat this application as a connected system, not as isolated files. Every requested change must be investigated across all related frontend, backend, database, API, Edge Function, documentation, configuration, and workflow areas before the task is considered complete.

---

## 1. Connected System Change Rule

When the user asks for a change, fix, removal, update, refactor, cleanup, or improvement, do not treat it as a narrow single-file task.

Before making changes, Claude must first understand:

- which feature/module the request belongs to
- what the feature is supposed to do
- where the data comes from
- where the data is displayed
- what components are connected
- what hooks/services are connected
- what API calls or Edge Functions are connected
- what Supabase tables/types/migrations are connected
- what fallback, mock, dummy, or placeholder data may be involved
- what documentation needs to be updated

Claude must search for all related references before declaring the task complete.

This includes searching for:

- function names
- component names
- route names
- page names
- table names
- column names
- API endpoint names
- Edge Function names
- hook names
- service names
- type/interface names
- constants
- mock data
- dummy data
- fallback data
- placeholder text
- seed data
- related documentation

Claude must not stop after fixing the first matching file.

If the same issue exists in other folders, routes, components, mock files, fallback states, reports, dashboards, or documentation, Claude must fix the related instances as part of the same task.

---

## 2. Full Feature Flow Investigation Rule

For every bug, missing data issue, dummy content issue, broken metric, incomplete feature, UI problem, or data mismatch, Claude must trace the full connected feature flow.

Claude must check the flow across:

1. User interface
2. Page/route
3. Component state
4. Hooks
5. Services
6. API calls
7. Edge Functions
8. Supabase tables
9. Supabase migrations
10. Shared types/interfaces
11. Fallback states
12. Empty states
13. Reports
14. Dashboard cards
15. Documentation

A task is not complete until Claude has checked the connected flow and confirmed that related areas are not still broken, outdated, duplicated, or using dummy content.

---

## 3. Dummy, Mock, Demo, and Placeholder Content Rule

Production-facing areas of the application must not contain dummy, mock, demo, fake, sample, placeholder, or hardcoded fallback content unless it is intentionally isolated for development-only use.

When the user asks to remove dummy content, Claude must search the entire codebase for related content, including but not limited to:

- dummy
- mock
- placeholder
- sample
- demo
- test data
- example
- lorem ipsum
- fake
- hardcoded
- fallback
- static data
- temporary data

Claude must also search for fake business-specific examples, including:

- fake clients
- fake websites
- fake SEO scores
- fake audit results
- fake ranking data
- fake keyword data
- fake Google Ads data
- fake traffic data
- fake conversion data
- fake reports
- fake tasks
- fake users
- fake project names
- fake dashboard metrics
- fake competitor data

Claude must check these areas:

- pages
- routes
- components
- hooks
- services
- constants
- utility files
- mock data files
- seed files
- Supabase migrations
- Edge Functions
- API response fallbacks
- dashboard widgets
- report generators
- onboarding flows
- empty states
- settings pages
- documentation

If mock data is still needed for local development, it must be:

- clearly isolated in a development-only folder
- clearly named as development-only
- blocked from production-facing UI
- never used in real client dashboards, reports, analytics, or production workflows

Claude must not replace dummy data with another hardcoded fake value. Where possible, replace dummy content with real database/API-driven data, proper empty states, or clear configuration-driven behaviour.

---

## 4. No Narrow Fix Rule

Claude must not make narrow fixes without checking the wider system impact.

If the user asks to fix one function, Claude must check whether that function is connected to:

- other components
- other routes
- other hooks
- shared utilities
- database tables
- Edge Functions
- reports
- dashboards
- project workflows
- documentation
- tests
- mock/fallback data

If related issues are found, Claude must fix them in the same task when they are directly connected.

If a related issue is discovered but requires a larger architectural change, Claude must report it clearly instead of silently ignoring it.

Claude must be proactive, but not reckless. Do not refactor unrelated modules unless they directly affect the requested task.

---

## 5. Application Learning Rule

Claude must continuously learn the structure, purpose, and workflow of this application.

Whenever Claude discovers important information about the application, it must update the relevant documentation automatically.

Important information includes:

- how a module works
- which files are connected
- which routes belong to a feature
- which Supabase tables are used
- which Edge Functions are involved
- which API contracts are used
- which shared types/interfaces are important
- which business rules must be followed
- which UI rules must be followed
- which SEO rules must be followed
- which Google Ads rules must be followed
- which WordPress integration rules must be followed
- which reporting rules must be followed
- recurring mistakes to avoid
- known issues and fixes
- deployment commands
- testing commands
- naming conventions
- data flow between frontend, backend, Supabase, WordPress, and external APIs

Claude must update one or more of these files when relevant:

- CLAUDE.md
- AGENT.md
- SYSTEM_OVERVIEW.md
- README.md
- feature-specific documentation
- database/schema notes
- Edge Function notes

Claude should not wait for the user to ask before updating documentation when the information is important for future development.

---

## 6. Documentation Update Rule

After completing any meaningful development task, Claude must check whether documentation needs to be updated.

Documentation must be updated when:

- a new feature is added
- an existing feature behaviour changes
- a database table or column is added/changed
- an Edge Function is added/changed
- an API contract changes
- a route/page is added/changed
- a workflow changes
- a business rule is clarified
- a recurring mistake is discovered
- a permanent user preference is stated
- a testing or deployment command is confirmed
- a known bug and fix is discovered

Claude must not leave important application knowledge only in chat. Important knowledge must be stored in the relevant markdown documentation file.

---

## 7. Search Before Fixing Rule

Before editing, Claude must search the codebase for related references.

Depending on the task, Claude should use relevant search terms such as:

- the feature name
- the route name
- the component name
- the function name
- the table name
- the Edge Function name
- the UI label shown to users
- related mock/dummy terms
- related database column names
- related API response fields

Claude must use the search results to understand the full scope before making the fix.

Do not assume the issue exists in only one file.

---

## 8. Production Readiness Rule

Claude must assume the application is intended for real client use and future SaaS use.

Therefore, Claude must avoid:

- fake production data
- hardcoded dashboard metrics
- hardcoded client results
- misleading SEO scores
- misleading Google Ads metrics
- unfinished placeholder UI
- demo-only reports in production areas
- broken empty states
- silent API failures
- unverified database assumptions
- undocumented business logic

Where real data is unavailable, Claude must use proper empty states, loading states, error states, or clear setup instructions.

---

## 9. Completion Checklist

Before saying a task is complete, Claude must confirm:

- The requested issue was fixed.
- The related feature/module was understood.
- Related files and references were searched.
- Connected frontend areas were checked.
- Connected backend/API/Edge Function areas were checked where relevant.
- Connected Supabase tables/types/migrations were checked where relevant.
- Similar dummy/mock/placeholder/fallback content was searched.
- Production-facing dummy content was removed or replaced where relevant.
- Related dashboard/report/empty states were checked where relevant.
- Documentation was updated where needed.
- Relevant tests, lint, type checks, or build commands were run where possible.
- Any unresolved risks, assumptions, or limitations were clearly reported.

Claude must not say "done", "fixed", or "complete" unless this checklist has been followed.

---

## 10. Final Response Format After Development Work

After completing a development task, Claude must report in this format:

### What I changed
- List the actual changes made.

### Related areas checked
- List the connected files, modules, routes, functions, database tables, Edge Functions, or documentation reviewed.

### Additional issues found and fixed
- Mention any related issues fixed beyond the original request.

### Verification
- List tests, lint, type checks, builds, or manual checks performed.

### Documentation updated
- List documentation files updated.
- If documentation was not updated, explain why.

### Remaining risks or follow-up
- Mention anything that could not be verified or needs future work.

Do not give vague completion updates. Be specific.

---

## 11. WebbyOps PM Tool — Application Knowledge

This section records permanent knowledge about the WebbyOps PM Tool application. Update this section whenever new structural, database, or business-rule knowledge is discovered.

### Application Purpose

WebbyOps is a project management SaaS tool for a web and SEO agency. It manages client projects, tasks, team workloads, content pipelines, credentials, and templates.

### Tech Stack

- **Frontend:** Next.js App Router, React, Tailwind CSS, CSS variables for theming
- **State:** Zustand with `persist` middleware (sessionStorage)
- **Database/Auth:** Supabase (PostgreSQL + Auth + Storage). **⚠️ The LIVE pm-tool project is `tfhzuruaaymfhqmeiusr`** (`.env.local` → `NEXT_PUBLIC_SUPABASE_URL=https://tfhzuruaaymfhqmeiusr.supabase.co`). **The Claude/MCP Supabase tools are connected to a DIFFERENT project (`wmulemkyjrjetwyzrsqq`, name "Omnipulse") — do NOT use the MCP for pm-tool data; its writes land in the wrong database.** To operate on the real DB, use `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` against `https://tfhzuruaaymfhqmeiusr.supabase.co` (GoTrue Admin API `/auth/v1/admin/users` to create auth users; PostgREST `/rest/v1/...` with the service role for tables). See Known Recurring Mistake #10. (`agency.webby.sg` is a SEPARATE app — "Webby SEO OS", a Vite SPA — that DOES use the Omnipulse project; `os.webby.sg` is this pm-tool.)
- **Drag and Drop:** DnD Kit
- **Deployment:** **Pull-based** — a cron job on the VPS runs [scripts/deploy.sh](scripts/deploy.sh) every ~2 min: it `git fetch`es `origin/master`, and only when there's a new commit does `git reset --hard` + `npm install` + `npm run build` + `pm2 restart pm-tool`. The VPS reaches OUT to GitHub (443), so no inbound SSH is needed. (The old GitHub Actions `appleboy/ssh-action` workflow kept failing with `dial tcp :22 i/o timeout` because runners couldn't SSH in; it's now `workflow_dispatch`-only as a manual fallback.) One-time VPS setup: `chmod +x scripts/deploy.sh` then add the cron line in that script's header. Logs: `/var/log/pm-tool-deploy.log`. `.env.local` (untracked) is preserved across `git reset --hard`.
- **VPS:** Runs HTTPS at `https://os.webby.sg` (SSL via Let's Encrypt, auto-renews) — `crypto.randomUUID()` is available; the `uuid()` helper in `lib/store.ts` will use it automatically. **VPS identity:** Hostinger VPS `srv1433288.hstgr.cloud` = `76.13.217.246` (Kuala Lumpur, AS47583). It ALSO hosts `agency.webby.sg` (the separate Webby SEO OS app) — an outage takes both down. SSH from the dev machine: `root@76.13.217.246` with `~/.ssh/id_ed25519` (host key already in known_hosts; the `hostinger-webby` ssh-config alias is DIFFERENT — that's Hostinger SHARED hosting `193.168.193.136:65002` for webby.sg's site files). Manage/restart via hPanel (hpanel.hostinger.com → VPS), which also has a browser Emergency Console (VNC) that works when SSH doesn't. **2026-08-05 outage post-mortem (full story — the interim "VM is dead" diagnosis was WRONG):** both sites unreachable for hours, yet the VM's journal shows it was HEALTHY the whole time (steady ~250 log lines/hr, cron deploys ticking) — **inbound traffic was blackholed at Hostinger's network edge** (their SYN-proxy answered TCP on EVERY port, incl. closed ones like 9999 — the tell; hPanel Emergency Console also wouldn't attach = provider-side). The user's hPanel reboot restored networking, BUT os.webby.sg stayed 502 because **`pm2 startup` had never been configured** — pm2 doesn't survive reboots, and the box hadn't rebooted since May 29 so nobody knew. Fixed 2026-08-05: `pm2 resurrect` + `pm2 startup systemd` + `pm2 save` → **`pm2-root.service` is now enabled** (app auto-starts on boot). Lessons/quirks: (1) Do NOT trust TCP-connect tests against this VPS — the Hostinger edge SYN-ACKs for dead/blackholed backends; test a closed port, and test HTTP from external nodes (check-host.net) — during the incident the sites returned 502/200 globally while the user's **VPN exit IP (ProtonVPN 149.88.103.x) was blocked** and saw timeouts. (2) **Port 44909 = Mattermost in Docker** (`mattermost-inkl` + postgres:16 containers, installed ~Apr 2026, auto-start on boot) — Hostinger support wrongly told the user to repoint nginx from 3000 to it during the 502; never do that, the fix for a 502 is starting pm-tool (port 3000). (3) The deploy cron line is duplicated in root's crontab (added twice, 2nd on Jun 3) — harmless (flock makes the loser skip) but it logs "another deploy is already running — skipping" EVERY 2 min; ~45k such lines in `/var/log/pm-tool-deploy.log` are NOISE, not a stuck deploy (`grep 'deploy complete'` for real deploys). Dedupe with `crontab -l | awk '!seen[$0]++' | crontab -` when convenient. (4) Security gaps found, NOT yet fixed (user decision pending): `PermitRootLogin yes` + `PasswordAuthentication yes` (50-cloud-init.conf wins over the later `no`) + **no fail2ban** — constant SSH brute-force background noise; disabling password auth may break hPanel browser-console login, so coordinate before changing.

### Role System

- **Admin:** Full access to all features, all projects, all tasks, all management pages
- **Staff:** View only assigned projects; no templates or team pages. **Task editing** (title/description/due date/child tasks) is governed by `canEdit` in [components/task-drawer.tsx](components/task-drawer.tsx) = `isAdmin || isMyTask || isCreator || isUnassigned` — see the Uploads & File Persistence module. **Attaching files is open to any staff member on any task they can see** (never gated). **Task deletion is request-and-approve** — staff cannot delete directly; they may *request* deletion of tasks **they created** (`pm_tasks.created_by = their auth uid`), and an admin must approve. See the Task Deletion Approval Module. **Credentials:** staff now see the Credentials tab but ONLY the credentials an admin has explicitly granted them (via `pm_credentials.allowed_staff`); they cannot add, manage access, or delete. See the Credentials Module section below. **Project staffing is admin-only** — staff see who's assigned but cannot add or remove people (it controls project visibility); see the Project Staffing Module.
- **Content Access:** Controlled per-staff via `can_access_content` boolean in `staff_members`
- Role resolved by: `user_roles` table first (owner/admin → admin role), then `staff_members.pm_role`
- **Critical:** Staff must NOT have rows in `user_roles`, or they will incorrectly receive admin role

### ⚠ Owner-Only Financial Data (permanent rule, stated 2026-08-14)

**Money data is the owner's alone — staff must never see it.** User's words: *"invoice and expenses is only for me. not for my staff to see."* This covers **invoices, quotations, payments, invoice templates/logs, expenses + receipts, and renewals/billing reminders**.

- **Hiding a page is NOT protection.** RLS decides who can read a row; a blanket `pm_allow_all` policy (`using (true)`) lets any signed-in staff member fetch the entire table with a hand-rolled PostgREST call no matter what the sidebar shows. Every invoice/renewal table was in exactly that state until 2026-08-14 ([scripts/restrict-financials-to-admin.sql](scripts/restrict-financials-to-admin.sql), applied live).
- **Do BOTH for any new money/confidential table:** (1) `adminOnly: true` in the sidebar + `<AdminOnly>` wrapper; (2) scoped RLS reusing `public.pm_is_admin()` — `for all using (public.pm_is_admin()) with check (public.pm_is_admin())`. Never `pm_allow_all`.
- **Prove it, don't assume.** In SQL: `set local role authenticated;` + `set local "request.jwt.claims" = '{"sub":"<uid>"}';` then count rows as an admin uid vs a staff uid. Expect admin = all, staff = 0, anon = 0 — and confirm a normal table (`pm_tasks`) still returns rows for staff so their actual work isn't broken.
- **Check server-side callers before locking a table.** Service-role clients (`/api/renewals/run`, `/api/push/send`, `/api/weekly-seo/run`) and SECURITY DEFINER functions (`pm_run_billing_reminders`) bypass RLS and are safe; a **SECURITY INVOKER** function that reads a locked table would break for non-admins. `next_invoice_number()`/`next_quote_number()` are SECURITY INVOKER but only ever called from admin-only pages, so they're fine.
- **Verified live 2026-08-14:** admin (leon@webby.sg, the ONLY admin — `user_roles` owner) sees 27 invoices / 14 payments / 2 renewals; staff sees **0** on every financial table while still seeing 272 tasks and 24 projects; anon sees 0; staff INSERT/UPDATE/DELETE attempts were refused with the data left intact.

### Staff Invite Lifecycle ([app/actions/invite.ts](app/actions/invite.ts))

1. **Invite** (`inviteStaff`): `inviteUserByEmail` creates the auth user immediately; a `staff_members` row is upserted with `status='invited'`, `user_id=NULL`. Any auto-created `user_roles` row is deleted (staff must never be in `user_roles`).
2. **Accept** (`linkStaffAccount`): on first sign-in, the auth callback ([app/auth/callback/page.tsx](app/auth/callback/page.tsx)) and the set-password page ([app/auth/set-password/page.tsx](app/auth/set-password/page.tsx)) both call this server action. It verifies the caller's access token server-side and sets `user_id = auth uid`, `status='active'` on the email-matched row. Idempotent. **Without this step the row stays `invited` with NULL `user_id` forever** — the member never appears in assignee dropdowns (they filter `status='active'`) and resolves to a nameless default profile. The callback has THREE paths that must all link + honor `type=invite`: PKCE (`?code=`), the SIGNED_IN subscription, AND the `getSession()` fallback (supabase-js can consume the URL hash before the subscription registers — this fallback once skipped linking and dumped invited users on /dashboard).
3. **Admin sets password** (`setStaffPassword`): Team page key-icon button (pending + active staff rows) → dialog → `admin.auth.admin.updateUserById(uid, { password, email_confirm: true })`, then links + activates the staff row. **This is the preferred onboarding flow**: the admin sets the password and hands it to the staff member; nobody clicks the email link.
4. **Revoke** (`revokeStaff`): reassigns the user's tasks and `assigned_staff` entries to a **live active admin** (owner preferred, the revoked user explicitly excluded — they may wrongly hold an owner row themselves); if no live admin target exists, tasks are unassigned (`assignee_id=NULL`) rather than left pointing at a dead UUID. Also deletes the user's `user_roles` rows, then the auth user, then the staff row.

**⚠️ Invite links sign you in as the invited user.** Supabase magic/invite links replace whatever session the browser holds — if the ADMIN opens one, they get logged out of their own account and signed in as the staff member, and the one-time link is consumed (June 2026: this stranded a passwordless half-onboarded account). Use the Set Password button instead. The invite-sent toast now warns about this.

**Server action auth:** `inviteStaff`, `revokeStaff`, `setStaffPassword` all require a `callerToken` (the caller's Supabase access token) and verify the caller is an admin via `verifyAdminCaller` (mirrors `pm_is_admin()`). Server actions are public HTTP endpoints — any new privileged action MUST do the same. `linkStaffAccount` needs no admin check (it only links the verified caller's own email-matched row).

### Admin Must Always Be Able To Edit

**Tasks:** title, status, priority, assignee, due date (must save to DB), description, tags, recurring, subtasks, delete, move to another project (top-level tasks only — subtasks travel with their parent; `moveTaskToProject` in `lib/store.ts`)

**Projects:** name, description, type, phase, due date, start date, client, channel, assigned staff (admin-only — from the project detail header OR the popup on each projects-list card; see the Project Staffing module), delete

**Everything else:** templates, credentials, channels, clients — full CRUD

### Supabase Tables

| Table | Key Columns |
|---|---|
| `staff_members` | `id`, `user_id` (auth UUID), `email`, `first_name`, `last_name`, `avatar_initials`, `pm_role`, `status`, `can_access_content` |
| `user_roles` | `user_id`, `role` (owner/admin = admin) |
| `pm_projects` | `id`, `name`, `description`, `type`, `phase`, `client_id`, `channel_id`, `start_date`, `due_date`, `assigned_staff` (uuid[]), `tier_id` (uuid FK → `pm_project_tiers`, ON DELETE SET NULL — which client package this project is on; NULL = unlabelled. See the Client Package (Tier Badge) Module), `archived_at` (admin project archive — loadAll filters IS NULL, hiding the project AND all its tasks; migration [scripts/project-archive.sql](scripts/project-archive.sql), applied live 2026-08-02) |
| `pm_tasks` | `id`, `project_id`, `parent_id`, `title`, `description`, `status` (CHECK: todo/in_progress/**to_be_discussed**/pending_review/**pending_client_approval**/**pending_article_post**/revision_required/done/**missed**/**rejected**), `priority`, `type`, `assignee_id`, `due_date`, `tags`, `recurring`, `recurring_day`, `sort_order`, `created_by` (auth uid, DB `DEFAULT auth.uid()` — who created the task; NULL for service-role/MCP inserts & pre-migration tasks), `deletion_requested_by` (auth uid; non-NULL ⇒ deletion awaiting admin approval), `deletion_requested_at`, `archived_at` (admin archive; loadAll filters IS NULL), `seo_week` (Monday date) + `seo_slot` (weekly SEO engine identity — see Weekly SEO Task Engine module), `requires_article_post` (bool — admin Approve parks the task in pending_article_post until a link is recorded; auto-true on weekly SEO article slots) + `article_url` (the live link recorded via Mark as Posted — see Article-Post Workflow module), `status_changed_at` (timestamptz, DEFAULT now(), maintained by BEFORE-UPDATE trigger `pm_tasks_set_status_changed_at` — when the task last changed status; lets the admin tell a NEW pending_review submission from an old one. Backfilled 2026-07-31 from `pm_task_activity` status rows, else created_at. Migration [scripts/task-status-changed-at.sql](scripts/task-status-changed-at.sql), applied live. UI: "since \<time\>" under the drawer Status cell, "Submitted for review \<time\>" above the admin Approve/Reject footer, "· submitted \<time\>" on tasks-page pending-review rows, purple "Submitted \<time\>" chip on kanban pending_review cards, tooltip on drawer subtask status pills. `statusPatch()` in [lib/store.ts](lib/store.ts) stamps it optimistically on every client status change — use it, not a bare `{ status }` patch), `seo_phase` (text — which phase of the standard SEO work set this task is: `setup`/`competitors`/`keyword-research`/`technical-seo`/`onpage-fixes`; NULL for ordinary tasks. Identity for the SEO Work tab — never match those tasks by title. Unique per (project, phase) via `pm_tasks_seo_phase_unique`. Migration [scripts/seo-setup-phase.sql](scripts/seo-setup-phase.sql), applied live 2026-08-19 — see the SEO Setup Phase Tasks module), `discussion_note` (text — the admin's parked-for-discussion note; nulled by BEFORE-UPDATE trigger `pm_tasks_clear_discussion_note` whenever status leaves to_be_discussed — see the `to_be_discussed` module), `is_article` (bool NOT NULL DEFAULT false — identity for the Articles sheet. Set by the weekly SEO generator on its article slots, by "+ Add article", and by hand from the Article column on a project's Sheet tab. **Never infer an article from its title.** Partial index `pm_tasks_is_article_idx (project_id) where is_article`. Deliberately NOT tracked by `pm_log_task_activity` — bulk-marking 100 tasks must not flood the History page (verified live). Migration [scripts/task-is-article.sql](scripts/task-is-article.sql), applied live 2026-08-25 — see the Task Sheet & Articles module) |

| `pm_project_tiers` | `id`, `name` (unique on `lower(name)`), `level` (integer — the rung on the tier ladder: 1 = first tier, 2 = second…; **NULL = a named package that is not a numbered tier**. CHECK `level is null or level >= 1`; deliberately NOT unique — see the Tier Level section), `short_label`, `icon` (a key from `TIER_ICON_KEYS` in [lib/project-tiers.ts](lib/project-tiers.ts)), `color`, `scope` (free text, one item per line — the quotas staff read off the badge), `sort_order`, `created_at`, `updated_at` (BEFORE-UPDATE trigger `pm_project_tiers_touch`). The client packages behind the tier badge. **RLS is NOT `pm_allow_all`:** SELECT = `auth.role() = 'authenticated'`, all writes = `pm_is_admin()`. Migrations [scripts/project-tiers.sql](scripts/project-tiers.sql) (applied live 2026-09-01) then [scripts/project-tier-levels.sql](scripts/project-tier-levels.sql) (applied live 2026-09-02) — see the Client Package (Tier Badge) Module. |
| `pm_weekly_seo_plans` | `id`, `project_id` (unique FK → `pm_projects`, CASCADE), `enabled`, `assignee_id`, `include_articles`, `include_backlinks`, `include_gmb`, `created_at`. Which projects get the weekly SEO task set. RLS `pm_allow_all`. |
| ~~`pm_seo_checklist_items`~~ | ⚠ **DROPPED from the live DB 2026-08-19** — the tick-list was replaced by the SEO Setup phase TASKS (see that module). It held 52 seeded rows across 2 projects, all `done=false` with no notes; the rows were dumped to the session transcript before the drop. Applied via [scripts/drop-seo-checklist.sql           — Dropped the deprecated pm_seo_checklist_items table. APPLIED live 2026-08-19.
scripts/backfill-seo-setup-tasks.mjs     — Brings every live SEO project in line with lib/seo-setup.ts: creates missing phases, renumbers old seeded titles, refreshes an untouched parent prompt, fixes sort_order. Idempotent, dry run by default. RUN live 2026-08-19 (56 tasks / 14 projects) and 2026-08-31 (competitors phase / 15 projects).
lib/weekly-seo.ts                        — Weekly SEO calendar/naming rules (month-of-Friday, week number, which article days a week produces). Dependency-free: shared by the generator route AND the admin UI so they can't drift.
app/api/weekly-seo/run/route.ts          — Node route: the generator (cron secret OR admin token; ?dry=1, ?projectId=)
components/weekly-seo-panel.tsx          — Reusable enrol/pause/assignee/includes/preview/Generate-now panel
app/(app)/weekly-seo/page.tsx            — Admin overview of every project in the weekly loop (adminOnly)
scripts/weekly-seo-cron.sh               — VPS cron line that POSTs /api/weekly-seo/run daily (17:00 UTC = 01:00 SGT)

lib/task-sheet.ts                        — Articles/Sheet pure module: article identity, week filing, sorting, summary, CSV. Dependency-free; shared by both surfaces so they can't drift.
components/task-sheet.tsx                — THE grid. Project "Sheet" tab (all tasks, editable) AND /articles (articlesOnly + showClient).
components/add-article-dialog.tsx        — Creates a task pre-flagged is_article + requires_article_post.
app/(app)/articles/page.tsx              — Cross-client articles overview with per-client outstanding chips.
scripts/task-is-article.sql              — Adds pm_tasks.is_article + partial index. APPLIED live 2026-08-25.
scripts/backfill-article-flag.mjs        — OPTIONAL tiered backfill of is_article. Offered 2026-08-25, DECLINED, NEVER RUN. Dry run by default.

lib/project-tiers.ts                     — Client package (tier badge) pure module: ProjectTier shape (incl. `level`), icon/colour vocabularies, tierInitial/scopeLines/sortTiers/findTier + the tier-ladder helpers tierLevelLabel/tierFullLabel/nextTierLevel/tiersAtLevel. Dependency-free.
components/tier-badge.tsx                — TierBadge (level chip + icon + portalled scope tooltip), TierLevelMark (the 1/2/3 chip), TierIconGlyph, TierInitial.
components/tier-picker.tsx               — Admin popup to label a project with a package. Portalled; swallows the click on a project card.
app/(app)/settings/packages/page.tsx     — Admin editor for the package list (name, short label, icon, colour, scope). AdminOnly.
scripts/project-tiers.sql                — Adds pm_project_tiers + pm_projects.tier_id, admin-write RLS, seeds SEO Starter + Growth SEO. APPLIED live 2026-09-01.
scripts/project-tier-levels.sql          — Adds pm_project_tiers.level (the 1/2/3 ladder) + a >=1 CHECK, backfills level from sort_order+1. APPLIED live 2026-09-02. Run AFTER project-tiers.sql on a fresh project.
scripts/enable-rls-seo-os-tables.sql — Enables RLS (+ owner policies) on the 12 leftover Webby SEO OS tables and sets security_invoker on ai_usage_monthly_summary. APPLIED live 2026-09-02.
```


### ⚠ The Dead Webby SEO OS Schema — REMOVED 2026-09-02

**Historical note. The live pm-tool project (`tfhzuruaaymfhqmeiusr`) used to carry a complete second application's schema** — ~140 Webby SEO OS tables (`clients`, `keywords`, `seo_articles`, `ads_*`, `ai_*`, `article_*`, `audit_*`, `gsc_*`, plus `tasks`/`templates`/`profiles`/`notifications` shadowing the `pm_`-prefixed ones). It was residue from that app moving to the **Omnipulse** project (`wmulemkyjrjetwyzrsqq`): last write **May 2026** while `pm_tasks` is written daily, and all 9 `clients` rows were orphans pointing at auth users that don't exist here. **Dropped on the owner's instruction 2026-09-02** ([scripts/drop-seo-os-schema.sql](scripts/drop-seo-os-schema.sql)) — 140 tables, 24,074 rows, 16 MB. `public` now holds **38 tables: the 36 `pm_*` plus `staff_members` and `user_roles`**.

- **⚠ `staff_members` and `user_roles` carry NO `pm_` prefix but are core pm-tool tables.** A "drop everything not `pm_*`" sweep would destroy the app's auth and role model. Establish the boundary by grepping every `.from("...")` in the codebase, never by eyeballing prefixes — that check is what caught this.
- **`pm_articles` (0 rows) is a separate unused pm-tool table and was NOT dropped**; the real article record is `pm_tasks` (see the Task Sheet & Articles module).
- **Before it was dropped it was a genuine hole, now closed twice over.** RLS was DISABLED on 12 of those tables until 2026-09-02 ([scripts/enable-rls-seo-os-tables.sql](scripts/enable-rls-seo-os-tables.sql)) — and an RLS-disabled table in `public` is fully exposed to `anon`/`authenticated`, with **the anon key shipping in the client bundle**. 1561 `ai_usage_logs` rows, 62 `quality_rules`, 39 `prompt_learnings`, 20 `article_idea_suggestions`, 12 `ai_agent_insights` and 3 `meta_audit_reports` were world-readable *and writable* by anyone holding that public key.
- **`ai_usage_monthly_summary` was a SECURITY DEFINER view** and read `ai_usage_logs` straight through RLS. Postgres views run as their owner unless `security_invoker = true`. **If you ever add a view over a protected table, set `security_invoker = on` or it becomes an RLS bypass.** (The view went with the drop.)
- **A full JSON export was taken and validated first** — 24,074 rows parsed back out of the files, matching the database exactly — at `C:/Users/Admin/OneDrive/Desktop/seo-os-backup-2026-09-02/`. **DDL was deliberately not exported**: the same schema is still live in Omnipulse, so only the data here was unique. A first backup attempt silently capped every large table at 1000 rows (shell pagination bug) — **always count the restored rows back; "no errors" is not proof of a complete backup.**
- **Left behind on purpose:** 13 unattached/orphaned functions (`migrate_lead_*`, `notify_orchestrator`, `trigger_google_ads_daily_sync`, `handle_new_user`, `assign_default_role`, `has_role`, `set_performance_check_on_publish`, `pm_seo_checklist_touch`, `update_updated_at`). All had `EXECUTE` revoked from `public`/`anon`/`authenticated`, so none is reachable with the anon key. Drop them for a clean sweep whenever.

### Database Function Privileges & `search_path` (2026-09-02)

The advisor's WARN tier, closed by [scripts/harden-function-privileges.sql](scripts/harden-function-privileges.sql) (applied live). Two of these were **not** cosmetic — they were anon-callable `SECURITY DEFINER` functions with real side effects:

- **`migrate_lead_*` (5 functions)** — anon-callable, feeding caller-supplied `jsonb` into `lead_generator.*` via `jsonb_populate_recordset`. **Correction (found later, while auditing schemas for the drop): the `lead_generator` schema does not exist in this project**, so these would have raised "schema does not exist" rather than actually writing. Still revoked — an anon-callable SECURITY DEFINER writer is the wrong shape to leave lying around — but the practical exposure was lower than first recorded.
- **`trigger_google_ads_daily_sync`** — anon-callable, fires `net.http_post` at an external Supabase project's Edge Function.
- **`pm_run_billing_reminders`** — anon-callable; inserts `pm_notifications` rows and stamps `last_notified_on`. Only pg_cron (as `postgres`) should run it, and it is never called from app code.

- **⚠ Revoke from `public`, not just `anon`/`authenticated`.** Postgres grants `EXECUTE` to `PUBLIC` by default on every new function, so revoking the two named roles alone is a **no-op**. `service_role` is granted back explicitly (server-only secret) so server-side callers keep working.
- **⚠ `pm_is_admin()` is DELIBERATELY EXEMPT — do not "fix" the two advisor warnings that remain about it.** 16 RLS policies on the financial and credentials tables call it, and every one applies to role `public` (which includes `anon`), so the **querying** role needs `EXECUTE` to evaluate them. Revoking would turn a clean "0 rows" into `permission denied for function pm_is_admin`. It leaks nothing — SECURITY DEFINER returning a boolean about the *caller*; anon gets `false`.
- **Revoking `EXECUTE` does NOT stop triggers firing** — Postgres checks that privilege at `CREATE TRIGGER` time, not at fire time. Proven with a throwaway table+trigger in a rolled-back probe first, then against real data: as role `authenticated`, a `pm_tasks` status update still moved `status_changed_at` and still wrote a `pm_task_activity` row. So the 7 trigger functions were safe to close.
- **`search_path` pinned to `public, pg_temp`** on the 22 functions that had none (`pg_temp` LAST, per the Postgres docs, so a temp object can't shadow a real one). Not `''` — several bodies reference public tables unqualified (`pm_projects`, `pm_billing_reminders`, `google_ads_connections`) while every cross-schema reference is already qualified (`lead_generator.*`, `net.http_post`). **Any new function should be created with `set search_path` from the start.**
- **Verified live 2026-09-02** with the real anon key: the dangerous RPCs now return `401 permission denied` / `404` from PostgREST, while `pm_is_admin` still returns `false` and `pm_invoices` still returns a clean `[]` (not an error). Advisor: **13 ERROR + ~40 WARN → 3 WARN**, the survivors being the two intentional `pm_is_admin` entries and Auth's leaked-password toggle.
- **Still open (needs the Supabase dashboard, not SQL): leaked-password protection is DISABLED** — Authentication → Providers → Password → enable "Check against HaveIBeenPwned". Worth turning on given staff passwords are set by the admin.

### Task Activity & Comment History Module

Gives the admin a tamper-evident record of what staff (and everyone) do to tasks, and preserves prior versions of edited comments. **Migration:** [scripts/task-activity-and-comment-history.sql](scripts/task-activity-and-comment-history.sql) — idempotent; **must be applied to the LIVE project (`tfhzuruaaymfhqmeiusr`)**. It was applied via the `mcp__supabase__*` MCP on 2026-07-21 after verifying `get_project_url` returned `tfhzuruaaymfhqmeiusr` (re-run the .sql if a fresh project is ever spun up).

- **DB-trigger based, not app-level.** Logging is done by Postgres triggers using `auth.uid()` — so EVERY edit path (task drawer, kanban drag, tasks page, schedule, subtasks, `moveTaskToProject`, future code) is captured without threading a user through the ~15 store mutation fns. The store has no current-user context, which is exactly why triggers were chosen.
  - `pm_log_task_activity()` (AFTER INSERT/UPDATE/DELETE on `pm_tasks`, SECURITY DEFINER): on UPDATE it diffs the tracked columns (title, status, priority, assignee, due_date, type, recurring, tags, project_id→`moved`) and writes **one `pm_task_activity` row per changed field**. `description` changes are logged as field=`description` with NO old/new (the HTML blob is too large). **`sort_order`/`updated_at`-only updates log nothing** (so reordering never spams the log).
  - `pm_snapshot_comment_version()` (BEFORE UPDATE on `pm_task_comments`, SECURITY DEFINER): when `body` changes, archives the OLD body into `pm_task_comment_versions`.
- **Everyone is logged** (admin edits too) — a complete audit trail; filter by actor to isolate staff. Actor is `auth.uid()`; resolve to a name via active `staff_members` (`user_id ?? id`). When a service-role/MCP call makes the change, `actor_id` is NULL (renders "System").
- **Where the admin reviews it:** (1) an admin-only collapsible **ACTIVITY** section at the bottom of the [task drawer](components/task-drawer.tsx) (`dbListTaskActivity`), and (2) a global **Activity Log** page [app/(app)/activity/page.tsx](app/(app)/activity/page.tsx) (sidebar entry `History`, `adminOnly`) via `dbListRecentActivity(300)`, grouped by day with an actor filter and deep-links to the task drawer.
- **Comment history:** an edited comment's "· edited" marker is a clickable disclosure (admin **+ the author**, per RLS) that lazy-loads `dbListCommentVersions(commentId)` and lists Original / Revision N / Current with timestamps. `handleSaveCommentEdit` refreshes the open history after saving.
- **DB helpers** (in [lib/db.ts](lib/db.ts)): `dbListTaskActivity(taskId)`, `dbListRecentActivity(limit=200)`, `dbListCommentVersions(commentId)` + types `TaskActivity` / `CommentVersion`. There is intentionally **no** `dbAdd*Activity`/`dbAddCommentVersion` — the triggers are the only writers, so clients can't forge or tamper with log rows.
- **RLS reuses `pm_is_admin()`** (see Credentials Module). Activity = admin-only read; comment versions = `pm_is_admin() OR edited_by = auth.uid()`.
- **`pm_task_comments` RLS is per-command, NOT `pm_allow_all`:** SELECT = any authenticated; INSERT = `auth.uid() = author_id`; DELETE = author or admin; UPDATE = `pm_task_comments_update_own` (`auth.uid() = author_id`, USING + WITH CHECK). **The UPDATE policy was MISSING until 2026-07-22** — RLS is default-deny, so every in-place comment edit matched 0 rows and the drawer showed "Failed to save changes" (the edit feature shipped 2026-07-21 without it). Applied to live via MCP migration `task_comments_update_policy`; also folded into [scripts/task-activity-and-comment-history.sql](scripts/task-activity-and-comment-history.sql).

### Task Deletion Approval Module

Staff can no longer delete tasks directly. A staff member may **request deletion of a task they created**, and an admin must approve before the row is removed. Admins still delete instantly (unchanged trash button).

- **Creator tracking:** `pm_tasks.created_by uuid DEFAULT auth.uid()` — auto-stamped by Postgres on every insert (PostgREST runs in the caller's auth context), so all creation paths (task drawer subtasks, tasks page, project seed, templates) record the creator **without threading a user through the store**. `rowToTask` maps it to `Task.createdBy`; `addTask`/`addSubtask` also stamp it optimistically via `supabase.auth.getSession()`. NULL for service-role/MCP inserts and pre-migration tasks (those can never be staff-deletion-requested).
- **Pending state:** `deletion_requested_by` (auth uid) + `deletion_requested_at` on `pm_tasks`. Non-NULL `deletion_requested_by` ⇒ a deletion is awaiting admin approval. These are NOT tracked by the `pm_log_task_activity` trigger (no audit-log spam on request/clear).
- **Store actions** ([lib/store.ts](lib/store.ts)): `requestTaskDeletion` (staff — sets the pending columns + fires a `deletion_request` notification), `approveTaskDeletion` (admin — clears the notification, hard-deletes via `deleteTask`, notifies the requester), `rejectTaskDeletion` (admin — clears the pending columns + notification, notifies the requester). `clearTaskDeletionRequests` is a dedicated helper (kept separate from `clearTaskApprovalRequests` so a plain status change never cancels a pending deletion).
- **UI** ([components/task-drawer.tsx](components/task-drawer.tsx)): the header shows a **Request deletion** trash button (two-click confirm) only for `!isAdmin && isCreator && !deletionPending`, and a **"Deletion requested"** badge while pending. The footer shows an admin **Approve deletion / Reject** block when `isAdmin && deletionPending`. Gated to top-level tasks (`isTop`), like the admin delete.
- **Notifications — new `deletion_request` type** (distinct from `approval_request` so it never triggers the notifications-page "Approve Completion" button, which is bound to `approval_request`). Wired into every admin surface: bell counts ([components/topbar.tsx](components/topbar.tsx), [components/sidebar.tsx](components/sidebar.tsx)), the Slack-style popup + `typeConfig` ([components/notification-toast-container.tsx](components/notification-toast-container.tsx)), and the notifications page filter/`typeConfig`/no-auto-mark-read ([app/(app)/notifications/page.tsx](app/(app)/notifications/page.tsx)). The notification links to `/projects/<pid>?task=<tid>` — clicking opens the drawer where the admin approves/rejects. Like `approval_request`, it's workspace-global (`user_id` NULL) so the push route does **not** OS-push it.
- **Enforcement is app-level.** `pm_tasks` uses a blanket `pm_allow_all` RLS policy (same as the existing "Submit for Review" flow), so the request-and-approve gate is enforced in the UI/store, not the DB. A determined staffer could still delete via the raw API — matching the app's existing trust model. Tighten with RLS + `pm_is_admin()` if that ever matters.
- **Migration:** [scripts/task-deletion-requests.sql](scripts/task-deletion-requests.sql) — idempotent (`add column if not exists` + `notify pgrst`). **Applied to the LIVE project (`tfhzuruaaymfhqmeiusr`) on 2026-07-22** via the `mcp__supabase__*` MCP after verifying `get_project_url` returned `tfhzuruaaymfhqmeiusr` and an identity check (108 tasks / 21 projects present). Re-run it if a fresh project is ever spun up.

### Credentials Module

- **Shared with per-staff access.** Admins have full CRUD and manage who can see each credential. Staff see the **Credentials tab** but only the credentials granted to them.
- **Access model:** each `pm_credentials` row has `allowed_staff` (`text[]`) holding the auth UUIDs (`staffAuthId = user_id ?? id`) of staff allowed to view it. Empty array = admin-only.
- **DB-level enforcement (RLS) — not just UI.** `pm_credentials` was changed from a blanket `pm_allow_all` policy to scoped policies so staff browsers never even download credentials they aren't granted:
  - `pm_credentials_select`: `pm_is_admin() OR auth.uid()::text = ANY(allowed_staff)`
  - `pm_credentials_insert/update/delete`: `pm_is_admin()` only
  - Helper `public.pm_is_admin()` is `SECURITY DEFINER STABLE`, mirrors [lib/auth-context.tsx](lib/auth-context.tsx) role resolution: admin if a `user_roles` row is owner/admin **OR** `staff_members.pm_role = 'admin'`. Migration: `restrict_pm_credentials_to_admin_and_allowed_staff`. **If you add another sensitive table, reuse `pm_is_admin()`.**
- **UI:** [app/(app)/credentials/page.tsx](app/(app)/credentials/page.tsx) is NOT wrapped in `<AdminOnly>` anymore — it renders for everyone but passes `isAdmin` down. Add Credential button, the per-row **Manage** access menu, the access avatars, the per-row **Edit** (pencil) button, and the **delete** button are all admin-only. Staff also get a client-side `allowedStaff.includes(user.id)` filter as a safeguard against stale persisted store data. `app/(app)/credentials/new/page.tsx` IS wrapped in `<AdminOnly>` (blocks staff reaching the add form by URL).
- **Editing details (admin):** the per-row **pencil** button opens an in-page **Edit Credential** modal to change client, label, **URL/link**, username, password, and notes. Flow: `store.updateCredential(id, data)` → `dbUpdateCredential` (now accepts `Partial<Omit<Credential,"id">>`, mapping `client→client_name`, `url`, `username`, `password`, `notes`, `label`, `allowedStaff→allowed_staff`; throws on error). Access-management still goes through the same `dbUpdateCredential` via `updateCredentialAccess({ allowedStaff })`. DB-level `pm_credentials_update` RLS = `pm_is_admin()` only, so the admin-only button is backed by DB enforcement (no migration needed).
- **Manage menu gotcha:** the access dropdown uses `position: fixed` anchored to the Manage button via `getBoundingClientRect()`. It must NOT be `absolute` — the credential rows live inside a `rounded-xl overflow-hidden` card, which clips an absolutely-positioned dropdown (it was rendering cut off below the card and was unclickable). Any future in-row popover here has the same constraint.

### Invoice Module

- **Admin-only, enforced in the DATABASE (hardened 2026-08-14).** Sidebar entry hidden for staff; pages wrapped in `<AdminOnly>`; **and** `pm_invoices`, `pm_invoice_line_items`, `pm_invoice_payments`, `pm_invoice_templates`, `pm_invoice_template_line_items`, `pm_invoice_logs` now carry `<table>_admin_all` policies (`using (public.pm_is_admin()) with check (public.pm_is_admin())`) instead of the blanket `pm_allow_all`. **Until 2026-08-14 every one of these tables was `using (true)`** — the pages were a curtain, not a lock, and any signed-in staff member could have fetched all invoices, quotes and payment amounts with a hand-rolled PostgREST call. See the Owner-Only Financial Data rule.
- **Earnings tracking (per payment).** The invoice list page ([app/(app)/invoices/page.tsx](app/(app)/invoices/page.tsx)) shows earnings derived **client-side** from the already-loaded invoices — no DB/RPC. Earnings are recognised on a **cash basis, one event per `pm_invoice_payments` row** (so a partially-paid invoice contributes several earnings across different months) via the `invoiceEarnings()` helper. Legacy fallback: a `status='paid'` invoice with **no** payment rows counts once at `paid_at` (or `issue_date`). **This path is live, not theoretical — 5 invoices marked paid before the ledger existed still hold zero payment rows** (WSG-2026-06-16-2, -06-22, -06-23, -07-05, -07-11), so the earlier claim that the migration backfilled a payment for every paid invoice is WRONG. Treat "paid with an empty ledger" as a state every surface must handle. Summary cards: **Outstanding** (= sum of **balance due** across sent/overdue/partial, NOT `total`), **Paid in <current month>**, **Paid in <current year>**. Below them a **Monthly earnings** bar chart for a selectable year. SGD-only. To add a true reports page later, lift the `earnings`/`monthly` memos out of the page.
- **Numbering:** `WSG-YYYY-MM-DD` format (e.g. `WSG-2026-05-18`), generated by `next_invoice_number()` Postgres RPC. Same-day duplicates get an auto-suffix `-2`, `-3`, etc. No counter table — uniqueness checked against `pm_invoices.invoice_number` directly.
- **Status:** stored as `draft|sent|paid|void` (CHECK-constrained — `partial`/`overdue` can NOT be stored). `overdue` and `partial` are *computed* statuses (`computeDerivedStatus` in `lib/invoice-types.ts`) — never stored. `overdue` = `status='sent' AND due_date < today`; `partial` = `status='sent' AND 0 < amountPaid < total`. **`partial` takes priority over `overdue`** in the badge.
- **Partial payments (`pm_invoice_payments`).** Each recorded payment is a row in the ledger; the sum is `amountPaid`, and `balanceDue = total − amountPaid` (clamped ≥0). Helpers `computeAmountPaid` / `computeBalanceDue` in [lib/invoice-types.ts](lib/invoice-types.ts) are the single source of truth, used by the list, detail page and PDF. DB layer ([lib/invoice-db.ts](lib/invoice-db.ts)): `addInvoicePayment` / `deleteInvoicePayment`, plus internal `syncInvoicePaidStatus(id)` which reconciles the stored `status`/`paid_*` after every payment change — when the balance hits 0 it flips `status='paid'` and copies the latest payment's date/reference/recorder into `paid_at`/`paid_note`/`paid_by`; otherwise it reverts to `sent` (or `draft`) and clears `paid_*`. `markInvoicePaid` now just records a payment for the **remaining balance** (one-click full pay); `markInvoiceUnpaid` deletes **all** payment rows and reverts. Detail page ([app/(app)/invoices/[id]/page.tsx](app/(app)/invoices/[id]/page.tsx)) has a **Payments** card (Total / Amount paid / Balance due + per-payment list with delete) and a **Record payment** dialog (amount defaulting to the balance, date, reference). Log events `payment_recorded` / `payment_removed` were added to the `pm_invoice_logs_event_check` whitelist. **No partial-payment status is stored — always recompute from the ledger.**
- **Changing an invoice's TOTAL re-runs the paid reconcile** (`updateInvoice` → `syncInvoicePaidStatus`, added 2026-08-31). Balance = total − paid, so editing the amount moves the balance exactly as recording a payment does; without this, adding a line item to a paid invoice left `status='paid'` while real money was outstanding. `updateInvoice` snapshots `status`/`total`/`paid_at` + the payment count **before** overwriting the total (once written, what was owed is unrecoverable) and reconciles only when the total actually changed — reconciling an unchanged legacy paid row would wipe its `paid_at`.
- **A legacy paid row is materialised, never silently un-paid.** When the total of a `status='paid'` invoice with an EMPTY ledger changes, `updateInvoice` first inserts a real payment for the **pre-edit total**, dated its existing `paid_at` (reference "Recorded before payment tracking"), then reconciles — so money already received survives as a ledger entry and only the difference becomes outstanding. `markInvoicePaid` follows the same rule: on a legacy paid row it dates the materialised payment at the existing `paid_at`, **not today**, because today's date would move that earning into the current month on the earnings chart.
- **Payment buttons follow the BALANCE, not the stored status.** They were gated on `status === 'sent'`, so an invoice reading PAID with a real balance due offered **no way to record a payment** — the only escape was "Mark unpaid", which deletes the entire ledger. Now *Record payment* shows whenever `status !== 'draft' && balanceDue > 0`, and *Mark unpaid* whenever there is anything to clear (`status === 'paid' || payments.length > 0`). **Never gate a money action on the stored status** — it is a cached conclusion; the ledger and the total are the facts.
- **Linked to a PROJECT, not a client.** The Clients management page was removed and `pm_clients` is empty, so invoices link to a **project** (`project_id`) instead. New/edit invoice pages show a Project dropdown (from the Zustand `projects` store); picking one prefills `bill_to_name` with the project name (blank-only, editable). The list/detail pages show the linked project name. `client_id` and the `loadClientBilling`/`updateClientBilling` helpers are retained but unused — do not wire new UI to them unless the Clients page is reinstated.
- **Bill-to is a snapshot.** `bill_to_*` fields are stored on the invoice row and are the source of truth for display/PDF. The project link is for organisation/reference only — changing or deleting the project does NOT alter historical bill-to data (project delete just nulls `project_id`).
- **Line totals:** `pm_invoice_line_items.line_total` is a generated column (`qty * unit_price stored`). Don't insert it manually.
- **Currency:** SGD-only for now. UI shows `S$` prefix.
- **Discount:** optional per-invoice discount. `discount_type` = `none` | `percent` | `fixed`; `discount_value` holds the % (e.g. `10` → 10%) or a flat amount. `total = subtotal − discountAmount`, clamped so it never goes negative. **All money math goes through `computeInvoiceTotals()` in [lib/invoice-types.ts](lib/invoice-types.ts)** — the DB layer, `LineItemsEditor`, the detail page, and the PDF all call it so they can't drift. Stored `subtotal`/`total` are recomputed on every create/update (`updateInvoice` reads back missing fields so a discount-only edit still recalculates). Discount lives at the **invoice** level, not on templates.
- **Editable Total (reverse discount):** in `LineItemsEditor` the **Total** field is an editable number input. Typing a total back-calculates the discount as a **fixed** amount (`discount_value = subtotal − enteredTotal`, clamped to `[0, subtotal]`; `≤0` → `discount_type='none'`). It's just another way to drive the same `discountType`/`discountValue` props, so it stays in sync with the discount row and `computeInvoiceTotals`.
- **No tax.** Subtotal = total **before discount**; total = subtotal − discount. If GST is added later, add a `tax_rate` and `tax_total` column (apply tax after discount).
- **Phase 1 (Done):** CRUD, templates, duplicate, mark sent, record (partial) payments, activity log. "Mark as sent" only flips status — no actual email.
- **Phase 2 (Done):** React-PDF branded template. Client-side generation via `@react-pdf/renderer`. Preview opens blob in new tab; Download triggers `<filename>.pdf` download. Component is `<InvoiceDocument>` in `components/invoice-pdf.tsx`. Must be dynamically imported with `{ ssr: false }` because @react-pdf/renderer is not SSR-safe.
- **Phase 3 (TODO):** Edge Function `send-invoice-email` using Gmail/Workspace SMTP + Nodemailer. Will need to render the PDF server-side (call `pdf(<InvoiceDocument …/>).toBuffer()`) and upload to `pm-invoices` bucket before attaching to the email. Requires Google app password in Edge Function secrets.
- **Phase 4 (TODO):** `pg_cron` daily job that reads `pm_invoices.reminder_cadence_days` per-invoice and triggers reminder emails until paid.
- **Storage bucket:** `pm-invoices` (private). Will hold generated PDFs once Phase 3 starts attaching to emails.
- **Logo asset:** `public/webby-sg-logo.png` — path is hardcoded in `lib/invoice-business-details.ts → logoPath`. Drop the WebbySG logo there as a PNG (transparent background, ~600px). If the file is missing, React-PDF will throw at generation time — there's no fallback in the current code.
- **Business details:** Webby SG / UEN 202444139M / 60 Paya Lebar Road #07-54 Paya Lebar Square / Singapore 409051 / Contact 8080 5608 (Leon). Edit `lib/invoice-business-details.ts` to change.
- **Seeded templates:** "Monthly SEO Project" (SEO Starter $2400 + Google Ads $300/mo) and "Premium Website Development" ($899 one-time). Live in `pm_invoice_templates`.

#### Quotes (quotations) — same table, `doc_type='quote'`

- **A quote IS a `pm_invoices` row** with `doc_type='quote'`. It reuses everything — line items, discounts, the PDF, templates, the editor — so there is no separate quotes table/page. **The [scripts/quotes-schema.sql](scripts/quotes-schema.sql) migration was APPLIED to the LIVE project (`tfhzuruaaymfhqmeiusr`) on 2026-07-15** (`doc_type` + conversion-link columns, doc_type-aware status CHECK, widened log-event whitelist, `next_quote_number()` RPC). **Before it was applied, ALL invoice/quote creation failed** — because `createInvoice` unconditionally inserts `doc_type`/`converted_from_quote_id`, the missing `doc_type` column returned a raw PostgREST error (`42703`) that the UI rendered as `[object Object]`. If you spin up a fresh Supabase project for pm-tool, re-run this migration there.
- **Numbering:** quotes get `WSGQ-YYYY-MM-DD` (same-day dupes → `-2`, `-3`) via the `next_quote_number()` RPC (mirrors `next_invoice_number()`, Asia/Singapore date). Distinct `WSGQ-` prefix means quote and invoice numbers never collide even in one table.
- **Quote lifecycle (stored `status`):** `draft → sent → accepted / declined / expired`. **Derived** display statuses (never stored): `converted` (has a linked invoice) and `expired` (sent + past its "valid until" date). All computed by `computeDerivedStatus` in [lib/invoice-types.ts](lib/invoice-types.ts), which branches on `docType`. Quotes have **no** payments / overdue / partial.
- **Switch type IN PLACE (`setInvoiceDocType`, 2026-08-11) — distinct from Convert.** A document raised as the wrong type can be flipped between invoice and quotation on the same row, keeping its line items, discount, bill-to, project, notes, PDF and activity log. **Use this when the document was simply the wrong type; use Convert when an accepted quote should spawn a real invoice and the quote must survive as a record.**
  - **The gate is money, not status: `docTypeSwitchBlocker()` in [lib/invoice-types.ts](lib/invoice-types.ts)** returns a reason string (or null) and is shared by the DB layer and the UI, so the button state and the write can never disagree. Locked when (a) **any `pm_invoice_payments` row exists** — a quotation cannot hold payments, and this also covers partially-paid invoices; (b) `status='paid'` — belt-and-braces for legacy paid rows with no payment ledger (5 exist live); (c) a quote that already has `converted_to_invoice_id` (switching it would duplicate the invoice it produced). **The lock is reversible** — deleting the payments (or Mark unpaid) makes the document switchable again.
  - **The number is ALWAYS reissued** via `next_invoice_number()` / `next_quote_number()`, because the `WSG-` / `WSGQ-` prefix is the only thing distinguishing the two in a shared table. The old number is released back into the pool (switching away and back returns the same number the same day) and both numbers are written into the activity log.
  - **`doc_type` and `status` MUST be updated in the same statement** — `pm_invoices_status_check` is doc_type-aware, so setting either alone violates it (verified live: `doc_type='quote'` + `status='paid'` raises `check_violation`). `statusForDocType()` keeps `draft`/`sent` (they exist in both lifecycles) and resets everything else to `draft`; a reset to draft also clears `sent_at`/`sent_to_email` since the reissued document has not been sent under its new number. `paid_*` are cleared defensively.
  - **Conversion links are dropped on BOTH sides** — an in-place change dissolves any quote→invoice pairing, so this row's `converted_to/from` are nulled and, if a quote pointed at this row as its produced invoice, that quote's `converted_to_invoice_id` is cleared too (guarded by `.eq("converted_to_invoice_id", id)`) so it becomes convertible again.
  - **No migration was needed.** The log event reuses the existing `updated` value (the `pm_invoice_logs_event_check` whitelist has no type-change entry) with a detail line naming both numbers and any status change. Adding a dedicated `type_changed` event would require widening that CHECK on the live DB.
  - **UI:** an `Invoice | Quotation` segmented toggle at the head of the detail page's action bar, plus a "Type locked" chip carrying the blocker reason as its tooltip. Clicking the inactive side opens a confirm dialog spelling out the renumbering, any status reset and any link removal. Everything downstream keys off `docType` at render time (list tabs + counts, earnings — invoice-only, "Due date" vs "Valid until", the PDF's QUOTATION wording and watermarks), so nothing else needed changing.
- **Convert → invoice (`convertQuoteToInvoice` in [lib/invoice-db.ts](lib/invoice-db.ts)):** creates a **brand-new draft invoice** (fresh `WSG-` number) copying line items, bill-to, discount, project, notes; sets the new invoice's `converted_from_quote_id`; marks the quote `status='accepted'` + `converted_to_invoice_id`. **The quote is preserved** (audit trail). Idempotent — re-converting returns the already-linked invoice id. The two rows cross-link (banner on each detail page). Deleting the invoice nulls the quote's link (ON DELETE SET NULL) so it becomes convertible again.
- **UI:** the invoice list ([app/(app)/invoices/page.tsx](app/(app)/invoices/page.tsx)) has an **Invoices / Quotes toggle**; each tab has its own status filter pills. **Financial summary + earnings chart are invoice-only** (quotes never count toward Outstanding/Paid). The New page ([app/(app)/invoices/new/page.tsx](app/(app)/invoices/new/page.tsx)) has an **Invoice / Quote** toggle (also reachable via `?type=quote`); "Due date" reads "Valid until" for quotes; Recent-source list is filtered to the same doc type (duplicating a quote makes a quote). The detail page ([app/(app)/invoices/[id]/page.tsx](app/(app)/invoices/[id]/page.tsx)) swaps the payment actions for **Mark accepted / Mark declined / Convert to invoice** (+ a convert dialog and a linked-doc banner); the Payments card is hidden for quotes.
- **PDF:** the same `<InvoiceDocument>` renders **"QUOTATION"** (title, running header, "QUOTATION DETAILS", "VALID UNTIL", "TOTAL" not "TOTAL DUE") and quote watermarks (ACCEPTED/DECLINED/EXPIRED/CONVERTED) when `docType==='quote'`.
- **DB helpers:** `nextQuoteNumber`, `setQuoteStatus`, `convertQuoteToInvoice`; log events `converted`/`accepted`/`declined` added to the `pm_invoice_logs` event whitelist.

### Renewals & Payment Reminders Module

- **Admin-only, enforced in the DATABASE (hardened 2026-08-14).** Sidebar entry "Renewals" (`CalendarClock`), page wrapped in `<AdminOnly>`, route `/renewals`, **and** `pm_billing_reminders` now uses `pm_billing_reminders_admin_all` (`pm_is_admin()`) rather than `pm_allow_all` — it holds client names, amounts and payment status. The daily jobs are unaffected: `/api/renewals/run` uses the service-role key and `pm_run_billing_reminders()` is SECURITY DEFINER, so both bypass RLS.
- **Purpose:** track recurring renewals (yearly hosting/domain, monthly/3-/6-month SEO, etc.) and get reminded to **chase clients for payment**.
- **Data:** `pm_billing_reminders` (see table list). Each reminder = a client (free text) + optional project link + service type + amount + frequency + `next_due_date` + `lead_days` (how many days before due to start chasing). [lib/billing-db.ts](lib/billing-db.ts) holds types + CRUD. `frequencyToMonths` maps frequency→`interval_months` (yearly=12, semiannual=6, quarterly=3, monthly=1, custom=N, one_time=null).
- **UI:** [app/(app)/renewals/page.tsx](app/(app)/renewals/page.tsx) — a month **calendar grid** (renewals shown on their due date, click to edit) + an **Upcoming & overdue** list (sorted soonest-first, color-coded by service, overdue in red) + an add/edit dialog.
- **Paid tracking (`paid` bool, per period):** the add/edit form has an **"Already paid for this period"** checkbox (defaults **unchecked** — a new renewal is treated as *unpaid/awaiting payment*, never auto-marked paid). In the Upcoming list each row shows a **Mark paid / Paid** toggle (`setBillingPaid`) and a separate **Next renewal / Mark done** advance (`markChased`). When `paid=true` the row badge reads **"Paid ✓"** (green), the calendar chip dims + shows a ✓, and the daily cron **skips** it. Advancing a recurring reminder resets `paid=false` for the new period; marking a one-off done sets `paid=true`.
- **Mark chased/paid** (`markChased`): recurring reminders roll `next_due_date` forward to the next future occurrence, reset `last_notified_on` **and `paid=false`**; one-offs are set `status='done'`, `paid=true`.
- **In-app/push alerts (daily job):** Postgres function `pm_run_billing_reminders()` runs via **pg_cron** (`pm-billing-reminders-daily`, 01:00 UTC ≈ 09:00 SGT). For each active **and unpaid** (`paid=false`) reminder within its lead window (or overdue) not yet notified today, it inserts a `pm_notifications` row (`type='billing_reminder'`, `user_id = created_by`, `link='/renewals'`) and sets `last_notified_on = today` — so it chases **daily until paid or marked done**. Surfaces as the in-app bell tray + top-right toast, plus **Web Push** once VAPID is configured on the VPS.
- **Email alerts (daily digest, SMTP/Titan):** SEPARATE, additive path — does NOT touch the pg_cron/in-app flow above. **Node route** [app/api/renewals/run/route.ts](app/api/renewals/run/route.ts) (`runtime=nodejs`) is POSTed once a day by a **VPS cron line** ([scripts/renewals-cron.sh](scripts/renewals-cron.sh), `0 0 * * *`). It auth's via the `RENEWALS_CRON_SECRET` header, loads every active+unpaid reminder inside its lead window (or overdue) not yet emailed today (`last_emailed_on`), and sends **ONE digest email** of all of them via [lib/mailer.ts](lib/mailer.ts) (Nodemailer → **Titan SMTP**, `smtp.titan.email:465`, **from `leon@webby.sg`**), then stamps `last_emailed_on=today`. `?dry=1` returns what would send without sending. Recipients = `RENEWALS_NOTIFY_EMAILS` (comma-sep env) if set, else the reminders' creators' login emails (via `auth.admin.getUserById`), else the sending mailbox. **All SMTP secrets are server-env only (VPS `.env.local`), never in the DB** — mirrors the push route. **⚠️ Production setup required:** set `SMTP_HOST/PORT/USER/PASS/FROM`, `RENEWALS_CRON_SECRET`, optional `RENEWALS_NOTIFY_EMAILS` in the VPS `.env.local`, `chmod +x scripts/renewals-cron.sh`, and add the cron line (see the script header). Until configured the route no-ops (`smtp-not-configured`) — in-app/push still work. The two dedup columns are independent: `last_notified_on` (in-app) vs `last_emailed_on` (email).
- **Notification routing change:** the admin tray previously showed **only** `approval_request`; it now also shows notifications **targeted to the admin** (`userId === self`) so renewal reminders surface. Updated in [components/topbar.tsx](components/topbar.tsx), [components/sidebar.tsx](components/sidebar.tsx), [app/(app)/notifications/page.tsx](app/(app)/notifications/page.tsx) (also routes via `n.link`), and [components/notification-toast-container.tsx](components/notification-toast-container.tsx). `billing_reminder` added to the notification `typeConfig` (CalendarClock / amber).

### Expenses & Receipts Module (IRAS accounting, 2026-08-14)

Records every business cost **with its receipt attached**, so a financial year can be handed to the accountant / filed with IRAS without hunting through email. Migration [scripts/expenses-schema.sql](scripts/expenses-schema.sql) — **applied to the LIVE project (`tfhzuruaaymfhqmeiusr`) on 2026-08-14** via the `mcp__supabase__*` MCP (identity-verified first: `get_project_url` + 272-task / 27-article-slot / `discussion_note`-present probe). Re-run on any fresh project.

- **Admin-only, enforced in the DATABASE.** Sidebar entry hidden for staff, page wrapped in `<AdminOnly>`, and — unlike most tables — `pm_expenses`/`pm_expense_receipts` do **not** get the blanket `pm_allow_all` policy. They reuse `pm_is_admin()` (the `pm_credentials` precedent), so a staff browser can't download company financials even with a hand-rolled API call. **Verified live:** with a probe row present, an admin JWT saw 1 row and a staff JWT saw 0 and was refused an INSERT (`insufficient_privilege`); `anon` saw 0.
- **`amount` is GST-INCLUSIVE — the single figure that reconciles to the bank statement.** `gst_amount` is the input tax *inside* it (`net = amount − gst_amount`), only meaningful when GST-registered; leave 0 otherwise and the whole amount is the cost. The form's **9% button** calls `gstFromInclusive` (`total × 9/109`, `GST_RATE` in [lib/expense-types.ts](lib/expense-types.ts)) — the direction you actually need, since SG tax invoices quote the gross. A DB CHECK (`gst_amount <= amount`) blocks the inverted entry.
- **SGD only, deliberately.** For a foreign-currency receipt the user enters the **SGD amount their card was actually charged** (what IRAS wants and what reconciles to the statement) and notes the original in Notes — so all totals stay summable. The `currency` column exists (defaults SGD) so a proper foreign-amount pair can be added later without a migration.
- **"No receipt" is DERIVED, never stored** (`computeExpenseStatus`): an expense with zero `pm_expense_receipts` rows reads as `missing_receipt` (red) and is counted on a summary card, so it can never drift from the actual attachments. Stored `status` is only `recorded` | `submitted`. A `submitted` expense keeps that status even without a receipt (it's already gone to the accountant).
- **Financial year is user-configurable** — `FY starts <month>` on the page, persisted in `localStorage` (`expenses-fy-start-month`), because plenty of SG companies close 31 Mar / 30 Jun rather than 31 Dec, and the boundary decides which year a cost is filed in. `financialYear`/`fyStartYearOf`/`fyMonthOrder` handle it (label `"2026"` for a Jan start, `"FY2026/27"` otherwise); the month chart re-orders its x-axis to the FY. **Unit-tested** across all 12 start months × 6 consecutive years for exact abutment, no gaps, and leap-year ends (29 Feb 2028).
- **`category` / `payment_method` / `status` are UNCONSTRAINED text on purpose** — the `pm_tasks` status CHECK has needed a live migration for every new value (see the task-status modules), and an expense vocabulary grows with the business. The TS unions in [lib/expense-types.ts](lib/expense-types.ts) are the source of truth and **every lookup falls back gracefully** (`categoryMeta`/`paymentLabel` return the raw key styled as "Other"), so an unknown value can never crash the page. Keep that property if you add categories.
- **17 categories carry an optional `taxNote`** shown in the form when selected — the treatments a small SG company most often gets wrong (private S-plate car running costs not deductible; fines/penalties not deductible; equipment claims capital allowances under s19/19A rather than a straight deduction; business entertainment needs who/why on the receipt). Framed as reminders, not advice. The `deductible` bool keeps a non-claimable cost in the books while excluding it from the deductible total.
- **CSV export** (`expensesToCSV`) is the accountant hand-off: it writes exactly the filtered rows on screen (the footer total and the file always agree) with Date/Vendor/Category/Project/Total/GST/Net/Deductible/Status **and a space-separated list of receipt URLs**, so the file is self-sufficient for someone with no access to this tool. UTF-8 BOM + CRLF for Excel; `= + - @` prefixes are neutralised against CSV formula injection.
- **Receipt uploads** go to the `pm-attachments` bucket under `expenses/<expense_id>/` (`uploadExpenseReceipt`). On a NEW expense files are **staged in memory** and uploaded right after the insert (no id exists before); on edit they upload immediately. Per-file loop with the `MAX_UPLOAD_BYTES` guard so one bad file can't abort the batch, and **if a staged upload fails the dialog stays open saying the expense saved but the receipt didn't** — never silently drop the only copy of a source document. `deleteExpense` removes the row (receipts cascade) but **never the storage object**: for an accounting record an orphaned file is far cheaper than a lost receipt.
- **Retention:** `retainUntilYear(fyStart) = fyStart + 6` surfaces "Keep records until \<year\>" — IRAS requires source documents for 5 years after the relevant YA.
- **Follow-ups not built:** staff-submitted reimbursement claims (module is admin-only today), true multi-currency, receipt OCR, and a bulk ZIP of a year's receipts (the CSV's links cover the hand-off for now).

### Weekly SEO Task Engine & Task Archive Module

Automates the recurring weekly SEO work set per client project and gives the admin archive/unarchive of completed tasks. **Migration [scripts/weekly-seo-schema.sql](scripts/weekly-seo-schema.sql) applied to the LIVE project (`tfhzuruaaymfhqmeiusr`) on 2026-07-23** via the `mcp__supabase__*` MCP (identity-verified first). Re-run on any fresh project.

**⚠️ Reworked 2026-08-11** (month/week naming, Friday pre-generation, no carry-forward, admin UI). **No schema change was needed** — enrolment has always been `pm_weekly_seo_plans`. The bullets below describe the CURRENT behaviour; anything about "Article Upload (Week N)", `carried-over`/`rollover-done` tags or `— x/3 posted` refers to the pre-2026-08-11 engine and is gone.

- **Calendar + naming rules live in [lib/weekly-seo.ts](lib/weekly-seo.ts)** — a dependency-free module (no supabase/next/react imports) shared by the generator route and the admin UI, so the preview the admin sees and what the cron writes can never drift. Two rules:
  1. **A week belongs to the month of its FRIDAY.** Week N = the Nth Friday of that month, which is exactly the Nth week of the month containing any weekday of it (`Math.ceil(friday.getUTCDate() / 7)`). Parent title = `"<Month> (Week N)"`, e.g. **"August (Week 2)"**.
  2. **Only the article days inside that month are generated.** A week straddling a month boundary produces the **NEW month's days only** (user decision 2026-08-11): Mon 28 Jul · Wed 30 Jul · Fri 1 Aug → **"August (Week 1)" with ONE child, "Article 1 (Friday)"** — the two July days are not created. Mirror case: Mon 31 Aug · Wed 2 Sep · Fri 4 Sep → "September (Week 1)" with Wednesday + Friday. Articles are renumbered **1..n within their parent** (so a one-day week reads "Article 1 (Friday)"), but `seo_slot` stays keyed to the weekday (article-1 = Mon, article-2 = Wed, article-3 = Fri) so generation stays idempotent. Verified over 5 years of weeks: every month numbers 1..N with no gaps, and every week yields ≥1 article (the Friday is by definition in-month).
- **What each enrolled project gets per week:** the `"<Month> (Week N)"` parent (due Friday) + its article subtasks, plus top-level **"Backlinks — <Month> (Week N)"** and **"GMB Post — <Month> (Week N)"** (due Friday). The week label was added to the singles on 2026-08-11 because, without carry-forward, each week creates a fresh one and a project would otherwise accumulate identically-titled "Backlinks" rows.
- **WHEN it runs (Asia/Singapore, from the same daily 17:00 UTC cron):** Mon–Fri tops up the **CURRENT** week (catch-up for a failed run or a project enrolled mid-week); **Fri/Sat/Sun also generate NEXT week**. 17:00 UTC Thursday = **01:00 SGT Friday**, which is the "publish next week at the start of Friday" rule the admin asked for; Sat/Sun repeat it (idempotent) so a failed Friday still lands before Monday. Weekends no longer no-op.
- **NO CARRY-FORWARD (user decision 2026-08-11).** An unfinished article stays under its own week's parent and simply runs overdue — never moved, retitled or tombstoned — and the new week always gets its own full set. The only tidy-up is `closeFinishedParents`: a past parent (scanning 6 weeks back) is set `done` **only when it is still `todo`/`in_progress` AND every one of its children is closed** (done/missed/rejected). A parent an admin parked in any other status is never touched, and a parent with an open child is left open on purpose.
- **Enrollment = `pm_weekly_seo_plans`** (`project_id` unique FK, `enabled`, `assignee_id`, `include_articles/backlinks/gmb`, RLS `pm_allow_all`). 9 projects enrolled (Cemimax, Outpost, RL Transport, Speckled Space, SG Dynamics, ASC Racking, Ascent Consultancy, Cleanitize, PolyGo), all assigned to staff `2f2e256e-…`.
- **Admin UI (2026-08-11):** [components/weekly-seo-panel.tsx](components/weekly-seo-panel.tsx) is the single reusable panel (enrol/pause/remove, assignee, per-item toggles, 6-week preview of the exact titles that will be generated, **Generate now**). It is mounted in two places: an admin-only **"Weekly SEO" tab** on the project detail page, and the admin **/weekly-seo** overview page ([app/(app)/weekly-seo/page.tsx](app/(app)/weekly-seo/page.tsx), sidebar entry, `AdminOnly`) which lists every enrolled project with its assignee, includes and this-week/next-week task counts, expands each row into the same panel, adds projects via a dropdown, and has a global Generate-now. Helpers in [lib/db.ts](lib/db.ts): `dbListWeeklySeoPlans` / `dbGetWeeklySeoPlan` / `dbSaveWeeklySeoPlan` (upsert on `project_id`) / `dbDeleteWeeklySeoPlan` / `dbReassignFutureWeeklySeoTasks` / `dbWeeklySeoTaskCounts` / `runWeeklySeoNow`. **Enrolling a project generates immediately** so it doesn't sit empty until the next cron run.
- **Changing the plan assignee also moves upcoming work:** `dbReassignFutureWeeklySeoTasks` repoints generator rows (`seo_slot IS NOT NULL`) from this Monday onwards that are still **`todo`** — work someone has already started or submitted is deliberately left alone.
- **Auth on the route now accepts EITHER** the cron secret (`x-cron-secret`/bearer = `WEEKLY_SEO_CRON_SECRET`, falling back to `RENEWALS_CRON_SECRET`) **or an admin's Supabase access token** (the UI Generate-now button; re-checked server-side against `user_roles`/`staff_members.pm_role`, mirroring `pm_is_admin()`). `?dry=1` reports without writing; `?projectId=<uuid>` scopes the run to one project. **A failing project no longer aborts the whole run** — each plan is wrapped in try/catch and reported in `results[].error`.
- **Task identity is `pm_tasks.seo_week` (Monday date) + `seo_slot`** (`articles-parent` | `article-1..3` | `backlinks` | `gmb`) — never by title, so retitling by hand can't cause a duplicate. Generated rows: `created_by` NULL, type `seo`, priority 5. Article subtasks get `requires_article_post: true` so admin approval routes them through the Article-Post Workflow (see that module).
- **`missed` status:** in the `pm_tasks_status_check` CHECK and the `TaskStatus` union, with display entries in task-drawer `statusOptions`, tasks-page `statusConfig`, activity-page `STATUS_LABEL`, chat `taskStatusColor/Label`, schedule-tab `STATUS_COLORS` (red #ef4444). A **closed** state: excluded from tasks-page active lists; staff cannot toggle a missed subtask (admin can). **Since 2026-08-11 nothing writes it automatically** — it was only ever produced by the removed carry-forward tombstones, so it is now an admin-set status only. No live task has ever held it.
- **⚠️ The generator has never actually run in production.** The newest generator-shaped rows are `seo_week = 2026-07-20` (plus one hand-made 2026-07-27 ASC parent), all seeded by hand on 2026-07-23 — i.e. the VPS cron line from [scripts/weekly-seo-cron.sh](scripts/weekly-seo-cron.sh) was never installed, and `WEEKLY_SEO_CRON_SECRET`/`RENEWALS_CRON_SECRET` may not be set on the box either. Until that is done, generation only happens when an admin presses **Generate now** (which authenticates with their own token and needs no secret). Verify with `crontab -l | grep weekly-seo` on the VPS.
- **Archive (admin-only):** `pm_tasks.archived_at`. `loadAll` filters `archived_at IS NULL`, so archived tasks vanish from every active view (kanban, tasks, dashboard, chat counts). Archiving stamps the top-level task AND its subtasks (`dbSetTaskArchived`); `dbListArchivedTasks` feeds the Archive page's new **Archived** tab (Unarchive button → `unarchiveTask` → refresh). Store actions `archiveTask`/`unarchiveTask`; drawer footer shows an **Archive** button on completed top-level tasks (admin). The Archive page ([app/(app)/archive/page.tsx](app/(app)/archive/page.tsx)) now has **Completed** (done, unarchived → Reopen + admin Archive) and **Archived** tabs.
- **PROJECT archive (admin-only, 2026-08-02):** `pm_projects.archived_at` (migration [scripts/project-archive.sql](scripts/project-archive.sql) — **applied to the LIVE project `tfhzuruaaymfhqmeiusr` on 2026-08-02** via the `mcp__supabase__*` MCP, identity-verified first: `get_project_url` + 27 article-slot / `discussion_note`-present probe; re-run on any fresh project). `loadAll` filters pm_projects `archived_at IS NULL` — an archived project **and all of its tasks** (nested under it in the store) vanish from every store-driven view (projects, tasks, dashboard, kanban, global search, chat task counts) in one stamp; task rows' own `archived_at` are untouched, so unarchive restores everything intact. Only the project ROW is stamped (`dbSetProjectArchived`); `dbListArchivedProjects` feeds the Archive page's admin-only **Archived Projects** tab (Unarchive → `unarchiveProject` → refresh). Store actions `archiveProject`/`unarchiveProject`; the projects-page card gets a gray two-click **Archive** button next to Delete (admin, hover). **Weekly SEO generator skips archived projects** (`.is("archived_at", null)` on its pm_projects select) — the `pm_weekly_seo_plans` row stays enrolled and generation resumes on unarchive. Side effects of archiving: the project's chat channel remains (history preserved, task-count badge drops to 0); the project detail page 404s (like archived tasks, view requires unarchive); invoices keep their `project_id` but the list/detail project-name lookup misses (shows the stored bill-to snapshot regardless); `Project.archivedAt` was added to the type — `addProject` omits it (`Omit<..., "archivedAt">`).
- **Staff workflow:** generated tasks are assigned via the plan, so staff see them on dashboard/tasks/kanban; the assignee satisfies `isMyTask` in the drawer's `canEdit` (see the Uploads & File Persistence module for the full rule) and can post their submitted work into the task **description** and comments even though `created_by` is NULL.
- **Legacy `pm_tasks.recurring` field is display-only** — no engine consumes it; the weekly SEO engine deliberately leaves it NULL on generated tasks (it was cleared on the adopted ASC sample rows).

### Task Sheet & Articles Module (2026-08-25)

The spreadsheet view of the board. Built because a week of SEO articles is a weekly parent task plus three subtasks *per client*, so "how many articles are pending?" could only be answered by opening ten projects and expanding every week. Two surfaces, **one component and one pure module**, so a count on one can never disagree with the other.

- **`/articles`** ([app/(app)/articles/page.tsx](app/(app)/articles/page.tsx), sidebar entry `Articles`, `FileText`) — every client's articles as one row each, with an **Outstanding by client** chip row on top (click to focus a client). Not admin-only: staff see the projects they are staffed on, the same boundary as `/projects` and the dashboard. Articles are delivery data, not money (see the Owner-Only Financial Data rule).
- **Project → "Sheet" tab** ([app/(app)/projects/[id]/page.tsx](app/(app)/projects/[id]/page.tsx), tab key `sheet`) — **every** task of that client, flat and editable. Shown on every project, not just SEO ones. Tab badge = articles still outstanding.
- **[components/task-sheet.tsx](components/task-sheet.tsx)** is the single grid, mounted by both (`articlesOnly` locks it to article rows and hides the toggle; `showClient` adds the Client column). **[lib/task-sheet.ts](lib/task-sheet.ts)** is the pure module behind it — dependency-free (types + `lib/weekly-seo` only), so the row builder, sorter, summary and CSV are testable without a browser and can't fork between the two pages.

**Identity is `pm_tasks.is_article`, never the title.** The live data settles it: 109 tasks contained "article" while **62 of them were not articles** (`Featured image not showing in single article page`, `Develop blog page`), and **19 genuine articles with live URLs recorded were titled only** `Monday`, `wednesday post`, `Wednesday Blogs`. `isArticleTask()` also accepts a generator `seo_slot` of `article-N` as belt-and-braces, so a generated article counts even if its flag write failed.

- **A weekly parent is a group, never a row.** `articleRows()` drops any flagged task that has articles beneath it (`holdsArticles`), which collapses both live shapes in one rule: the generator's `August (Week 1)` parent with three article children, and the hand-made `week 6 articles` parent with `monday`/`wednesday`/`friday` children. A flagged task with no article children is a row in its own right — that's how a one-off blog post appears.
- **Marking is manual and bulk** (owner decision 2026-08-25: *"not all are articles. just give me the function to label a article"*). The Sheet's **Article** column is a per-row tick (admin only), plus a toolbar action — filter the sheet to what you mean (search `monday`, pick a week, pick an assignee) and **"Mark N shown as articles"** does the lot via `setTasksIsArticle` → `dbSetTasksArticle` (chunked 50, throws). There is also a single-task toggle in the task drawer under **Articles Sheet**.
- **A one-off backfill was offered and DECLINED.** [scripts/backfill-article-flag.mjs](scripts/backfill-article-flag.mjs) tiers 139 candidates by evidence (A: live URL recorded / generator slot · B: weekday child of a weekly parent · C: title only) and **was never run against live**. It defaults to a dry run and is kept as an accelerator if that decision changes.

**Editing writes straight through the existing store actions** (`updateTaskTitle`, `updateTaskStatus`, `updateTaskDueDate`, `updateTaskPriority`, `updateTaskAssignee`, `markArticlePosted`) — so a status change from the sheet still cascades to descendants and rolls up to the parent exactly as the drawer does, and the History log records it identically. Each row renders **its own** error line on failure; the store patches optimistically, so a swallowed error would look saved until the next refresh reverted it (Known Recurring Mistake #13). Editable when `isAdmin || assignee === me || unassigned`.

- **The Live URL cell is the one shortcut worth having**: a row in `pending_article_post` gets an inline URL box + **Post** button calling `markArticlePosted` — 7 live tasks were sitting in that state with no way to clear them without opening each drawer.
- **Weeks** reuse `planWeek()` from [lib/weekly-seo.ts](lib/weekly-seo.ts) (month-of-Friday), so a generated week and a hand-made week in the same calendar week never get two different labels. A row is filed by `seo_week` → its own due date → **its parent's** due date (the live pattern is a dated weekly parent whose children carry no date) → `No date set`, which sorts last.
- **Blanks always sort LAST** in every column regardless of direction — an undated task is not the most urgent just because its due date is empty (same trap the keyword table had to avoid).
- **CSV export** writes exactly the rows shown, in the order shown, so what you sorted is what you get. UTF-8 BOM + CRLF for Excel, and `= + - @` prefixes neutralised against formula injection.
- **`+ Add article`** ([components/add-article-dialog.tsx](components/add-article-dialog.tsx)) creates a task already flagged `is_article` + `requires_article_post`, type `seo`, priority 5. It passes `dueDate: ""` explicitly — `addTask` defaults an ABSENT dueDate to TODAY, which would show a brand-new article as due immediately (the same trap the SEO phase tasks hit). On a project it pre-fills the assignee with that client's most frequent article writer.

**Fixed on the way (real pre-existing bug): `dbAddTask` silently dropped `requires_article_post`** — it maps a fixed column list and that one was never added, so any task created with it (not just from this module) had admin Approve close it outright instead of parking it in `pending_article_post` for the live link. `addTask`'s optimistic row also hardcoded `false`. Both now honour the caller.

**Context worth keeping:** the weekly SEO generator has still never run in production (its cron was never installed — see the Weekly SEO module), so **every article since 2026-07-20 has been created by hand**, which is why titles are freeform and why the flag has to be manual. `pm_articles` (the Content module / `/content` page) is a **separate, entirely unused table — 0 rows live**; the real article record is `pm_tasks`. Don't wire new article work to `pm_articles`.

**Not built:** drag-to-reorder rows (the board owns `sort_order`; the sheet sorts by column instead), editing a task's description or project from the sheet, and a saved per-user view (filters reset on navigation).

### Keyword Research Module (2026-08-18)


The target keywords for a client, in a **"Keywords" tab** on the project detail page (next to SEO Work; both render only for an SEO-labelled project). This tab is **where the "2. Keyword Research" phase task gets done** — the SEO Work record reads a count and top-6 preview from here, which is how the admin and the next staff member see what is being targeted (see the SEO Setup Phase Tasks module). Migration [scripts/keywords-schema.sql](scripts/keywords-schema.sql) — **applied to the LIVE project (`tfhzuruaaymfhqmeiusr`) on 2026-08-18** via the `mcp__supabase__*` MCP (identity-verified first). Re-run on any fresh project.

- **Columns are the research table** (user decision 2026-08-18): keyword, monthly volume, difficulty, target page, current rank, status, priority, notes. Sortable by every numeric column; **unknown values always sort last** regardless of direction — an unresearched keyword must not read as the best opportunity just because its volume is NULL.
- **Rankings are a SINGLE current value, not history** (user decision 2026-08-18). Setting a rank stamps `rank_checked_at`, so a stale number is always identifiable as stale (shown as a tooltip); clearing the rank clears the timestamp. Adding history later means a `pm_keyword_ranks` child table, **not** a change to this one.
- **Bulk paste is the primary input** — `parseKeywordPaste` in [lib/keyword-types.ts](lib/keyword-types.ts) (pure, dependency-free) accepts a bare keyword list, tab-separated (copying from Sheets/Excel/Ahrefs) or CSV. It maps columns from a **header row** when one is present, else falls back to positional keyword/volume/difficulty, and only assigns a numeric field when the cell actually parses as a number so a stray text column can't land in `searchVolume`. Header detection **requires the keyword column specifically**, so a data row starting with the word "position" isn't eaten as a header.
- **CSV/TSV file upload (added 2026-09-01)** — the import dialog has a drop zone / file picker beside the textarea. The file is read with `File.text()` straight **into the same textarea**, so upload and paste share ONE parser, preview and import path and cannot drift. Guarded at 5 MB (a keyword export is a small text file; anything bigger is the wrong file), and the `<input>` value is cleared after each pick so re-choosing the SAME file still fires `onChange`.
- **A UTF-8 BOM is stripped before anything else.** Excel writes one on every CSV it saves; left in place it glues itself to the first header cell, the keyword column fails to match, header detection is skipped, and the header row imports as a keyword literally called "Keyword". Covered by a test.
- **Header cells are normalised before matching** (`normalizeHeader`): bracketed qualifiers and `* : #` are stripped, so `Difficulty (0-100)` and `Volume (US)` match. The patterns stay anchored whole-string on purpose — **`Google page` (a page NUMBER) must not match the target-URL pattern, and `Ranking page` must not match the rank pattern.** Both traps are in the live Cemimax export and both are tested.
- **`parseSeoDate` refuses ambiguous slash dates.** `03/09/2026` is 3 September here and 9 March to a US tool; silently picking one would misdate a rank check by six months with nothing on screen to show for it. ISO and textual months only; anything else falls back to the import time and the dialog **says how many rows that happened to**.
  - `parseSeoNumber` handles what tools really emit: `2,400`, `1.2K`, `3.4M`, `<10`, `—`, `n/a`, blank → number or NULL (never 0).
  - **`splitLine` respects double-quoted fields (RFC 4180).** A naive `split()` turned `"halal restaurant, sg",2400` into the keyword `"halal restaurant` with the volume lost — silent corruption nobody would notice. Don't simplify it back.
  - **Verified by a pure-function test: 38 assertions**, incl. quoted commas, escaped `""`, K/M suffixes, reordered headers, and the not-a-header case. Script kept in the session scratchpad (this repo has no test runner); re-derive with `./node_modules/.bin/tsc lib/keyword-types.ts --outDir <tmp>` and a small node harness.
- **Re-importing UPDATES, it does not skip (changed 2026-09-01).** `importKeywords` inserts keywords the project doesn't have and **refreshes the ones it does** (case-insensitive match), reporting `inserted` / `updated` / `unchanged`. The old skip-everything behaviour made uploading a monthly rank report a silent no-op, which is the main thing anyone wants to import. The `(project_id, lower(keyword))` index is for that lookup and is **intentionally not unique**, so a partial batch can't abort mid-way.
- **What an update may touch is decided by `ParsedPaste.mappedFields`** — the columns the source actually HAD. This is the guard that makes re-import safe:
  - A field with **no column** in the file is never written. Importing a volume-only list must not wipe every recorded position — that is the one bug that would silently destroy a client's rank history, and it is covered by a test.
  - A field **with** a column is written even when the cell is blank, because that is the report saying so: a blank Position on a rank export means the keyword fell out of the results, which is exactly the news worth recording.
  - **`targetUrl` is the deliberate exception** — a blank ranking-page cell just accompanies a keyword that isn't ranking; it is not a statement that the page you target has gone away.
  - A paste with **no header row** claims authority over volume/difficulty only, so a bare keyword list can never read as "these keywords have no rank".
- **`rank_checked_at` follows the rank COLUMN, not the rank VALUE.** A report that checked a keyword and found it outside the top 100 stores rank NULL **plus** a timestamp — which is precisely how `pm_keywords` distinguishes "not ranking" from "never checked" (see the column comment). The date comes from the row's own "Last checked" cell when there is one, else the import time. Note `updateKeyword` (the manual single-cell edit) still *clears* the timestamp when a rank is cleared by hand — that is right for a human saying "I don't know", and wrong for a report saying "I looked".
- **Status is set on INSERT only:** a keyword arriving with a position is stored as `ranking`, not `target` (it would be wrong on arrival). An update **never** touches status or priority — those are the admin's judgement, and a monthly report has no business overwriting a keyword deliberately marked `dropped`.
- **Permissions:** admin + staff assigned to the project can add, import and edit; **delete is admin-only**; everyone else who can see the project reads it. App-level via `canEdit`, with blanket `pm_allow_all` RLS (delivery data, not money — see the Owner-Only Financial Data rule).
- **`status`/`priority` are unconstrained text** for the same reason as `pm_seo_checklist_items.category`; `statusMeta`/`priorityMeta` fall back to the raw key so an unknown value can't crash the page.
- **Lint traps hit while building this:** no `setLoading(true)` inside the load effect (`react-hooks/set-state-in-effect`), and the sortable `<th>` **must** be declared at module level — a component created during render is remounted every render and this repo's lint rejects it.
- **Verified live 2026-08-18:** insert (both a full row and a nulls row) → defaults applied (`target`/`medium`) → update → delete, probe rows removed (table left at 0). RLS proven with a real staff uid: staff read keywords, while `pm_invoices` and `pm_expenses` still return 0.
- **Verified 2026-09-01 (the import rework):** two pure-function suites, both re-derivable with `tsc lib/keyword-types.ts lib/keyword-db.ts --outDir <tmp> --module commonjs` (this repo has no test runner; the harnesses live in the session scratchpad). **46 assertions** parse the real Cemimax rank export — header mapping, the `Google page` / `Ranking page` traps, `Status` text never reaching a number field, difficulty `0` surviving, BOM, date and number edge cases. **27 assertions** drive the real `importKeywords` against a stubbed PostgREST client and assert on the exact patch it sends — including the critical one: **a volume-only list leaves stored ranks untouched.**
- **First real import, live 2026-09-01:** the Cemimax rank tracker export → **32 keywords** on project Cemimax (10 ranking, best position 5; 22 checked-and-not-ranking; 22 volumes; 13 difficulties incl. three real `0`s; 15 ranking URLs; 3 intent notes), all stamped `2026-08-31` from the file's own Last checked column. `pm_keywords` is no longer the empty table the 2026-08-18 note describes — Speckled Space also holds 20 keywords (no ranks recorded).
- **Not built:** rank history/charting (still a single current value — adding history means a `pm_keyword_ranks` child table, NOT a change to this one), linking a keyword to the article that targets it (the Content module's `targetKeyword` is still just free text), and importing the tracker's *derived* columns (Status, Google page, Change since last check) — all of them are recomputable from position, so storing them would just create something to go stale.

### SEO Setup Phase Tasks & SEO Work Record Module (2026-08-19, replaced the checklist)

**User rule 2026-08-19: the SEO start is a TASK, not a checklist.** In their words: *"its more of a pin task when i label a project as SEO. so when i tag my staff, he will input the keyword research followed by technical seo, then on page fixes. this is so that i can check and next staff knows what work is done and keywords are being targetted."* The 26-item tick-list built on 2026-08-18 (`pm_seo_checklist_items`) is **gone from the app** — it was one day old, seeded into 2 projects with **0 items ticked and 0 notes**, so no real work record was lost.

- **What a project gets when it is labelled SEO / Web + SEO:** a parent **"SEO Setup"** task on the board with one child per phase, in the order the work happens — **1. Competitors, 2. Keyword Research, 3. Technical SEO, 4. On-Page Fixes**. Real `pm_tasks` rows, so they are assignable, reviewable (the full submit-for-review / approve / revision workflow), searchable, and they roll up on the kanban like any other parent. No due dates (`dueDate: ""` — `addTask` defaults an ABSENT dueDate to TODAY, which would run the whole set overdue on day one), type `seo`, priority 5.
- **`competitors` was added as phase 1 on 2026-08-31** (owner: *"in the seo work, i want another point to include 'competitors'"*). It goes FIRST because, in their words, the client *"already know who are their competitors and it might not be based on keyword research or ranking"* — it is an input gathered at kickoff, not an output of the research. **No migration was needed**: `seo_phase` is unconstrained text precisely so a phase can be added in code alone. Adding it renumbered the other three titles (1-2-3 → 2-3-4) on the 15 live SEO projects; the backfill script did that, and only where the title was still the seeded one.
- **Board order is stamped, not implied.** `ensureSeoSetupTasks` used to rely on insert order alone (all four rows land with `sort_order` 0 and `loadAll` falls back to `created_at`), which is only right when the whole set is new — filling a gap put the new row LAST, so "1. Competitors" would have sat at the bottom of the subtasks. It now calls `dbReorderTasks` with the canonical 0..N after creating anything, in its own try/catch (cosmetic — it must never fail the seeding). The SEO Work tab was always safe: it renders `SEO_PHASES` in order, not the task order.
- **Identity is `pm_tasks.seo_phase`** (`setup` | `competitors` | `keyword-research` | `technical-seo` | `onpage-fixes`), **never the title** — titles get renamed and repeat across projects (same rule as `seo_slot` for the weekly engine). Unconstrained text, because every CHECK on `pm_tasks` has needed a live migration to add a value. Backed by partial unique index `pm_tasks_seo_phase_unique (project_id, seo_phase) where seo_phase is not null` — the hard backstop against a double-click or two admins labelling at once. Migration [scripts/seo-setup-phase.sql](scripts/seo-setup-phase.sql), **applied live 2026-08-19** (identity-verified first: `get_project_url` plus a 326-task / 27-article-slot / 52-checklist-row fingerprint).
- **Creation is AUTOMATIC on the label** (user decision 2026-08-19), via `ensureSeoSetupTasks(projectId)` in [lib/store.ts](lib/store.ts), wired into **`addProject`** (project created as SEO) and **`updateProject`** (type changed to SEO later — deliberately AFTER the DB write, so a failed rename seeds nothing). Idempotent, and it **checks `pm_tasks` rather than the store** (`dbListSeoPhaseTasks`): archived tasks keep their `seo_phase` and still hold the unique index, so a store-only check would attempt a duplicate insert. It **fills gaps** rather than being all-or-nothing — delete one phase and the tab puts just that one back. It never throws; a project whose seeding failed simply shows the create button on its tab.
- **Assignee (rule shared by the app and the backfill script): the project weekly SEO plan assignee if it is enrolled** (that IS the person doing this client SEO), else **the project staff member when there is exactly one**, else unassigned for the admin to tag. When the script fills a GAP in a set that already exists, whoever is already on those phase tasks wins over both — a phase added to the standard set later belongs with the person already doing that client's SEO. An unassigned task is still staff-editable — `canEdit` treats unassigned as open (see the Uploads & File Persistence module).
- **The record surface is the "SEO Work" tab** ([components/seo-work-panel.tsx](components/seo-work-panel.tsx), tab key `seo-work`, replacing `seo-checklist`): the four phases in order, each with its task status, who has it, "since date + time", and **what that person wrote in the task description** — headed *Work recorded* once the description differs from the seeded prompt, *What to do and record* while it is still the prompt (compared markup/whitespace-insensitively by `sameText`). On the Keyword Research phase it also shows a live count and top-6 preview of `pm_keywords` with a jump to the Keywords tab — the "which keywords are being targeted" half of the ask. **The panel owns no data**: it reads the store task tree, so a change made on the board, in the drawer or through the review workflow shows here immediately.
- **Permissions:** anyone who can see the project reads the record (it is only tasks). Editing happens in the task drawer under the normal task rules. **Creating / repairing the set is ADMIN-ONLY** (`canCreate={isAdmin}`) — it puts tasks on everyone board.
- **The SEO tabs (SEO Work + Keywords) render only for an SEO-labelled project**, or one that still holds SEO work after being relabelled (`showSeoTabs`) — so a record already taken never becomes unreachable. If the open tab is hidden by a relabel, `activeTab` falls back to the board rather than rendering an empty pane (derived at render from `activeTabRaw`; do NOT "fix" this with a setState effect — this repo lint rule forbids it).
- **The standard technical / on-page items now live as PROSE in each phase task seeded description** ([lib/seo-setup.ts](lib/seo-setup.ts) — dependency-free, shared by the store creator and the panel so they cannot drift). Editing that file changes what NEW projects get, not what is already on a board. Deliberately not a tick-list: staff replace the prompt with what they actually did.
- **Existing SEO projects WERE backfilled 2026-08-19** (owner asked for the tabs to hold the tasks): [scripts/backfill-seo-setup-tasks.mjs](scripts/backfill-seo-setup-tasks.mjs) created **56 tasks across all 14 live seo/both projects** — 11 sets landed on a person (9 off their weekly SEO plan, 2 off project staffing), 3 stayed unassigned. It reads its titles/descriptions out of `lib/seo-setup.ts` so a backfilled project matches an app-created one exactly, and defaults to a dry run (`--apply` to write). Undo, before anyone edits them: `delete from pm_tasks where seo_phase is not null;`.
- **The script works PHASE BY PHASE, not project by project** (reworked 2026-08-31, when adding a phase to the standard set proved the old "skip any project that already has a `seo_phase` task" rule useless). Per project it: creates any missing phase (and the parent), renumbers a title that still holds an **older seeded title** (`LEGACY_TITLES` — a hand-renamed task is left alone), refreshes the parent prompt only while it still matches an **older seeded prompt** (`sameText`, the panel's own comparison), and stamps `sort_order` 0..N. It **never touches a phase description** — that is where staff write their work up, and rewriting it would both destroy the record and flip the panel to "Work recorded". Adding a phase later is a re-run, not a new script. Note that title changes ARE picked up by `pm_log_task_activity`, so they show on the History page as "System" (service-role writes carry no `auth.uid()`).
- **`pm_seo_checklist_items` was DROPPED from the live DB on 2026-08-19** on the owner instruction ("i dont need the check list so can remove those"), via [scripts/drop-seo-checklist.sql](scripts/drop-seo-checklist.sql). Its 52 rows (2 projects, 0 ticked, 0 notes) were dumped to the session transcript first. `scripts/seo-checklist-schema.sql` was deleted with it — git history holds both if it is ever needed.
- **Verified live 2026-08-19:** a deliberately rolled-back `DO` block proved that an insert carrying `seo_phase` succeeds and that a **second row for the same (project, phase) is refused with `unique_violation`**; PostgREST returns `seo_phase` (schema cache reloaded) and 0 rows hold it, so the probe left nothing behind. `tsc --noEmit` clean, `next build` clean.
- **Fixed on the way (real pre-existing bug):** the project page resolved the open drawer with `project.tasks.find(...)` — **top-level only** — so any SUBTASK opened from a notification deep link resolved to `null` and the drawer never opened. Now a module-level `findTaskDeep`, reused by the `?task=` effect too.
- **`sanitizeHtml` / `isHtml` moved to [lib/utils.ts](lib/utils.ts)** (they were private to [components/task-drawer.tsx](components/task-drawer.tsx)) — two surfaces now render stored description HTML, and a second copy of a sanitiser is exactly the thing that drifts.
- **Not built:** per-item granularity inside a phase (deliberate), per-phase due-date scheduling, a dashboard roll-up of which clients still have unfinished SEO setup, and any structured competitor table — competitors are written up in the phase task's description like every other phase (there is no `pm_competitors`, and the owner asked only for the point to exist).

### Client Package (Tier Badge) Module (2026-09-01)

A coloured icon beside every project saying **which package that client is on**, and hovering it lists the **work scope** — pages, keywords, backlinks, articles a month. Built because staff had no way to tell a S$500 Starter client from a Growth client without opening the quotation, so the scope of the work was invisible on the board.

#### The tier LADDER — `level` (2026-09-02)

The owner asked for "1st tier, 2nd tier, 3rd tier icons beside the project name". The badge already existed but identified a package only by NAME and icon ("SEO Starter", a sprout), while the owner's own vocabulary is a ladder — so the number they actually say appeared nowhere in the app.

- **`pm_project_tiers.level`** is the rung: 1, 2, 3… **NULL is a real value, not a gap** — a package that is not a rung (a one-off web build) keeps its badge and scope without pretending to rank against the SEO retainers. `rowToTier` must therefore keep it `null` rather than defaulting to a number, and `dbUpdateProjectTier` tests `!== undefined` (not truthiness) so "take this off the ladder" reaches the database.
- **Deliberately NOT unique, and no `pm_allow_all`-style CHECK beyond `>= 1`.** Two packages on one rung is a mistake, not corruption; a write refused mid-relabel is worse than a duplicate number the admin can see. The Settings editor shows an amber **clash warning** instead (`tiersAtLevel`). `level >= 1` is the one invariant that can never need widening (there is no tier 0), so it is safe as a CHECK — every other CHECK on `pm_tasks` has needed a live migration to add a value.
- **`level` LEADS the sort** (`sortTiers`), ahead of `sort_order` and name, and both DB reads (`loadAll`, `dbListProjectTiers`) now pass through it — a picker ordered any other way would contradict the numbers on the board. **Use `Number.MAX_SAFE_INTEGER` as the unranked sentinel, never `Infinity`:** `Infinity - Infinity` is `NaN`, which makes the comparator incoherent for two unranked packages and leaves their order to the engine. Covered by a test that sorts all six input permutations of three unranked packages and asserts one result.
- **The badge leads with the number** (`TierLevelMark` — a filled chip in the tier colour, digit in the card background), then the package icon, then the name. The number is what is being looked up; the icon is identity, not rank. `TierInitial` (dense rows) shows the digit instead of initials for a ranked package — in one character "2" says more than "G". The scope tooltip gains a "TIER 2" eyebrow above the name, and its flip-height estimate accounts for that extra line.
- **Where it renders:** projects-list cards (admin button + staff badge), project detail header (plus "Tier 1 scope:" on the inline chips), the picker menu ("Tier 1 · SEO Starter"), the New Project form, the dashboard Active Projects list, topbar global search, and Settings → Client Packages.
- **A new package defaults to the next free rung** (`nextTierLevel`), so adding the third tier is a click rather than a decision. The level control offers `None` plus 1–5, stretched far enough to always include the level the package already holds — otherwise editing a tier 7 package would offer no way back to 7.
- **Backfilled from `sort_order + 1`**, which reproduced the owner's stated vocabulary exactly: **SEO Starter = Tier 1** (9 projects), **Growth SEO = Tier 2** (5 projects). The backfill is guarded on NO row having a level yet — the same idiom as the seed block in [scripts/project-tiers.sql](scripts/project-tiers.sql) — so a re-run can never re-rank a package the admin deliberately un-ranked. **Proven live in a rolled-back probe**, along with the `>= 1` CHECK refusing tier 0 and a duplicate rung being allowed.
- **RLS re-proven on the new column with real uids** (2026-09-02): staff READ the levels, a staff UPDATE matched **0 rows**, admin write succeeded, **anon saw 0**. Adding a column to a `for all` policy does not change the policy, but the rule is prove it, don't assume.
- **There is no third package yet** — one was NOT invented, because a placeholder package with fabricated quotas is exactly the fake production data the Dummy Content rule forbids. Settings → Client Packages → **New package** creates it with level 3 pre-filled.

- **The package LIST is data, not code** (owner decision 2026-09-01, choosing "editable in the app" over a `lib/*.ts` constant): `pm_project_tiers` holds name / **level** / short label / icon / colour / scope / sort order, and the admin edits it at **Settings → Client Packages** ([app/(app)/settings/packages/page.tsx](app/(app)/settings/packages/page.tsx), `AdminOnly`). A quota changes with a price list, not with a release — renaming a package or editing its scope must never need a deploy.
- **Seeded from the real invoice templates** so the badge and the quotation agree: **SEO Starter** (5 pages · 10 keywords · 20 starter backlinks · 4 articles · GMB audit) and **Growth SEO** (10 pages · 20 keywords · 50 backlinks/mo · 4 articles/mo · GMB + 1 post/week · CRO · strategy call). Both were lifted from `pm_invoice_templates` live rows.
- **The monthly PRICE is deliberately NOT in the seeded scope.** Staff need the quotas to do the work; what a client pays is owner-only (see the Owner-Only Financial Data rule). The engagement term ("6-month engagement") is kept — that is scope, not revenue. The admin can put pricing back from Settings if they want it; nothing stops them.
- **RLS is scoped, not `pm_allow_all`:** `pm_project_tiers_select` is `auth.role() = 'authenticated'` (the badge exists FOR staff, but the anon key ships in the client bundle and has no business reading the package list) and `pm_project_tiers_admin_write` is `for all using/with check (public.pm_is_admin())`. **Verified live 2026-09-01** with real uids: staff read 2 packages but INSERT was refused `42501` and UPDATE/DELETE matched 0 rows; admin insert+update+delete OK; **anon reads 0**. The whole probe was rolled back, leaving nothing behind.
- **Labelling is manual, per project** — matching the owner's standing preference for labelling their own data rather than a heuristic backfill. Three places set it: the **projects-list card** (admin clicks the badge → `TierPickerMenu`, the fast path for labelling many clients without opening each one), the **project detail header**, and the **New Project** form.
- **The owner's vocabulary: "tier 1" = SEO Starter, "tier 2" = Growth SEO** (established 2026-09-01; **now recorded in the data** as `pm_project_tiers.level` rather than living only in this file — see the tier LADDER section above). Confirmed against the live invoices, not assumed — Cleanitize (WSG-2026-06-01), Speckled Space (WSG-2026-07-15-3) and SgInsure (WSG-2026-08-11) all hold **Growth SEO** line items at S$750/mo, and all three were named as tier 2. Note the invoice evidence does NOT cover every client: the four projects with *linked* SEO retainer invoices (Ionxlab, Outpost SG, RL Transport, SG Dynamics) are all Starter, and most Growth invoices carry a `bill_to_name` with **no `project_id` link at all** — so never infer a client's package from `pm_invoices.project_id` alone.
- **Live labelling applied 2026-09-01** on the owner's instruction (not inferred): **Growth SEO (5)** — Speckled Space, SG Insure, Drum tutor, s-torgue medical and auto supplies, Cleanitize. **SEO Starter (9)** — 3 projects SEO client, ASC Racking, Ascent Consultancy, Cemimax, Ionxlab, Outpost SG, PolyGo, RL Transport, SG Dynamics. **13 left deliberately unlabelled** — the 12 website-build-only projects plus the internal Webby SG ones: an SEO retainer badge on a one-off build would tell staff there is monthly scope (keywords, articles, backlinks) where there is none, which is the exact confusion the badge exists to remove. **No badge = no retainer**, and that is a meaningful state, not a gap to be filled.
- **`pm_projects.tier_id` is ON DELETE SET NULL.** Deleting a package never deletes or orphans projects — they just lose the badge. `deleteProjectTier` clears the pointer in the store too, or those cards would keep rendering a badge whose row is gone. Every read goes through **`findTier()`**, which returns null for a dangling id, so a stale persisted store can't render a broken badge.
- **`TierPickerMenu` is portalled to `<body>`** for the usual reason (project cards are `overflow-hidden` and dnd-kit puts a transform on the drag wrapper) and, like `StaffAssignMenu`, **swallows a dismissing click that lands on a project card** with a one-shot capture-phase `preventDefault` — otherwise closing the menu would navigate into a project. Unlike the staff popup it DOES close on an outside click: every row writes immediately, so there is nothing typed to protect (the Dismiss & Discard rule exempts plain menus). The scope tooltip on `TierBadge` is portalled for the same clipping reason.
- **Where the badge renders:** projects list cards, the project detail header (which spells the scope out inline as chips rather than hiding it in a tooltip — on the project you are working on, the quotas ARE the brief), the dashboard Active Projects list, and global search results in the topbar.
- **`icon`/`color`/`scope` are unconstrained text**, same reasoning as `pm_keywords.status` and `seo_phase`: every CHECK on `pm_tasks` has needed a live migration to add a value. `TIER_ICON_KEYS` in [lib/project-tiers.ts](lib/project-tiers.ts) is the source of truth for the picker, and `TierIconGlyph` **falls back to the default icon** for an unknown key rather than rendering nothing.
- **`addProjectTier` is the one non-optimistic write** in the module — the id comes from `gen_random_uuid()`, so the row has to come back before it can go in the store. `setProjectTier` / `updateProjectTier` / `deleteProjectTier` all patch Zustand first, then **roll back and rethrow** on failure (Known Recurring Mistake #13), and each caller renders the reason with `errorMessage()`.
- **Not built:** a tier filter on the projects list, drag-to-reorder in Settings (the `level` buttons rank the ladder; `sort_order` is now only a tiebreaker for unranked packages), per-tier quota *tracking* (e.g. "3 of 4 articles done this month" — the data exists in the Articles sheet and the weekly SEO engine, but the badge is deliberately a label, not a meter), and any link from a package to the invoice template it came from.

### Project Staffing Module (2026-08-12)

Who is assigned to a project lives in `pm_projects.assigned_staff` (uuid[] of auth ids, `staffAuthId = user_id ?? id`). It is not cosmetic — it drives **project visibility for staff** (`app/(app)/projects/page.tsx` and the dashboard filter on `assignedStaff.includes(user.id)`), and DB trigger `pm_projects_sync_channel_members` adds newly-assigned staff to the project's chat channel (**additive only** — removing someone from the project does NOT remove them from the channel).

- **ADMIN-ONLY, on both surfaces.** The project detail page's avatar row was previously ungated, so any staff member could add or remove people from a project (and thereby change who could see it). Fixed 2026-08-12: staff now see the same avatars read-only ("Nobody" when empty); the remove-on-click avatars and the `+` menu render only for `isAdmin`. Enforcement is app-level — `pm_projects` uses blanket RLS, same trust model as the rest of the app.
- **Fast path — the projects LIST popup.** Assigning across many projects used to mean opening each project. Each card's footer staff cluster is now an admin button (avatars + `UserPlus`, or "Assign staff" when empty) opening `StaffAssignMenu`: every active staff member listed with a green check when assigned, one click to toggle, a search box once there are >6 staff, a per-row spinner while the write is in flight, and a red error line on failure. Live staff is fetched once by the page and passed down; the checkmarks track the store, so they update as you click.
- **The popup MUST be portalled to `document.body`.** The card is `overflow-hidden` and dnd-kit puts a `transform` on the wrapper while dragging — either would clip the panel or turn it into the containing block for `position: fixed`. It is positioned from the trigger's `getBoundingClientRect()` captured at open time, flips above the trigger when there's no room below, and closes on outside click / Escape / page scroll / resize (scrolling INSIDE the staff list is excluded, and the trigger itself is excluded from the outside-click handler or the click that follows would reopen it). Same class of trap as the credentials Manage menu. The dismissing click is **swallowed** with a one-shot capture-phase `preventDefault` — the card behind the popup is a `<Link>`, so without it dismissing would navigate into the project; `preventDefault` stops only the anchor (next/link bails on `defaultPrevented`) while React `onClick` handlers still fire, so clicking another card's staff button switches popups in ONE click.
- **Writes roll back on failure.** `assignStaff`/`removeStaff` (via the shared `setAssignedStaff` helper in [lib/store.ts](lib/store.ts)), `moveProjectToChannel` and `updateProject` all patch Zustand optimistically, then restore the previous value and **rethrow** if the DB write fails; every caller catches and renders the reason with `errorMessage()`. Before this, `dbUpdateProject` didn't check its error at all (Known Recurring Mistake #13) — a rejected assignment looked successful until the next `refresh()` silently undid it.

### Uploads & File Persistence Module (2026-08-09)

Fixes a cluster of bugs that all presented to staff as **"I uploaded it and it doesn't show"** (reported by Samia). Diagnosis evidence: **50 of 91** task uploads existed in the `pm-attachments` bucket but were referenced by no attachment/comment/description row, and `pm_task_activity` (the tamper-evident trigger log) showed clusters of uploads with **no matching `field='description'` row** — e.g. task `6be35c56` took 4 uploads in 14 seconds on 2026-08-04 with zero description saves logged. The saves never reached Postgres.

Four independent causes, all fixed:

1. **The project Files tab was a fake uploader.** `handleFileUpload` → `store.addMedia` wrote a `blob:` URL into local Zustand state only — no storage upload, no DB row. Files vanished on the next `refresh()` (which runs on every pathname change and rebuilds `project.media` from the DB) and **no other user ever saw them**, so nothing was recoverable and nothing was even logged. Now: `store.uploadProjectMedia` → `uploadProjectFile()` → `pm_project_media` row (see the table above). The tab has drag-and-drop, an uploading spinner, a red error panel, and cards link to the real file. `addMedia` no longer exists.
2. **DB write errors were discarded.** `dbUpdateTask` never checked `error` at all, and `dbAddAttachment` only `console.error`'d. Both now **throw**. Callers update Zustand optimistically, so a swallowed error is indistinguishable from success until a refresh silently reverts it.
3. **The description save was fire-and-forget.** [components/task-drawer.tsx](components/task-drawer.tsx) called `updateTaskDescription(...)` without `await` or `.catch`. Combined with (2), a failed save produced *no* signal — not even a console error. Now it sets `descSaving`/`descSaveError` state and renders a red "Description not saved — …" panel telling the user to copy their text before closing. `uploadTaskAttachment` likewise now `await`s `dbAddAttachment` **before** showing the attachment, and `deleteAttachment`/`removeMedia` restore their optimistic removal if the delete fails.
4. **Pasted images were inlined as base64, which is what made those saves fail.** `RichEditor.handlePaste` only intercepted clipboard items of `kind === "file"` (screenshots). An image copied from a **web page, Word or Google Docs** arrives as `text/html` containing `<img src="data:image/…;base64,…">` and went straight into the row — producing descriptions up to **1.46 MB**, all of which every user downloaded on every navigation (`loadAll` does `select *` on `pm_tasks`). `handlePaste` now also detects `data:image` in the pasted HTML and routes it through `pasteHtmlWithUploadedImages()`, which converts each data URI to a real File (`dataUrlToFile` in [lib/supabase.ts](lib/supabase.ts)), uploads it, and rewrites `src` to the storage URL. An image that fails to upload is **dropped, not inlined** — re-embedding the blob is the bug.
   - **Backfill:** [scripts/migrate-base64-descriptions.mjs](scripts/migrate-base64-descriptions.mjs) (plain `fetch`, no supabase-js — node_modules is unreliable under OneDrive) migrated the already-damaged rows. **Run against LIVE on 2026-08-09: 6 tasks, 9 images, 3.10 MB → 3.0 KB of description text** (total across all tasks: 3187 kB → 16 kB). All 9 images verified reachable (HTTP 200, `image/png`). Backup of the originals is written to `scripts/base64-descriptions-backup.json` (gitignored) in `--apply` mode; it defaults to a dry run.

**None of this was account-specific.** There is no per-staff upload permission anywhere — `pm_task_attachments`, `pm_project_media` and `storage.objects` are all blanket-allow for authenticated users. The bugs were code-level and hit everyone; by orphan count the **admin** was the biggest victim (Leon 49 orphans / 79 uploads, Samia 1 / 5, Mohsin 0 / 1). Fixes therefore apply to every current and future staff member automatically — nothing to configure per account.

**`canEdit` (task drawer) — widened 2026-08-09.** Was `isAdmin || isMyTask`, so the description/title/due-date/child-task controls were hidden from staff on any task not assigned to them, with no way out. Now `isAdmin || isMyTask || isCreator || isUnassigned`:
- **`isCreator`** — a staff member who created a task can edit it even if it's assigned to someone else (26 live tasks had creator ≠ assignee). Mirrors the deletion-request model, which already trusts `created_by`.
- **`isUnassigned`** — an unassigned task was editable by **admins only**, freezing it for all staff. `revokeStaff` sets `assignee_id = NULL` when it can't find a live admin to reassign to ([app/actions/invite.ts](app/actions/invite.ts)), so revoking a staff member could silently freeze their whole backlog for everyone else. Staff only ever reach tasks inside projects they're assigned to, so this stays within the existing visibility boundary.
- The **paperclip "UPLOAD TO TASK"** control was already ungated for everyone — only the description path was affected.

**Upload size guard.** `MAX_UPLOAD_MB` / `MAX_UPLOAD_BYTES` / `formatBytes` in [lib/utils.ts](lib/utils.ts) (50 MB — Supabase's global default; no bucket sets its own `file_size_limit`). Task attachments and project files check size **before** uploading and name the offending file and its size. Both loops are also per-file now, so one bad file no longer aborts the whole batch.

**Storage layout** (all in the public `pm-attachments` bucket, via `uploadToBucket` in [lib/supabase.ts](lib/supabase.ts)): task attachments → `<task_id>/`, project files → `projects/<project_id>/`, chat → `chat/<conversation_id>/`.

**Caveat:** deleting an attachment removes the DB row but **not** the storage object, so some orphaned objects are legitimate deletions rather than lost uploads. There is no storage GC.

### Dismiss & Discard Guard Module (2026-08-17)

**User rule: clicking outside a popup must not close it immediately.** Chosen behaviour: a dismiss gesture closes an **untouched** dialog straight away, but once anything has been typed / changed / staged it **asks first** ("Discard unsaved changes?" → Keep editing / Discard). Applies to EVERY dismiss path, not just the backdrop — ✕, Cancel/Done, and the drawer's Back button all go through the same call, so they can't disagree.

- **One implementation: `useDiscardGuard` in [components/discard-guard.tsx](components/discard-guard.tsx).** `{ dirty, onClose, busy?, title?, message?, discardLabel? }` → `{ requestClose, guard }`. Wire `onClick={requestClose}` on the backdrop/✕/Cancel and render `{guard}` anywhere in the dialog's tree. `busy: true` (a save/upload in flight) swallows the dismiss entirely — closing mid-write is worse than either outcome.
- **The confirm is PORTALLED to `<body>` at `z-[200]`** with its own backdrop, so it sits above (and shields) whatever dialog it's asking about regardless of that dialog's z-index or `overflow`. Escape is captured (capture phase) so answering the question can't also close the thing being protected.
- **`dirty` is derived per dialog, never stored:** on a NEW record it's "any meaningful field filled"; on an EDIT it's "differs from the row as loaded". Follow that pattern for new dialogs — a `dirty` flag that has to be maintained by hand goes stale.
- **Wired into:** task drawer (backdrop / ✕ / Done / Back — dirty = unposted comment draft, staged comment files, open comment edit, typed-but-unadded subtask, title edit, article-URL draft, unsaved discussion note; each panel in the stack reports up to the stack's backdrop via `onDirtyChange`), New Task dialog (tasks page), Record expense ([components/expense-form.tsx](components/expense-form.tsx) — replaced its hand-rolled `confirm()`; still refuses to drop staged receipts), Add renewal, the five project-detail dialogs (new weekly report, add task, add pin, edit project, apply template), edit credential, set staff password, record invoice payment, convert quote → invoice, and the chat create-task-from-message / new-conversation / members dialogs.
- **Deliberate exceptions.** (1) *Post-action* closes stay raw `onClose()` — after delete / archive / move / a successful save the work is committed, so there's nothing to protect. (2) The project-page **Add Task** dialog only guards its staged FILES: its text fields are draft-persisted by `useDraft` (localStorage) and come back on reopen. (3) Plain **menus** (credentials Manage, chat ⋮ / emoji / sound) still dismiss on an outside click — every action in them writes immediately, so nothing can be lost.
- **The projects-list staff-assign popup is the one structural change** ([app/(app)/projects/page.tsx](app/(app)/projects/page.tsx) `StaffAssignMenu`): it holds nothing typed, so "confirm" has nothing to confirm — instead an outside click **no longer closes it at all** (it's a batch surface: assign several people across several projects). Close with ✕, Escape, or its own staff button; clicking **another card's staff button** hands over so only one popup is ever open (`data-staff-trigger`). A click landing on a project card is **swallowed** (`data-project-card` + one-shot capture-phase `preventDefault`) so the card's `<Link>` doesn't yank you into the project — meaning you must close the popup before navigating; the panel says so ("Stays open while you assign — press Esc or ✕ to close"). Scroll/resize now **re-measure the trigger and follow it** instead of closing (closing on scroll would be the same surprise by another route).
- **Lint note:** this repo's `react-hooks/set-state-in-effect` rule is on. The guard therefore derives `showConfirm = asking && dirty` at render instead of syncing state in an effect, and the staff popup seeds its rect from the prop without a sync effect. Don't reintroduce either.

### Chat Module

- **All authenticated users** (admin + staff). New `Chat` sidebar entry with realtime unread badge.
- **Three conversation kinds:**
  - `project` — one channel per project, **auto-created** on `pm_projects` insert via trigger `pm_projects_create_channel`. Members default to `assigned_staff` + all `user_roles` admins. Trigger `pm_projects_sync_channel_members` adds new staff to the channel when `assigned_staff` updates (additive only — doesn't remove). Unique per project (partial unique index). `ensureProjectChannel` is now mostly a no-op safety net.
  - `dm` — 1-on-1 between any two users. `findOrCreateDM` ensures only one exists per pair.
  - `group` — ad-hoc named group chat, any 3+ users picked at creation.
- **Realtime:** Supabase realtime subscriptions on `pm_chat_messages` (per-conversation for live streaming) + a separate inbox subscription for the sidebar unread badge. Trigger `pm_chat_messages_bump_last` auto-updates `pm_chat_conversations.last_message_at` on every insert.
- **Unread:** counted as messages in conversation where `created_at > member.last_read_at AND author_id != self AND deleted_at IS NULL`. `markRead` updates `last_read_at` on every conversation open. **Two hardening rules (2026-08-04, after a phantom "unread badge but nothing there" report):** (1) `markRead` sets `last_read_at: "now"` — the Postgres special date/time input, evaluated SERVER-side — never the client clock (a browser clock behind the server stamps the marker in the past and messages stay counted unread forever); (2) `subscribeToInboxForUser` doesn't trust realtime alone — Supabase never replays events missed while a websocket was down (laptop sleep, backgrounded tab), so it also fires the refresh callback on channel REjoin (`SUBSCRIBED` after the first), on window focus / visibilitychange, and on a 60s interval while the tab is visible. All unread surfaces go through it: the sidebar badge (`use-chat-unread.ts`), the floating unread-inbox popup, AND the chat page's conversation list (which previously had its own INSERT-only channel with none of this). Refresh callbacks swallow fetch errors (keep the previous count) so one failed request can't strand a stale badge. Diagnosing a phantom badge: join `pm_chat_members` × `pm_chat_messages` on `created_at > last_read_at AND author_id <> user AND deleted_at IS NULL` — zero rows means the badge was stale client state, not data. Note: thread replies (`parent_id` set) DO count as unread but are only visible inside their thread, not the main timeline.
- **@-mentions:** parsed from message body via `@firstname` regex (case-insensitive). Resolved against active `staff_members` first names. Persisted in `pm_chat_mentions` and trigger a targeted `pm_notifications` row (`type=mention`, `user_id=<recipient>`, `link=/chat`).
- **Notification targeting:** `pm_notifications.user_id` is NULL for workspace-global notifications (legacy behavior) and set for targeted ones. Staff filter their tray to `userId IS NULL OR userId = self`; admin filter is unchanged (approval_request only).
- **Attachments:** reuse `pm-attachments` bucket under `chat/{conversation_id}/{timestamp}_{name}` path. One NON-IMAGE attachment per message; **images are INLINE and unlimited (2026-07-23):** pasting/dropping/picking an image uploads it immediately (`uploadChatAttachment`) and inserts an **`[img:<url>]` token at the caret** in the composer, so text and images interleave in one message (sentence → image → text → image). `RenderBody`'s combined regex (`@mention | [task:uuid] | [img:url]`) renders the token as an inline image (max 340px, click opens full size). Send is blocked while uploads are in flight (`uploadingImgs`). Every snippet surface renders the token as 📷 (`chatSnippet` in chat-db for conversation previews; local replaces in `pinnedSnippet`, chat-toast-container, push route); the Media panel's Images tab includes inline images (loader `.or(attachment_type.eq.image, body ilike %[img:%)`), and its Links tab strips them; create-task-from-message converts them to real `<img>` in the task description. The Composer accepts the paperclip picker, **clipboard paste** (`onPaste` → image items become the staged file), and **drag-and-drop** onto the textarea. **Images are first-class, not file chips** (2026-07-22): a staged image shows a real preview (max ~240×170, X badge to remove — non-image files keep the name chip); sent image attachments render **inline** in the main timeline AND thread replies (shared `MessageRow`, max 340px, click to open) and as thumbnails in the PinnedPanel (max 200×150); quote/pin snippets show `📷 Photo` instead of `📎 <name>`. `uploadChatAttachment` derives `attachment_type` (`image`/`video`/`document`) from the MIME type — the inline render keys off `attachmentType === "image"`.
- **Edit / delete:** soft delete via `deleted_at` (preserves thread integrity + unread counts). Edit sets `edited_at`. Both gated to author only at UI layer. **The in-place edit box has the SAME @-mention autocomplete as the Composer** (added 2026-07-24; `editMention*` state + `editRef` in `MessageItem`, mirrors the composer's dropdown + arrow/Enter/Tab/Escape keys — same pattern as the task-drawer comment edit box). On save, mentions are re-resolved and ONLY people newly tagged by the edit get a `mention` notification — pre-existing mentions never re-fire.
- **Unread divider:** MessageView captures the user's `last_read_at` once on mount (stable for the session) and renders a red "NEW" divider above the first message that arrived after it. The divider sticks until you switch conversations or unmount — it doesn't disappear the moment `markRead` writes.
- **Member management:** click "Members" in the conversation header (groups + project channels; hidden for DMs). Dialog allows rename (groups only), add member, remove member. Groups: any member can manage; project channels: admins only.
- **Task references in messages:** type `#` in the composer to open a task picker dropdown (all active tasks across all projects user can see). On select, inserts `[task:<uuid>]` into the message body. Renderer parses these tokens and renders inline as a clickable card with title + project + status badge, linking to `/projects/<projectId>?task=<taskId>`. Combined regex in `RenderBody` handles `@mentions` and `[task:UUID]` in one pass.
- **Create task from a message (both admin + staff):** every non-deleted message (main timeline AND thread) has a hover **ListTodo** button → `CreateTaskFromMessageDialog` (in [app/(app)/chat/page.tsx](app/(app)/chat/page.tsx)). Prefills: title = cleaned body (task tokens stripped, 120 chars), project = the channel's project (project channels; DMs/groups pick manually), assignee = **first @mention in the message** else self, priority P5, no due date. On create: `store.addTask` (returns the id); the message body is written into the task **description** with a "From chat — <author>, <timestamp>" provenance line (HTML-escaped); an image/file attachment on the message is **carried over** as a task attachment via `dbAddAttachment` (same storage URL, no re-upload) + `refresh()`. Afterwards a `[task:<id>]` reference is dropped into the composer (reuses `pendingTaskInsert`) so one Enter shares the task card in the conversation. `uuid()` is now **exported** from [lib/store.ts](lib/store.ts) for this.
- **Tasks side-panel:** "Tasks" button in the conversation header toggles a right-hand panel (320px). For project channels: shows that project's tasks grouped by status. For DMs/groups: shows tasks assigned to any conversation member. Search bar filters by task title or project name. Each row has "Reference in chat" (inserts `[task:UUID]` into the composer via lifted state in MessageView) and "Open →" (deep-link to task drawer).
- **Conversation list dual-badge:** each conversation row in the left sidebar shows two badges — an accent pill with task count (`getConvTaskCount` — for project channels = project's active tasks; for DM/group = tasks assigned to any member) and a red unread-count badge. Both hide at 0.
- **Toast notifications:** [components/chat-toast-container.tsx](components/chat-toast-container.tsx) mounted globally in `app/(app)/layout.tsx`. Subscribes to `pm_chat_messages` INSERT events, filters to conversations the user is a member of (cached set, refreshed via realtime on `pm_chat_members` changes), suppresses toasts when user is already on `/chat`. Toasts auto-dismiss after 5s, click to navigate to /chat. Also plays the notification chime ([lib/notification-sound.ts](lib/notification-sound.ts)).
- **App notification popups (Slack-style):** [components/notification-toast-container.tsx](components/notification-toast-container.tsx), also mounted in `app/(app)/layout.tsx`. Subscribes to `pm_notifications` INSERT (now in the `supabase_realtime` publication) and shows **top-right** transient popups (chat toasts are bottom-right, so they don't collide). Relevance mirrors the bell ([components/topbar.tsx](components/topbar.tsx)): admin → only `approval_request`; staff → `user_id IS NULL` or `user_id === self`. **`type='mention'` is excluded** (the chat toast already covers mentions — avoids double-popping). Suppressed on `/notifications`. Plays the chime; click navigates to `link`/project/task; auto-dismiss 6s.
- **Member integrity rules:** triggers `auto_create_project_channel` and `sync_project_channel_members` only include user_ids that have an active `staff_members` row — prevents ghost owners (auth users in `user_roles` with no staff_members entry) from being added.
- **Delete / leave:** MembersDialog footer has danger-zone buttons. **Delete is admin-only** for both groups and project channels (DMs aren't deletable from UI). Hard-deletes cascade to messages/members/mentions via FK. "Leave group" removes self only and is available to any member. Both use two-click confirm. Deletion closes the open conversation in the parent page (`onDeleted` callback).
- **Pin & Categories (per-user, both admin + staff):** Each user can pin conversations and organize them into self-created **categories** (folders). State is **personal** — stored on the user's own `pm_chat_members` row (`pinned`, `category_id`), never shared. Categories live in `pm_chat_categories` (per-user, named, reorderable via `sort_order`). The conversation list renders as collapsible sections: **Pinned** (all pinned, regardless of category) → each **category** → **Uncategorized**. If the user has no pins and no categories, the list falls back to a plain flat list. Collapsed-section state persists in `localStorage` keyed `chat-collapsed-<userId>`. Per-row **⋮ menu**: pin/unpin, move to any category, "New category…" (create + move in one step), remove from category. **Category header ⋮ menu**: rename (inline), delete (two-click confirm; deleting a category un-categorizes its chats via `ON DELETE SET NULL`, never deletes the conversations). "New category" button at top of the list creates an empty folder. All mutations are optimistic (local state first, persist async, reload on error). chat-db helpers: `loadChatCategories`, `createChatCategory`, `renameChatCategory`, `deleteChatCategory`, `setConversationPinned`, `setConversationCategory`. `loadConversationsForUser` returns the current user's `pinned`/`categoryId` on each `ConversationWithUnread`.
- **Message threads (Slack-style, both admin + staff):** Any message can be replied to in a thread. Hover a message → **Reply** (↰ `CornerUpLeft`) opens a right-hand **ThreadPanel** (root message + replies + its own composer). Replies are `pm_chat_messages` rows with `parent_id` = the thread-root id. The **main timeline only shows top-level messages** (`loadMessages` filters `parent_id IS NULL`); replies live in the thread. Root messages with replies show a **"💬 N replies · last reply time"** badge (`MessageCircle`) that reopens the thread. Reply-count metadata comes from `loadThreadMeta(conversationId)` → `Map<rootId, ThreadMeta>`, kept live by incrementing in the realtime `onInsert` (routed by `parentId`). The thread composer reuses `<Composer>` with a `parentId` prop. **One** realtime channel per conversation (`subscribeToConversation`) feeds both the main list and the open thread — the ThreadPanel is presentational (no own subscription) to avoid duplicate Supabase channels.
- **Pinned messages (shared per conversation, unlimited, both admin + staff):** Any member can pin/unpin **individual messages** (incl. ones holding links/files) via the hover **Pin** icon. Pins live in `pm_chat_pinned_messages` (shared, not per-user — distinct from per-user *conversation* pinning on `pm_chat_members.pinned`). Header **"Pinned · N"** button toggles the right-hand **PinnedPanel** (full list, click links directly, unpin); a slim **pinned banner** under the header shows the latest pin for quick access. Realtime via `subscribeToPinned`. chat-db helpers: `loadPinnedMessages`, `pinMessage`, `unpinMessage`, `subscribeToPinned`. Pinning is **not** a destructive action, so it is intentionally open to staff (unlike delete).
- **Notification sound:** [lib/notification-sound.ts](lib/notification-sound.ts) synthesizes a short two-note chime via the Web Audio API (no audio asset, no bundle cost). `playNotificationSound()` is called on incoming messages from others in **MessageView** (`onInsert`, when on /chat) and in **chat-toast-container.tsx** (when elsewhere in the app) — together they cover both cases without double-playing. Mute is a per-browser pref in `localStorage` (`chat-sound-muted`), toggled by the **🔊/🔇 button in the conversation header** (`isChatSoundMuted`/`setChatSoundMuted`). Audio is lazily created/resumed on first play to satisfy browser autoplay policies.
- **Desktop (OS) notifications:** [lib/web-notifications.ts](lib/web-notifications.ts) fires native `Notification`s via the Web Notifications API when a relevant chat message / app notification arrives **and the tab isn't focused** (`document.visibilityState !== 'visible'`) — wired into both `chat-toast-container.tsx` and `notification-toast-container.tsx`. Permission is requested via the **"Enable desktop alerts" button in the chat header** AND a global **"Enable alerts" button in the topbar** ([components/topbar.tsx](components/topbar.tsx), shown only while permission is `default`) so it's reachable from any page (`getNotificationPermission`/`requestNotificationPermission`). **Scope:** works while the app is open in a (possibly backgrounded) tab — NOT when the browser is fully closed (that needs Web Push: service worker + VAPID + a server endpoint, a separate future feature).
- **Emoji reactions (both admin + staff):** any member can react to a message; reactions are **shared** (table `pm_chat_reactions`). Hover a message → **Smile** icon opens a fixed picker (`👍 ❤️ ✅ 😂 🎉 👀 🙏 🔥`); reactions render as chips under the message (count + highlighted if you reacted; click a chip to toggle yours). Realtime via `subscribeToReactions`; state is a `Map<messageId, ChatReaction[]>` in MessageView, reloaded on any change. Work on **both** the main timeline and inside the **thread panel** (MessageView passes the reactions Map + `handleToggleReaction` to ThreadPanel). chat-db helpers: `loadReactions`, `addReaction`, `removeReaction`, `subscribeToReactions`.
- **Unread inbox popup (global, bottom-right):** [components/unread-inbox.tsx](components/unread-inbox.tsx), mounted in `(app)/layout.tsx`. A floating button with the **total unread chat count**; click opens a popup listing every conversation with unread messages (icon, display name, last-message preview, per-conversation unread badge, relative time). Clicking a row deep-links to **`/chat?c=<conversationId>`**, which the chat page reads (`useSearchParams` + a one-shot `deepLinkRef`) to auto-select that conversation. Refreshes via `subscribeToInboxForUser`. **Hidden on `/chat`** (the sidebar already shows unread there). The chat message toasts were nudged up (`bottom: 90`) so they don't overlap this button.
- **Media panel (shared images + links, both admin + staff):** header **"Media"** button (Image icon) toggles a right-hand panel with two tabs — **Images** (grid of every image shared in the conversation via `loadConversationImages`; for PROJECT channels a second "From tasks" section lists image attachments from that project's tasks, straight from the store) and **Links** (every http(s) URL extracted from message bodies via `loadConversationLinkMessages` + `MEDIA_URL_RE`). Every item shows its date (`formatTime`); click a chat item → `scrollToMessage` jump+flash (limited to the loaded ~200-message window, like the PinnedPanel; thread-reply images silently no-op); click a task image → opens the task drawer; hover ⧉ opens the file full-size. Mutually exclusive with the Pinned/Tasks panels (`toggleMediaPanel`).
- **Jump-to-message & in-conversation search:** each timeline row carries `data-mid={message.id}`. The **PinnedPanel** "Jump →" button calls `scrollToMessage(id)` → `scrollIntoView` + a 1.6s `.msg-flash` highlight (global keyframes in MessageView). The header **search** (🔍) toggle opens a filter bar that narrows the visible timeline to messages whose body matches (case-insensitive), with a live match count; clearing/Escape restores the full timeline. Jump clears any active search first so the target is in the DOM. Both are scoped to the loaded window (latest ~200 messages).
- **Key files:**
  - `lib/chat-types.ts` — types (incl. `ThreadMeta`, `ChatPinnedMessage`, `parentId` on `ChatMessage`)
  - `lib/chat-db.ts` — CRUD + realtime helpers + mention parsing + threads (`loadThreadReplies`/`loadThreadMeta`) + pinned (`loadPinnedMessages`/`pinMessage`/`unpinMessage`/`subscribeToPinned`)
  - `lib/notification-sound.ts` — Web Audio chime + mute pref helpers
  - `lib/web-notifications.ts` — desktop/OS Notification API helpers (permission + show-when-unfocused)
  - `components/notification-toast-container.tsx` — Slack-style popups for `pm_notifications` (mounted in `(app)/layout.tsx`)
  - `components/unread-inbox.tsx` — global bottom-right floating unread-messages launcher (mounted in `(app)/layout.tsx`; deep-links via `/chat?c=<id>`)
  - `lib/use-chat-unread.ts` — hook for sidebar badge
  - `app/(app)/chat/page.tsx` — single-page UI (list + view + composer + ThreadPanel + PinnedPanel + reactions + search + new-conversation dialog)

### PWA & Web Push (Mobile / installable app)

The web app is an installable **PWA** (Android: "Install app" / Add to Home screen → standalone window, app icon) with **Web Push** so chat messages and targeted notifications arrive **even when the app is closed**. No separate mobile codebase.

- **Installable:** [app/manifest.ts](app/manifest.ts) (Next `MetadataRoute.Manifest`, served at `/manifest.webmanifest`) + `viewport.themeColor` and `appleWebApp` metadata in [app/layout.tsx](app/layout.tsx). Icons currently reuse `public/webby-sg-logo.png` for 192/512/maskable — **replace with purpose-built 192×192 and 512×512 (maskable, full-bleed) icons** for a polished home-screen look.
- **Service worker:** [public/sw.js](public/sw.js) handles `push` (shows the notification) and `notificationclick` (focuses an existing tab / opens the URL). Registered by [components/pwa-register.tsx](components/pwa-register.tsx), mounted in the root layout.
- **Subscribe flow:** [lib/push.ts](lib/push.ts) `subscribeToPush(userId)` subscribes via `PushManager` using `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and upserts to `pm_push_subscriptions`. Called after permission is granted (chat header + topbar "Enable alerts") and auto-refreshed on load for already-opted-in users.
- **Sending pushes — Node API route, NOT an edge function:** [app/api/push/send/route.ts](app/api/push/send/route.ts) (`runtime = "nodejs"`) uses the `web-push` npm lib. **All secrets live in the Next.js server env only** (`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SUPABASE_SERVICE_ROLE_KEY`) — nothing sensitive in the DB. It verifies the caller's Supabase access token, recomputes recipients server-side (chat → conversation members except author; notification → `user_id`), loads their subscriptions, sends, and prunes dead subscriptions (404/410).
- **Triggers:** the **client** calls `notifyPush(kind, id)` ([lib/push.ts](lib/push.ts)) right after the write — `'chat'` from the Composer after `sendMessage` (covers main + thread), `'notification'` from `store.addNotification` (covers approval/revision etc.). The route **skips** `type='mention'` and untargeted (`user_id IS NULL`) notifications — so mentions don't double-push (chat covers them) and workspace-global `approval_request` only toasts in-app (no OS push).
- **VAPID keys:** generated with `npx web-push generate-vapid-keys`. Public key → `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (committed-safe, in `.env.local`); private key → `VAPID_PRIVATE_KEY` (`.env.local`, gitignored — **server only**).
- **⚠️ Production setup required:** add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` to the **VPS / GitHub Actions deploy env** (they're only in local `.env.local` now). Push needs HTTPS (already have via `os.webby.sg`). Optional next step: wrap as a **TWA** for the Play Store.

### Known Recurring Mistakes

The numbered list the rest of this file cites. Add to it rather than renumbering — the numbers are referenced from other sections.

**#10 — Writing pm-tool data through the wrong Supabase project.** The live pm-tool project is `tfhzuruaaymfhqmeiusr`; the Supabase MCP has historically pointed at `wmulemkyjrjetwyzrsqq` ("Omnipulse"), a *different* application. **Always run `get_project_url` AND a data fingerprint before any MCP write** (task/project counts, or a column only this project has). Verified reaching the correct project on 2026-07-15, 2026-08-14, 2026-08-19 and 2026-09-02 — but verify every time, because the answer has changed before.

**#13 — Swallowed DB errors behind an optimistic store update.** Every store action patches Zustand first, so a DB helper that only `console.error`s (or ignores `error` entirely) is *indistinguishable from success* until the next `refresh()` silently reverts it. This has bitten `dbUpdateTask`, `dbAddAttachment` and `dbUpdateProject` — and it is what made "I uploaded it and it doesn't show" impossible to diagnose. **Rule: a DB helper throws, the store rolls back its optimistic patch and rethrows, and the caller renders the reason with `errorMessage()`.**

**#14 — Hooks below an early `return` in a page's permission gate (2026-09-02).** Both `/projects/new` and `/content` opened with `if (user && <not allowed>) { router.replace(...); return null; }` sitting **above** their `useState`/`useEffect` calls. This is a real crash, not a lint nit: `user` is null while auth resolves, so the **first** render runs every hook, and the moment `user` resolves to a non-permitted staff member the early return skips them all — React throws *"rendered fewer hooks than expected"* and the page dies. It also called `router.replace()` during a render pass. **Rule: a permission gate is a WRAPPER component, never an early return above hooks.** Use `<AdminOnly>` ([components/admin-guard.tsx](components/admin-guard.tsx)) for admin-only pages; for a different rule (content is admin **or** `can_access_content`) write a wrapper of the same shape — gate in the parent, hooks in the child, redirect inside a `useEffect`. Guard against regressions with `npx eslint app components lib --ext .ts,.tsx | grep -c rules-of-hooks` — that count must stay **0**.
