/**
 * Surfacing parked SUBTASKS that would otherwise have no card anywhere.
 *
 * The kanban renders TOP-LEVEL tasks only — a subtask shows as nothing more
 * than "2/3 subtasks" on its parent's card. That is fine while a child's status
 * rolls up to its parent, and `rollupTopStatus` in lib/store.ts does exactly
 * that for `pending_review` and `revision_required`.
 *
 * It deliberately does NOT roll up the three admin-PARKED states below: the
 * admin parks or approves one child without disturbing the parent (and
 * auto-exiting `to_be_discussed` would wipe the admin's note). The consequence
 * is that a parked child becomes invisible — its column reads 0 while the work
 * really is sitting there waiting on someone.
 *
 * That is not hypothetical. Live count 2026-09-02: of 24 tasks in
 * `pending_article_post`, **20 were subtasks with no card on their project
 * board** — including "Monday Task" under the in-progress parent "August Last
 * article" (SG Dynamics), which is how this was reported. The weekly SEO
 * generator makes it structural: it creates Article 1/2/3 as SUBTASKS, so every
 * approved article lands here.
 *
 * The Tasks page had already worked around this with a private copy of the
 * list. This module is that logic lifted out so the board and the Tasks page
 * cannot disagree about what is parked.
 *
 * Pure and dependency-free (types only).
 */

import type { Task, TaskStatus } from "./mock-data";

/**
 * Child statuses that never roll up to the parent, so a descendant holding one
 * must be surfaced as its own card. Keep this the exact complement of what
 * `rollupTopStatus` propagates — if that function ever learns a new state, this
 * list has to be revisited in the same change.
 */
export const SURFACED_CHILD_STATUSES: readonly TaskStatus[] = [
  "to_be_discussed",
  "pending_client_approval",
  "pending_article_post",
];

export function isSurfacedChildStatus(status: string): boolean {
  return (SURFACED_CHILD_STATUSES as readonly string[]).includes(status);
}

/** A surfaced descendant carries its parent's title so a card can say where it lives. */
export type SurfacedTask = Task & { parentTitle?: string };

/**
 * Every descendant (at any depth) sitting in a parked status, tagged with its
 * immediate parent's title. Top-level tasks are NOT included — they already have
 * a card of their own.
 */
export function surfacedDescendants(tasks: Task[]): SurfacedTask[] {
  const out: SurfacedTask[] = [];
  const walk = (parent: Task) => {
    for (const child of parent.subtasks ?? []) {
      if (isSurfacedChildStatus(child.status)) {
        out.push({ ...child, parentTitle: parent.title });
      }
      walk(child);
    }
  };
  for (const t of tasks) walk(t);
  return out;
}

/**
 * What a board should actually render: the top-level tasks plus any parked
 * descendant that would otherwise be invisible.
 *
 * A parked descendant whose PARENT is also parked still appears — they are two
 * separate pieces of waiting work, and that is what the Tasks page already does.
 * Ids are de-duplicated defensively so a task can never be rendered twice (React
 * would warn on the duplicate key, and dnd-kit would misbehave).
 */
export function withSurfacedDescendants(tasks: Task[]): SurfacedTask[] {
  const seen = new Set(tasks.map((t) => t.id));
  const extra = surfacedDescendants(tasks).filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
  return [...tasks, ...extra];
}
