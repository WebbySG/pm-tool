"use client";
import { Topbar } from "@/components/topbar";
import { type Task } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { TaskDrawer } from "@/components/task-drawer";
import { Calendar, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";

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
  todo: { label: "To Do", color: "#4a7090", bg: "#8b90a720" },
  in_progress: { label: "In Progress", color: "#3b82f6", bg: "#3b82f620" },
  review: { label: "Review", color: "#f59e0b", bg: "#f59e0b20" },
  done: { label: "Done", color: "#22c55e", bg: "#22c55e20" },
};

function TaskGroup({
  title, tasks, accent, icon, onSelect, liveStaff,
}: {
  title: string;
  tasks: TaskWithProject[];
  accent: string;
  icon?: React.ReactNode;
  onSelect: (task: TaskWithProject) => void;
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
          const sc = statusConfig[task.status];
          const overdue = task.status !== "done" && new Date(task.dueDate) < new Date();
          return (
            <div
              key={task.id}
              onClick={() => onSelect(task)}
              className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
              style={{ background: "#0f1d2e", borderBottom: i < tasks.length - 1 ? "1px solid #1c3248" : "none" }}
            >
              <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0" style={{ borderColor: "#1c3248" }}>
                {task.status === "done" && <span style={{ color: "#22c55e", fontSize: 10 }}>✓</span>}
              </div>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: priorityColor[task.priority] }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: task.status === "done" ? "#4a7090" : "#cce4ff", textDecoration: task.status === "done" ? "line-through" : "none" }}>
                  {task.title}
                </p>
                <p className="text-xs truncate" style={{ color: "#4a7090" }}>{task.projectName}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                <div className="flex items-center gap-1 text-xs" style={{ color: overdue ? "#ef4444" : "#4a7090" }}>
                  <Calendar size={11} />
                  {new Date(task.dueDate).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}
                </div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#38b6e8", color: "#fff" }}>
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
  const { projects } = useStore();
  const [liveStaff, setLiveStaff] = useState<LiveStaff[]>([]);
  const [filterMember, setFilterMember] = useState("all");

  useEffect(() => {
    supabase.from("staff_members").select("id,user_id,email,first_name,last_name,avatar_initials")
      .eq("status", "active")
      .then(({ data }) => setLiveStaff((data as LiveStaff[]) ?? []));
  }, []);
  const [filterType, setFilterType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null);

  const allTasks: TaskWithProject[] = projects.flatMap((p) =>
    p.tasks.map((t) => ({ ...t, projectName: p.name, projectId: p.id }))
  );

  const filtered = allTasks.filter((t) => {
    if (filterMember !== "all" && t.assigneeId !== filterMember) return false;
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const now = new Date();
  const todayStr = now.toDateString();

  const grouped = {
    overdue: filtered.filter((t) => t.status !== "done" && new Date(t.dueDate) < now && new Date(t.dueDate).toDateString() !== todayStr),
    today: filtered.filter((t) => t.status !== "done" && new Date(t.dueDate).toDateString() === todayStr),
    upcoming: filtered.filter((t) => t.status !== "done" && new Date(t.dueDate) > now),
    done: filtered.filter((t) => t.status === "done"),
  };

  // Keep selected task in sync with store updates
  const liveSelectedTask = selectedTask
    ? projects.find((p) => p.id === selectedTask.projectId)?.tasks.find((t) => t.id === selectedTask.id) ?? null
    : null;

  return (
    <>
      <Topbar title="All Tasks" />
      <div className="p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2">
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
          <span className="text-sm" style={{ color: "#4a7090" }}>{filtered.length} tasks</span>
        </div>

        <TaskGroup title="Overdue" tasks={grouped.overdue} accent="#ef4444" icon={<AlertTriangle size={14} style={{ color: "#ef4444" }} />} onSelect={setSelectedTask} liveStaff={liveStaff} />
        <TaskGroup title="Due Today" tasks={grouped.today} accent="#f59e0b" onSelect={setSelectedTask} liveStaff={liveStaff} />
        <TaskGroup title="Upcoming" tasks={grouped.upcoming} accent="#38b6e8" onSelect={setSelectedTask} liveStaff={liveStaff} />
        <TaskGroup title="Completed" tasks={grouped.done} accent="#22c55e" onSelect={setSelectedTask} liveStaff={liveStaff} />

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: "#4a7090" }}>No tasks match the current filters.</p>
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
