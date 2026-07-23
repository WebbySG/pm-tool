"use client";
import { Topbar } from "@/components/topbar";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { dbListArchivedTasks } from "@/lib/db";
import { Calendar, RotateCcw, Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { type Task } from "@/lib/mock-data";

interface LiveStaff {
  id: string; user_id: string | null; email: string;
  first_name: string | null; last_name: string | null; avatar_initials: string;
}
function staffAuthId(s: LiveStaff) { return s.user_id ?? s.id; }
function staffName(s: LiveStaff) { return [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email; }
function staffInitials(s: LiveStaff) { return s.avatar_initials || staffName(s).slice(0, 2).toUpperCase(); }

type TaskWithProject = Task & { projectName: string; projectId: string };

const AVATAR_COLORS = ["#818cf8", "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#22d3ee"];

export default function ArchivePage() {
  const { projects, updateTaskStatus, archiveTask, unarchiveTask } = useStore();
  const { user } = useAuth();
  const isAdmin = user?.pmRole === "admin";
  const [liveStaff, setLiveStaff] = useState<LiveStaff[]>([]);
  const [tab, setTab] = useState<"completed" | "archived">("completed");
  const [archived, setArchived] = useState<TaskWithProject[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("staff_members").select("id,user_id,email,first_name,last_name,avatar_initials")
      .eq("status", "active")
      .then(({ data }) => setLiveStaff((data as LiveStaff[]) ?? []));
  }, [user?.id]);

  const projectName = useCallback(
    (pid: string) => projects.find((p) => p.id === pid)?.name ?? "Unknown Project",
    [projects],
  );

  const loadArchived = useCallback(async () => {
    setArchivedLoading(true);
    try {
      const rows = await dbListArchivedTasks();
      setArchived(
        rows
          .filter((t) => (isAdmin ? true : t.assigneeId === user?.id))
          .map((t) => ({ ...t, projectName: projectName(t.projectId), projectId: t.projectId })),
      );
    } finally {
      setArchivedLoading(false);
    }
  }, [isAdmin, user?.id, projectName]);

  useEffect(() => { if (tab === "archived") void loadArchived(); }, [tab, loadArchived]);

  const doneTasks: TaskWithProject[] = projects.flatMap((p) =>
    p.tasks
      .filter((t) => t.status === "done" && (!isAdmin ? t.assigneeId === user?.id : true))
      .map((t) => ({ ...t, projectName: p.name, projectId: p.id }))
  ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  async function handleArchive(t: TaskWithProject) {
    setBusyId(t.id);
    try { await archiveTask(t.projectId, t.id); } finally { setBusyId(null); }
  }

  async function handleUnarchive(t: TaskWithProject) {
    setBusyId(t.id);
    try {
      await unarchiveTask(t.id);
      setArchived((prev) => prev.filter((x) => x.id !== t.id));
    } finally { setBusyId(null); }
  }

  const list = tab === "completed" ? doneTasks : archived;

  // Group by project
  const byProject = new Map<string, TaskWithProject[]>();
  for (const t of list) {
    if (!byProject.has(t.projectId)) byProject.set(t.projectId, []);
    byProject.get(t.projectId)!.push(t);
  }

  return (
    <>
      <Topbar title="Archive" />
      <div className="p-6 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTab("completed")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
            style={{
              background: tab === "completed" ? "#22c55e15" : "transparent",
              border: `1px solid ${tab === "completed" ? "#22c55e30" : "#1c3248"}`,
              color: tab === "completed" ? "#22c55e" : "#4a7090",
            }}
          >
            <Archive size={14} /> Completed ({doneTasks.length})
          </button>
          <button
            onClick={() => setTab("archived")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
            style={{
              background: tab === "archived" ? "#6b728020" : "transparent",
              border: `1px solid ${tab === "archived" ? "#6b728040" : "#1c3248"}`,
              color: tab === "archived" ? "#9ca3af" : "#4a7090",
            }}
          >
            <ArchiveRestore size={14} /> Archived{tab === "archived" ? ` (${archived.length})` : ""}
          </button>
        </div>

        {tab === "archived" && archivedLoading && (
          <p className="text-sm flex items-center gap-2" style={{ color: "#4a7090" }}>
            <Loader2 size={14} className="animate-spin" /> Loading archived tasks...
          </p>
        )}

        {list.length === 0 && !(tab === "archived" && archivedLoading) && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Archive size={36} style={{ color: "#1c3248" }} />
            <p className="text-sm" style={{ color: "#4a7090" }}>
              {tab === "completed" ? "No completed tasks yet." : "Nothing archived yet."}
            </p>
          </div>
        )}

        {Array.from(byProject.entries()).map(([projectId, tasks]) => (
          <div key={projectId}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#4a7090" }}>
              {projectName(projectId)}
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1c3248" }}>
              {tasks.map((task, i) => {
                const assignee = liveStaff.find((s) => staffAuthId(s) === task.assigneeId);
                const avatarColor = AVATAR_COLORS[liveStaff.indexOf(assignee!) % AVATAR_COLORS.length] ?? "#818cf8";
                const busy = busyId === task.id;
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 px-4 py-3"
                    style={{
                      background: "#0f1d2e",
                      borderBottom: i < tasks.length - 1 ? "1px solid #1c3248" : "none",
                    }}
                  >
                    <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0" style={{ borderColor: "#22c55e", background: "#22c55e20" }}>
                      <span style={{ color: "#22c55e", fontSize: 10 }}>✓</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "#4a7090", textDecoration: "line-through" }}>{task.title}</p>
                      <p className="text-xs" style={{ color: "#1c3248" }}>
                        {tab === "archived" && task.archivedAt
                          ? `Archived ${new Date(task.archivedAt).toLocaleString("en-SG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                          : `Completed ${new Date(task.updatedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}`}
                        {task.subtasks.length > 0 && ` · ${task.subtasks.length} subtask${task.subtasks.length !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1 text-xs" style={{ color: "#4a7090" }}>
                        <Calendar size={11} />
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString("en-SG", { day: "numeric", month: "short" })
                          : "No date"}
                      </div>
                      {assignee && (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: avatarColor, color: "#fff" }}
                          title={staffName(assignee)}
                        >
                          {staffInitials(assignee)}
                        </div>
                      )}
                      {tab === "completed" && (
                        <button
                          onClick={() => updateTaskStatus(task.projectId, task.id, "todo")}
                          title="Reopen task"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                          style={{ background: "#38b6e820", color: "#38b6e8", border: "1px solid #38b6e840" }}
                        >
                          <RotateCcw size={11} /> Reopen
                        </button>
                      )}
                      {tab === "completed" && isAdmin && (
                        <button
                          onClick={() => handleArchive(task)}
                          disabled={busy}
                          title="Archive (hide from active views)"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                          style={{ background: "#6b728020", color: "#9ca3af", border: "1px solid #6b728040", opacity: busy ? 0.6 : 1 }}
                        >
                          {busy ? <Loader2 size={11} className="animate-spin" /> : <Archive size={11} />} Archive
                        </button>
                      )}
                      {tab === "archived" && isAdmin && (
                        <button
                          onClick={() => handleUnarchive(task)}
                          disabled={busy}
                          title="Restore to active views"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                          style={{ background: "#38b6e820", color: "#38b6e8", border: "1px solid #38b6e840", opacity: busy ? 0.6 : 1 }}
                        >
                          {busy ? <Loader2 size={11} className="animate-spin" /> : <ArchiveRestore size={11} />} Unarchive
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
