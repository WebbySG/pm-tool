// ─── Task sheet — every task of a client as one flat, sortable row ───────────
// Powers the project "Sheet" tab (all of a client's tasks, editable in place)
// and the global /articles page (the article rows of every client at once).
// Both read the SAME builder, so a number on one can never disagree with the
// other.
//
// Deliberately dependency-free (types + lib/weekly-seo only — no supabase,
// next or react), for the same reason lib/weekly-seo.ts is: it is shared by two
// UI surfaces and the CSV export, and pure functions are the only part of this
// feature testable without a browser.
//
// ARTICLE IDENTITY IS THE `is_article` FLAG, NEVER THE TITLE. The live data is
// the argument: 109 tasks contain the word "article" but 62 of them are not
// articles ("Featured image not showing in single article page"), while 19
// genuine articles — with live URLs already recorded — are titled only
// "Monday", "wednesday post" or "Wednesday Blogs". Titles are for people; the
// flag is for counting. See scripts/task-is-article.sql.

import type { Project, Task, TaskStatus } from "./mock-data";
import { mondayOf, planWeek, utcDate } from "./weekly-seo";

// ─── Article identity ────────────────────────────────────────────────────────

/** Weekly-generator article slots: article-1 (Mon), article-2 (Wed), article-3 (Fri). */
const ARTICLE_SLOT_RE = /^article-\d+$/;

/**
 * Is this task an article?
 *
 * The flag is the answer; the slot check is belt-and-braces so a generated
 * article always counts even if its flag write failed, and so generator rows
 * created before the flag existed need no backfill of their own.
 */
export function isArticleTask(t: Task): boolean {
  return t.isArticle || (!!t.seoSlot && ARTICLE_SLOT_RE.test(t.seoSlot));
}

/**
 * A task that HOLDS articles rather than being one — the weekly parent
 * ("week 6 articles", "Article Upload (Week 4)"). It is the group heading, never
 * an article row of its own, or every week would be counted twice.
 */
export function holdsArticles(t: Task): boolean {
  return t.subtasks.some((c) => isArticleTask(c) || holdsArticles(c));
}

// ─── Status ──────────────────────────────────────────────────────────────────

/** Which pile a task is in, from the admin's point of view. */
export type Bucket = "working" | "needs_you" | "waiting" | "done" | "closed";

export const BUCKET_META: Record<Bucket, { label: string; color: string }> = {
  working:   { label: "In progress",  color: "#3b82f6" },
  needs_you: { label: "Needs review", color: "#a855f7" },
  waiting:   { label: "Waiting",      color: "#f97316" },
  done:      { label: "Done",         color: "#22c55e" },
  closed:    { label: "Closed",       color: "#dc2626" },
};

const STATUS_BUCKET: Record<string, Bucket> = {
  todo: "working",
  in_progress: "working",
  revision_required: "working",
  pending_review: "needs_you",
  to_be_discussed: "needs_you",
  pending_client_approval: "waiting",
  pending_article_post: "waiting",
  done: "done",
  rejected: "closed",
  missed: "closed",
};

export function bucketOf(status: TaskStatus): Bucket {
  // An unrecognised status counts as still-open work rather than vanishing from
  // the outstanding number — the pm_tasks status CHECK has gained a value four
  // times already (to_be_discussed, pending_client_approval,
  // pending_article_post, rejected), each as a live migration.
  return STATUS_BUCKET[status] ?? "working";
}

// Colours match task-drawer statusOptions so a status reads the same everywhere.
const STATUS_LABEL: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  to_be_discussed: "To Be Discussed",
  pending_review: "Pending Review",
  pending_client_approval: "Pending Client Approval",
  pending_article_post: "Pending Article Post",
  revision_required: "Revision Required",
  done: "Done",
  missed: "Missed",
  rejected: "Rejected",
};

const STATUS_COLOR: Record<string, string> = {
  todo: "#4a7090",
  in_progress: "#3b82f6",
  to_be_discussed: "#06b6d4",
  pending_review: "#a855f7",
  pending_client_approval: "#ec4899",
  pending_article_post: "#f97316",
  revision_required: "#f59e0b",
  done: "#22c55e",
  missed: "#ef4444",
  rejected: "#dc2626",
};

export function statusLabel(s: TaskStatus): string { return STATUS_LABEL[s] ?? s; }
export function statusColor(s: TaskStatus): string { return STATUS_COLOR[s] ?? "#4a7090"; }

/** Every status, in workflow order — drives the dropdown and the filter. */
export const SHEET_STATUSES: TaskStatus[] = [
  "todo", "in_progress", "revision_required", "pending_review",
  "to_be_discussed", "pending_client_approval", "pending_article_post",
  "done", "missed", "rejected",
];

export const PRIORITY_LABEL: Record<number, string> = {
  1: "P1 · Critical", 2: "P2 · High", 3: "P3 · Medium",
  4: "P4 · Low", 5: "P5 · Routine",
};

export function priorityColor(p: number): string {
  if (p <= 1) return "#ef4444";
  if (p === 2) return "#f97316";
  if (p === 3) return "#f59e0b";
  if (p === 4) return "#3b82f6";
  return "#4a7090";
}

// ─── Weeks ───────────────────────────────────────────────────────────────────

/** Undated rows sort into their own bucket rather than guessing a week. */
export const NO_WEEK = "";
export const NO_WEEK_LABEL = "No date set";

function parseIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = utcDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function isoOf(d: Date): string { return d.toISOString().slice(0, 10); }

/**
 * The Monday a row is filed under.
 *
 * A generated article knows its own week (`seo_week`). Everything else is
 * placed by its due date, and failing that by its parent's — the live pattern
 * is a dated weekly parent ("Week 6 Article", due Friday) whose children carry
 * no date of their own, and dropping those would empty most of the sheet.
 */
export function weekKeyOf(task: Task, parent: Task | null): string {
  if (task.seoWeek) return task.seoWeek;
  const own = task.dueDate ? parseIso(task.dueDate) : null;
  if (own) return isoOf(mondayOf(own));
  const up = parent?.dueDate ? parseIso(parent.dueDate) : null;
  if (up) return isoOf(mondayOf(up));
  return NO_WEEK;
}

/**
 * "August (Week 1)" — the same month-of-Friday rule the weekly generator names
 * its parents by, reused rather than re-derived so a generated week and a
 * hand-made week in the same calendar week never carry two different labels.
 */
export function weekLabelOf(weekKey: string): string {
  if (weekKey === NO_WEEK) return NO_WEEK_LABEL;
  const d = parseIso(weekKey);
  if (!d) return NO_WEEK_LABEL;
  return planWeek(mondayOf(d)).title;
}

// ─── Rows ────────────────────────────────────────────────────────────────────

export interface SheetRow {
  id: string;
  task: Task;
  projectId: string;
  projectName: string;
  /** The task this one sits under, when it has one — the "Group" column. */
  parentId: string | null;
  parentTitle: string;
  title: string;
  status: TaskStatus;
  bucket: Bucket;
  priority: number;
  assigneeId: string;
  dueDate: string;
  /** Monday ISO, or NO_WEEK when nothing dates this row. */
  weekKey: string;
  weekLabel: string;
  isArticle: boolean;
  /** True for a weekly parent — it groups articles rather than being one. */
  isArticleGroup: boolean;
  articleUrl: string | null;
  statusChangedAt: string | null;
  createdAt: string;
}

/**
 * Flatten a project's task tree into sheet rows — parents and children alike,
 * each carrying its parent's title in `parentTitle`. Flat is the point: the
 * board already shows the hierarchy, and what the sheet is for is sorting and
 * filtering across all of it at once.
 */
export function sheetRowsForProject(project: Project): SheetRow[] {
  const out: SheetRow[] = [];

  const walk = (task: Task, parent: Task | null) => {
    const weekKey = weekKeyOf(task, parent);
    out.push({
      id: task.id,
      task,
      projectId: project.id,
      projectName: project.name,
      parentId: parent?.id ?? null,
      parentTitle: parent?.title ?? "",
      title: task.title,
      status: task.status,
      bucket: bucketOf(task.status),
      priority: task.priority,
      assigneeId: task.assigneeId,
      dueDate: task.dueDate || (parent?.dueDate ?? ""),
      weekKey,
      weekLabel: weekLabelOf(weekKey),
      isArticle: isArticleTask(task),
      isArticleGroup: holdsArticles(task),
      articleUrl: task.articleUrl,
      statusChangedAt: task.statusChangedAt,
      createdAt: task.createdAt,
    });
    for (const child of task.subtasks) walk(child, task);
  };

  for (const t of project.tasks) walk(t, null);
  return out;
}

export function sheetRows(projects: Project[]): SheetRow[] {
  return projects.flatMap(sheetRowsForProject);
}

/**
 * The article rows: flagged, and not a weekly parent that merely holds
 * articles — that single rule collapses both shapes the live data uses, the
 * generator's "August (Week 1)" parent with three article children and the
 * hand-made "week 6 articles" parent with weekday children. A flagged task with
 * no articles under it is a row in its own right, which is how a one-off blog
 * post appears.
 */
export function articleRows(rows: SheetRow[]): SheetRow[] {
  return rows.filter((r) => r.isArticle && !r.isArticleGroup);
}

// ─── Sorting ─────────────────────────────────────────────────────────────────

export type SortKey =
  | "week" | "dueDate" | "projectName" | "parentTitle" | "title"
  | "status" | "priority" | "assignee" | "updated";

/**
 * Sort by one column. Blanks always sort LAST regardless of direction — an
 * undated task is not "the most urgent" just because its due date is empty,
 * which is exactly the trap the keyword table had to avoid too.
 */
export function sortSheetRows(
  rows: SheetRow[],
  key: SortKey,
  desc: boolean,
  assigneeName: (id: string) => string,
): SheetRow[] {
  const dir = desc ? -1 : 1;
  const blankLast = (a: string, b: string): number | null => {
    if (a === b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return null;
  };

  return [...rows].sort((a, b) => {
    switch (key) {
      case "week": {
        const r = blankLast(a.weekKey, b.weekKey);
        return r ?? (a.weekKey < b.weekKey ? -dir : dir);
      }
      case "dueDate": {
        const r = blankLast(a.dueDate, b.dueDate);
        return r ?? (a.dueDate < b.dueDate ? -dir : dir);
      }
      case "priority":
        return (a.priority - b.priority) * dir || a.title.localeCompare(b.title);
      case "status":
        return (SHEET_STATUSES.indexOf(a.status) - SHEET_STATUSES.indexOf(b.status)) * dir
          || a.title.localeCompare(b.title);
      case "assignee": {
        const an = a.assigneeId ? assigneeName(a.assigneeId) : "";
        const bn = b.assigneeId ? assigneeName(b.assigneeId) : "";
        const r = blankLast(an, bn);
        return r ?? an.localeCompare(bn) * dir;
      }
      case "updated": {
        const an = a.statusChangedAt ?? "";
        const bn = b.statusChangedAt ?? "";
        const r = blankLast(an, bn);
        return r ?? (an < bn ? -dir : dir);
      }
      case "projectName":
        return a.projectName.localeCompare(b.projectName) * dir || a.title.localeCompare(b.title);
      case "parentTitle": {
        const r = blankLast(a.parentTitle, b.parentTitle);
        return r ?? a.parentTitle.localeCompare(b.parentTitle) * dir;
      }
      default:
        return a.title.localeCompare(b.title) * dir;
    }
  });
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export interface SheetSummary {
  total: number;
  outstanding: number;
  working: number;
  needsYou: number;
  waiting: number;
  done: number;
  closed: number;
  articles: number;
  overdue: number;
}

/**
 * `todayIso` is passed in rather than read from the clock so this stays pure and
 * the caller controls the timezone (the agency works to Asia/Singapore).
 */
export function summarise(rows: SheetRow[], todayIso: string): SheetSummary {
  const s: SheetSummary = {
    total: rows.length, outstanding: 0, working: 0, needsYou: 0,
    waiting: 0, done: 0, closed: 0, articles: 0, overdue: 0,
  };
  for (const r of rows) {
    if (r.bucket === "working") s.working++;
    else if (r.bucket === "needs_you") s.needsYou++;
    else if (r.bucket === "waiting") s.waiting++;
    else if (r.bucket === "done") s.done++;
    else s.closed++;

    // "Outstanding" is everything still needing someone to act. A rejected or
    // missed task is finished business, not a debt.
    if (r.bucket !== "done" && r.bucket !== "closed") {
      s.outstanding++;
      if (r.dueDate && r.dueDate < todayIso) s.overdue++;
    }
    if (r.isArticle && !r.isArticleGroup) s.articles++;
  }
  return s;
}

/** Per-client outstanding counts for the global overview, busiest first. */
export function summariseByProject(rows: SheetRow[], todayIso: string): {
  projectId: string; projectName: string; summary: SheetSummary;
}[] {
  const byProject = new Map<string, SheetRow[]>();
  for (const r of rows) {
    if (!byProject.has(r.projectId)) byProject.set(r.projectId, []);
    byProject.get(r.projectId)!.push(r);
  }
  return Array.from(byProject.entries())
    .map(([projectId, list]) => ({
      projectId,
      projectName: list[0].projectName,
      summary: summarise(list, todayIso),
    }))
    .sort((a, b) =>
      b.summary.outstanding - a.summary.outstanding ||
      a.projectName.localeCompare(b.projectName));
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  // A leading = / + / - / @ is escaped so Excel doesn't evaluate a task title
  // like "-10 tips" as a formula. Same guard as lib/expense-types.ts.
  const body = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(body) ? `"${body.replace(/"/g, '""')}"` : body;
}

/**
 * The spreadsheet hand-off. Writes exactly the rows on screen in exactly the
 * order they are shown, so what you sorted is what you get.
 */
export function sheetToCSV(
  rows: SheetRow[],
  personName: (id: string) => string,
  opts: { includeClient: boolean },
): string {
  const header = [
    ...(opts.includeClient ? ["Client"] : []),
    "Week", "Due date", "Group", "Task", "Status", "Priority",
    "Assignee", "Article", "Live URL", "Last updated",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push([
      ...(opts.includeClient ? [r.projectName] : []),
      r.weekLabel,
      r.dueDate,
      r.parentTitle,
      r.title,
      statusLabel(r.status),
      PRIORITY_LABEL[r.priority] ?? String(r.priority),
      r.assigneeId ? personName(r.assigneeId) : "Unassigned",
      r.isArticle ? "Yes" : "",
      r.articleUrl ?? "",
      r.statusChangedAt ?? "",
    ].map(csvCell).join(","));
  }
  // CRLF + UTF-8 BOM so Excel on Windows opens it cleanly.
  return "﻿" + lines.join("\r\n") + "\r\n";
}
