"use client";
import { useMemo } from "react";
import { useStore } from "./store";
import { useAuth } from "./auth-context";
import type { Project } from "./mock-data";
import { type Viewer, visibleProjects } from "./task-visibility";

/**
 * The current viewer, and the store filtered to what they may see.
 *
 * The Zustand store deliberately holds NO user context (see the Task Activity
 * module — it is why the audit log is trigger-based), so scoping has to happen
 * at the read side. These hooks are that read side: a page calls
 * `useVisibleProjects()` instead of `useStore((s) => s.projects)` and gets the
 * projects it may open, each carrying only the tasks the viewer may see.
 *
 * Keep the filtering HERE rather than in each page. The bug this replaces was
 * exactly that — two screens filtered by assignee inline and nine forgot to.
 */

export function useViewer(): Viewer {
  const { user } = useAuth();
  // `id: ""` while auth resolves. canSeeProject/ownsTask both treat an empty id
  // as "owns nothing", so a half-loaded session shows an empty list rather than
  // briefly flashing somebody else's work.
  return useMemo(
    () => ({ id: user?.id ?? "", isAdmin: user?.pmRole === "admin" }),
    [user?.id, user?.pmRole],
  );
}

/** Projects the viewer may open, with each project's tasks already scoped. */
export function useVisibleProjects(): Project[] {
  const projects = useStore((s) => s.projects);
  const viewer = useViewer();
  return useMemo(() => visibleProjects(projects, viewer), [projects, viewer]);
}
