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
| `pm_projects` | `id`, `name`, `description`, `type`, `phase`, `client_id`, `channel_id`, `start_date`, `due_date`, `assigned_staff` (uuid[]), `archived_at` (admin project archive — loadAll filters IS NULL, hiding the project AND all its tasks; migration [scripts/project-archive.sql](scripts/project-archive.sql), applied live 2026-08-02) |
| `pm_tasks` | `id`, `project_id`, `parent_id`, `title`, `description`, `status` (CHECK: todo/in_progress/**to_be_discussed**/pending_review/**pending_client_approval**/**pending_article_post**/revision_required/done/**missed**/**rejected**), `priority`, `type`, `assignee_id`, `due_date`, `tags`, `recurring`, `recurring_day`, `sort_order`, `created_by` (auth uid, DB `DEFAULT auth.uid()` — who created the task; NULL for service-role/MCP inserts & pre-migration tasks), `deletion_requested_by` (auth uid; non-NULL ⇒ deletion awaiting admin approval), `deletion_requested_at`, `archived_at` (admin archive; loadAll filters IS NULL), `seo_week` (Monday date) + `seo_slot` (weekly SEO engine identity — see Weekly SEO Task Engine module), `requires_article_post` (bool — admin Approve parks the task in pending_article_post until a link is recorded; auto-true on weekly SEO article slots) + `article_url` (the live link recorded via Mark as Posted — see Article-Post Workflow module), `status_changed_at` (timestamptz, DEFAULT now(), maintained by BEFORE-UPDATE trigger `pm_tasks_set_status_changed_at` — when the task last changed status; lets the admin tell a NEW pending_review submission from an old one. Backfilled 2026-07-31 from `pm_task_activity` status rows, else created_at. Migration [scripts/task-status-changed-at.sql](scripts/task-status-changed-at.sql), applied live. UI: "since \<time\>" under the drawer Status cell, "Submitted for review \<time\>" above the admin Approve/Reject footer, "· submitted \<time\>" on tasks-page pending-review rows, purple "Submitted \<time\>" chip on kanban pending_review cards, tooltip on drawer subtask status pills. `statusPatch()` in [lib/store.ts](lib/store.ts) stamps it optimistically on every client status change — use it, not a bare `{ status }` patch), `discussion_note` (text — the admin's parked-for-discussion note; nulled by BEFORE-UPDATE trigger `pm_tasks_clear_discussion_note` whenever status leaves to_be_discussed — see the `to_be_discussed` module) |
| `pm_weekly_seo_plans` | `id`, `project_id` (unique FK → `pm_projects`, CASCADE), `enabled`, `assignee_id`, `include_articles`, `include_backlinks`, `include_gmb`, `created_at`. Which projects get the weekly SEO task set. RLS `pm_allow_all`. |
| `pm_channels` | `id`, `name`, `color`, `order` |
| `pm_clients` | `id`, `name`, `website`, `industry` |
| `pm_credentials` | credentials with `allowed_staff` array |
| `pm_project_templates`, `pm_task_templates` | templates |
| `pm_notifications` | `id`, `title`, `body`, `type`, `project_id`, `task_id`, `read`, `created_at`, `user_id` (nullable — NULL = workspace-global; set = targeted), `link` (optional href) |
| `pm_task_attachments` | file attachments |
| `pm_project_media` | `id`, `project_id` (FK → `pm_projects`, ON DELETE CASCADE), `name`, `type` (image/video/document), `url`, `size`, `uploaded_by`, `uploaded_at`. **Project Files tab storage** — files live in the `pm-attachments` bucket under `projects/<project_id>/`. RLS `pm_allow_all`. Migration [scripts/project-media.sql](scripts/project-media.sql), **applied live 2026-08-09**. Read by `loadAll` (mapped onto `Project.media`), written by `dbAddProjectMedia`/`dbDeleteProjectMedia`. |
| `pm_task_activity` | `id`, `task_id` (FK → `pm_tasks`, ON DELETE **SET NULL** — so a deleted task's history survives), `project_id`, `task_title` (snapshot), `actor_id` (auth uid of whoever changed it), `action` (created/updated/moved/deleted), `field`, `old_value`, `new_value`, `created_at`. **Audit trail** written ONLY by the `pm_log_task_activity` trigger on `pm_tasks`. RLS: **admin-only** select (`pm_is_admin()`); no client write policy (SECURITY DEFINER trigger is the sole writer → tamper-evident). |
| `pm_task_comment_versions` | `id`, `comment_id` (FK → `pm_task_comments`, ON DELETE CASCADE), `task_id`, `body` (the PREVIOUS body), `edited_by` (comment author), `superseded_at`, `created_at`. **Comment edit history** written ONLY by the `pm_snapshot_comment_version` BEFORE-UPDATE trigger. RLS: `pm_is_admin() OR edited_by = auth.uid()` (admin **+ the author**). |
| `pm_weekly_reports` | `id`, `project_id` (FK → `pm_projects`, ON DELETE CASCADE), `week_starting` (date), `summary_notes`, `tasks_snapshot` (jsonb snapshot of task rows), `share_token` (unique, **DB-defaulted** — the insert in `dbCreateWeeklyReport` doesn't send it; backs the public `/report/<token>` page), `created_by`, `created_at`. **⚠️ Table only created in the LIVE project on 2026-07-22** via [scripts/weekly-reports-schema.sql](scripts/weekly-reports-schema.sql) — the Reports tab UI + `lib/db.ts` helpers shipped earlier WITHOUT it (tab silently empty, create failed). RLS: `authenticated` ALL + `anon` token-gated SELECT only (mirrors `pm_articles`). Re-run the script on any fresh project. |
| `pm_chat_conversations` | `id`, `kind` (project/dm/group), `name`, `project_id`, `created_by`, `last_message_at` |
| `pm_chat_members` | `(conversation_id, user_id)` PK + `joined_at`, `last_read_at`, `pinned` (bool, per-user pin), `category_id` (FK → `pm_chat_categories`, ON DELETE SET NULL — per-user folder assignment) |
| `pm_chat_categories` | `id`, `user_id`, `name`, `sort_order`, `created_at` — per-user chat folders. Unique `(user_id, lower(name))`, RLS `pm_allow_all` |
| `pm_chat_messages` | `id`, `conversation_id`, `author_id`, `body`, `attachment_url`, `attachment_name`, `attachment_type`, `edited_at`, `deleted_at`, `created_at`, `parent_id` (FK → `pm_chat_messages`, ON DELETE CASCADE — NULL = top-level, set = thread reply) |
| `pm_chat_mentions` | `(message_id, mentioned_user_id)` — for routing @-mention notifications |
| `pm_chat_pinned_messages` | `id`, `conversation_id` (FK, cascade), `message_id` (FK, cascade), `pinned_by`, `created_at`. Unique `(conversation_id, message_id)`. **Shared** per conversation (not per-user), unlimited. RLS `pm_allow_all`, in `supabase_realtime` publication |
| `pm_chat_reactions` | `id`, `conversation_id` (FK, cascade), `message_id` (FK, cascade), `user_id`, `emoji`, `created_at`. Unique `(message_id, user_id, emoji)`. Emoji reactions, shared. RLS `pm_allow_all`, in `supabase_realtime` publication |
| `pm_push_subscriptions` | `id`, `user_id`, `endpoint` (unique), `p256dh`, `auth`, `created_at`. Browser Web Push subscriptions (one per device/browser). RLS `pm_allow_all`. Read only server-side by the push API route. |
| `pm_billing_reminders` | `id`, `title`, `client_name`, `project_id` (FK, SET NULL), `service_type` (hosting/domain/seo/maintenance/other), `amount`, `currency`, `frequency` (yearly/semiannual/quarterly/monthly/one_time/custom), `interval_months`, `next_due_date`, `lead_days`, `status` (active/paused/done), `paid` (bool — is the current period due on `next_due_date` settled?), `notes`, `last_notified_on`, `last_chased_at`, `created_by`. Recurring renewal / payment-chase reminders. RLS `pm_allow_all`. |
| `pm_expenses` | `id`, `expense_date` (date ON THE RECEIPT — decides the financial year), `vendor`, `category`, `payment_method`, `description`, `amount` (numeric(12,2), total paid **incl. GST**), `gst_amount` (the GST portion inside `amount`; `check gst_amount <= amount`), `currency` (SGD), `project_id` (FK → `pm_projects`, ON DELETE **SET NULL**), `deductible` (bool), `status` (recorded/submitted), `submitted_at`, `submitted_note`, `notes`, `created_by` (DB `DEFAULT auth.uid()`), `created_at`, `updated_at`. **Business expense ledger for IRAS.** `category`/`payment_method`/`status` are deliberately **unconstrained text** (no CHECK) — see the Expenses module. RLS: **admin-only** via `pm_is_admin()` (NOT `pm_allow_all`). Migration [scripts/expenses-schema.sql](scripts/expenses-schema.sql), **applied live 2026-08-14**. |
| `pm_expense_receipts` | `id`, `expense_id` (FK → `pm_expenses`, ON DELETE **CASCADE**), `name`, `url`, `type` (image/document), `size`, `uploaded_by`, `uploaded_at`. **The IRAS source documents.** Files live in the `pm-attachments` bucket under `expenses/<expense_id>/`. RLS: admin-only via `pm_is_admin()`. |
| `pm_invoices` | `id`, `invoice_number`, `doc_type` (**invoice** / **quote** — quotes reuse this table), `converted_to_invoice_id` (quote→invoice link, self-FK ON DELETE SET NULL), `converted_from_quote_id` (invoice←quote link, self-FK ON DELETE SET NULL), `project_id` (FK → `pm_projects`, ON DELETE SET NULL — the live link), `client_id` (legacy/unused — client page removed, kept nullable for back-compat), `status` (invoices: draft/sent/paid/void · quotes: draft/sent/accepted/declined/expired — CHECK is doc_type-aware), `currency`, `issue_date`, `due_date` (= "valid until" for quotes), snapshot `bill_to_*` fields, `subtotal`, `discount_type` (none/percent/fixed), `discount_value`, `total`, `reminder_cadence_days`, `sent_at`, `paid_at`, `paid_by`, `pdf_path` |
| `pm_invoice_line_items` | `id`, `invoice_id`, `description`, `qty`, `unit_price`, `line_total` (generated) |
| `pm_invoice_payments` | `id`, `invoice_id` (FK → `pm_invoices`, ON DELETE CASCADE), `amount` (numeric, `> 0`), `paid_at`, `reference`, `recorded_by`, `created_at`. **Partial-payment ledger** — source of truth for amounts received against an invoice. RLS `pm_allow_all`. |
| `pm_invoice_templates` | `id`, `name`, `description`, `default_notes`, `default_payment_instructions`, `default_due_days` |
| `pm_invoice_template_line_items` | `id`, `template_id`, `description`, `qty`, `unit_price` |
| `pm_invoice_counters` | `year` (PK), `last_seq` — used by `next_invoice_number(p_year)` RPC |
| `pm_invoice_logs` | `id`, `invoice_id`, `event`, `detail`, `actor` — invoice activity audit trail |
| `pm_clients` extension | added `billing_email`, `billing_address` (nullable) for invoice prefill |

### `pending_client_approval` Task Status (2026-07-24)

Internally approved work now waiting on the **client** to sign off. Migration [scripts/task-status-pending-client-approval.sql](scripts/task-status-pending-client-approval.sql) — **applied to the LIVE project (`tfhzuruaaymfhqmeiusr`) on 2026-07-24** via the `mcp__supabase__*` MCP (identity-verified first); re-run on any fresh project. Rules:

- **Admin-set only** — excluded from the staff status dropdown in the task drawer (same filter as pending_review/revision_required/done/missed).
- **Open/active state** (not done): counts as an active task everywhere; the completion cascade still marks it done when a parent is approved.
- **Not overdue-flagged** — kanban `TaskCard` and the tasks page exclude it from overdue highlighting (the wait is on the client, not staff).
- **Roll-up protected** — like `done`, a descendant submitting for review does NOT clobber a top-level task parked in this state (`rollupTopStatus` in [lib/store.ts](lib/store.ts)); a descendant `revision_required` still overrides it.
- **Display entries** (color `#ec4899` pink) in: task-drawer `statusOptions`, kanban `STATUS_COLS` (own column, grid is now `STATUS_COLS.length`-driven), tasks-page `statusConfig` + status filter + dedicated "Pending Client Approval" group, activity-page `STATUS_LABEL`, chat `taskStatusColor/Label` + tasks side-panel grouping, schedule-tab `STATUS_COLORS`.

### `pending_article_post` Task Status & Article-Post Workflow (2026-07-29)

For article tasks, admin approval is NOT the end of the job — the article still has to go up on the client website. Migration [scripts/task-pending-article-post.sql](scripts/task-pending-article-post.sql) — **applied to the LIVE project (`tfhzuruaaymfhqmeiusr`) on 2026-07-29** via the `mcp__supabase__*` MCP (identity-verified first: URL + 27 article-slot / 185 total task probe); re-run on any fresh project. Adds the status to the CHECK, `pm_tasks.article_url` (text), `pm_tasks.requires_article_post` (bool default false, backfilled true for `seo_slot LIKE 'article-%'`).

- **Flow:** task has `requires_article_post=true` → staff submits for review → admin **Approve** → `approveTaskCompletion` ([lib/store.ts](lib/store.ts)) branches: instead of done, status becomes `pending_article_post` and the assignee gets a targeted `task_assigned` notification ("upload it to the website and add the article link"). The drawer footer then shows an orange **Mark as Posted** panel — **ASSIGNEE-ONLY** (user rule 2026-07-31): the URL input (https:// auto-prepended, validated via `new URL`) appears for the task's assignee (admin included when THEY are the assignee) or when the task is unassigned; an admin viewing a staff-assigned task instead sees a passive "Approved — waiting on \<staff\> to upload… (since \<time\>)" notice — posting the link is the staff's job (admin can reassign to self to override). `markArticlePosted` → saves `article_url` + status `done` → workspace-global **`article_posted`** notification to admins (body includes the URL). If a task somehow already has `articleUrl`, Approve goes straight to done.
- **Qualifier is the `requires_article_post` flag ONLY** (client code never reads `seo_slot` — it isn't mapped into the `Task` type). Auto-set `true` by the weekly SEO generator on fresh Article 1/2/3 subtasks ([app/api/weekly-seo/run/route.ts](app/api/weekly-seo/run/route.ts)); admin-togglable on ANY task via the drawer meta-grid **"Article Post"** cell (`setTaskRequiresArticlePost`). Backfilled on the 27 live article tasks.
- **Admin-set only status:** excluded from the staff status dropdown (same filter as pending_review etc.); entered only via admin Approve. Staff's "Submit for Review" footer button is hidden in this state (the Mark-as-Posted panel replaces it). Subtask-row checkbox/status-cycle clicks by staff on a `pending_article_post` child open the child drawer instead of mutating status.
- **Open/active state**, counts as active everywhere; **overdue-flagged normally** (the wait is on STAFF, unlike pending_client_approval).
- **Cascade/roll-up:** `cascadeDescendantsDone` never force-dones a `pending_article_post` descendant (would skip the link — same protection as `missed`); `rollupTopStatus` treats a top parked in `pending_article_post` like `pending_client_approval` (descendant pending_review doesn't clobber it; descendant revision_required still overrides).
- **Weekly rollover:** carry-forward already treats it as unfinished (`status !== done/missed`) — an approved-but-unposted article MOVES into next week's slot ("— carried over") with its status, flag, and link panel intact, and counts as not-posted in the old week's "x/3 posted" (user decision 2026-07-29).
- **`article_posted` notification type** (Newspaper icon, orange): workspace-global (userId NULL), shown to admins in [components/topbar.tsx](components/topbar.tsx), [components/sidebar.tsx](components/sidebar.tsx), [components/notification-toast-container.tsx](components/notification-toast-container.tsx), [app/(app)/notifications/page.tsx](app/(app)/notifications/page.tsx) (auto-marks read on click — informational, unlike approval/deletion requests). Not OS-pushed (push route skips untargeted types).
- **Display entries** (color `#f97316` orange) in: task-drawer `statusOptions`, kanban `STATUS_COLS` (own column), tasks-page `statusConfig` + status filter + "Pending Article Post" group + passive row circle, activity `STATUS_LABEL`, chat `taskStatusColor/Label` + side-panel grouping, schedule `STATUS_COLORS`. The recorded `article_url` renders as a green **Article Link** cell in the drawer meta grid (permanent record).

### `rejected` Task Status (2026-07-31)

The admin reviewed the work and refused it OUTRIGHT — a **CLOSED** (terminal) state, unlike `revision_required` which reopens the task for another attempt. Migration [scripts/task-status-rejected.sql](scripts/task-status-rejected.sql) — **applied to the LIVE project (`tfhzuruaaymfhqmeiusr`) on 2026-07-31** via the `mcp__supabase__*` MCP (identity-verified first: URL + 27 article-slot probe + `article_url` column present); re-run on any fresh project. Rules:

- **Admin-set only** — excluded from the staff status dropdown (same filter as pending_review etc.). Set via (a) the red two-click **Reject** button in the drawer's pending_review admin footer (next to Request Revision / Approve; `markTaskRejected` in [lib/store.ts](lib/store.ts) — distinct from `rejectTask`, which is the revision loop), or (b) the admin status dropdown / kanban drag (`updateTaskStatus`). Notifies the assignee (targeted `task_assigned`, "Task Rejected").
- **Closed state everywhere**: the shared helper **`isClosedStatus()`** in [lib/mock-data.ts](lib/mock-data.ts) (`done`/`missed`/`rejected`) now drives the active-task filters on the tasks page, dashboard (overdue stat, recent tasks, team workload), and chat (conversation task-count badges, `#` task picker, tasks side-panel). Never overdue-flagged (kanban `TaskCard` excludes it). **No resubmit:** staff's "Submit for Review" button is hidden on a rejected task ("Rejected by Admin" notice instead); staff clicks on a rejected subtask row are inert (like `missed` — admins may reopen).
- **Cascade:** rejecting a task cascades `rejected` onto every still-open descendant (`cascadeDescendantsClosed` — the renamed, parameterized `cascadeDescendantsDone`; done/missed/pending_article_post descendants are left untouched). **Roll-up:** a rejected top is a terminal admin decision — descendant `pending_review` AND `revision_required` both leave it alone (`rollupTopStatus`).
- **Weekly SEO engine:** treated as closed — a rejected article/backlinks/GMB slot does NOT carry forward; a rejected article counts as not-posted in the old week's "x/3 posted" suffix (which now counts `done` articles rather than `3 − carried`).
- **Archivable:** the drawer's admin Archive button now shows for `done` OR `rejected` top-level tasks. Unarchived rejected tasks are visible on the kanban's own **Rejected** column (they're filtered out of the tasks page like done/missed).
- **Display entries** (color `#dc2626` dark red — distinct from missed's `#ef4444`) in: task-drawer `statusOptions`, kanban `STATUS_COLS` (own column), tasks-page `statusConfig`, activity `STATUS_LABEL`, chat `taskStatusColor/Label` + side-panel grouping (rejected/missed buckets surface in search), schedule `STATUS_COLORS`.

### `to_be_discussed` Task Status & Discussion Note (2026-08-02)

The admin parked the task pending a discussion (with staff, the client, or internally), with a reference note recording why. Migration [scripts/task-status-to-be-discussed.sql](scripts/task-status-to-be-discussed.sql) — **applied to the LIVE project (`tfhzuruaaymfhqmeiusr`) on 2026-08-02** via the `mcp__supabase__*` MCP (identity-verified first: `get_project_url` + live staff-row probe; trigger behaviour verified end-to-end on a throwaway archived row, then cleaned up). Re-run on any fresh project. Adds the status to the CHECK, `pm_tasks.discussion_note` (text), and BEFORE-UPDATE trigger `pm_tasks_clear_discussion_note`.

- **Admin-set only** — excluded from the staff status dropdown in the task drawer (same filter as pending_review etc.). Staff clicks on a `to_be_discussed` subtask row (checkbox AND status-cycle pill) open the child drawer instead of mutating status — same guard as `pending_article_post`.
- **Discussion note (`Task.discussionNote`)** — cyan panel in the task drawer (ADMIN-ONLY, shown only while the task is in this status): textarea + "Save note" via `setTaskDiscussionNote` in [lib/store.ts](lib/store.ts) (`dbUpdateTask({ discussion_note })`). **The note is TRANSIENT BY DESIGN (user rule 2026-08-02: "the notes disappears after i change the status")**: DB trigger `pm_tasks_clear_discussion_note` nulls it whenever status changes to anything ≠ `to_be_discussed`, so EVERY write path clears it (drawer dropdown, kanban drag, bulk cascades, roll-ups, service-role writes); `statusPatch()` mirrors the clear optimistically (it now returns `discussionNote: null` for every non-to_be_discussed status). The tasks page also shows the note inline on group rows (cyan 💬 truncated line, admin only, full text in the title tooltip).
- **Open/active state** (`isClosedStatus` unchanged — it counts as active work everywhere), but **admin-parked** like `pending_client_approval`: NOT overdue-flagged (kanban `TaskCard` + tasks-page rows), and `rollupTopStatus` protects a top parked in it from descendant `pending_review` clobber (descendant `revision_required` still overrides — which also clears the note; acceptable since Request Revision is an admin action). The completion cascade closes `to_be_discussed` descendants normally (their notes clear via the trigger).
- **No notifications** — parking a task fires nothing (notification minimalism rule).
- **Display entries** (color `#06b6d4` cyan) in: task-drawer `statusOptions`, kanban `STATUS_COLS` (own column after In Progress), tasks-page `statusConfig` + status filter + dedicated "To Be Discussed" group (FIFO by `statusChangedAt`, "· parked \<time\>" suffix, passive cyan row circle), activity-page `STATUS_LABEL`, chat `taskStatusColor/Label` + tasks side-panel grouping, schedule-tab `STATUS_COLORS`.
- **Tasks-page tab (2026-08-02):** the All Tasks tab switcher has a **"To Be Discussed" quick-filter tab** (after Revision, cyan, count badge) — it shares the Review/Revision tab body (`activeTab === "discuss"` branch) but renders ONE FIFO group sorted oldest-parked-first by `statusChangedAt` instead of the Overdue/Today/Upcoming date groups (parked tasks are admin-parked, never overdue-flagged). Member/type filter dropdowns apply as on the other single-status tabs.
- **Parked SUBTASKS surface as their own rows (2026-08-02).** `to_be_discussed` does NOT roll up onto the parent, so a parked child would otherwise be invisible in the tasks page's top-level lists (user report: parked "Monday article" child didn't appear; clicking showed only the parent). `parkedDescendants` in [app/(app)/tasks/page.tsx](app/(app)/tasks/page.tsx) walks every project's task tree and adds each `to_be_discussed` descendant as a row (with a `parentTitle` " › parent" context in the row's project line) to the main-tab "To Be Discussed" group, the discuss tab, and the status-dropdown count. `liveSelectedTask` uses a deep `findDeep` search so clicking such a row opens the CHILD's drawer, not the parent's. If another status ever stops rolling up, it needs the same treatment.

### Review Workflow Roll-up & Completion Cascade (2026-07-23)

Children/grandchildren at ANY depth have the full submit-for-review / approve / request-revision workflow (each drawer child panel carries the same footer controls). Two automatic rules in [lib/store.ts](lib/store.ts) (`rollupTopStatus`, `cascadeDescendantsClosed`, wired into `updateTaskStatus`/`updateSubtaskStatus`/`requestTaskApproval`/`approveTaskCompletion`/`rejectTask`/`markTaskRejected`):
- **Roll-up (descendant → TOP-level task):** any descendant `revision_required` ⇒ top becomes `revision_required` (even reopening a done top — but never a `rejected` top); else any descendant `pending_review` ⇒ top becomes `pending_review` (unless top is done/rejected or parked in an admin state: pending_client_approval/pending_article_post/to_be_discussed); when the last pending/revision descendant resolves, an auto-rolled top drops back to `in_progress`. Only fires for descendant changes — changing a top-level task directly never rolls onto itself. Purpose: the kanban/tasks board always shows that something under a parent needs attention.
- **Completion cascade (parent → descendants):** marking any task `done` (incl. admin Approve) — or `rejected` — closes every still-open descendant with the same status (one bulk `dbUpdateTasksBulk`); `missed` tombstones and already-closed descendants are never touched.
- Notification `?task=` deep links may target SUBTASKS — the project page searches the whole tree (`findDeep`) when opening the drawer from a link.

### Readable URLs (project slugs, 2026-07-23)

`pm_projects.slug` (unique, e.g. `asc-racking`) is maintained by DB trigger `pm_projects_set_slug` (insert + rename; `-2`/`-3` suffixes on collision; backfilled live). `/projects/[id]` resolves **slug OR uuid** (resolve early → use the real UUID for DB calls like weekly reports); nav links prefer slug (`projectPath()` in [lib/utils.ts](lib/utils.ts), or inline `p.slug || p.id`). **Cold-load guard (2026-07-29):** the detail page must NOT `notFound()` while `store.initialized` is false — the Zustand persist uses sessionStorage, which is **per-tab**, so right-click → open-in-new-tab (or any hard refresh / shared link) renders once with an empty store before `init()` completes; it now shows a spinner until initialized, then 404s only if the project truly doesn't exist. Chat `?c=` accepts a conversation id OR a project slug/id (resolves to the project channel), and the chat page scrubs consumed deep-link params from the address bar (`router.replace("/chat")`, kept when `&m=` needs the scroll). Task references stay UUIDs on purpose — titles repeat (9× "Backlinks" weekly) and change (`— carried over`), so they can't be URL identity. Stored notification `link`s keep UUIDs (always resolvable).

### Key Development Patterns

- **Live staff:** Always fetch from `staff_members` where `status = 'active'`. Auth ID = `s.user_id ?? s.id`
- **Assignee IDs:** Always Supabase auth UUIDs — never "u1", "u2", "u3" or any mock ID
- **Store refresh:** `refresh()` called in app layout on every pathname change — data stays current without manual reload
- **DB writes must be awaited:** Never fire-and-forget `dbAddProject`, `dbAddTask` etc. — silent failures cause data loss
- **UUID:** Use `uuid()` from `lib/store.ts` — calls `crypto.randomUUID()` on HTTPS, Math.random fallback on HTTP
- **Error display:** Use `errorMessage(e)` from [lib/utils.ts](lib/utils.ts) for user-facing catch blocks — **never** `e instanceof Error ? e.message : String(e)`. Supabase/PostgREST errors are PLAIN objects (`{ message, details, hint, code }`), NOT `Error` instances, so the `instanceof` check falls through to `String(e)` → **`[object Object]`**, hiding the real cause. `errorMessage()` extracts `.message` (+ details/hint) from those objects.
- **Timestamps in UI show date + time**, not date only (user preference, 2026-07-22): use `new Date(x).toLocaleString(…, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })` (year optional in tight spots like chat/comments). Applied to the task drawer "Added" field, task attachments, project Files tab, and weekly-report "Created". Timestamps come from DB `DEFAULT now()` columns (`pm_tasks.created_at`, `pm_task_attachments.uploaded_at` — both verified live), NOT client clocks; the store's optimistic `new Date().toISOString()` is display-only until the next `refresh()`.
- **Project Files tab media IS persisted** (fixed 2026-08-09 — see the Uploads & File Persistence module). `uploadProjectMedia`/`removeMedia` in [lib/store.ts](lib/store.ts) upload to the `pm-attachments` bucket under `projects/<id>/` and write a `pm_project_media` row. **Pinned items (`addPinnedItem`/`removePinnedItem`) are still local-only** — no DB table, they vanish on refresh. That's the remaining gap in this area.
- **Every file picker uses `FILE_ACCEPT`** from [lib/utils.ts](lib/utils.ts) — never inline an `accept` string. The old hardcoded list omitted spreadsheets, so staff literally could not select a `.xlsx` in the OS dialog. Note `accept` only filters the picker; drag-and-drop and paste bypass it.

### Known Recurring Mistakes

1. Using `USERS` from `lib/mock-data.ts` — always use live Supabase staff instead
2. Hardcoding `"u1"`, `"u2"`, `"u3"` as user/assignee/uploader IDs — always use `user?.id` from `useAuth()`
3. Not awaiting DB writes — always `await` inserts/updates
4. `uuid()` calling itself recursively — must call `crypto.randomUUID()` not `uuid()`
5. Staff appearing in `user_roles` — removes them or they get admin role
6. `confirmation_token` NULL in auth.users — Supabase requires empty string `''` not NULL
7. PostgREST schema cache stale after migrations — run `NOTIFY pgrst, 'reload schema'`
8. `initialized` in persist partialize — causes stale data; keep it out of persisted state
9. **Dangling user IDs after staff revocation** — deleting an auth user does NOT clean up `pm_tasks.assignee_id`, `pm_projects.assigned_staff`, or their `user_roles` rows. June 2026 incident: Shoaib's old account (`35b86038-…`) was revoked while it wrongly held a `user_roles` owner row; the old `revokeStaff` owner lookup (`.eq("role","owner").limit(1)`) picked the revoked user *themselves*, so reassignment no-op'd and 38 tasks + 12 projects pointed at a dead UUID Shoaib's new account couldn't match → staff saw none of their tasks. Fixed `revokeStaff` now excludes the revoked user from the lookup, requires a live active admin target (else unassigns), and deletes the revoked user's `user_roles` rows. If a staffer reports "can't see assigned tasks", FIRST check `pm_tasks.assignee_id` values against `auth.users`/`staff_members` for orphans.
10. **Operating on the WRONG Supabase project via the MCP** — historically the Claude Supabase MCP (`list_projects`) only exposed `wmulemkyjrjetwyzrsqq` ("Omnipulse"), while the deployed pm-tool authenticates against `tfhzuruaaymfhqmeiusr` (`.env.local`). **July 2026 incident:** a new staff account (`namira@webby.sg`) was created + fully verified (login 200, correct staff row, no admin) via the MCP — but in Omnipulse — while the user kept getting "incorrect email or password" at `os.webby.sg`, which talks to `tfhzuruaaymfhqmeiusr`. Every check passed against the wrong DB. Fix was to recreate the account in the correct project via the `.env.local` service-role key (`POST /auth/v1/admin/users` with `email_confirm:true`, then insert an `active`/`staff` `staff_members` row, ensure no `user_roles` row), then delete the stray Omnipulse copy. **⚠️ UPDATE 2026-07-15:** the `mcp__supabase__*` MCP server was verified this session to reach the **CORRECT live project** (`tfhzuruaaymfhqmeiusr`) — the migration that fixed invoice creation was applied through it. Verification method: `execute_sql` returned a `pm_invoice_payments` row (`9dfd8a3d-…`) that a service-role REST probe against `tfhzuruaaymfhqmeiusr` had just returned, and `doc_type` was absent — matching the live broken state. **Still ALWAYS verify which project an MCP reaches before writing** (run an identity check like "is this known live row present?"; note there may be two Supabase MCP servers — `mcp__supabase__*` vs `mcp__claude_ai_Supabase__*` — which can point at different projects). **Before any account/DB fix, confirm which project the target domain uses** (grep the deployed JS bundle for `*.supabase.co`, or read `.env.local`). Don't trust MCP verification alone for anything the live app must see.
11. **RLS is default-deny per command — a new write path needs a matching policy.** July 2026 incident: in-place comment editing shipped with the `edited_at` column + snapshot trigger, but `pm_task_comments` only had SELECT/INSERT/DELETE policies — no UPDATE policy — so every edit PATCH matched 0 rows, `.single()` errored, and users saw a generic "Failed to save changes". Fixed 2026-07-22 (`pm_task_comments_update_own`, author-only). When adding any feature that INSERTs/UPDATEs/DELETEs on a table with scoped (non-`pm_allow_all`) RLS, check `pg_policies` for that command first. Related: DB helpers should `throw` the Supabase error (the UI catches with `errorMessage()`), not `return null` — swallowing it hides the real cause.
12. **⚠ OPEN UX TRAP: Enter does NOT post a task-drawer comment (chat sends on Enter).** 2026-07-24 incident ("Samia's disappearing link"): the chat composer sends on plain Enter ([app/(app)/chat/page.tsx](app/(app)/chat/page.tsx) `handleKeyDown`), but the task-drawer comment box only posts via the **Post button or Ctrl+Enter** (`handleCommentKeyDown` in [components/task-drawer.tsx](components/task-drawer.tsx)) — plain Enter just inserts a newline. Staff habituated to chat paste a link, hit Enter, see no error, close the drawer → the unsent draft (component state) is silently discarded. Samia lost 3 attempts this way on the Outpost "Competitors comparison/research" task and reported "it keeps deleting again and again"; the DB audit trail (`pm_task_activity` + comment rows) proved the attempts never reached Postgres — nothing was deleted. Diagnosis playbook: if a user reports vanishing comments/links, check `pm_task_activity` for the task (trigger-written, tamper-evident) and search `pm_task_comments` for the pasted text — zero rows means the client never sent it, not that something deleted it. Fix candidates (not yet implemented): make Enter post (Shift+Enter = newline) to match chat, and/or warn before closing the drawer with a non-empty comment draft. Related latent bug (**FIXED 2026-08-09**): the description save on RichEditor close called `updateTaskDescription` fire-and-forget — that bug was real and was silently losing uploaded images. See the Uploads & File Persistence module.

13. **A DB helper that swallows its error turns optimistic UI into silent data loss.** Every store mutation writes Zustand first, so if the DB helper returns instead of throwing, the user sees success and the change disappears at the next `refresh()` — with no console error to diagnose from. `dbUpdateTask` (checked nothing), `dbAddAttachment` (`console.error` only) and `dbUpdateProject` (checked nothing — fixed 2026-08-12; it backs staff assignment, project edits and channel moves) all did this and cost months of lost description edits and attachments. **Rule: DB helpers `throw`; the UI catches with `errorMessage()` and renders something.** Never `return null`/log-and-continue on a write. Equally, never fire-and-forget a store mutation from a component (`updateX(...)` with no `await`/`.catch`) — an unhandled rejection is invisible to the user. When diagnosing "my content vanished", check `pm_task_activity` for the task: the trigger writes a row per changed field, so **no row means the write never reached Postgres** (it wasn't deleted).
14. **Don't inline binary data into a table column.** Pasted base64 images bloated `pm_tasks.description` to 1.46 MB; because `loadAll` does `select *`, every user downloaded it on every navigation and the saves themselves started failing. Uploads go to the `pm-attachments` bucket and the row stores a URL. `RichEditor` intercepts `data:image` in pasted HTML for exactly this reason — don't remove that path.

### Key File Map

```
app/(app)/layout.tsx          — Auth guard, store refresh on navigation
app/(app)/dashboard/page.tsx  — Admin: full team; Staff: own tasks only
app/(app)/projects/page.tsx   — Project list, channels, DnD, admin-only controls. Toolbar filters: staff dropdown + TYPE pills (All / Web Dev / SEO / Web + SEO, color-coded to card badges, live counts). Type matching is SERVICE-based: "SEO" shows seo AND both, "Web Dev" shows webdev AND both, "Web + SEO" isolates both-only (user preference 2026-07-29). While any filter is active, empty channel groups are hidden. **Filters persist in the URL** (`?type=seo&staff=<uuid>` via `router.replace`, `applyFilters()`) so the selection survives going into a project and pressing back, and filtered views are shareable; the page is therefore wrapped in `<Suspense>` (useSearchParams on a static route — same idiom as credentials/new). Each card's footer staff cluster is an admin **assign/remove popup** (`StaffAssignMenu`) — see the Project Staffing module.
app/(app)/projects/new/page.tsx — Create project (admin only), live staff
app/(app)/projects/[id]/page.tsx — Project detail, kanban, schedule, files (REAL uploads → pm_project_media + pm-attachments bucket; drag-drop, spinner, error panel), pinned (still local-only), content, weekly reports (pm_weekly_reports), Weekly SEO (ADMIN-ONLY tab — renders <WeeklySeoPanel>; the tab list is built from the `ProjectTab` union and appends "weekly-seo" only when isAdmin)
app/(app)/tasks/page.tsx      — All tasks (role filtered). Filter bar: project / member / type / priority / status dropdowns. The four status groups (Pending Review / Pending Client Approval / Pending Article Post / Revision Required) sort OLDEST-submission-first by statusChangedAt (FIFO review queue, user request 2026-07-31); the sort runs after the filter bar so it holds within any member/project view. New Task dialog: admin can quick-create a project inline ("New project" → name only; defaults type=webdev, phase=discovery, assignedStaff=[task assignee]). Uses store.addProject which now returns the new project id.
app/(app)/team/page.tsx       — Team management, invites, content access toggle
app/(app)/activity/page.tsx   — UNIFIED Activity Log (admin only): merges FOUR streams into one per-person timeline — task audit rows (dbListRecentActivity 300), task comments (dbListRecentComments 200), chat messages across ALL conversations (loadRecentChatMessages 200, labeled #Project / group name / "Direct message", deep-links /chat?c=<id>&m=<mid>), and file uploads (dbListRecentUploads 120). Person dropdown + per-type filter chips with counts (Task changes / Comments / Chat / Files), grouped by day, task deep-links via slug. Comment/upload context resolved client-side from the store task tree (archived/deleted tasks → "archived or deleted task"). Actors that don't resolve against ACTIVE staff (revoked accounts' dangling auth uids) are EXCLUDED from the person dropdown and their timeline rows render "Former staff" (user request 2026-08-02 — dropdown previously showed duplicate "Unknown user" entries); their history stays visible under "All people". When the "Task changes" chip is active, a STATUS sub-dropdown appears ("Any status" / "→ <Status> · n") filtering to audit rows with field='status' AND new_value=<picked> — i.e. changes INTO that status, with per-status counts for the selected person.
app/(app)/credentials/page.tsx — Credentials (admin only)
app/(app)/templates/page.tsx  — Templates (admin only)
app/(app)/content/            — Content (per-staff access control)
components/sidebar.tsx        — Navigation, role-filtered
components/topbar.tsx         — Page header: functional GLOBAL SEARCH (live dropdown matching project names + task titles from the store, role-scoped — staff only see assigned projects/own tasks; click/Enter navigates, links use project slug), bell badge, Enable-alerts button
components/task-drawer.tsx    — Full task edit panel. **COMMENTS are NEWEST-FIRST (user rule 2026-08-07):** the composer sits ABOVE the list and the latest comment renders directly beneath it (`commentsNewestFirst` memo sorts a copy by `createdAt` desc; the `comments` state itself stays chronological so `handlePostComment` can keep appending, and `dbListTaskComments` still returns ascending — do NOT reorder the DB helper). Comment EDIT HISTORY stays oldest-first (Original → Revision N → Current) on purpose: it reads as a progression, not a feed. Description (RichEditor) + comment composer accept images via drag-and-drop AND clipboard paste (screenshots), not just the paperclip picker. Description images insert inline as <img> HTML (uploaded via uploadAttachment → pm-attachments bucket); dropping on the read-only description (editor closed) appends + saves via updateTaskDescription. Comments support MULTIPLE attachments (2026-07-23): `pm_task_comments.attachments` jsonb array [{url,name,size,type}] — legacy single attachment_url/name/size/type rows are merged into the array by `rowToTaskComment` at read time, so UI code only reads `c.attachments`. **Comment IMAGES are INLINE, line-based (like chat):** pasting/dropping/picking an image uploads immediately (`uploadAttachment`) and inserts an `[img:url]` token at the caret (`insertCommentInlineImages`, works in BOTH the composer and the in-place edit box via `handleEditCommentPaste`); `CommentBody` renders @mentions + `[img:]` tokens (image click → lightbox); Post is blocked while uploads are in flight (`uploadingCommentImgs`); mention-notification bodies show the token as 📷. Non-image files still stage as attachment chips (`commentFiles`) and render via the attachments grid — older grid-style image comments keep rendering from `c.attachments`. A **"Discuss in Chat →"** button in the COMMENTS header jumps to the project's chat channel via `/chat?c=<conv>&ref=<taskId>` — the chat page reads `&ref` and pre-inserts the `[task:<id>]` reference into the composer (preferred over long comment threads). Shared helpers: escapeHtml / plainToHtml / imgHtml. COMMENTS are editable in-place by their AUTHOR ONLY (pencil button, hover) — dbUpdateTaskComment sets body + edited_at (nullable timestamptz on pm_task_comments; added 2026-07-21); a "· edited" marker shows after the timestamp. The edit textarea has the SAME @-mention autocomplete as the composer (added 2026-07-23; shared module-level `MentionDropdown` component + `editMention*` state mirroring the composer's `mention*` state — `startEditComment` seeds `editPendingMentions` from the comment's stored `mentionedUserIds`). On save, `mentioned_user_ids` is recomputed (mentions whose `@label` was deleted from the body drop off) and ONLY mentions NEWLY added by the edit fire a notification — pre-existing mentions are never re-notified, and the attachment is untouched. For an edited comment, the "· edited" marker is a clickable **history disclosure** (visible to **admin + the comment's own author**) that lazy-loads `dbListCommentVersions` and shows every prior body (Original / Revision N / Current) with timestamps — see the Task Activity & Comment History Module. The "Move to another project" control (admin, top-level tasks only; subtasks travel with parent) lives in the meta grid ABOVE the description — moveTaskToProject. **Admin-only ACTIVITY section** (collapsible, at the bottom of the scroll area) lazy-loads `dbListTaskActivity(task.id)` and lists this task's audit trail (actor resolved via liveStaff; status/priority/assignee/project codes formatted to labels via `activitySentence`/`activityValueLabel`).
components/kanban-board.tsx   — Kanban board
components/schedule-tab.tsx   — Schedule/calendar view
lib/store.ts                  — Zustand store: init(), refresh(), all CRUD
lib/db.ts                     — Supabase query layer
lib/auth-context.tsx          — PmUser, role resolution, canAccessContent
lib/mock-data.ts              — Types only. USERS array is dead — do not use in UI
lib/invoice-types.ts          — Invoice / InvoicePayment / InvoiceTemplate / InvoiceLog types + computeDerivedStatus / computeAmountPaid / computeBalanceDue + the invoice⇄quotation switch rules (docTypeSwitchBlocker / statusForDocType / docTypeLabel)
lib/invoice-db.ts             — Invoice CRUD, payments ledger (addInvoicePayment/deleteInvoicePayment), quotes (nextQuoteNumber/setQuoteStatus/convertQuoteToInvoice, setInvoiceDocType for the in-place type switch), templates, logs (NOT in main store — pages call directly)
components/invoice-line-items-editor.tsx — Shared line items grid editor (multi-line textarea for description)
components/invoice-template-form.tsx     — Shared create/edit template form
components/invoice-pdf.tsx               — React-PDF Document (branded WebbySG design)
components/invoice-pdf-actions.tsx       — Client-only Preview + Download PDF buttons (dynamic import, ssr: false)
lib/invoice-business-details.ts          — Source of truth for "From" details + logo path
app/(app)/invoices/page.tsx              — Invoice list w/ status filter (admin only)
app/(app)/invoices/new/page.tsx          — Create from template / past invoice / blank
app/(app)/invoices/[id]/page.tsx         — View/edit, record (partial) payments, mark sent, duplicate, delete, activity log, Invoice⇄Quotation type toggle
app/(app)/invoices/templates/page.tsx    — Template list
app/(app)/invoices/templates/new/page.tsx — Create template
app/(app)/invoices/templates/[id]/page.tsx — Edit template
scripts/restrict-financials-to-admin.sql — Swaps pm_allow_all for pm_is_admin() RLS on all invoice/quote/payment/template/log + billing-reminder tables (applied live 2026-08-14). See the Owner-Only Financial Data rule.
lib/expense-types.ts                     — Expense types + ALL pure expense math (GST 9% inclusive/net, financial years, derived status, summarise, CSV builder). Dependency-free: shared by the page, the form and the export so they can't drift.
lib/expense-db.ts                        — Expense CRUD + receipts (addExpenseReceipt/deleteExpenseReceipt) + setExpensesSubmitted. Every helper THROWS. NOT in the main store — the page calls it directly (like invoices).
components/expense-form.tsx              — Add/edit dialog incl. receipt drag-drop + upload, 9% GST extract, per-category IRAS note
app/(app)/expenses/page.tsx              — Expense list, FY navigator + FY-start-month picker, summary cards, month + category charts, filters, CSV export, bulk mark-submitted (admin only)
lib/billing-db.ts                        — Renewal/payment-reminder types + CRUD + markChased + setBillingPaid
app/(app)/renewals/page.tsx              — Renewals calendar + upcoming list + paid toggle + add/edit (admin only)
lib/mailer.ts                            — Shared Titan/SMTP transport (Nodemailer); secrets from server env only
app/api/renewals/run/route.ts            — Node route: daily renewal-reminder email digest (cron-triggered)
scripts/renewals-cron.sh                 — VPS cron line that POSTs /api/renewals/run once a day
lib/weekly-seo.ts                        — Weekly SEO calendar/naming rules (month-of-Friday, week number, which article days a week produces). Dependency-free: shared by the generator route AND the admin UI so they can't drift.
app/api/weekly-seo/run/route.ts          — Node route: the generator (cron secret OR admin token; ?dry=1, ?projectId=)
components/weekly-seo-panel.tsx          — Reusable enrol/pause/assignee/includes/preview/Generate-now panel
app/(app)/weekly-seo/page.tsx            — Admin overview of every project in the weekly loop (adminOnly)
scripts/weekly-seo-cron.sh               — VPS cron line that POSTs /api/weekly-seo/run daily (17:00 UTC = 01:00 SGT)
```

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
- **Earnings tracking (per payment).** The invoice list page ([app/(app)/invoices/page.tsx](app/(app)/invoices/page.tsx)) shows earnings derived **client-side** from the already-loaded invoices — no DB/RPC. Earnings are recognised on a **cash basis, one event per `pm_invoice_payments` row** (so a partially-paid invoice contributes several earnings across different months) via the `invoiceEarnings()` helper. Legacy fallback: a `status='paid'` invoice with **no** payment rows counts once at `paid_at` (or `issue_date`) — but the migration backfilled a full payment for every existing paid invoice, so this path is rarely hit. Summary cards: **Outstanding** (= sum of **balance due** across sent/overdue/partial, NOT `total`), **Paid in <current month>**, **Paid in <current year>**. Below them a **Monthly earnings** bar chart for a selectable year. SGD-only. To add a true reports page later, lift the `earnings`/`monthly` memos out of the page.
- **Numbering:** `WSG-YYYY-MM-DD` format (e.g. `WSG-2026-05-18`), generated by `next_invoice_number()` Postgres RPC. Same-day duplicates get an auto-suffix `-2`, `-3`, etc. No counter table — uniqueness checked against `pm_invoices.invoice_number` directly.
- **Status:** stored as `draft|sent|paid|void` (CHECK-constrained — `partial`/`overdue` can NOT be stored). `overdue` and `partial` are *computed* statuses (`computeDerivedStatus` in `lib/invoice-types.ts`) — never stored. `overdue` = `status='sent' AND due_date < today`; `partial` = `status='sent' AND 0 < amountPaid < total`. **`partial` takes priority over `overdue`** in the badge.
- **Partial payments (`pm_invoice_payments`).** Each recorded payment is a row in the ledger; the sum is `amountPaid`, and `balanceDue = total − amountPaid` (clamped ≥0). Helpers `computeAmountPaid` / `computeBalanceDue` in [lib/invoice-types.ts](lib/invoice-types.ts) are the single source of truth, used by the list, detail page and PDF. DB layer ([lib/invoice-db.ts](lib/invoice-db.ts)): `addInvoicePayment` / `deleteInvoicePayment`, plus internal `syncInvoicePaidStatus(id)` which reconciles the stored `status`/`paid_*` after every payment change — when the balance hits 0 it flips `status='paid'` and copies the latest payment's date/reference/recorder into `paid_at`/`paid_note`/`paid_by`; otherwise it reverts to `sent` (or `draft`) and clears `paid_*`. `markInvoicePaid` now just records a payment for the **remaining balance** (one-click full pay); `markInvoiceUnpaid` deletes **all** payment rows and reverts. Detail page ([app/(app)/invoices/[id]/page.tsx](app/(app)/invoices/[id]/page.tsx)) has a **Payments** card (Total / Amount paid / Balance due + per-payment list with delete) and a **Record payment** dialog (amount defaulting to the balance, date, reference). Log events `payment_recorded` / `payment_removed` were added to the `pm_invoice_logs_event_check` whitelist. **No partial-payment status is stored — always recompute from the ledger.**
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