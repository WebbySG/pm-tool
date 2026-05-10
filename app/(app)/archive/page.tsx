"use client";
import { Topbar } from "@/components/topbar";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Calendar, RotateCcw, Archive } from "lucide-react";
import { useState, useEffect } from "react";
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
  const { projects, updateTaskStatus } = useStore();
  const { user } = useAuth();
  const isAdmin = user?.pmRole === "admin";
  const [liveStaff, setLiveStaff] = useState<LiveStaff[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("staff_members").select("id,user_id,email,first_name,last_name,avatar_initials")
      .eq("status", "active")
      .then(({ data }) => setLiveStaff((data as LiveStaff[]) ?? []));
  }, [user?.id]);

  const doneTasks: TaskWithProject[] = projects.flatMap((p) =>
    p.tasks
      .filter((t) => t.status === "done" && (!isAdmin ? t.assigneeId === user?.id : true))
      .map((t) => ({ ...t, projectName: p.name, projectId: p.id }))
  ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // Group by project
  const byProject = new Map<string, TaskWithProject[]>();
  for (const t of doneTasks) {
    if (!byProject.has(t.projectId)) byProject.set(t.projectId, []);
    byProject.get(t.projectId)!.push(t);
  }

  return (
    <>
      <Topbar title="Archive" />
      <div className="p-6 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#22c55e15", border: "1px solid #22c55e30" }}>
            <Archive size={14} style={{ color: "#22c55e" }} />
            <span className="text-sm font-medium" style={{ color: "#22c55e" }}>{doneTasks.length} completed task{doneTasks.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {doneTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Archive size={36} style={{ color: "#1c3248" }} />
            <p className="text-sm" style={{ color: "#4a7090" }}>No completed tasks yet.</p>
          </div>
        )}

        {Array.from(byProject.entries()).map(([projectId, tasks]) => {
          const project = projects.find((p) => p.id === projectId);
          return (
            <div key={projectId}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#4a7090" }}>
                {project?.name ?? "Unknown Project"}
              </p>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1c3248" }}>
                {tasks.map((task, i) => {
                  const assignee = liveStaff.find((s) => staffAuthId(s) === task.assigneeId);
                  const avatarColor = AVATAR_COLORS[liveStaff.indexOf(assignee!) % AVATAR_COLORS.length] ?? "#818cf8";
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
                          Completed {new Date(task.updatedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
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
                        <button
                          onClick={() => updateTaskStatus(task.projectId, task.id, "todo")}
                          title="Reopen task"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                          style={{ background: "#38b6e820", color: "#38b6e8", border: "1px solid #38b6e840" }}
                        >
                          <RotateCcw size={11} /> Reopen
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
