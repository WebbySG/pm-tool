# WebbyOps PM Tool — System Overview

## Application Purpose

WebbyOps is a project management SaaS tool for a web and SEO agency. It manages client projects, task boards, team workloads, content pipelines, shared credentials, and reusable task templates.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js App Router, React, Tailwind CSS |
| State | Zustand + persist middleware (sessionStorage) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage (task attachments) |
| Drag and Drop | DnD Kit |
| Deployment | GitHub Actions → VPS (HTTP, not HTTPS) |

---

## Roles and Permissions

| Role | Projects | Tasks | Team | Credentials | Templates | Content |
|---|---|---|---|---|---|---|
| Admin | Full CRUD | Full CRUD all tasks | Full management | Full access | Full CRUD | Always |
| Staff | View assigned only | Own tasks only | No access | No access | No access | If enabled |

- Role is resolved by `user_roles` table first, then `staff_members.pm_role`
- Staff must not appear in `user_roles` or they receive admin role
- Content access per-staff via `can_access_content` in `staff_members`

---

## Database Tables

| Table | Purpose |
|---|---|
| `staff_members` | Team roster with role, status, content access flag |
| `user_roles` | Role overrides (admin/owner) |
| `pm_projects` | Projects with assigned_staff array (auth UUIDs) |
| `pm_tasks` | Tasks with assignee_id (auth UUID), subtasks via parent_id |
| `pm_channels` | Project grouping channels |
| `pm_clients` | Client records |
| `pm_credentials` | Shared credentials with per-staff access |
| `pm_project_templates` | Project template definitions |
| `pm_task_templates` | Task templates within project templates |
| `pm_notifications` | System/AI notifications |
| `pm_task_attachments` | File attachments on tasks |

---

## Key Data Flow

1. App mounts → `StoreInitializer` calls `store.init()` → loads all data from Supabase
2. User navigates → app layout calls `store.refresh()` → silently reloads all data
3. Admin creates project → `store.addProject()` → awaits `db.dbAddProject()` → data persists to DB
4. Staff logs in → `buildPmUser()` checks `user_roles`, then `staff_members` → role resolved
5. Staff views projects → filtered to `p.assignedStaff.includes(user.id)` (auth UUID)
6. Task assignee lookup → always from live `staff_members` table, never from mock USERS array

---

## Development Behaviour and Connected Change Policy

All development work must treat the application as a connected system.

**When a change is requested:**
- Do not edit only the first matching file
- Understand the full feature flow: UI → component → store → DB → types
- Search for all related references across frontend, backend, Supabase, shared types, fallback states, dashboards, reports, and documentation
- Fix all directly connected instances in the same task

**Production content rules:**
- No dummy, mock, demo, fake, placeholder, sample, or hardcoded fallback content in production-facing areas
- `USERS` from `lib/mock-data.ts` must not be used in any component, page, or service
- Hardcoded IDs `"u1"`, `"u2"`, `"u3"` must not appear in any production code path
- All user references must use the Supabase auth UUID from `useAuth()` or the `staff_members` table
- When dummy content is found in one area, search the entire codebase for related instances

**Admin editing:**
- Admin must always be able to edit all task and project details
- Any edit restriction applied to staff must be explicitly bypassed for admin using `isAdmin` checks

**Database writes:**
- Always `await` database operations — fire-and-forget causes silent data loss
- Always throw on DB errors, never swallow with `console.error`

**Documentation:**
- Whenever important application structure, business rules, database schema, recurring mistakes, or development patterns are discovered, update `CLAUDE.md`, `AGENTS.md`, and `SYSTEM_OVERVIEW.md` immediately without waiting to be asked

**Before any task is marked complete:**
- The requested issue was fixed
- Related files and references were searched
- The connected feature flow was checked
- Production-facing dummy/mock/fallback content was removed or replaced where found
- Relevant type checks or builds were run where possible
- Documentation was updated where needed
- Unresolved risks or limitations were reported

---

## Known Recurring Issues

| Issue | Fix |
|---|---|
| `USERS` mock data in production UI | Replace with live `staff_members` query |
| Hardcoded `"u1"` as assignee/uploader | Use `user?.id` from `useAuth()` |
| DB writes not awaited | Always `await` all insert/update calls |
| `uuid()` recursion bug | Must call `crypto.randomUUID()` not `uuid()` |
| Staff in `user_roles` → gets admin role | Delete their row from `user_roles` |
| `on_profile_created_assign_role` DB trigger | Was inserting 'owner' into `user_roles` for ALL new users — **trigger dropped** |
| No UPDATE RLS on `staff_members` → invite accept fails to link `user_id` | Added "Staff can update own record, admins can update all" RLS policy |
| `project.dueDate` null → "Invalid Date" in UI | `rowToProject` uses `?? ""` fallback; UI guards with `isNaN` check |
| PostgREST schema cache after migration | `NOTIFY pgrst, 'reload schema'` |
| `confirmation_token` NULL for SQL-created staff | Set to empty string `''` |

---

## Deployment

- Push to `master` → GitHub Actions → SSH to VPS → build + `pm2 restart`
- VPS runs HTTP — `crypto.randomUUID()` unavailable — `uuid()` helper handles fallback
- Desktop batch file: "Deploy WebbyOps.bat" for manual deploys
