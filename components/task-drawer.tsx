"use client";
import { useState, useRef, useEffect } from "react";
import {
  X, Plus, Paperclip, RefreshCw, ChevronDown, Check, Trash2,
  Image, FileText, Link2, Video, Save, ChevronRight, Loader2, ExternalLink,
} from "lucide-react";
import { type Task, type TaskStatus } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

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

const statusOptions: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo", label: "To Do", color: "#4a7090" },
  { key: "in_progress", label: "In Progress", color: "#3b82f6" },
  { key: "review", label: "Review", color: "#f59e0b" },
  { key: "done", label: "Done", color: "#22c55e" },
];

const priorityOptions = [
  { key: "urgent" as const, label: "Urgent", color: "#ef4444" },
  { key: "high" as const, label: "High", color: "#f59e0b" },
  { key: "medium" as const, label: "Medium", color: "#38b6e8" },
  { key: "low" as const, label: "Low", color: "#22c55e" },
];

const attachIcon = { image: Image, video: Video, document: FileText, link: Link2 };

interface Props {
  task: Task | null;
  projectId: string;
  onClose: () => void;
}

export function TaskDrawer({ task, projectId, onClose }: Props) {
  if (!task) return null;
  return <DrawerStack rootTask={task} projectId={projectId} onClose={onClose} />;
}

// ─── Stack controller — manages the array of open tasks ──────────────────────
function DrawerStack({ rootTask, projectId, onClose }: { rootTask: Task; projectId: string; onClose: () => void }) {
  const [stack, setStack] = useState<Task[]>([rootTask]);
  const [liveStaff, setLiveStaff] = useState<LiveStaff[]>([]);
  const { projects } = useStore();

  useEffect(() => {
    supabase.from("staff_members").select("id,user_id,email,first_name,last_name,avatar_initials")
      .eq("status", "active")
      .then(({ data }) => setLiveStaff((data as LiveStaff[]) ?? []));
  }, []);

  // Keep every task in the stack live from the store
  function liveTask(taskId: string): Task | null {
    function find(tasks: Task[]): Task | null {
      for (const t of tasks) {
        if (t.id === taskId) return t;
        const found = find(t.subtasks);
        if (found) return found;
      }
      return null;
    }
    const project = projects.find((p) => p.id === projectId);
    return project ? find(project.tasks) : null;
  }

  function pushTask(task: Task) { setStack((s) => [...s, task]); }
  function popTask() { setStack((s) => s.slice(0, -1)); }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "#00000060" }} onClick={onClose} />
      <div className="fixed top-0 right-0 h-screen z-50 flex" style={{ pointerEvents: "none" }}>
        {stack.map((stackEntry, i) => {
          const live = liveTask(stackEntry.id) ?? stackEntry;
          const isTop = i === stack.length - 1;
          const offset = (stack.length - 1 - i) * 24;
          return (
            <div
              key={stackEntry.id + "-" + i}
              className="absolute top-0 h-full flex flex-col transition-transform"
              style={{
                width: 600,
                right: offset,
                background: "#0f1d2e",
                borderLeft: "1px solid #1c3248",
                pointerEvents: "auto",
                zIndex: i,
                boxShadow: isTop ? "-8px 0 32px #00000040" : "none",
                filter: isTop ? "none" : `brightness(${0.85 - (stack.length - 1 - i) * 0.05})`,
              }}
            >
              <TaskPanel
                task={live}
                projectId={projectId}
                isTop={isTop}
                canGoBack={i > 0}
                onGoBack={popTask}
                onClose={onClose}
                onOpenChild={(child) => pushTask(child)}
                liveStaff={liveStaff}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Single task panel ────────────────────────────────────────────────────────
function TaskPanel({
  task, projectId, isTop, canGoBack, onGoBack, onClose, onOpenChild, liveStaff,
}: {
  task: Task;
  projectId: string;
  isTop: boolean;
  canGoBack: boolean;
  onGoBack: () => void;
  onClose: () => void;
  onOpenChild: (task: Task) => void;
  liveStaff: LiveStaff[];
}) {
  const {
    updateTaskStatus, updateTaskPriority, updateTaskAssignee, updateTaskDescription,
    updateTaskRecurring,
    addSubtask, updateSubtaskStatus, deleteTask, uploadTaskAttachment, deleteAttachment,
  } = useStore();
  const { user } = useAuth();

  const isAdmin = user?.pmRole === "admin";
  const isMyTask = task.assigneeId === user?.id;
  const canEdit = isAdmin || isMyTask;

  const [newSubtask, setNewSubtask] = useState("");
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState(task.assigneeId);
  const [description, setDescription] = useState(task.description);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [descEditing, setDescEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const status = statusOptions.find((s) => s.key === task.status)!;
  const priority = priorityOptions.find((p) => p.key === task.priority)!;
  const assignee = liveStaff.find((s) => staffAuthId(s) === task.assigneeId);
  const subtaskDone = task.subtasks.filter((s) => s.status === "done").length;

  async function handleAddSubtask() {
    const title = newSubtask.trim();
    if (!title) return;
    await addSubtask(projectId, task.id, { title, assigneeId: newSubtaskAssignee, dueDate: task.dueDate });
    setNewSubtask("");
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await deleteTask(projectId, task.id);
    if (canGoBack) onGoBack(); else onClose();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        await uploadTaskAttachment(projectId, task.id, file);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 shrink-0" style={{ borderBottom: "1px solid #1c3248" }}>
        {canGoBack && (
          <button onClick={onGoBack} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: "#4a7090" }}>
            ←
          </button>
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {task.recurring && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: "#38b6e820", color: "#38b6e8" }}>
              <RefreshCw size={10} /> {task.recurring}
            </span>
          )}
          {task.parentId && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#1c3248", color: "#4a7090" }}>child</span>
          )}
          <span className="text-xs font-mono truncate" style={{ color: "#4a7090" }}>{task.id.slice(0, 8).toUpperCase()}</span>
        </div>
        {isTop && (
          <>
            {isAdmin && (
              <button onClick={handleDelete} className="p-1.5 rounded-lg hover:opacity-70 text-xs flex items-center gap-1" style={{ color: confirmDelete ? "#ef4444" : "#4a7090" }}>
                <Trash2 size={14} /> {confirmDelete ? "Confirm?" : ""}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "#4a7090" }}>
              <X size={16} />
            </button>
          </>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
        <h2 className="text-xl font-semibold leading-snug" style={{ color: "#cce4ff" }}>{task.title}</h2>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3">
          {/* Status */}
          <div className="relative">
            <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Status</p>
            <button
              onClick={() => { if (!canEdit) return; setShowStatusMenu(!showStatusMenu); setShowPriorityMenu(false); setShowAssigneeMenu(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-sm font-medium"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: status.color, opacity: canEdit ? 1 : 0.6, cursor: canEdit ? "pointer" : "default" }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: status.color }} />
              {status.label}
              <ChevronDown size={13} className="ml-auto" style={{ color: "#4a7090" }} />
            </button>
            {showStatusMenu && (
              <div className="absolute top-full left-0 mt-1 w-full rounded-lg overflow-hidden z-20 shadow-lg" style={{ background: "#0e1e30", border: "1px solid #1c3248" }}>
                {statusOptions.map((s) => (
                  <button key={s.key} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:opacity-80"
                    style={{ color: s.color, background: s.key === task.status ? "#1c3248" : "transparent" }}
                    onClick={() => { updateTaskStatus(projectId, task.id, s.key); setShowStatusMenu(false); }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                    {s.key === task.status && <Check size={12} className="ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="relative">
            <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Priority</p>
            <button
              onClick={() => { if (!isAdmin) return; setShowPriorityMenu(!showPriorityMenu); setShowStatusMenu(false); setShowAssigneeMenu(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-sm font-medium"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: priority.color, opacity: isAdmin ? 1 : 0.6, cursor: isAdmin ? "pointer" : "default" }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: priority.color }} />
              {priority.label}
              <ChevronDown size={13} className="ml-auto" style={{ color: "#4a7090" }} />
            </button>
            {showPriorityMenu && (
              <div className="absolute top-full left-0 mt-1 w-full rounded-lg overflow-hidden z-20 shadow-lg" style={{ background: "#0e1e30", border: "1px solid #1c3248" }}>
                {priorityOptions.map((p) => (
                  <button key={p.key} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:opacity-80"
                    style={{ color: p.color, background: p.key === task.priority ? "#1c3248" : "transparent" }}
                    onClick={() => { updateTaskPriority(projectId, task.id, p.key); setShowPriorityMenu(false); }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    {p.label}
                    {p.key === task.priority && <Check size={12} className="ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assignee */}
          <div className="relative">
            <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Assignee</p>
            <button
              onClick={() => { if (!isAdmin) return; setShowAssigneeMenu(!showAssigneeMenu); setShowStatusMenu(false); setShowPriorityMenu(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-sm"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff", opacity: isAdmin ? 1 : 0.6, cursor: isAdmin ? "pointer" : "default" }}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#38b6e8", color: "#fff" }}>
                {assignee ? staffInitials(assignee) : "?"}
              </div>
              {assignee ? staffName(assignee) : "Unassigned"}
              <ChevronDown size={13} className="ml-auto" style={{ color: "#4a7090" }} />
            </button>
            {showAssigneeMenu && (
              <div className="absolute top-full left-0 mt-1 w-full rounded-lg overflow-hidden z-20 shadow-lg" style={{ background: "#0e1e30", border: "1px solid #1c3248" }}>
                {liveStaff.map((s) => (
                  <button key={s.id} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:opacity-80"
                    style={{ color: "#cce4ff", background: staffAuthId(s) === task.assigneeId ? "#1c3248" : "transparent" }}
                    onClick={() => { updateTaskAssignee(projectId, task.id, staffAuthId(s)); setShowAssigneeMenu(false); }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#38b6e8", color: "#fff" }}>{staffInitials(s)}</div>
                    {staffName(s)}
                    {staffAuthId(s) === task.assigneeId && <Check size={12} className="ml-auto" style={{ color: "#22c55e" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Due date */}
          <div>
            <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Due Date</p>
            <input type="date" defaultValue={task.dueDate}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }} />
          </div>

          {/* Recurring */}
          <div>
            <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Recurring</p>
            <select
              value={task.recurring ?? ""}
              onChange={(e) => updateTaskRecurring(projectId, task.id, (e.target.value || null) as "weekly" | "monthly" | "yearly" | null)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
            >
              <option value="">One-time</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold" style={{ color: "#4a7090" }}>DESCRIPTION</p>
            {descEditing ? (
              <button onClick={() => { updateTaskDescription(projectId, task.id, description); setDescEditing(false); }}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                style={{ background: "#22c55e20", color: "#22c55e" }}>
                <Save size={11} /> Save
              </button>
            ) : canEdit ? (
              <button onClick={() => setDescEditing(true)} className="text-xs" style={{ color: "#38b6e8" }}>Edit</button>
            ) : null}
          </div>
          {descEditing ? (
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} autoFocus
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={{ background: "#0e1e30", border: "1px solid #38b6e8", color: "#cce4ff" }} />
          ) : (
            <div onClick={() => canEdit && setDescEditing(true)} className="rounded-lg p-3 min-h-16"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", cursor: canEdit ? "text" : "default" }}>
              {task.description
                ? <p className="text-sm leading-relaxed" style={{ color: "#cce4ff" }}>{task.description}</p>
                : <p className="text-sm" style={{ color: "#8b90a750" }}>{canEdit ? "Click to add a description..." : "No description."}</p>
              }
            </div>
          )}
        </div>

        {/* Child tasks */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: "#4a7090" }}>
            CHILD TASKS {task.subtasks.length > 0 && `· ${subtaskDone}/${task.subtasks.length} done`}
          </p>

          {task.subtasks.length > 0 && (
            <div className="rounded-lg overflow-hidden mb-3" style={{ border: "1px solid #1c3248" }}>
              {task.subtasks.map((sub, i) => {
                const subAssignee = liveStaff.find((s) => staffAuthId(s) === sub.assigneeId);
                const subStatus = statusOptions.find((s) => s.key === sub.status)!;
                const isDone = sub.status === "done";
                return (
                  <div key={sub.id}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:opacity-80 transition-opacity group"
                    style={{ background: "#0f1d2e", borderBottom: i < task.subtasks.length - 1 ? "1px solid #1c3248" : "none" }}
                    onClick={() => onOpenChild(sub)}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); updateSubtaskStatus(projectId, task.id, sub.id, isDone ? "todo" : "done"); }}
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors"
                      style={{ borderColor: subStatus.color, background: isDone ? subStatus.color : "transparent" }}
                    >
                      {isDone && <Check size={10} color="#fff" />}
                    </button>
                    <p className="text-sm flex-1 truncate" style={{ color: isDone ? "#4a7090" : "#cce4ff", textDecoration: isDone ? "line-through" : "none" }}>
                      {sub.title}
                    </p>
                    {sub.subtasks.length > 0 && (
                      <span className="text-xs shrink-0" style={{ color: "#4a7090" }}>{sub.subtasks.length} child{sub.subtasks.length !== 1 ? "ren" : ""}</span>
                    )}
                    <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0" style={{ background: subStatus.color + "20", color: subStatus.color }}>{subStatus.label}</span>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#38b6e8", color: "#fff" }}>
                      {subAssignee ? staffInitials(subAssignee).charAt(0) : "?"}
                    </div>
                    <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: "#4a7090" }} />
                  </div>
                );
              })}
            </div>
          )}

          {canEdit && (
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Add child task..." value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }} />
              {isAdmin && (
                <select value={newSubtaskAssignee} onChange={(e) => setNewSubtaskAssignee(e.target.value)}
                  className="px-2 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}>
                  {liveStaff.map((s) => <option key={s.id} value={staffAuthId(s)}>{staffName(s).split(" ")[0]}</option>)}
                </select>
              )}
              <button onClick={handleAddSubtask} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1"
                style={{ background: "#38b6e8", color: "#fff" }}>
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Attachments */}
        {task.attachments.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: "#4a7090" }}>ATTACHMENTS</p>
            <div className="flex flex-col gap-2">
              {task.attachments.map((att) => {
                const Icon = attachIcon[att.type];
                return (
                  <div key={att.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg group"
                    style={{ background: "#0e1e30", border: "1px solid #1c3248" }}>
                    <Icon size={15} style={{ color: "#38b6e8" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "#cce4ff" }}>{att.name}</p>
                      <p className="text-xs" style={{ color: "#4a7090" }}>{att.size}</p>
                    </div>
                    <a href={att.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded hover:opacity-70 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "#4a7090" }}>
                      <ExternalLink size={13} />
                    </a>
                    <button onClick={() => deleteAttachment(projectId, task.id, att.id)}
                      className="p-1 rounded hover:opacity-70 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "#ef4444" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: "#4a7090" }}>UPLOAD TO TASK</p>
          <label className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
            style={{ border: "2px dashed #1c3248" }}>
            {uploading
              ? <Loader2 size={16} className="animate-spin" style={{ color: "#38b6e8" }} />
              : <Paperclip size={16} style={{ color: "#4a7090" }} />
            }
            <div>
              <p className="text-sm" style={{ color: "#4a7090" }}>{uploading ? "Uploading..." : "Click to attach files"}</p>
              <p className="text-xs" style={{ color: "#8b90a750" }}>Images, videos, PDFs, Word docs · max 50 MB</p>
            </div>
            <input ref={fileRef} type="file" className="hidden" multiple
              accept="image/*,video/*,.pdf,.doc,.docx"
              onChange={handleFileChange}
              disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-6 py-4 shrink-0" style={{ borderTop: "1px solid #1c3248" }}>
        {canGoBack
          ? <button onClick={onGoBack} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: "#1c3248", color: "#cce4ff" }}>← Back</button>
          : <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: "#38b6e8", color: "#fff" }}>Done</button>
        }
      </div>
    </div>
  );
}
