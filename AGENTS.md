# Agent Development Rules

This repository follows the permanent development behaviour rules defined in `CLAUDE.md`.

All coding agents must follow these rules without exception:

1. **Never treat a request as a single-file edit.** Understand the full feature/module before touching anything.
2. **Search first.** Before changing code, search for all related references: component names, function names, route names, table names, type names, dummy/mock terms.
3. **Fix all directly connected issues** in the same task — frontend, backend, API, Edge Function, Supabase, shared types, fallback states, dashboard, reports, documentation.
4. **No dummy/mock/fake/placeholder/hardcoded content in production-facing areas.** If asked to remove dummy content, search the whole codebase and fix all related instances.
5. **Never use `USERS` from `lib/mock-data.ts`.** Always fetch live staff from the `staff_members` Supabase table.
6. **Never hardcode `"u1"`, `"u2"`, `"u3"` or any mock user ID.** Always use `user?.id` from `useAuth()`.
7. **Always `await` database writes.** Fire-and-forget inserts cause silent data loss.
8. **Always replace dummy content with real database/API-driven data,** proper empty states, loading states, or error states — never with another hardcoded value.
9. **Admin users must always be able to edit all details** — task title, due date, description, assignee, priority, status, tags; project name, description, type, phase, due date, client, staff.
10. **Update documentation automatically** whenever important application structure, business rules, database schema, recurring mistakes, or development patterns are discovered. Do not wait to be asked.
11. **Run relevant type checks or build verification** before reporting a task complete where possible.
12. **Do not report a task as complete** until connected areas have been checked and production-facing dummy content has been removed or replaced.

For the full detailed rules, architecture knowledge, database schema, key file map, and recurring mistake list, refer to `CLAUDE.md` Section 11 (WebbyOps PM Tool — Application Knowledge).
