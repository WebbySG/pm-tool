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

**Tasks:** title, status, priority, assignee, due date (must save to DB), description, tags, recurring, subtasks, delete, move to another project (top-level tasks only — subtasks travel with their parent; `moveTaskToProject` in `lib/store.ts`)

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
| `pm_notifications` | `id`, `title`, `body`, `type`, `project_id`, `task_id`, `read`, `created_at`, `user_id` (nullable — NULL = workspace-global; set = targeted), `link` (optional href) |
| `pm_task_attachments` | file attachments |
| `pm_chat_conversations` | `id`, `kind` (project/dm/group), `name`, `project_id`, `created_by`, `last_message_at` |
| `pm_chat_members` | `(conversation_id, user_id)` PK + `joined_at`, `last_read_at`, `pinned` (bool, per-user pin), `category_id` (FK → `pm_chat_categories`, ON DELETE SET NULL — per-user folder assignment) |
| `pm_chat_categories` | `id`, `user_id`, `name`, `sort_order`, `created_at` — per-user chat folders. Unique `(user_id, lower(name))`, RLS `pm_allow_all` |
| `pm_chat_messages` | `id`, `conversation_id`, `author_id`, `body`, `attachment_url`, `attachment_name`, `attachment_type`, `edited_at`, `deleted_at`, `created_at`, `parent_id` (FK → `pm_chat_messages`, ON DELETE CASCADE — NULL = top-level, set = thread reply) |
| `pm_chat_mentions` | `(message_id, mentioned_user_id)` — for routing @-mention notifications |
| `pm_chat_pinned_messages` | `id`, `conversation_id` (FK, cascade), `message_id` (FK, cascade), `pinned_by`, `created_at`. Unique `(conversation_id, message_id)`. **Shared** per conversation (not per-user), unlimited. RLS `pm_allow_all`, in `supabase_realtime` publication |
| `pm_chat_reactions` | `id`, `conversation_id` (FK, cascade), `message_id` (FK, cascade), `user_id`, `emoji`, `created_at`. Unique `(message_id, user_id, emoji)`. Emoji reactions, shared. RLS `pm_allow_all`, in `supabase_realtime` publication |
| `pm_push_subscriptions` | `id`, `user_id`, `endpoint` (unique), `p256dh`, `auth`, `created_at`. Browser Web Push subscriptions (one per device/browser). RLS `pm_allow_all`. Read only server-side by the push API route. |
| `pm_invoices` | `id`, `invoice_number`, `project_id` (FK → `pm_projects`, ON DELETE SET NULL — the live link), `client_id` (legacy/unused — client page removed, kept nullable for back-compat), `status` (draft/sent/paid/void), `currency`, `issue_date`, `due_date`, snapshot `bill_to_*` fields, `subtotal`, `discount_type` (none/percent/fixed), `discount_value`, `total`, `reminder_cadence_days`, `sent_at`, `paid_at`, `paid_by`, `pdf_path` |
| `pm_invoice_line_items` | `id`, `invoice_id`, `description`, `qty`, `unit_price`, `line_total` (generated) |
| `pm_invoice_templates` | `id`, `name`, `description`, `default_notes`, `default_payment_instructions`, `default_due_days` |
| `pm_invoice_template_line_items` | `id`, `template_id`, `description`, `qty`, `unit_price` |
| `pm_invoice_counters` | `year` (PK), `last_seq` — used by `next_invoice_number(p_year)` RPC |
| `pm_invoice_logs` | `id`, `invoice_id`, `event`, `detail`, `actor` — invoice activity audit trail |
| `pm_clients` extension | added `billing_email`, `billing_address` (nullable) for invoice prefill |

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
app/(app)/tasks/page.tsx      — All tasks (role filtered). New Task dialog: admin can quick-create a project inline ("New project" → name only; defaults type=webdev, phase=discovery, assignedStaff=[task assignee]). Uses store.addProject which now returns the new project id.
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
lib/invoice-types.ts          — Invoice / InvoiceTemplate / InvoiceLog types + computeDerivedStatus
lib/invoice-db.ts             — Invoice CRUD, templates, logs, client billing helpers (NOT in main store — pages call directly)
components/invoice-line-items-editor.tsx — Shared line items grid editor (multi-line textarea for description)
components/invoice-template-form.tsx     — Shared create/edit template form
components/invoice-pdf.tsx               — React-PDF Document (branded WebbySG design)
components/invoice-pdf-actions.tsx       — Client-only Preview + Download PDF buttons (dynamic import, ssr: false)
lib/invoice-business-details.ts          — Source of truth for "From" details + logo path
app/(app)/invoices/page.tsx              — Invoice list w/ status filter (admin only)
app/(app)/invoices/new/page.tsx          — Create from template / past invoice / blank
app/(app)/invoices/[id]/page.tsx         — View/edit, mark sent/paid, duplicate, delete, activity log
app/(app)/invoices/templates/page.tsx    — Template list
app/(app)/invoices/templates/new/page.tsx — Create template
app/(app)/invoices/templates/[id]/page.tsx — Edit template
```

### Invoice Module

- **Admin-only.** Sidebar entry hidden for staff; pages wrapped in `<AdminOnly>`.
- **Numbering:** `WSG-YYYY-MM-DD` format (e.g. `WSG-2026-05-18`), generated by `next_invoice_number()` Postgres RPC. Same-day duplicates get an auto-suffix `-2`, `-3`, etc. No counter table — uniqueness checked against `pm_invoices.invoice_number` directly.
- **Status:** stored as `draft|sent|paid|void`. `overdue` is a *computed* status (`computeDerivedStatus` in `lib/invoice-types.ts`) — never stored; derived from `status='sent' AND due_date < today`.
- **Linked to a PROJECT, not a client.** The Clients management page was removed and `pm_clients` is empty, so invoices link to a **project** (`project_id`) instead. New/edit invoice pages show a Project dropdown (from the Zustand `projects` store); picking one prefills `bill_to_name` with the project name (blank-only, editable). The list/detail pages show the linked project name. `client_id` and the `loadClientBilling`/`updateClientBilling` helpers are retained but unused — do not wire new UI to them unless the Clients page is reinstated.
- **Bill-to is a snapshot.** `bill_to_*` fields are stored on the invoice row and are the source of truth for display/PDF. The project link is for organisation/reference only — changing or deleting the project does NOT alter historical bill-to data (project delete just nulls `project_id`).
- **Line totals:** `pm_invoice_line_items.line_total` is a generated column (`qty * unit_price stored`). Don't insert it manually.
- **Currency:** SGD-only for now. UI shows `S$` prefix.
- **Discount:** optional per-invoice discount. `discount_type` = `none` | `percent` | `fixed`; `discount_value` holds the % (e.g. `10` → 10%) or a flat amount. `total = subtotal − discountAmount`, clamped so it never goes negative. **All money math goes through `computeInvoiceTotals()` in [lib/invoice-types.ts](lib/invoice-types.ts)** — the DB layer, `LineItemsEditor`, the detail page, and the PDF all call it so they can't drift. Stored `subtotal`/`total` are recomputed on every create/update (`updateInvoice` reads back missing fields so a discount-only edit still recalculates). Discount lives at the **invoice** level, not on templates.
- **Editable Total (reverse discount):** in `LineItemsEditor` the **Total** field is an editable number input. Typing a total back-calculates the discount as a **fixed** amount (`discount_value = subtotal − enteredTotal`, clamped to `[0, subtotal]`; `≤0` → `discount_type='none'`). It's just another way to drive the same `discountType`/`discountValue` props, so it stays in sync with the discount row and `computeInvoiceTotals`.
- **No tax.** Subtotal = total **before discount**; total = subtotal − discount. If GST is added later, add a `tax_rate` and `tax_total` column (apply tax after discount).
- **Phase 1 (Done):** CRUD, templates, duplicate, mark sent/paid, activity log. "Mark as sent" only flips status — no actual email.
- **Phase 2 (Done):** React-PDF branded template. Client-side generation via `@react-pdf/renderer`. Preview opens blob in new tab; Download triggers `<filename>.pdf` download. Component is `<InvoiceDocument>` in `components/invoice-pdf.tsx`. Must be dynamically imported with `{ ssr: false }` because @react-pdf/renderer is not SSR-safe.
- **Phase 3 (TODO):** Edge Function `send-invoice-email` using Gmail/Workspace SMTP + Nodemailer. Will need to render the PDF server-side (call `pdf(<InvoiceDocument …/>).toBuffer()`) and upload to `pm-invoices` bucket before attaching to the email. Requires Google app password in Edge Function secrets.
- **Phase 4 (TODO):** `pg_cron` daily job that reads `pm_invoices.reminder_cadence_days` per-invoice and triggers reminder emails until paid.
- **Storage bucket:** `pm-invoices` (private). Will hold generated PDFs once Phase 3 starts attaching to emails.
- **Logo asset:** `public/webby-sg-logo.png` — path is hardcoded in `lib/invoice-business-details.ts → logoPath`. Drop the WebbySG logo there as a PNG (transparent background, ~600px). If the file is missing, React-PDF will throw at generation time — there's no fallback in the current code.
- **Business details:** Webby SG / UEN 202444139M / 60 Paya Lebar Road #07-54 Paya Lebar Square / Singapore 409051 / Contact 8080 5608 (Leon). Edit `lib/invoice-business-details.ts` to change.
- **Seeded templates:** "Monthly SEO Project" (SEO Starter $2400 + Google Ads $300/mo) and "Premium Website Development" ($899 one-time). Live in `pm_invoice_templates`.

### Chat Module

- **All authenticated users** (admin + staff). New `Chat` sidebar entry with realtime unread badge.
- **Three conversation kinds:**
  - `project` — one channel per project, **auto-created** on `pm_projects` insert via trigger `pm_projects_create_channel`. Members default to `assigned_staff` + all `user_roles` admins. Trigger `pm_projects_sync_channel_members` adds new staff to the channel when `assigned_staff` updates (additive only — doesn't remove). Unique per project (partial unique index). `ensureProjectChannel` is now mostly a no-op safety net.
  - `dm` — 1-on-1 between any two users. `findOrCreateDM` ensures only one exists per pair.
  - `group` — ad-hoc named group chat, any 3+ users picked at creation.
- **Realtime:** Supabase realtime subscriptions on `pm_chat_messages` (per-conversation for live streaming) + a separate inbox subscription for the sidebar unread badge. Trigger `pm_chat_messages_bump_last` auto-updates `pm_chat_conversations.last_message_at` on every insert.
- **Unread:** counted as messages in conversation where `created_at > member.last_read_at AND author_id != self AND deleted_at IS NULL`. `markRead` updates `last_read_at` on every conversation open.
- **@-mentions:** parsed from message body via `@firstname` regex (case-insensitive). Resolved against active `staff_members` first names. Persisted in `pm_chat_mentions` and trigger a targeted `pm_notifications` row (`type=mention`, `user_id=<recipient>`, `link=/chat`).
- **Notification targeting:** `pm_notifications.user_id` is NULL for workspace-global notifications (legacy behavior) and set for targeted ones. Staff filter their tray to `userId IS NULL OR userId = self`; admin filter is unchanged (approval_request only).
- **Attachments:** reuse `pm-attachments` bucket under `chat/{conversation_id}/{timestamp}_{name}` path. One attachment per message (v1).
- **Edit / delete:** soft delete via `deleted_at` (preserves thread integrity + unread counts). Edit sets `edited_at`. Both gated to author only at UI layer.
- **Unread divider:** MessageView captures the user's `last_read_at` once on mount (stable for the session) and renders a red "NEW" divider above the first message that arrived after it. The divider sticks until you switch conversations or unmount — it doesn't disappear the moment `markRead` writes.
- **Member management:** click "Members" in the conversation header (groups + project channels; hidden for DMs). Dialog allows rename (groups only), add member, remove member. Groups: any member can manage; project channels: admins only.
- **Task references in messages:** type `#` in the composer to open a task picker dropdown (all active tasks across all projects user can see). On select, inserts `[task:<uuid>]` into the message body. Renderer parses these tokens and renders inline as a clickable card with title + project + status badge, linking to `/projects/<projectId>?task=<taskId>`. Combined regex in `RenderBody` handles `@mentions` and `[task:UUID]` in one pass.
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