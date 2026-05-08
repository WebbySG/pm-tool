"use client";
import { useState, useRef } from "react";
import { notFound } from "next/navigation";
import { useParams } from "next/navigation";
import { USERS, type Task, type TaskType, type TaskStatus } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { Topbar } from "@/components/topbar";
import { TaskDrawer } from "@/components/task-drawer";
import { KanbanBoard } from "@/components/kanban-board";
import {
  Pin, Link2, MessageSquare, FileText, Image, Video, Upload, X, ExternalLink, RotateCcw,
} from "lucide-react";
import { ScheduleTab } from "@/components/schedule-tab";
import { useDraft } from "@/lib/use-draft";

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
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string;
  type: TaskType;
  recurring: "weekly" | "monthly" | null;
  recurringDay: string;
  tags: string;
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { projects, clients, addTask, assignStaff, removeStaff, addMedia, removeMedia, addPinnedItem, removePinnedItem } = useStore();
  const [activeTab, setActiveTab] = useState<"board" | "schedule" | "files" | "pinned">("board");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddPin, setShowAddPin] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [addTaskCol, setAddTaskCol] = useState("todo");
  const [pinForm, setPinForm] = useState({ type: "link" as "link" | "document" | "message", title: "", content: "", url: "" });
  const initialTask: NewTaskForm = {
    title: "", description: "", assigneeId: "u2", priority: "medium",
    dueDate: new Date().toISOString().split("T")[0], type: "webdev",
    recurring: null, recurringDay: "", tags: "",
  };
  const [newTask, setNewTask, clearTaskDraft, taskRestored] = useDraft(
    `add-task:${params.id}`, initialTask
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectRaw = projects.find((p) => p.id === params.id);
  if (!projectRaw) return notFound();
  const project = projectRaw;

  const client = clients.find((c) => c.id === project.clientId);
  const done = project.tasks.filter((t) => t.status === "done").length;
  const pct = project.tasks.length > 0 ? Math.round((done / project.tasks.length) * 100) : 0;
  const typeColor = project.type === "seo" ? "#22c55e" : "#38b6e8";
  const assignedUsers = USERS.filter((u) => project.assignedStaff.includes(u.id));
  const unassignedUsers = USERS.filter((u) => !project.assignedStaff.includes(u.id));

  function handleAddTask() {
    if (!newTask.title.trim()) return;
    addTask(project.id, {
      projectId: project.id,
      title: newTask.title.trim(),
      description: newTask.description,
      type: newTask.type,
      status: addTaskCol as Task["status"],
      priority: newTask.priority,
      assigneeId: newTask.assigneeId,
      dueDate: newTask.dueDate,
      tags: newTask.tags ? newTask.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      recurring: newTask.recurring,
      recurringDay: newTask.recurringDay || undefined,
    });
    setShowAddTask(false);
    clearTaskDraft();
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
        uploadedBy: "u1",
        uploadedAt: new Date().toISOString(),
      });
    });
    e.target.value = "";
  }

  function handleAddPin() {
    if (!pinForm.title.trim()) return;
    addPinnedItem(project.id, { ...pinForm, pinnedBy: "u1" });
    setShowAddPin(false);
    setPinForm({ type: "link", title: "", content: "", url: "" });
  }

  // Keep selected task in sync with store updates
  const liveSelectedTask = selectedTask
    ? project.tasks.find((t) => t.id === selectedTask.id) ?? null
    : null;

  return (
    <>
      <Topbar title={project.name} back={{ label: "Projects", href: "/projects" }} />
      <div className="flex flex-col h-full">

        {/* Project header */}
        <div className="px-6 pt-5 pb-0">
          <div className="rounded-xl p-4 mb-4" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: typeColor + "20", color: typeColor }}>
                    {project.type === "seo" ? "SEO" : "Web Dev"}
                  </span>
                  <span className="text-xs" style={{ color: "#4a7090" }}>{client?.name} · {client?.website}</span>
                </div>
                <p className="text-sm" style={{ color: "#4a7090" }}>{project.description}</p>
              </div>

              {/* Assigned staff */}
              <div className="flex flex-col items-end gap-2 relative">
                <div className="flex items-center gap-1">
                  <span className="text-xs mr-1" style={{ color: "#4a7090" }}>Assigned:</span>
                  {assignedUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => removeStaff(project.id, u.id)}
                      title={`Remove ${u.name}`}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 hover:opacity-70 transition-opacity"
                      style={{ background: "#38b6e8", color: "#fff", borderColor: "#0f1d2e" }}
                    >
                      {u.avatar}
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
                    {unassignedUsers.length === 0 ? (
                      <p className="px-3 py-2 text-sm" style={{ color: "#4a7090" }}>All staff assigned</p>
                    ) : unassignedUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => { assignStaff(project.id, u.id); setShowAssignMenu(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:opacity-80"
                        style={{ color: "#cce4ff" }}
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#38b6e8", color: "#fff" }}>
                          {u.avatar}
                        </div>
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}
                <span className="text-xs" style={{ color: "#4a7090" }}>
                  Due {new Date(project.dueDate).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
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
            {(["board", "schedule", "files", "pinned"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-2.5 text-sm font-medium capitalize transition-colors"
                style={{
                  color: activeTab === tab ? "#38b6e8" : "#4a7090",
                  borderBottom: activeTab === tab ? "2px solid #38b6e8" : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {tab === "files" ? `Files (${project.media.length})` : tab === "pinned" ? `Pinned (${project.pinnedItems.length})` : tab === "schedule" ? "Schedule" : "Board"}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* BOARD */}
          {activeTab === "board" && (
            <KanbanBoard
              projectId={project.id}
              tasks={project.tasks}
              onTaskClick={(task) => setSelectedTask(task)}
              onAddTask={(status: TaskStatus) => { setAddTaskCol(status); setShowAddTask(true); }}
            />
          )}

          {/* SCHEDULE */}
          {activeTab === "schedule" && (
            <ScheduleTab
              project={project}
              onTaskClick={(task) => setSelectedTask(task)}
              onAddTask={(dueDate) => {
                setNewTask((prev) => ({ ...prev, dueDate }));
                setAddTaskCol("todo");
                setShowAddTask(true);
              }}
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
                <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*,video/*,.pdf,.doc,.docx" onChange={handleFileUpload} />
              </label>

              {project.media.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-3" style={{ color: "#4a7090" }}>PROJECT FILES ({project.media.length})</p>
                  <div className="grid grid-cols-3 gap-3">
                    {project.media.map((file) => {
                      const Icon = mediaIcon[file.type];
                      const uploader = USERS.find((u) => u.id === file.uploadedBy);
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
                                {uploader?.name.split(" ")[0]} · {new Date(file.uploadedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}
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
                  const pinner = USERS.find((u) => u.id === item.pinnedBy);
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
                        Pinned by {pinner?.name.split(" ")[0]} · {new Date(item.pinnedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

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
                    {USERS.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Priority</p>
                  <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as NewTaskForm["priority"] })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
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

      <TaskDrawer task={liveSelectedTask} projectId={project.id} onClose={() => setSelectedTask(null)} />
    </>
  );
}

