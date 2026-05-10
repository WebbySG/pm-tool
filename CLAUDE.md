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
- **Database/Auth:** Supabase (PostgreSQL + Auth + Storage)
- **Drag and Drop:** DnD Kit
- **Deployment:** GitHub Actions → VPS via `appleboy/ssh-action`
- **VPS:** Runs HTTPS at `https://os.webby.sg` (SSL via Let's Encrypt, auto-renews) — `crypto.randomUUID()` is available; the `uuid()` helper in `lib/store.ts` will use it automatically

### Role System

- **Admin:** Full access to all features, all projects, all tasks, all management pages
- **Staff:** View only assigned projects; create/edit/delete own tasks only; no credentials, templates, or team pages
- **Content Access:** Controlled per-staff via `can_access_content` boolean in `staff_members`
- Role resolved by: `user_roles` table first (owner/admin → admin role), then `staff_members.pm_role`
- **Critical:** Staff must NOT have rows in `user_roles`, or they will incorrectly receive admin role

### Admin Must Always Be Able To Edit

**Tasks:** title, status, priority, assignee, due date (must save to DB), description, tags, recurring, subtasks, delete

**Projects:** name, description, type, phase, due date, start date, client, channel, assigned staff, delete

**Everything else:** templates, credentials, channels, clients — full CRUD

### Supabase Tables

| Table | Key Columns |
|---|---|
| `staff_members` | `id`, `user_id` (auth UUID), `email`, `first_name`, `last_name`, `avatar_initials`, `pm_role`, `status`, `can_access_content` |
| `user_roles` | `user_id`, `role` (owner/admin = admin) |
| `pm_projects` | `id`, `name`, `description`, `type`, `phase`, `client_id`, `channel_id`, `start_date`, `due_date`, `assigned_staff` (uuid[]) |
| `pm_tasks` | `id`, `project_id`, `parent_id`, `title`, `description`, `status`, `priority`, `type`, `assignee_id`, `due_date`, `tags`, `recurring`, `recurring_day`, `sort_order` |
| `pm_channels` | `id`, `name`, `color`, `order` |
| `pm_clients` | `id`, `name`, `website`, `industry` |
| `pm_credentials` | credentials with `allowed_staff` array |
| `pm_project_templates`, `pm_task_templates` | templates |
| `pm_notifications` | notifications |
| `pm_task_attachments` | file attachments |

### Key Development Patterns

- **Live staff:** Always fetch from `staff_members` where `status = 'active'`. Auth ID = `s.user_id ?? s.id`
- **Assignee IDs:** Always Supabase auth UUIDs — never "u1", "u2", "u3" or any mock ID
- **Store refresh:** `refresh()` called in app layout on every pathname change — data stays current without manual reload
- **DB writes must be awaited:** Never fire-and-forget `dbAddProject`, `dbAddTask` etc. — silent failures cause data loss
- **UUID:** Use `uuid()` from `lib/store.ts` — calls `crypto.randomUUID()` on HTTPS, Math.random fallback on HTTP

### Known Recurring Mistakes

1. Using `USERS` from `lib/mock-data.ts` — always use live Supabase staff instead
2. Hardcoding `"u1"`, `"u2"`, `"u3"` as user/assignee/uploader IDs — always use `user?.id` from `useAuth()`
3. Not awaiting DB writes — always `await` inserts/updates
4. `uuid()` calling itself recursively — must call `crypto.randomUUID()` not `uuid()`
5. Staff appearing in `user_roles` — removes them or they get admin role
6. `confirmation_token` NULL in auth.users — Supabase requires empty string `''` not NULL
7. PostgREST schema cache stale after migrations — run `NOTIFY pgrst, 'reload schema'`
8. `initialized` in persist partialize — causes stale data; keep it out of persisted state

### Key File Map

```
app/(app)/layout.tsx          — Auth guard, store refresh on navigation
app/(app)/dashboard/page.tsx  — Admin: full team; Staff: own tasks only
app/(app)/projects/page.tsx   — Project list, channels, DnD, admin-only controls
app/(app)/projects/new/page.tsx — Create project (admin only), live staff
app/(app)/projects/[id]/page.tsx — Project detail, kanban, schedule, files, pinned
app/(app)/tasks/page.tsx      — All tasks (role filtered)
app/(app)/team/page.tsx       — Team management, invites, content access toggle
app/(app)/credentials/page.tsx — Credentials (admin only)
app/(app)/templates/page.tsx  — Templates (admin only)
app/(app)/content/            — Content (per-staff access control)
components/sidebar.tsx        — Navigation, role-filtered
components/task-drawer.tsx    — Full task edit panel
components/kanban-board.tsx   — Kanban board
components/schedule-tab.tsx   — Schedule/calendar view
lib/store.ts                  — Zustand store: init(), refresh(), all CRUD
lib/db.ts                     — Supabase query layer
lib/auth-context.tsx          — PmUser, role resolution, canAccessContent
lib/mock-data.ts              — Types only. USERS array is dead — do not use in UI
```