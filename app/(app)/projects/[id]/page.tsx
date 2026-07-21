"use client";
import { useState, useRef, useEffect } from "react";
import { notFound } from "next/navigation";
import { useParams, useSearchParams } from "next/navigation";
import { type Task, type TaskType, type TaskStatus } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Topbar } from "@/components/topbar";
import { TaskDrawer } from "@/components/task-drawer";
import { KanbanBoard } from "@/components/kanban-board";
import {
  Pin, Link2, MessageSquare, FileText, Image, Video, Upload, X, ExternalLink, RotateCcw, Pencil, Check, ListChecks, ChevronDown, ChevronUp, Loader2, FileEdit, CheckCircle2, Clock, AlertCircle,
  BarChart2, Plus, Copy, Trash2, ChevronRight, Paperclip,
} from "lucide-react";
import { dbGetWeeklyReports, dbCreateWeeklyReport, dbUpdateWeeklyReport, dbDeleteWeeklyReport, type WeeklyReport } from "@/lib/db";
import Link from "next/link";
import { ScheduleTab } from "@/components/schedule-tab";
import { useDraft } from "@/lib/use-draft";

interface LiveStaff {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_initials: string;
}

function staffAuthId(s: LiveStaff) { return s.user_id ?? s.id; }
function staffName(s: LiveStaff) { return [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email; }
function staffInitials(s: LiveStaff) { return s.avatar_initials || staffName(s).slice(0, 2).toUpperCase(); }

const pinnedIcon: Record<string, React.FC<{ size: number; style?: React.CSSProperties }>> = {
  link: Link2, document: FileText, message: MessageSquare, image: Image,
};

const pinnedColor: Record<string, string> = {
  link: "#3b82f6", document: "#f59e0b", message: "#38b6e8", image: "#22c55e",
};

const mediaIcon: Record<string, React.FC<{ size: number; style?: React.CSSProperties }>> = {
  image: Image, video: Video, document: FileText,
};

type NewTaskForm = {
  title: string;
  description: string;
  assigneeId: string;
  priority: number;
  dueDate: string;
  type: TaskType;
  recurring: "weekly" | "monthly" | "every-3-months" | "every-4-months" | "every-6-months" | "yearly" | null;
  recurringDay: string;
  tags: string;
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const taskQueryId = searchParams.get("task");
  const { user } = useAuth();
  const isAdmin = user?.pmRole === "admin";
  const { projects, templates, articles, channels, addTask, uploadTaskAttachment, updateProject, assignStaff, removeStaff, addMedia, removeMedia, addPinnedItem, removePinnedItem, addNotification, approveArticleAsAdmin, updateArticleStatus } = useStore();
  const [liveStaff, setLiveStaff] = useState<LiveStaff[]>([]);
  const [activeTab, setActiveTab] = useState<"board" | "schedule" | "files" | "pinned" | "content" | "reports">("board");
  // ── Weekly reports state ──────────────────────────────────────────────────
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [showNewReport, setShowNewReport] = useState(false);
  const [newReportWeek, setNewReportWeek] = useState("");
  const [newReportNotes, setNewReportNotes] = useState("");
  const [savingReport, setSavingReport] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [newTaskFiles, setNewTaskFiles] = useState<File[]>([]);
  const [showAddPin, setShowAddPin] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", type: "webdev" as "webdev" | "seo" | "both", channelId: null as string | null, startDate: "", dueDate: "" });
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  const [applyTemplateIds, setApplyTemplateIds] = useState<string[]>([]);
  const [applyTemplateExpanded, setApplyTemplateExpanded] = useState<string | null>(null);
  const [applyTemplateError, setApplyTemplateError] = useState("");
  const [applyingTemplates, setApplyingTemplates] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [addTaskCol, setAddTaskCol] = useState("todo");
  const [pinForm, setPinForm] = useState({ type: "link" as "link" | "document" | "message", title: "", content: "", url: "" });
  const initialTask: NewTaskForm = {
    title: "", description: "", assigneeId: "", priority: 5,
    dueDate: "", type: "webdev",
    recurring: null, recurringDay: "", tags: "",
  };
  const [newTask, setNewTask, clearTaskDraft, taskRestored] = useDraft(
    `add-task:${params.id}`, initialTask
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("staff_members").select("id,user_id,email,first_name,last_name,avatar_initials")
      .eq("status", "active")
      .then(({ data }) => {
        const staff = (data as LiveStaff[]) ?? [];
        setLiveStaff(staff);
        setNewTask((prev) => ({ ...prev, assigneeId: prev.assigneeId || (staff[0] ? staffAuthId(staff[0]) : "") }));
      });
  }, [user?.id]);

  useEffect(() => {
    if (activeTab !== "reports") return;
    setReportsLoading(true);
    dbGetWeeklyReports(params.id).then((data) => { setReports(data); setReportsLoading(false); });
  }, [activeTab, params.id]);

  // Default the new-report week to Monday of the current week
  useEffect(() => {
    if (!showNewReport) return;
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    setNewReportWeek(monday.toISOString().slice(0, 10));
  }, [showNewReport]);

  async function handleCreateReport() {
    if (!newReportWeek) return;
    setSavingReport(true);
    // Build snapshot from tasks due in the selected week
    const weekStart = new Date(newReportWeek + "T00:00:00");
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
    const snap = project.tasks
      .filter((t) => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate + "T00:00:00");
        return d >= weekStart && d <= weekEnd;
      })
      .map((t) => {
        const assignee = liveStaff.find((s) => staffAuthId(s) === t.assigneeId);
        return { id: t.id, title: t.title, status: t.status, assigneeName: assignee ? staffName(assignee) : "", dueDate: t.dueDate ?? "" };
      });
    const report = await dbCreateWeeklyReport(params.id, newReportWeek, newReportNotes, snap, user?.id ?? null);
    if (report) setReports((prev) => [report, ...prev]);
    setShowNewReport(false);
    setNewReportNotes("");
    setSavingReport(false);
  }

  function handleCopyLink(token: string) {
    const url = `${window.location.origin}/report/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  async function handleSaveReportNotes(id: string) {
    await dbUpdateWeeklyReport(id, { summaryNotes: editingNotes });
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, summaryNotes: editingNotes } : r));
    setEditingReportId(null);
  }

  async function handleDeleteReport(id: string) {
    await dbDeleteWeeklyReport(id);
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  const projectRaw = projects.find((p) => p.id === params.id);

  useEffect(() => {
    if (!taskQueryId || !projectRaw) return;
    const t = projectRaw.tasks.find((x) => x.id === taskQueryId);
    if (t) setSelectedTask(t);
  }, [taskQueryId, projectRaw?.id, projectRaw?.tasks.length]);

  if (!projectRaw) return notFound();
  const project = projectRaw;

  const done = project.tasks.filter((t) => t.status === "done").length;
  const pct = project.tasks.length > 0 ? Math.round((done / project.tasks.length) * 100) : 0;
  const typeColor = project.type === "seo" ? "#22c55e" : project.type === "both" ? "#a855f7" : "#38b6e8";
  const assignedUsers = liveStaff.filter((s) => project.assignedStaff.includes(staffAuthId(s)));
  const unassignedUsers = liveStaff.filter((s) => !project.assignedStaff.includes(staffAuthId(s)));
  // Staff only see tasks assigned to them; admins see everything
  const boardTasks = isAdmin ? project.tasks : project.tasks.filter((t) => t.assigneeId === user?.id);

  async function handleAddTask() {
    if (!newTask.title.trim()) return;
    const title = newTask.title.trim();
    const taskInput = {
      projectId: project.id,
      title,
      description: newTask.description,
      type: newTask.type,
      status: addTaskCol as Task["status"],
      priority: newTask.priority,
      assigneeId: newTask.assigneeId,
      dueDate: newTask.dueDate,
      tags: newTask.tags ? newTask.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      recurring: newTask.recurring,
      recurringDay: newTask.recurringDay || undefined,
    };
    const filesToUpload = newTaskFiles;
    // Close popup immediately — optimistic update has already populated the board
    setShowAddTask(false);
    setAddTaskError(null);
    setNewTaskFiles([]);
    clearTaskDraft();
    try {
      const newTaskId = await addTask(project.id, taskInput);
      // Upload any attached files after task is created
      if (filesToUpload.length > 0 && newTaskId) {
        const uploadedBy = user?.id ?? "";
        for (const file of filesToUpload) {
          await uploadTaskAttachment(project.id, newTaskId, file, uploadedBy);
        }
      }
    } catch (err: unknown) {
      const e = err as { message?: string; details?: string; hint?: string; code?: string };
      const msg = e?.message || e?.details || e?.hint || (typeof err === "string" ? err : JSON.stringify(err));
      const friendly = /foreign key|not present in table/i.test(msg)
        ? `Couldn't save "${title}" — project not in database. Delete and recreate the project.`
        : `Couldn't save "${title}": ${msg}`;
      setAddTaskError(friendly);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const type = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext) ? "image" : ["mp4", "mov", "webm"].includes(ext) ? "video" : "document";
      addMedia(project.id, {
        name: file.name,
        type,
        url: URL.createObjectURL(file),
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        uploadedBy: user?.id ?? "",
        uploadedAt: new Date().toISOString(),
      });
    });
    e.target.value = "";
  }

  function handleAddPin() {
    if (!pinForm.title.trim()) return;
    addPinnedItem(project.id, { ...pinForm, pinnedBy: user?.id ?? "" });
    setShowAddPin(false);
    setPinForm({ type: "link", title: "", content: "", url: "" });
  }

  function openEdit() {
    setEditForm({
      name: project.name,
      description: project.description,
      type: project.type as "webdev" | "seo" | "both",
      channelId: project.channelId ?? null,
      startDate: project.startDate ?? "",
      dueDate: project.dueDate ?? "",
    });
    setShowEdit(true);
  }

  async function handleSaveEdit() {
    if (!editForm.name.trim()) return;
    await updateProject(project.id, {
      name: editForm.name.trim(),
      description: editForm.description,
      type: editForm.type,
      channelId: editForm.channelId,
      startDate: editForm.startDate,
      dueDate: editForm.dueDate,
    });
    setShowEdit(false);
  }

  const matchingTemplates = project.type === "both"
    ? templates.filter((t) => t.type === "webdev" || t.type === "seo" || t.type === "any" || t.type === "both")
    : templates.filter((t) => t.type === project.type || t.type === "any");

  async function handleApplyTemplates() {
    if (applyTemplateIds.length === 0) return;
    setApplyTemplateError("");

    const existingTitles = new Set(project.tasks.map((t) => t.title.trim().toLowerCase()));
    const clashes: string[] = [];
    applyTemplateIds.forEach((tplId) => {
      const tpl = templates.find((t) => t.id === tplId);
      if (!tpl) return;
      tpl.tasks.forEach((tt) => {
        if (existingTitles.has(tt.title.trim().toLowerCase())) clashes.push(tt.title);
      });
    });

    if (clashes.length > 0) {
      setApplyTemplateError(`Title clash — these tasks already exist: ${clashes.join(", ")}`);
      return;
    }

    setApplyingTemplates(true);
    const startDate = project.startDate ?? new Date().toISOString().split("T")[0];
    for (const tplId of applyTemplateIds) {
      const tpl = templates.find((t) => t.id === tplId);
      if (!tpl) continue;
      for (const tt of tpl.tasks) {
        const due = new Date(startDate);
        due.setDate(due.getDate() + tt.daysFromStart);
        await addTask(project.id, {
          projectId: project.id,
          title: tt.title,
          description: tt.description,
          type: tt.type,
          status: "todo",
          priority: tt.priority,
          assigneeId: liveStaff[0] ? staffAuthId(liveStaff[0]) : "",
          dueDate: due.toISOString().split("T")[0],
          tags: tt.tags,
          recurring: tt.recurring ?? null,
          recurringDay: tt.recurringDay,
        });
      }
    }

    setApplyingTemplates(false);
    setApplyTemplateIds([]);
    setShowApplyTemplate(false);
  }

  // Keep selected task in sync with store updates
  const liveSelectedTask = selectedTask
    ? project.tasks.find((t) => t.id === selectedTask.id) ?? null
    : null;

  return (
    <>
      <Topbar title={project.name} back={{ label: "Projects", href: "/projects" }} />
      {addTaskError && (
        <div className="fixed top-20 right-6 z-[60] max-w-md flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg"
          style={{ background: "#1a0f12", border: "1px solid #ef444460", color: "#fca5a5", boxShadow: "0 12px 32px #00000060" }}>
          <span className="text-base leading-none">⚠</span>
          <div className="flex-1 text-sm leading-relaxed">{addTaskError}</div>
          <button onClick={() => setAddTaskError(null)} className="text-xs hover:opacity-70" style={{ color: "#fca5a5" }}>
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex flex-col h-full">

        {/* Project header */}
        <div className="px-6 pt-5 pb-0">
          <div className="rounded-xl p-4 mb-4" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: typeColor + "20", color: typeColor }}>
                    {project.type === "seo" ? "SEO" : project.type === "both" ? "Web + SEO" : "Web Dev"}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={openEdit}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs hover:opacity-80 transition-opacity ml-1"
                      style={{ background: "#1c3248", color: "#4a7090" }}
                      title="Edit project"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                  )}
                </div>
                <p className="text-sm" style={{ color: "#4a7090" }}>{project.description}</p>
              </div>

              {/* Assigned staff */}
              <div className="flex flex-col items-end gap-2 relative">
                <div className="flex items-center gap-1">
                  <span className="text-xs mr-1" style={{ color: "#4a7090" }}>Assigned:</span>
                  {assignedUsers.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => removeStaff(project.id, staffAuthId(s))}
                      title={`Remove ${staffName(s)}`}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 hover:opacity-70 transition-opacity"
                      style={{ background: "#38b6e8", color: "#fff", borderColor: "#0f1d2e" }}
                    >
                      {staffInitials(s)}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowAssignMenu(!showAssignMenu)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-base hover:opacity-70"
                    style={{ background: "#1c3248", color: "#4a7090" }}
                  >+</button>
                </div>
                {showAssignMenu && (
                  <div className="absolute top-full right-0 mt-1 rounded-lg z-20 shadow-lg overflow-hidden" style={{ background: "#0e1e30", border: "1px solid #1c3248", minWidth: "180px" }}>
                    {liveStaff.length === 0 ? (
                      <p className="px-3 py-2 text-sm" style={{ color: "#4a7090" }}>Loading staff…</p>
                    ) : unassignedUsers.length === 0 ? (
                      <p className="px-3 py-2 text-sm" style={{ color: "#4a7090" }}>All staff assigned</p>
                    ) : unassignedUsers.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { assignStaff(project.id, staffAuthId(s)); setShowAssignMenu(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:opacity-80"
                        style={{ color: "#cce4ff" }}
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#38b6e8", color: "#fff" }}>
                          {staffInitials(s)}
                        </div>
                        {staffName(s)}
                      </button>
                    ))}
                  </div>
                )}
                <span className="text-xs" style={{ color: "#4a7090" }}>
                  {project.dueDate && !isNaN(new Date(project.dueDate).getTime())
                    ? `Due ${new Date(project.dueDate).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}`
                    : "No due date set"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 h-1.5 rounded-full" style={{ background: "#1c3248" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#38b6e8" }} />
              </div>
              <span className="text-xs font-medium shrink-0" style={{ color: "#cce4ff" }}>{pct}% · {done}/{project.tasks.length} tasks</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center" style={{ borderBottom: "1px solid #1c3248" }}>
            {(["board", "schedule", "files", "pinned", "content", "reports"] as const).map((tab) => {
              const projectArticles = articles.filter((a) => a.projectId === project.id);
              const pendingCount = projectArticles.filter((a) => a.status === "pending_review").length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-2.5 text-sm font-medium capitalize transition-colors relative"
                  style={{
                    color: activeTab === tab ? "#38b6e8" : "#4a7090",
                    borderBottom: activeTab === tab ? "2px solid #38b6e8" : "2px solid transparent",
                    marginBottom: "-1px",
                  }}
                >
                  {tab === "files" ? `Files (${project.media.length})`
                    : tab === "pinned" ? `Pinned (${project.pinnedItems.length})`
                    : tab === "schedule" ? "Schedule"
                    : tab === "reports" ? (
                      <span className="flex items-center gap-1.5">
                        <BarChart2 size={13} />Reports
                      </span>
                    )
                    : tab === "content" ? (
                      <span className="flex items-center gap-1.5">
                        Content
                        {pendingCount > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: "#f59e0b20", color: "#f59e0b" }}>{pendingCount}</span>
                        )}
                      </span>
                    )
                    : "Board"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* BOARD */}
          {activeTab === "board" && (
            <div className="flex flex-col gap-4">
              {isAdmin && matchingTemplates.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={() => { setApplyTemplateError(""); setShowApplyTemplate(true); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                    style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#4a7090" }}
                  >
                    <ListChecks size={14} /> Apply Template
                  </button>
                </div>
              )}
              <KanbanBoard
                projectId={project.id}
                tasks={boardTasks}
                onTaskClick={(task) => setSelectedTask(task)}
                onAddTask={(status: TaskStatus) => { setAddTaskCol(status); setShowAddTask(true); }}
                liveStaff={liveStaff}
              />
            </div>
          )}

          {/* SCHEDULE */}
          {activeTab === "schedule" && (
            <ScheduleTab
              project={{ ...project, tasks: boardTasks }}
              onTaskClick={(task) => setSelectedTask(task)}
              onAddTask={(dueDate) => {
                setNewTask((prev) => ({ ...prev, dueDate }));
                setAddTaskCol("todo");
                setShowAddTask(true);
              }}
              liveStaff={liveStaff}
            />
          )}

          {/* FILES */}
          {activeTab === "files" && (
            <div className="flex flex-col gap-5">
              <label
                className="flex flex-col items-center justify-center gap-3 rounded-xl p-8 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ border: "2px dashed #1c3248" }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#38b6e820" }}>
                  <Upload size={22} style={{ color: "#38b6e8" }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: "#cce4ff" }}>Upload files</p>
                  <p className="text-xs mt-0.5" style={{ color: "#4a7090" }}>Images, videos, documents</p>
                </div>
                <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*,video/*,text/*,.pdf,.doc,.docx,.txt,.text,.log,.md,.csv,.rtf" onChange={handleFileUpload} />
              </label>

              {project.media.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-3" style={{ color: "#4a7090" }}>PROJECT FILES ({project.media.length})</p>
                  <div className="grid grid-cols-3 gap-3">
                    {project.media.map((file) => {
                      const Icon = mediaIcon[file.type];
                      const uploader = liveStaff.find((s) => staffAuthId(s) === file.uploadedBy);
                      return (
                        <div key={file.id} className="rounded-xl overflow-hidden group" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
                          <div className="h-36 flex items-center justify-center relative" style={{ background: "#0e1e30" }}>
                            {file.type === "image" && file.url.startsWith("blob:") ? (
                              <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                            ) : (
                              <Icon size={36} style={{ color: "#1c3248" }} />
                            )}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <button
                                onClick={() => removeMedia(project.id, file.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{ background: "#ef444420", color: "#ef4444" }}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                          <div className="px-3 py-2.5">
                            <p className="text-sm font-medium truncate" style={{ color: "#cce4ff" }}>{file.name}</p>
                            <div className="flex items-center justify-between mt-0.5">
                              <p className="text-xs" style={{ color: "#4a7090" }}>{file.size}</p>
                              <p className="text-xs" style={{ color: "#4a7090" }}>
                                {uploader ? staffName(uploader).split(" ")[0] : "—"} · {new Date(file.uploadedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONTENT */}
          {activeTab === "content" && (() => {
            const projectArticles = articles.filter((a) => a.projectId === project.id);
            const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
              draft:           { label: "Draft",           color: "#64748b", bg: "#64748b20", icon: <FileEdit size={13} /> },
              pending_review:  { label: "Pending Review",  color: "#f59e0b", bg: "#f59e0b20", icon: <Clock size={13} /> },
              changes_requested: { label: "Changes Requested", color: "#ef4444", bg: "#ef444420", icon: <AlertCircle size={13} /> },
              approved:        { label: "Approved",        color: "#22c55e", bg: "#22c55e20", icon: <CheckCircle2 size={13} /> },
              published:       { label: "Published",       color: "#38b6e8", bg: "#38b6e820", icon: <CheckCircle2 size={13} /> },
            };
            const postTypeLabel: Record<string, string> = { gmb: "GMB Post", website: "Website Post", other: "Other" };
            return (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm" style={{ color: "#4a7090" }}>{projectArticles.length} article{projectArticles.length !== 1 ? "s" : ""}</p>
                  <Link
                    href="/content/new"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                    style={{ background: "#38b6e815", border: "1px solid #38b6e840", color: "#38b6e8" }}
                  >
                    + New Article
                  </Link>
                </div>

                {projectArticles.length === 0 && (
                  <div className="text-center py-12 flex flex-col items-center gap-2">
                    <FileEdit size={28} style={{ color: "#1c3248" }} />
                    <p className="text-sm" style={{ color: "#4a7090" }}>No articles linked to this project yet.</p>
                    <Link href="/content/new" className="text-sm hover:opacity-80" style={{ color: "#38b6e8" }}>
                      Create the first article →
                    </Link>
                  </div>
                )}

                <div className="rounded-xl overflow-hidden" style={{ border: projectArticles.length ? "1px solid #1c3248" : "none" }}>
                  {projectArticles.map((article, i) => {
                    const sc = statusConfig[article.status] ?? statusConfig.draft;
                    return (
                      <div
                        key={article.id}
                        className="flex items-center gap-4 px-4 py-3 hover:opacity-80 transition-opacity"
                        style={{
                          background: "#0f1d2e",
                          borderBottom: i < projectArticles.length - 1 ? "1px solid #1c3248" : "none",
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "#cce4ff" }}>{article.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs" style={{ color: "#4a7090" }}>{postTypeLabel[article.postType] ?? article.postType}</span>
                            {article.targetKeyword && (
                              <span className="text-xs" style={{ color: "#4a7090" }}>· {article.targetKeyword}</span>
                            )}
                            <span className="text-xs" style={{ color: "#4a7090" }}>· {article.submittedByName || "Unknown"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>
                            {sc.icon} {sc.label}
                          </span>
                          {isAdmin && article.status === "pending_review" && (
                            <div className="flex items-center gap-1">
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
                            </div>
                          )}
                          <Link
                            href={`/content/${article.id}`}
                            className="text-xs hover:opacity-80 transition-opacity"
                            style={{ color: "#38b6e8" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            View →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* PINNED */}
          {activeTab === "pinned" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                {(["link", "document", "message"] as const).map((type) => {
                  const icons = { link: Link2, document: FileText, message: MessageSquare };
                  const Icon = icons[type];
                  return (
                    <button
                      key={type}
                      onClick={() => { setPinForm({ ...pinForm, type }); setShowAddPin(true); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                      style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#4a7090" }}
                    >
                      <Pin size={13} /><Icon size={13} />
                      Pin {type === "message" ? "Note" : type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  );
                })}
              </div>

              {project.pinnedItems.length === 0 && (
                <p className="text-sm" style={{ color: "#4a7090" }}>No pinned items yet.</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                {project.pinnedItems.map((item) => {
                  const Icon = pinnedIcon[item.type];
                  const color = pinnedColor[item.type];
                  const pinner = liveStaff.find((s) => staffAuthId(s) === item.pinnedBy);
                  return (
                    <div key={item.id} className="rounded-xl p-4 relative group" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
                      <button
                        onClick={() => removePinnedItem(project.id, item.id)}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:opacity-70"
                        style={{ color: "#4a7090" }}
                      >
                        <X size={13} />
                      </button>
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "20" }}>
                          <Icon size={15} style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-sm font-semibold" style={{ color: "#cce4ff" }}>{item.title}</p>
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: "#4a7090" }}>{item.content}</p>
                        </div>
                      </div>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs mt-2 hover:opacity-70" style={{ color }}>
                          <ExternalLink size={11} /> {item.url.replace("https://", "")}
                        </a>
                      )}
                      <p className="text-xs mt-2" style={{ color: "#8b90a750" }}>
                        Pinned by {pinner ? staffName(pinner).split(" ")[0] : "—"} · {new Date(item.pinnedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* REPORTS */}
          {activeTab === "reports" && (() => {
            function fmtDate(iso: string) {
              return new Date(iso + "T00:00:00").toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
            }
            function weekRange(iso: string) {
              const end = new Date(iso + "T00:00:00"); end.setDate(end.getDate() + 6);
              return `${fmtDate(iso)} – ${fmtDate(end.toISOString().slice(0, 10))}`;
            }
            // Group by month
            const byMonth: Record<string, WeeklyReport[]> = {};
            for (const r of reports) {
              const key = new Date(r.weekStarting + "T00:00:00").toLocaleDateString("en-SG", { month: "long", year: "numeric" });
              if (!byMonth[key]) byMonth[key] = [];
              byMonth[key].push(r);
            }
            return (
              <div className="flex flex-col gap-5">
                {/* Toolbar */}
                {isAdmin && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowNewReport(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ background: "#38b6e8", color: "#fff" }}
                    >
                      <Plus size={14} /> New Week Report
                    </button>
                  </div>
                )}

                {reportsLoading && <p className="text-sm" style={{ color: "#4a7090" }}>Loading…</p>}
                {!reportsLoading && reports.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-12">
                    <BarChart2 size={32} style={{ color: "#1c3248" }} />
                    <p className="text-sm" style={{ color: "#4a7090" }}>No reports yet. Create the first weekly report.</p>
                  </div>
                )}

                {Object.entries(byMonth).map(([month, monthReports]) => (
                  <div key={month}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#4a7090" }}>{month}</p>
                    <div className="flex flex-col gap-3">
                      {monthReports.map((r) => {
                        const totalTasks = r.tasksSnapshot.length;
                        const doneTasks = r.tasksSnapshot.filter((t) => t.status === "done").length;
                        const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/report/${r.shareToken}`;
                        return (
                          <div key={r.id} className="rounded-xl p-4 flex flex-col gap-3"
                            style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
                            {/* Report header */}
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold" style={{ color: "#cce4ff" }}>Week of {weekRange(r.weekStarting)}</p>
                                <p className="text-xs mt-0.5" style={{ color: "#4a7090" }}>
                                  {doneTasks}/{totalTasks} tasks · Created {fmtDate(r.createdAt.slice(0, 10))}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleCopyLink(r.shareToken)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                                  style={{ background: copiedToken === r.shareToken ? "#22c55e20" : "#1c3248", color: copiedToken === r.shareToken ? "#22c55e" : "#4a7090" }}
                                >
                                  <Copy size={11} /> {copiedToken === r.shareToken ? "Copied!" : "Copy link"}
                                </button>
                                <a href={shareUrl} target="_blank" rel="noreferrer"
                                  className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                                  style={{ color: "#4a7090" }}>
                                  <ExternalLink size={13} />
                                </a>
                                {isAdmin && (
                                  <button onClick={() => handleDeleteReport(r.id)}
                                    className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                                    style={{ color: "#4a7090" }}>
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Task pills */}
                            {totalTasks > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {r.tasksSnapshot.map((t) => (
                                  <span key={t.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                                    style={{ background: t.status === "done" ? "#22c55e15" : "#1c3248", color: t.status === "done" ? "#22c55e" : "#4a7090", border: `1px solid ${t.status === "done" ? "#22c55e30" : "transparent"}` }}>
                                    {t.status === "done" ? "✓" : "○"} {t.title}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Notes */}
                            {editingReportId === r.id ? (
                              <div className="flex flex-col gap-2">
                                <textarea
                                  autoFocus
                                  value={editingNotes}
                                  onChange={(e) => setEditingNotes(e.target.value)}
                                  rows={3}
                                  placeholder="Add notes for the client…"
                                  className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                                  style={{ background: "#0e1e30", border: "1px solid #38b6e8", color: "#cce4ff" }}
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => handleSaveReportNotes(r.id)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                                    style={{ background: "#22c55e20", color: "#22c55e" }}>Save</button>
                                  <button onClick={() => setEditingReportId(null)}
                                    className="px-3 py-1.5 rounded-lg text-xs"
                                    style={{ color: "#4a7090" }}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <p className="flex-1 text-xs leading-relaxed" style={{ color: r.summaryNotes ? "#cce4ff" : "#4a7090" }}>
                                  {r.summaryNotes || (isAdmin ? "No notes — click to add a summary for the client." : "No notes.")}
                                </p>
                                {isAdmin && (
                                  <button onClick={() => { setEditingReportId(r.id); setEditingNotes(r.summaryNotes); }}
                                    className="shrink-0" style={{ color: "#38b6e8" }}>
                                    <Pencil size={12} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* New Report Modal */}
      {showNewReport && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "#00000070" }} onClick={() => setShowNewReport(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="rounded-xl w-full max-w-sm flex flex-col gap-4 p-6" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: "#cce4ff" }}>New Week Report</h3>
                <button onClick={() => setShowNewReport(false)} style={{ color: "#4a7090" }}><X size={16} /></button>
              </div>
              <div>
                <label className="text-xs block mb-1.5" style={{ color: "#4a7090" }}>Week Starting (Monday)</label>
                <input type="date" value={newReportWeek} onChange={(e) => setNewReportWeek(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }} />
                <p className="text-xs mt-1" style={{ color: "#4a7090" }}>
                  Tasks with due dates in this week will be included automatically.
                </p>
              </div>
              <div>
                <label className="text-xs block mb-1.5" style={{ color: "#4a7090" }}>Notes for Client (optional)</label>
                <textarea value={newReportNotes} onChange={(e) => setNewReportNotes(e.target.value)} rows={3}
                  placeholder="Summary of the week's work…"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNewReport(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: "#1c3248", color: "#cce4ff" }}>Cancel</button>
                <button onClick={handleCreateReport} disabled={savingReport || !newReportWeek}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "#38b6e8", color: "#fff" }}>
                  {savingReport ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {savingReport ? "Creating…" : "Create Report"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "#00000070" }} onClick={() => setShowAddTask(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="rounded-xl w-full max-w-md flex flex-col gap-4 p-6" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: "#cce4ff" }}>New Task</h3>
                <button onClick={() => setShowAddTask(false)} style={{ color: "#4a7090" }}><X size={16} /></button>
              </div>

              {taskRestored && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "#38b6e815", border: "1px solid #38b6e840", color: "#9dd8f5" }}>
                  <RotateCcw size={11} />
                  Draft restored
                  <button onClick={clearTaskDraft} className="ml-auto hover:opacity-70" style={{ color: "#4a7090" }}>Discard</button>
                </div>
              )}

              <input
                autoFocus
                type="text"
                placeholder="Task title *"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
              />

              <textarea
                placeholder="Description (optional)"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Assignee</p>
                  <select value={newTask.assigneeId} onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}>
                    {liveStaff.map((s) => <option key={s.id} value={staffAuthId(s)}>{staffName(s)}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Priority</p>
                  <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}>
                    {[1,2,3,4,5,6,7,8,9,10].map((p) => <option key={p} value={p}>P{p}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Due Date</p>
                  <input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }} />
                </div>
                <div>
                  <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Recurring</p>
                  <select value={newTask.recurring ?? ""} onChange={(e) => setNewTask({ ...newTask, recurring: (e.target.value || null) as NewTaskForm["recurring"] })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}>
                    <option value="">None</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="every-3-months">Every 3 months</option>
                    <option value="every-4-months">Every 4 months</option>
                    <option value="every-6-months">Every 6 months</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                {newTask.recurring === "weekly" && (
                  <div className="col-span-2">
                    <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Day of week</p>
                    <select value={newTask.recurringDay} onChange={(e) => setNewTask({ ...newTask, recurringDay: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}>
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Tags (comma separated)</p>
                  <input type="text" placeholder="e.g. frontend, research" value={newTask.tags} onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }} />
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
                <button onClick={handleAddTask} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: "#38b6e8", color: "#fff" }}>
                  Create Task
                </button>
                <button onClick={() => setShowAddTask(false)} className="px-4 py-2.5 rounded-lg text-sm" style={{ background: "#0e1e30", color: "#4a7090", border: "1px solid #1c3248" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Pin Modal */}
      {showAddPin && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "#00000070" }} onClick={() => setShowAddPin(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="rounded-xl w-full max-w-md flex flex-col gap-4 p-6" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: "#cce4ff" }}>
                  Pin {pinForm.type === "message" ? "Note" : pinForm.type.charAt(0).toUpperCase() + pinForm.type.slice(1)}
                </h3>
                <button onClick={() => setShowAddPin(false)} style={{ color: "#4a7090" }}><X size={16} /></button>
              </div>
              <input type="text" placeholder="Title *" value={pinForm.title} onChange={(e) => setPinForm({ ...pinForm, title: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }} autoFocus />
              <textarea placeholder="Content / note" value={pinForm.content} onChange={(e) => setPinForm({ ...pinForm, content: e.target.value })} rows={3} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none" style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }} />
              {pinForm.type !== "message" && (
                <input type="url" placeholder="URL (optional)" value={pinForm.url} onChange={(e) => setPinForm({ ...pinForm, url: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }} />
              )}
              <div className="flex gap-2">
                <button onClick={handleAddPin} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: "#38b6e8", color: "#fff" }}>Pin it</button>
                <button onClick={() => setShowAddPin(false)} className="px-4 py-2.5 rounded-lg text-sm" style={{ background: "#0e1e30", color: "#4a7090", border: "1px solid #1c3248" }}>Cancel</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Project Modal */}
      {showEdit && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "#00000070" }} onClick={() => setShowEdit(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="rounded-xl w-full max-w-lg flex flex-col gap-4 p-6" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: "#cce4ff" }}>Edit Project</h3>
                <button onClick={() => setShowEdit(false)} style={{ color: "#4a7090" }}><X size={16} /></button>
              </div>

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "#4a7090" }}>Project Name *</label>
                <input
                  autoFocus
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "#4a7090" }}>Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Type */}
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-xs" style={{ color: "#4a7090" }}>Type</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value as "webdev" | "seo" | "both" })}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                  >
                    <option value="webdev">Web Dev</option>
                    <option value="seo">SEO</option>
                    <option value="both">Web + SEO</option>
                  </select>
                </div>

                {/* Channel */}
                {channels.length > 0 && (
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <label className="text-xs" style={{ color: "#4a7090" }}>Channel</label>
                    <select
                      value={editForm.channelId ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, channelId: e.target.value || null })}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                    >
                      <option value="">— No channel —</option>
                      {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Start Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs" style={{ color: "#4a7090" }}>Start Date</label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                  />
                </div>

                {/* Due Date */}
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-xs" style={{ color: "#4a7090" }}>Due Date</label>
                  <input
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveEdit}
                  disabled={!editForm.name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
                  style={{ background: "#38b6e8", color: "#fff" }}
                >
                  <Check size={14} /> Save Changes
                </button>
                <button
                  onClick={() => setShowEdit(false)}
                  className="px-4 py-2.5 rounded-lg text-sm"
                  style={{ background: "#0e1e30", color: "#4a7090", border: "1px solid #1c3248" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Apply Template Modal */}
      {showApplyTemplate && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "#00000070" }} onClick={() => setShowApplyTemplate(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="rounded-xl w-full max-w-lg flex flex-col gap-4 p-6 max-h-[80vh] overflow-y-auto" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: "#cce4ff" }}>Apply Template to Project</h3>
                <button onClick={() => setShowApplyTemplate(false)} style={{ color: "#4a7090" }}><X size={16} /></button>
              </div>

              <div className="flex items-center gap-2">
                <ListChecks size={14} style={{ color: "#38b6e8" }} />
                <p className="text-xs font-semibold" style={{ color: "#4a7090" }}>SELECT TEMPLATES TO APPLY</p>
                {applyTemplateIds.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full ml-auto" style={{ background: "#38b6e820", color: "#38b6e8" }}>
                    {applyTemplateIds.reduce((sum, id) => sum + (templates.find((t) => t.id === id)?.tasks.length ?? 0), 0)} tasks will be added
                  </span>
                )}
              </div>

              {applyTemplateError && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#ef444420", color: "#ef4444", border: "1px solid #ef444430" }}>
                  {applyTemplateError}
                </p>
              )}

              <div className="flex flex-col gap-2">
                {matchingTemplates.map((tpl) => {
                  const selected = applyTemplateIds.includes(tpl.id);
                  const expanded = applyTemplateExpanded === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      className="rounded-lg overflow-hidden"
                      style={{ border: `1px solid ${selected ? "#38b6e8" : "#1c3248"}`, background: selected ? "#38b6e815" : "#0e1e30" }}
                    >
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <button
                          onClick={() => setApplyTemplateIds((prev) => prev.includes(tpl.id) ? prev.filter((id) => id !== tpl.id) : [...prev, tpl.id])}
                          className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                          style={{ borderColor: selected ? "#38b6e8" : "#1c3248", background: selected ? "#38b6e8" : "transparent" }}
                        >
                          {selected && <Check size={10} color="#fff" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: "#cce4ff" }}>{tpl.name}</p>
                          <p className="text-xs" style={{ color: "#4a7090" }}>{tpl.tasks.length} tasks · {tpl.description}</p>
                        </div>
                        <button
                          onClick={() => setApplyTemplateExpanded(expanded ? null : tpl.id)}
                          className="p-1 rounded hover:opacity-70"
                          style={{ color: "#4a7090" }}
                        >
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                      {expanded && (
                        <div style={{ borderTop: "1px solid #1c3248" }}>
                          {tpl.tasks.map((task, i) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 px-4 py-2"
                              style={{ borderBottom: i < tpl.tasks.length - 1 ? "1px solid #1c324840" : "none" }}
                            >
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: (() => { const n = typeof task.priority === "number" ? task.priority : 5; return n <= 2 ? "#ef4444" : n <= 4 ? "#f59e0b" : n <= 6 ? "#38b6e8" : "#22c55e"; })() }} />
                              <p className="text-xs flex-1" style={{ color: "#cce4ff" }}>{task.title}</p>
                              <span className="text-xs" style={{ color: "#8b90a750" }}>Day {task.daysFromStart}{task.recurring ? ` · ${task.recurring}` : ""}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleApplyTemplates}
                  disabled={applyTemplateIds.length === 0 || applyingTemplates}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "#38b6e8", color: "#fff" }}
                >
                  {applyingTemplates ? <><Loader2 size={14} className="animate-spin" />Applying…</> : <>Apply {applyTemplateIds.length > 0 ? `${applyTemplateIds.length} Template${applyTemplateIds.length > 1 ? "s" : ""}` : "Templates"}</>}
                </button>
                <button onClick={() => setShowApplyTemplate(false)} className="px-4 py-2.5 rounded-lg text-sm" style={{ background: "#0e1e30", color: "#4a7090", border: "1px solid #1c3248" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <TaskDrawer task={liveSelectedTask} projectId={project.id} onClose={() => setSelectedTask(null)} />
    </>
  );
}

