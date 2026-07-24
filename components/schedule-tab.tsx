"use client";
import { useState } from "react";
import {
  ChevronDown, ChevronRight, Plus, RotateCcw, Check,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { type Task, type Project } from "@/lib/mock-data";

interface LiveStaff {
  id: string; user_id: string | null; email: string;
  first_name: string | null; last_name: string | null; avatar_initials: string;
}
function staffAuthId(s: LiveStaff) { return s.user_id ?? s.id; }
function staffInitials(s: LiveStaff) { return s.avatar_initials || [s.first_name, s.last_name].filter(Boolean).join(" ").slice(0, 2).toUpperCase() || s.email.slice(0, 2).toUpperCase(); }
function staffName(s: LiveStaff) { return [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email; }

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns 1-based month and week (1-4) relative to project start. */
function getSlot(projectStart: Date, dueDate: string): { month: number; week: 1 | 2 | 3 | 4 } {
  const due = new Date(dueDate);
  const days = Math.max(0, Math.floor((due.getTime() - projectStart.getTime()) / 86400000));
  const month = Math.floor(days / 28) + 1;
  const week = (Math.min(Math.floor((days % 28) / 7) + 1, 4)) as 1 | 2 | 3 | 4;
  return { month, week };
}

/** ISO date string for the last day of a given week slot. */
function slotEndDate(projectStart: Date, month: number, week: number): string {
  const d = new Date(projectStart);
  d.setDate(d.getDate() + (month - 1) * 28 + (week - 1) * 7 + 6);
  return d.toISOString().split("T")[0];
}

const STATUS_COLORS: Record<string, string> = {
  todo: "#4a7090", in_progress: "#38b6e8", review: "#f59e0b", done: "#22c55e", missed: "#ef4444",
  pending_review: "#a855f7", pending_client_approval: "#ec4899", revision_required: "#f59e0b",
};
function PRIORITY_COLORS(p: number | string): string {
  const n = typeof p === "number" ? p : 5;
  if (n <= 2) return "#ef4444";
  if (n <= 4) return "#f59e0b";
  if (n <= 6) return "#38b6e8";
  return "#22c55e";
}

// ── Task row ───────────────────────────────────────────────────────────────────
function TaskRow({
  task,
  isRecurring,
  onClick,
  liveStaff,
}: {
  task: Task;
  isRecurring: boolean;
  onClick: () => void;
  liveStaff: LiveStaff[];
}) {
  const { updateTaskStatus } = useStore();
  const assignee = liveStaff.find((s) => staffAuthId(s) === task.assigneeId);
  const isDone = task.status === "done";

  function toggleDone(e: React.MouseEvent) {
    e.stopPropagation();
    updateTaskStatus(task.projectId, task.id, isDone ? "todo" : "done");
  }

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group transition-all hover:opacity-90"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      {/* Done toggle */}
      <button
        onClick={toggleDone}
        className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
        style={{
          borderColor: isDone ? "#22c55e" : "var(--border)",
          background: isDone ? "#22c55e" : "transparent",
        }}
      >
        {isDone && <Check size={10} color="#fff" strokeWidth={3} />}
      </button>

      {/* Priority dot */}
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: PRIORITY_COLORS(task.priority) }}
        title={`P${task.priority}`}
      />

      {/* Title */}
      <p
        className="text-sm flex-1 truncate"
        style={{
          color: isDone ? "var(--text-muted)" : "var(--text)",
          textDecoration: isDone ? "line-through" : "none",
        }}
      >
        {task.title}
      </p>

      {/* Recurring badge */}
      {isRecurring && (
        <span
          className="shrink-0 flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
          style={{ background: "#38b6e815", color: "#38b6e8" }}
        >
          <RotateCcw size={9} /> weekly
        </span>
      )}

      {/* Status pill */}
      <span
        className="shrink-0 text-xs px-2 py-0.5 rounded-full capitalize"
        style={{ background: (STATUS_COLORS[task.status] ?? "#4a7090") + "20", color: STATUS_COLORS[task.status] ?? "#4a7090" }}
      >
        {task.status.replace(/_/g, " ")}
      </span>

      {/* Assignee avatar */}
      {assignee && (
        <div
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: "var(--accent)", color: "#fff" }}
          title={staffName(assignee)}
        >
          {staffInitials(assignee)}
        </div>
      )}
    </div>
  );
}

// ── Week row ───────────────────────────────────────────────────────────────────
function WeekRow({
  weekNum,
  weekStart,
  weekEnd,
  tasks,
  recurringIds,
  onTaskClick,
  onAddTask,
  liveStaff,
}: {
  weekNum: number;
  weekStart: Date;
  weekEnd: Date;
  tasks: Task[];
  recurringIds: Set<string>;
  onTaskClick: (t: Task) => void;
  onAddTask: () => void;
  liveStaff: LiveStaff[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const done = tasks.filter((t) => t.status === "done").length;
  const fmt = (d: Date) => d.toLocaleDateString("en-SG", { day: "numeric", month: "short" });

  return (
    <div>
      {/* Week header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:opacity-80 transition-opacity"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <span style={{ color: "var(--text-muted)" }}>
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        </span>
        <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
          Week {weekNum}
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {fmt(weekStart)} – {fmt(weekEnd)}
        </span>
        {tasks.length > 0 && (
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{ background: done === tasks.length && tasks.length > 0 ? "#22c55e20" : "var(--bg-surface)", color: done === tasks.length && tasks.length > 0 ? "#22c55e" : "var(--text-muted)" }}
          >
            {done}/{tasks.length} done
          </span>
        )}
      </button>

      {/* Week content */}
      {!collapsed && (
        <div className="px-5 pb-3 flex flex-col gap-1.5">
          {tasks.length === 0 && (
            <p className="text-xs py-1" style={{ color: "var(--text-muted)" }}>No tasks this week</p>
          )}
          {tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              isRecurring={recurringIds.has(t.id)}
              onClick={() => onTaskClick(t)}
              liveStaff={liveStaff}
            />
          ))}
          <button
            onClick={onAddTask}
            className="flex items-center gap-1.5 text-xs py-1.5 px-2.5 rounded-lg transition-opacity hover:opacity-80 mt-0.5 w-fit"
            style={{ color: "var(--text-muted)", border: "1px dashed var(--border)" }}
          >
            <Plus size={11} /> Add task
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Schedule Tab ──────────────────────────────────────────────────────────
export function ScheduleTab({
  project,
  onTaskClick,
  onAddTask,
  liveStaff,
}: {
  project: Project;
  onTaskClick: (task: Task) => void;
  /** Called with the pre-filled due date ISO string for that week. */
  onAddTask: (dueDate: string) => void;
  liveStaff: LiveStaff[];
}) {
  const projectStart = new Date(project.startDate);
  const projectEnd   = new Date(project.dueDate);

  // Total months to display (at least 1)
  const totalDays   = Math.max(28, Math.ceil((projectEnd.getTime() - projectStart.getTime()) / 86400000));
  const totalMonths = Math.ceil(totalDays / 28);

  // Build per-slot task lists
  // one-time tasks → exact slot
  // recurring weekly → all 4 weeks of every month from start month onwards
  // recurring monthly → week 4 of every month from start month onwards
  const oneTime   = new Map<string, Task[]>();
  const recurring = new Map<string, Task[]>(); // key = "month-week", value = tasks
  const recurringIds = new Set<string>();

  for (const task of project.tasks) {
    if (!task.dueDate) continue;
    const { month, week } = getSlot(projectStart, task.dueDate);

    if (task.recurring === "weekly") {
      recurringIds.add(task.id);
      for (let m = month; m <= totalMonths; m++) {
        for (let w = 1; w <= 4; w++) {
          const k = `${m}-${w}`;
          if (!recurring.has(k)) recurring.set(k, []);
          if (!recurring.get(k)!.find((t) => t.id === task.id)) {
            recurring.get(k)!.push(task);
          }
        }
      }
    } else if (task.recurring === "monthly") {
      recurringIds.add(task.id);
      for (let m = month; m <= totalMonths; m++) {
        const k = `${m}-4`;
        if (!recurring.has(k)) recurring.set(k, []);
        if (!recurring.get(k)!.find((t) => t.id === task.id)) {
          recurring.get(k)!.push(task);
        }
      }
    } else {
      const k = `${month}-${week}`;
      if (!oneTime.has(k)) oneTime.set(k, []);
      oneTime.get(k)!.push(task);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: totalMonths }, (_, mi) => {
        const monthNum = mi + 1;
        const monthStart = new Date(projectStart);
        monthStart.setDate(monthStart.getDate() + mi * 28);
        const monthLabel = monthStart.toLocaleDateString("en-SG", { month: "long", year: "numeric" });

        // Count tasks in this month
        const monthTaskCount = project.tasks.filter((t) => {
          if (!t.dueDate) return false;
          const { month } = getSlot(projectStart, t.dueDate);
          return month === monthNum;
        }).length;

        const hasRecurringThisMonth = project.tasks.some((t) => {
          if (!t.dueDate) return false;
          const { month } = getSlot(projectStart, t.dueDate);
          return (t.recurring === "weekly" || t.recurring === "monthly") && month <= monthNum;
        });

        return (
          <div
            key={monthNum}
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            {/* Month header */}
            <div
              className="flex items-center gap-3 px-5 py-3.5"
              style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "#fff" }}
              >
                {monthNum}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                  Month {monthNum} — {monthLabel}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {monthNum === 1 && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#22c55e20", color: "#22c55e" }}>
                    Onboarding
                  </span>
                )}
                {hasRecurringThisMonth && monthNum > 1 && (
                  <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "#38b6e820", color: "#38b6e8" }}>
                    <RotateCcw size={9} /> Recurring
                  </span>
                )}
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {monthTaskCount} task{monthTaskCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* 4 weeks */}
            {([1, 2, 3, 4] as const).map((w) => {
              const weekStart = new Date(monthStart);
              weekStart.setDate(weekStart.getDate() + (w - 1) * 7);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6);

              const k = `${monthNum}-${w}`;
              const oneTimeTasks = oneTime.get(k) ?? [];
              const recurringTasks = recurring.get(k) ?? [];
              const slotRecurringIds = new Set(recurringTasks.map((t) => t.id));

              // Deduplicate (a task can't be in both one-time and recurring)
              const allTasks = [
                ...oneTimeTasks,
                ...recurringTasks.filter((t) => !oneTimeTasks.find((ot) => ot.id === t.id)),
              ];

              return (
                <WeekRow
                  key={w}
                  weekNum={w}
                  weekStart={weekStart}
                  weekEnd={weekEnd}
                  tasks={allTasks}
                  recurringIds={slotRecurringIds}
                  onTaskClick={onTaskClick}
                  onAddTask={() => onAddTask(slotEndDate(projectStart, monthNum, w))}
                  liveStaff={liveStaff}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
