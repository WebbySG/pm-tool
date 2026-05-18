"use client";
import { Topbar } from "@/components/topbar";
import { type Task } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { TaskDrawer } from "@/components/task-drawer";
import { Calendar, AlertTriangle, Archive, FileEdit, CheckCircle2, Clock, XCircle, Plus, X, Paperclip } from "lucide-react";
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

function priorityColor(p: number | string): string {
  const n = typeof p === "number" ? p : 5;
  if (n <= 2) return "#ef4444";
  if (n <= 4) return "#f59e0b";
  if (n <= 6) return "#38b6e8";
  return "#22c55e";
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  todo:              { label: "To Do",             color: "#64748b", bg: "#64748b20" },
  in_progress:       { label: "In Progress",       color: "#3b82f6", bg: "#3b82f620" },
  pending_review:    { label: "Pending Review",    color: "#a855f7", bg: "#a855f720" },
  revision_required: { label: "Revision Required", color: "#f59e0b", bg: "#f59e0b20" },
  done:              { label: "Done",              color: "#22c55e", bg: "#22c55e20" },
};

const AVATAR_COLORS = ["#818cf8", "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#22d3ee"];

function TaskGroup({
  title, tasks, accent, icon, onSelect, onComplete, onRequestApproval, isAdmin, liveStaff,
}: {
  title: string;
  tasks: TaskWithProject[];
  accent: string;
  icon?: React.ReactNode;
  onSelect: (task: TaskWithProject) => void;
  onComplete: (task: TaskWithProject) => void;
  onRequestApproval: (task: TaskWithProject) => void;
  isAdmin: boolean;
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
                borderLeft: `3px solid ${priorityColor(task.priority)}`,
              }}
            >
              {/* Complete / request approval button */}
              {task.status === "pending_review" ? (
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: "#a855f7" }}
                  title="Awaiting review"
                />
              ) : isAdmin ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onComplete(task); }}
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 hover:scale-110 transition-transform"
                  style={{ borderColor: "#22c55e" }}
                  title="Mark complete"
                />
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onRequestApproval(task); }}
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 hover:scale-110 transition-transform"
                  style={{ borderColor: "#a855f7" }}
                  title="Request completion approval"
                />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#cce4ff" }}>
                  {task.title}
                </p>
                <p className="text-xs truncate" style={{ color: "#4a7090" }}>{task.projectName}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded hidden sm:block"
                  style={{ background: priorityColor(task.priority) + "20", color: priorityColor(task.priority), border: `1px solid ${priorityColor(task.priority)}40` }}
                >
                  P{typeof task.priority === "number" ? task.priority : 5}
                </span>
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
  const { projects, articles, updateTaskStatus, requestTaskApproval, approveArticleAsAdmin, updateArticleStatus, addTask, uploadTaskAttachment } = useStore();
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskProject, setNewTaskProject] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState(5);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskFiles, setNewTaskFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.pmRole === "admin";
  const [activeTab, setActiveTab] = useState<"tasks" | "content">("tasks");
  const [liveStaff, setLiveStaff] = useState<LiveStaff[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("staff_members").select("id,user_id,email,first_name,last_name,avatar_initials")
      .eq("status", "active")
      .then(({ data }) => setLiveStaff((data as LiveStaff[]) ?? []));
  }, [user?.id]);

  const [filterMember, setFilterMember] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "todo" | "in_progress" | "pending_review" | "revision_required">("all");
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
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all") {
      const p = typeof t.priority === "number" ? t.priority : 5;
      const fp = Number(filterPriority);
      if (fp === 1 && p > 2) return false;
      if (fp === 3 && (p < 3 || p > 4)) return false;
      if (fp === 5 && (p < 5 || p > 6)) return false;
      if (fp === 7 && p < 7) return false;
    }
    return true;
  });

  const statusCounts = {
    todo: activeTasks.filter((t) => t.status === "todo").length,
    in_progress: activeTasks.filter((t) => t.status === "in_progress").length,
    pending_review: activeTasks.filter((t) => t.status === "pending_review").length,
    revision_required: activeTasks.filter((t) => t.status === "revision_required").length,
  };

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

  async function handleRequestApproval(task: TaskWithProject) {
    const name = user?.name ?? "Staff";
    await requestTaskApproval(task.projectId, task.id, name, task.title);
  }

  // Keep selected task in sync with store updates
  const liveSelectedTask = selectedTask
    ? projects.find((p) => p.id === selectedTask.projectId)?.tasks.find((t) => t.id === selectedTask.id) ?? null
    : null;

  // Content approval data
  const contentArticles = isAdmin
    ? articles
    : articles.filter((a) => a.submittedById === user?.id);
  const pendingContentCount = contentArticles.filter((a) => a.status === "pending_review").length;

  const articleStatusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    draft:              { label: "Draft",             color: "#64748b", bg: "#64748b20", icon: <FileEdit size={12} /> },
    pending_review:     { label: "Pending Review",    color: "#f59e0b", bg: "#f59e0b20", icon: <Clock size={12} /> },
    changes_requested:  { label: "Changes Requested", color: "#ef4444", bg: "#ef444420", icon: <XCircle size={12} /> },
    approved:           { label: "Approved",          color: "#22c55e", bg: "#22c55e20", icon: <CheckCircle2 size={12} /> },
    published:          { label: "Published",         color: "#38b6e8", bg: "#38b6e820", icon: <CheckCircle2 size={12} /> },
  };

  const articlesByProject = contentArticles.reduce<Record<string, typeof contentArticles>>((acc, a) => {
    const key = a.projectId ?? "__none__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <>
      <Topbar title="All Tasks" />
      <div className="p-6 flex flex-col gap-6">

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
          <button
            onClick={() => setActiveTab("tasks")}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === "tasks" ? "#1c3248" : "transparent",
              color: activeTab === "tasks" ? "#cce4ff" : "#4a7090",
            }}
          >
            Project Tasks
          </button>
          <button
            onClick={() => setActiveTab("content")}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            style={{
              background: activeTab === "content" ? "#1c3248" : "transparent",
              color: activeTab === "content" ? "#cce4ff" : "#4a7090",
            }}
          >
            Content Approval
            {pendingContentCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: "#f59e0b20", color: "#f59e0b" }}>{pendingContentCount}</span>
            )}
          </button>
        </div>

        {/* PROJECT TASKS TAB */}
        {activeTab === "tasks" && (
          <>
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
                <option value="1">P1-2 (Critical)</option>
                <option value="3">P3-4 (High)</option>
                <option value="5">P5-6 (Medium)</option>
                <option value="7">P7-10 (Low)</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#cce4ff" }}
              >
                <option value="all">All Statuses</option>
                <option value="todo">To Do ({statusCounts.todo})</option>
                <option value="in_progress">In Progress ({statusCounts.in_progress})</option>
                <option value="pending_review">Pending Review ({statusCounts.pending_review})</option>
                <option value="revision_required">Revision Required ({statusCounts.revision_required})</option>
              </select>
              <span className="text-sm" style={{ color: "#4a7090" }}>{filtered.length} active task{filtered.length !== 1 ? "s" : ""}</span>

              <button
                onClick={() => {
                  setNewTaskProject(projects[0]?.id ?? "");
                  setNewTaskAssignee(user?.id ?? "");
                  setShowNewTask(true);
                }}
                className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ background: "#38b6e8", color: "#fff" }}
              >
                <Plus size={13} /> New Task
              </button>
              {doneCount > 0 && (
                <Link
                  href="/archive"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ background: "#22c55e15", border: "1px solid #22c55e30", color: "#22c55e" }}
                >
                  <Archive size={13} /> Archive ({doneCount})
                </Link>
              )}
            </div>

            <TaskGroup title="Overdue" tasks={grouped.overdue} accent="#ef4444" icon={<AlertTriangle size={14} style={{ color: "#ef4444" }} />} onSelect={setSelectedTask} onComplete={handleComplete} onRequestApproval={handleRequestApproval} isAdmin={isAdmin} liveStaff={liveStaff} />
            <TaskGroup title="Due Today" tasks={grouped.today} accent="#f59e0b" onSelect={setSelectedTask} onComplete={handleComplete} onRequestApproval={handleRequestApproval} isAdmin={isAdmin} liveStaff={liveStaff} />
            <TaskGroup title="Upcoming" tasks={grouped.upcoming} accent="#38b6e8" onSelect={setSelectedTask} onComplete={handleComplete} onRequestApproval={handleRequestApproval} isAdmin={isAdmin} liveStaff={liveStaff} />
            <TaskGroup title="No Due Date" tasks={grouped.noDate} accent="#4a7090" onSelect={setSelectedTask} onComplete={handleComplete} onRequestApproval={handleRequestApproval} isAdmin={isAdmin} liveStaff={liveStaff} />

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
          </>
        )}

        {/* CONTENT APPROVAL TAB */}
        {activeTab === "content" && (
          <div className="flex flex-col gap-6">
            {/* Status summary */}
            <div className="flex items-center gap-3 flex-wrap">
              {(["pending_review", "approved", "changes_requested", "draft", "published"] as const).map((s) => {
                const count = contentArticles.filter((a) => a.status === s).length;
                const sc = articleStatusConfig[s];
                if (!count) return null;
                return (
                  <div key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: sc.bg, color: sc.color }}>
                    {sc.icon} {sc.label}: {count}
                  </div>
                );
              })}
              {contentArticles.length === 0 && (
                <p className="text-sm" style={{ color: "#4a7090" }}>No articles yet.</p>
              )}
            </div>

            {/* Articles grouped by project */}
            {Object.entries(articlesByProject).map(([projectId, projectArticles]) => {
              const proj = projects.find((p) => p.id === projectId);
              const projName = proj?.name ?? "No Project";
              const pendingInProject = projectArticles.filter((a) => a.status === "pending_review").length;
              return (
                <div key={projectId}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold" style={{ color: "#cce4ff" }}>{projName}</h3>
                    {pendingInProject > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: "#f59e0b20", color: "#f59e0b" }}>{pendingInProject} pending</span>
                    )}
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1c3248" }}>
                    {projectArticles.map((article, i) => {
                      const sc = articleStatusConfig[article.status] ?? articleStatusConfig.draft;
                      return (
                        <div
                          key={article.id}
                          className="flex items-center gap-4 px-4 py-3"
                          style={{
                            background: "#0f1d2e",
                            borderBottom: i < projectArticles.length - 1 ? "1px solid #1c3248" : "none",
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "#cce4ff" }}>{article.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: "#4a7090" }}>
                              by {article.submittedByName || "Unknown"} · {new Date(article.updatedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>
                              {sc.icon} {sc.label}
                            </span>
                            {isAdmin && article.status === "pending_review" && (
                              <>
                                <button
                                  onClick={() => approveArticleAsAdmin(article.id)}
                                  className="px-2 py-1 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                                  style={{ background: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e40" }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateArticleStatus(article.id, "changes_requested")}
                                  className="px-2 py-1 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                                  style={{ background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440" }}
                                >
                                  Changes
                                </button>
                              </>
                            )}
                            <Link href={`/content/${article.id}`} className="text-xs hover:opacity-80" style={{ color: "#38b6e8" }}>
                              View →
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {contentArticles.length === 0 && (
              <div className="text-center py-16 flex flex-col items-center gap-3">
                <FileEdit size={32} style={{ color: "#1c3248" }} />
                <p className="text-sm" style={{ color: "#4a7090" }}>No articles yet. Staff can create articles from the Content page.</p>
                <Link href="/content" className="text-sm hover:opacity-80" style={{ color: "#38b6e8" }}>Go to Content →</Link>
              </div>
            )}
          </div>
        )}
      </div>

      <TaskDrawer
        task={liveSelectedTask}
        projectId={selectedTask?.projectId ?? ""}
        onClose={() => setSelectedTask(null)}
      />

      {showNewTask && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "#00000070" }} onClick={() => setShowNewTask(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="rounded-xl w-full max-w-md flex flex-col gap-4 p-6" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: "#cce4ff" }}>New Task</h3>
                <button onClick={() => setShowNewTask(false)} style={{ color: "#4a7090" }}><X size={16} /></button>
              </div>

              <div>
                <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Project *</p>
                <select value={newTaskProject} onChange={(e) => setNewTaskProject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}>
                  <option value="">— Select project —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <input
                autoFocus
                type="text"
                placeholder="Task title *"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Assignee</p>
                  <select value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}>
                    <option value="">Unassigned</option>
                    {liveStaff.map((s) => <option key={s.id} value={staffAuthId(s)}>{staffName(s)}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Priority</p>
                  <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}>
                    {[1,2,3,4,5,6,7,8,9,10].map((p) => <option key={p} value={p}>P{p}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Due Date</p>
                  <input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }} />
                </div>
                <div className="col-span-2">
                  <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Attach files (optional)</p>
                  <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:opacity-80" style={{ border: "2px dashed #1c3248" }}>
                    <Paperclip size={14} style={{ color: "#4a7090" }} />
                    <span className="text-xs" style={{ color: "#4a7090" }}>
                      {newTaskFiles.length > 0 ? `${newTaskFiles.length} file${newTaskFiles.length === 1 ? "" : "s"} selected` : "Click to attach files"}
                    </span>
                    <input type="file" multiple className="hidden"
                      accept="image/*,video/*,text/*,.pdf,.doc,.docx,.txt,.text,.log,.md,.csv,.rtf"
                      onChange={(e) => setNewTaskFiles(Array.from(e.target.files ?? []))} />
                  </label>
                  {newTaskFiles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {newTaskFiles.map((f, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: "#1c3248", color: "#cce4ff" }}>
                          {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  disabled={!newTaskProject || !newTaskTitle.trim() || creating}
                  onClick={async () => {
                    if (!newTaskProject || !newTaskTitle.trim()) return;
                    setCreating(true);
                    try {
                      const newTaskId = await addTask(newTaskProject, {
                        projectId: newTaskProject,
                        title: newTaskTitle.trim(),
                        description: "",
                        type: "webdev",
                        status: "todo",
                        priority: newTaskPriority,
                        assigneeId: newTaskAssignee,
                        dueDate: newTaskDueDate,
                        tags: [],
                        recurring: null,
                      });
                      if (newTaskFiles.length > 0 && newTaskId) {
                        const uploadedBy = user?.id ?? "";
                        for (const file of newTaskFiles) {
                          await uploadTaskAttachment(newTaskProject, newTaskId, file, uploadedBy);
                        }
                      }
                      setShowNewTask(false);
                      setNewTaskTitle("");
                      setNewTaskDueDate("");
                      setNewTaskPriority(5);
                      setNewTaskFiles([]);
                    } catch (err) {
                      const e = err as { message?: string };
                      alert(`Couldn't save: ${e?.message || "Unknown error"}`);
                    } finally {
                      setCreating(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ background: "#38b6e8", color: "#fff" }}>
                  {creating ? "Creating…" : "Create Task"}
                </button>
                <button onClick={() => setShowNewTask(false)} className="px-4 py-2.5 rounded-lg text-sm" style={{ background: "#0e1e30", color: "#4a7090", border: "1px solid #1c3248" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
