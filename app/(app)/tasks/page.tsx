"use client";
import { Topbar } from "@/components/topbar";
import { type Task } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { TaskDrawer } from "@/components/task-drawer";
import { Calendar, AlertTriangle, Archive } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

interface LiveStaff {
  id: string; user_id: string | null; email: string;
  first_name: string | null; last_name: string | null; avatar_initials: string;
}
function staffAuthId(s: LiveStaff) { return s.user_id ?? s.id; }
function staffName(s: LiveStaff) { return [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email; }
function staffInitials(s: LiveStaff) { return s.avatar_initials || staffName(s).slice(0, 2).toUpperCase(); }

type TaskWithProject = Task & { projectName: string; projectId: string };

const priorityColor: Record<string, string> = {
  urgent: "#ef4444", high: "#f59e0b", medium: "#38b6e8", low: "#22c55e",
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  todo:        { label: "To Do",       color: "#64748b", bg: "#64748b20" },
  in_progress: { label: "In Progress", color: "#3b82f6", bg: "#3b82f620" },
  review:      { label: "Review",      color: "#f59e0b", bg: "#f59e0b20" },
  done:        { label: "Done",        color: "#22c55e", bg: "#22c55e20" },
};

const AVATAR_COLORS = ["#818cf8", "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#22d3ee"];

function TaskGroup({
  title, tasks, accent, icon, onSelect, onComplete, liveStaff,
}: {
  title: string;
  tasks: TaskWithProject[];
  accent: string;
  icon?: React.ReactNode;
  onSelect: (task: TaskWithProject) => void;
  onComplete: (task: TaskWithProject) => void;
  liveStaff: LiveStaff[];
}) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold" style={{ color: accent }}>{title}</h2>
        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: accent + "20", color: accent }}>{tasks.length}</span>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1c3248" }}>
        {tasks.map((task, i) => {
          const assignee = liveStaff.find((s) => staffAuthId(s) === task.assigneeId);
          const avatarColor = AVATAR_COLORS[liveStaff.indexOf(assignee!) % AVATAR_COLORS.length] ?? "#818cf8";
          const sc = statusConfig[task.status];
          const overdue = task.status !== "done" && !!task.dueDate && new Date(task.dueDate) < new Date();
          return (
            <div
              key={task.id}
              onClick={() => onSelect(task)}
              className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                background: "#0f1d2e",
                borderBottom: i < tasks.length - 1 ? "1px solid #1c3248" : "none",
                borderLeft: `3px solid ${priorityColor[task.priority]}`,
              }}
            >
              {/* Complete checkbox */}
              <button
                onClick={(e) => { e.stopPropagation(); onComplete(task); }}
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 hover:scale-110 transition-transform"
                style={{ borderColor: "#22c55e" }}
                title="Mark complete"
              />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#cce4ff" }}>
                  {task.title}
                </p>
                <p className="text-xs truncate" style={{ color: "#4a7090" }}>{task.projectName}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full hidden sm:block"
                  style={{ background: sc.bg, color: sc.color }}
                >
                  {sc.label}
                </span>
                <div
                  className="flex items-center gap-1 text-xs"
                  style={{ color: overdue ? "#ef4444" : "#4a7090" }}
                >
                  <Calendar size={11} />
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString("en-SG", { day: "numeric", month: "short" })
                    : "No date"}
                </div>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: assignee ? avatarColor : "#1c3248", color: "#fff" }}
                  title={assignee ? staffName(assignee) : "Unassigned"}
                >
                  {assignee ? staffInitials(assignee) : "?"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { projects, updateTaskStatus } = useStore();
  const { user } = useAuth();
  const isAdmin = user?.pmRole === "admin";
  const [liveStaff, setLiveStaff] = useState<LiveStaff[]>([]);

  useEffect(() => {
    supabase.from("staff_members").select("id,user_id,email,first_name,last_name,avatar_initials")
      .eq("status", "active")
      .then(({ data }) => setLiveStaff((data as LiveStaff[]) ?? []));
  }, []);

  const [filterMember, setFilterMember] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null);

  const allTasks: TaskWithProject[] = projects.flatMap((p) =>
    p.tasks
      .filter((t) => isAdmin || t.assigneeId === user?.id)
      .map((t) => ({ ...t, projectName: p.name, projectId: p.id }))
  );

  const activeTasks = allTasks.filter((t) => t.status !== "done");
  const doneCount = allTasks.filter((t) => t.status === "done").length;

  const filtered = activeTasks.filter((t) => {
    if (filterMember !== "all" && t.assigneeId !== filterMember) return false;
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const now = new Date();
  const todayStr = now.toDateString();

  const grouped = {
    overdue:  filtered.filter((t) => t.dueDate && new Date(t.dueDate) < now && new Date(t.dueDate).toDateString() !== todayStr),
    today:    filtered.filter((t) => t.dueDate && new Date(t.dueDate).toDateString() === todayStr),
    upcoming: filtered.filter((t) => t.dueDate && new Date(t.dueDate) > now),
    noDate:   filtered.filter((t) => !t.dueDate),
  };

  async function handleComplete(task: TaskWithProject) {
    await updateTaskStatus(task.projectId, task.id, "done");
  }

  // Keep selected task in sync with store updates
  const liveSelectedTask = selectedTask
    ? projects.find((p) => p.id === selectedTask.projectId)?.tasks.find((t) => t.id === selectedTask.id) ?? null
    : null;

  return (
    <>
      <Topbar title="All Tasks" />
      <div className="p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterMember} onChange={(e) => setFilterMember(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#cce4ff" }}>
            <option value="all">All Members</option>
            {liveStaff.map((s) => <option key={s.id} value={staffAuthId(s)}>{staffName(s)}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#cce4ff" }}>
            <option value="all">All Types</option>
            <option value="webdev">Web Dev</option>
            <option value="seo">SEO</option>
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#cce4ff" }}>
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <span className="text-sm" style={{ color: "#4a7090" }}>{filtered.length} active task{filtered.length !== 1 ? "s" : ""}</span>

          {doneCount > 0 && (
            <Link
              href="/archive"
              className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ background: "#22c55e15", border: "1px solid #22c55e30", color: "#22c55e" }}
            >
              <Archive size={13} /> Archive ({doneCount})
            </Link>
          )}
        </div>

        <TaskGroup title="Overdue" tasks={grouped.overdue} accent="#ef4444" icon={<AlertTriangle size={14} style={{ color: "#ef4444" }} />} onSelect={setSelectedTask} onComplete={handleComplete} liveStaff={liveStaff} />
        <TaskGroup title="Due Today" tasks={grouped.today} accent="#f59e0b" onSelect={setSelectedTask} onComplete={handleComplete} liveStaff={liveStaff} />
        <TaskGroup title="Upcoming" tasks={grouped.upcoming} accent="#38b6e8" onSelect={setSelectedTask} onComplete={handleComplete} liveStaff={liveStaff} />
        <TaskGroup title="No Due Date" tasks={grouped.noDate} accent="#4a7090" onSelect={setSelectedTask} onComplete={handleComplete} liveStaff={liveStaff} />

        {filtered.length === 0 && (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <p className="text-sm" style={{ color: "#4a7090" }}>
              {activeTasks.length === 0 ? "All tasks completed! Check the archive." : "No tasks match the current filters."}
            </p>
            {doneCount > 0 && (
              <Link href="/archive" className="text-sm hover:opacity-80 transition-opacity" style={{ color: "#22c55e" }}>
                View {doneCount} completed task{doneCount !== 1 ? "s" : ""} in Archive →
              </Link>
            )}
          </div>
        )}
      </div>

      <TaskDrawer
        task={liveSelectedTask}
        projectId={selectedTask?.projectId ?? ""}
        onClose={() => setSelectedTask(null)}
      />
    </>
  );
}
