/**
 * Who can see which task — the single rule, applied everywhere.
 *
 * Owner decision 2026-09-02: *"when i assign a project to a staff, they can see
 * all the task ... including other staff task."* A staff member should see their
 * own work, not their colleagues'.
 *
 * Pure and dependency-free (types only) so every surface — project board, sheet,
 * articles, chat pickers, dashboard counts — can import ONE rule. Before this,
 * `project.tasks.filter((t) => t.assigneeId === user.id)` was written inline on
 * two screens and simply omitted on nine others; a rule copied by hand into a
 * dozen places is a rule that will be missed in the thirteenth.
 *
 * ── The rule ─────────────────────────────────────────────────────────────────
 *   admin                    → everything
 *   assigned to me           → visible
 *   created by me            → visible (mirrors the deletion-request model,
 *                              which already trusts created_by)
 *   UNASSIGNED               → visible, so staff can still pick work up. Hiding
 *                              these would strand every unassigned task until an
 *                              admin dished it out — and revokeStaff() unassigns
 *                              a departing member's backlog, so a whole client's
 *                              work can land in that state.
 *   anything else            → hidden
 *
 * ── Ancestors are kept, and this is not optional ─────────────────────────────
 * `project.tasks` holds TOP-LEVEL tasks only; children live in `subtasks`. So a
 * flat `filter(t => t.assigneeId === me)` over the top level DELETES the parent
 * of a subtask I own, and my own work becomes unreachable — the kanban only ever
 * renders parents, with subtasks as a progress count. That is not hypothetical:
 * the weekly SEO engine creates Article 1/2/3 as subtasks of a weekly parent, so
 * the old board filter was already hiding real staff work.
 *
 * A parent kept purely as an ancestor is a shell: the viewer sees its title and
 * status because they must, to reach their own subtask, but its OTHER children
 * are filtered out the same way. Every count downstream is derived from the
 * filtered tree, so a staff member's view stays internally consistent — a
 * progress bar reads "1 of 2" over what they can actually see, never over work
 * they are not shown.
 *
 * ⚠ This is a UI rule, not enforcement. `pm_tasks` still carries a blanket
 * `pm_allow_all` policy, so every browser downloads every task and a determined
 * staff member could still read them through the API. Scoping pm_tasks with RLS
 * is the agreed follow-up (owner decision 2026-09-02: UI first, database after).
 * Do not describe this as a security boundary until that lands.
 */

import type { Task, Project } from "./mock-data";

export type Viewer = {
  /** The auth uid of the person looking. Empty while auth is still resolving. */
  id: string;
  isAdmin: boolean;
};

/** Unassigned is stored as "" (rowToTask coalesces a NULL assignee_id). */
export function isUnassigned(task: Pick<Task, "assigneeId">): boolean {
  return !task.assigneeId;
}

/** Does this one task belong to the viewer? Ignores descendants. */
export function ownsTask(task: Pick<Task, "assigneeId" | "createdBy">, viewerId: string): boolean {
  if (!viewerId) return false;
  return task.assigneeId === viewerId || task.createdBy === viewerId;
}

/** Is this one task visible in its own right? Ignores descendants. */
export function canSeeTask(
  task: Pick<Task, "assigneeId" | "createdBy">,
  viewer: Viewer,
): boolean {
  if (viewer.isAdmin) return true;
  return ownsTask(task, viewer.id) || isUnassigned(task);
}

/**
 * Filter a task TREE. A node survives when the viewer can see it OR when it
 * still holds a visible descendant, in which case it is kept as an ancestor so
 * that descendant stays reachable. Children are always filtered recursively, so
 * an ancestor never leaks its other owners' work.
 *
 * Returns new objects — never mutates the store's arrays.
 */
export function filterTaskTree(tasks: Task[], viewer: Viewer): Task[] {
  if (viewer.isAdmin) return tasks;
  const out: Task[] = [];
  for (const task of tasks) {
    const subtasks = filterTaskTree(task.subtasks ?? [], viewer);
    if (canSeeTask(task, viewer) || subtasks.length > 0) {
      out.push({ ...task, subtasks });
    }
  }
  return out;
}

/**
 * Every visible task as a FLAT list, descendants included.
 *
 * For surfaces that walk into subtasks rather than rendering a tree (the sheet,
 * the Articles page, chat's task pickers). Ancestor shells are deliberately
 * EXCLUDED here: a flat list has no reachability problem to solve, so a parent
 * the viewer does not own has no reason to appear as a row.
 */
export function visibleTasksFlat(tasks: Task[], viewer: Viewer): Task[] {
  const out: Task[] = [];
  const walk = (list: Task[]) => {
    for (const t of list) {
      if (canSeeTask(t, viewer)) out.push(t);
      walk(t.subtasks ?? []);
    }
  };
  walk(tasks);
  return out;
}

/**
 * Is this project visible at all? Staff see only projects they are staffed on.
 *
 * This was enforced on the projects LIST and the dashboard but nowhere else, so
 * a staff member could open any project by URL and read its Sheet, SEO Work and
 * Reports tabs in full.
 */
export function canSeeProject(
  project: Pick<Project, "assignedStaff">,
  viewer: Viewer,
): boolean {
  if (viewer.isAdmin) return true;
  if (!viewer.id) return false;
  return (project.assignedStaff ?? []).includes(viewer.id);
}

/** The projects a viewer may open, each carrying only the tasks they may see. */
export function visibleProjects(projects: Project[], viewer: Viewer): Project[] {
  if (viewer.isAdmin) return projects;
  return projects
    .filter((p) => canSeeProject(p, viewer))
    .map((p) => ({ ...p, tasks: filterTaskTree(p.tasks ?? [], viewer) }));
}

/** done / total over whatever the viewer can actually see, descendants included. */
export function taskProgress(tasks: Task[]): { done: number; total: number; pct: number } {
  let done = 0;
  let total = 0;
  const walk = (list: Task[]) => {
    for (const t of list) {
      total++;
      if (t.status === "done") done++;
      walk(t.subtasks ?? []);
    }
  };
  walk(tasks);
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}
