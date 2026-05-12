"use client";
import { useState, useRef, useEffect } from "react";
import {
  X, Plus, Paperclip, RefreshCw, ChevronDown, Check, Trash2,
  Image, FileText, Link2, Video, ChevronRight, Loader2, ExternalLink, Download,
  Bold, Italic, List, Heading,
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
  { key: "pending_review", label: "Pending Review", color: "#a855f7" },
  { key: "revision_required", label: "Revision Required", color: "#f59e0b" },
  { key: "done", label: "Done", color: "#22c55e" },
];

function priorityColor(p: number): string {
  if (p <= 2) return "#ef4444";
  if (p <= 4) return "#f59e0b";
  if (p <= 6) return "#38b6e8";
  return "#22c55e";
}

// Strip dangerous HTML before rendering/storing (no script/style/event handlers/js: URLs).
// Internal staff-only content, but defensive sanitisation is still good practice.
function sanitizeHtml(html: string): string {
  if (typeof document === "undefined") return html;
  const tmpl = document.createElement("template");
  tmpl.innerHTML = html;
  tmpl.content.querySelectorAll("script,style,iframe,object,embed").forEach((n) => n.remove());
  tmpl.content.querySelectorAll<HTMLElement>("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      else if ((name === "href" || name === "src") && value.trim().startsWith("javascript:")) el.removeAttribute(attr.name);
    });
  });
  return tmpl.innerHTML;
}

// Detect whether stored description is HTML or legacy plain text. Legacy plain-text
// descriptions (pre-rich-text) should still render with line breaks preserved.
function isHtml(s: string): boolean {
  return /<\/?(p|div|br|strong|em|b|i|u|h\d|ul|ol|li|a|span)\b/i.test(s);
}

// WYSIWYG editor using contentEditable + document.execCommand. Real bolding,
// not markdown wrapping. Stores HTML; sanitised on save and on display.
function RichEditor({ initialHtml, onSave }: { initialHtml: string; onSave: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = isHtml(initialHtml)
        ? sanitizeHtml(initialHtml)
        : initialHtml.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
      ref.current.focus();
      // Move cursor to end
      const r = document.createRange();
      r.selectNodeContents(ref.current);
      r.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
  }, [initialHtml]);

  function exec(cmd: string, value?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, value);
  }

  function handleBlur() {
    if (!ref.current) return;
    const html = sanitizeHtml(ref.current.innerHTML);
    onSave(html === "<br>" ? "" : html);
  }

  const btn = (Ic: React.ComponentType<{ size?: number }>, cmd: string, title: string, value?: string) => (
    <button
      key={title}
      type="button"
      onMouseDown={(e) => { e.preventDefault(); exec(cmd, value); }}
      className="p-1.5 rounded hover:opacity-80 transition-opacity"
      style={{ color: "#9dd8f5" }}
      title={title}
    >
      <Ic size={13} />
    </button>
  );

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #38b6e8", background: "#0e1e30" }}>
      <div className="flex items-center gap-1 px-2 py-1.5" style={{ borderBottom: "1px solid #1c3248" }}>
        {btn(Bold, "bold", "Bold")}
        {btn(Italic, "italic", "Italic")}
        {btn(Heading, "formatBlock", "Heading", "<h3>")}
        {btn(List, "insertUnorderedList", "Bulleted list")}
        <span className="text-xs ml-auto" style={{ color: "#4a7090" }}>Saves on click-away</span>
      </div>
      <div
        ref={ref}
        contentEditable
        onBlur={handleBlur}
        className="rich-content text-sm leading-relaxed px-3 py-2.5 outline-none"
        style={{ background: "#0e1e30", color: "#cce4ff", minHeight: 120 }}
        suppressContentEditableWarning
      />
    </div>
  );
}

const PRIORITY_LABELS: Record<number, string> = {
  1: "P1 · Critical", 2: "P2 · Urgent", 3: "P3 · High", 4: "P4 · High",
  5: "P5 · Medium", 6: "P6 · Medium", 7: "P7 · Low", 8: "P8 · Low",
  9: "P9 · Minimal", 10: "P10 · Minimal",
};

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
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("staff_members").select("id,user_id,email,first_name,last_name,avatar_initials")
      .eq("status", "active")
      .then(({ data }) => setLiveStaff((data as LiveStaff[]) ?? []));
  }, [user?.id]);

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

  const MAX_DRAWERS = 4;

  function pushTask(task: Task, fromDepth?: number) {
    setStack((s) => {
      // If task already in stack, just truncate to it
      const existingIdx = s.findIndex((t) => t.id === task.id);
      if (existingIdx !== -1) return s.slice(0, existingIdx + 1);
      // If opened from a specific depth, truncate stack to that depth + 1 then push
      const base = fromDepth !== undefined ? s.slice(0, fromDepth + 1) : s;
      const next = [...base, task];
      // Cap at MAX_DRAWERS
      return next.length > MAX_DRAWERS ? next.slice(next.length - MAX_DRAWERS) : next;
    });
  }
  function popTask() { setStack((s) => s.slice(0, -1)); }

  // Side-by-side layout: drawers don't overlap
  const drawerWidth = stack.length === 1 ? 600 : stack.length === 2 ? 520 : 440;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "#00000060" }} onClick={onClose} />
      <div className="fixed top-0 right-0 h-screen z-50" style={{ pointerEvents: "none" }}>
        {stack.map((stackEntry, i) => {
          const live = liveTask(stackEntry.id) ?? stackEntry;
          const isTop = i === stack.length - 1;
          const depth = i;
          const rightPos = (stack.length - 1 - i) * drawerWidth;
          const parentTask = i > 0 ? (liveTask(stack[i - 1].id) ?? stack[i - 1]) : undefined;
          return (
            <div
              key={stackEntry.id + "-" + i}
              className="absolute top-0 h-full flex flex-col"
              style={{
                width: drawerWidth,
                right: rightPos,
                background: depth === 0 ? "#0f1d2e" : "#0a1828",
                borderLeft: depth === 0 ? "1px solid #1c3248" : "3px solid #38b6e8",
                pointerEvents: "auto",
                zIndex: i,
                boxShadow: isTop ? "-8px 0 32px #00000050" : "-2px 0 12px #00000030",
                transition: "width 0.2s ease",
              }}
            >
              <TaskPanel
                task={live}
                projectId={projectId}
                isTop={isTop}
                canGoBack={i > 0}
                depth={depth}
                parentTask={parentTask}
                onGoBack={popTask}
                onClose={onClose}
                onOpenChild={(child) => pushTask(child, i)}
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
  task, projectId, isTop, canGoBack, depth, parentTask, onGoBack, onClose, onOpenChild, liveStaff,
}: {
  task: Task;
  projectId: string;
  isTop: boolean;
  canGoBack: boolean;
  depth: number;
  parentTask?: Task;
  onGoBack: () => void;
  onClose: () => void;
  onOpenChild: (task: Task) => void;
  liveStaff: LiveStaff[];
}) {
  const {
    updateTaskStatus, updateTaskPriority, updateTaskAssignee, updateTaskDescription,
    updateTaskTitle, updateTaskDueDate, updateTaskRecurring,
    addSubtask, updateSubtaskStatus, deleteTask, uploadTaskAttachment, deleteAttachment,
    requestTaskApproval, approveTaskCompletion, rejectTask,
  } = useStore();
  const { user } = useAuth();

  const isAdmin = user?.pmRole === "admin";
  const isMyTask = task.assigneeId === user?.id;
  const canEdit = isAdmin || isMyTask;

  const [newSubtask, setNewSubtask] = useState("");
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState(task.assigneeId);
  const [description, setDescription] = useState(task.description);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [localPrio, setLocalPrio] = useState<number | null>(null);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [descEditing, setDescEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [confirmDeleteAttachmentId, setConfirmDeleteAttachmentId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSaveTitle() {
    const t = titleDraft.trim();
    if (t && t !== task.title) updateTaskTitle(projectId, task.id, t);
    setTitleEditing(false);
  }

  async function handleRequestApproval() {
    setApprovalLoading(true);
    try {
      const name = user?.name ?? "Staff";
      await requestTaskApproval(projectId, task.id, name, task.title);
    } finally {
      setApprovalLoading(false);
    }
  }

  async function handleApprove() {
    setApprovalLoading(true);
    try {
      await approveTaskCompletion(projectId, task.id, task.title);
    } finally {
      setApprovalLoading(false);
    }
  }

  async function handleReject() {
    setApprovalLoading(true);
    try {
      await rejectTask(projectId, task.id, task.title);
    } finally {
      setApprovalLoading(false);
    }
  }

  const status = statusOptions.find((s) => s.key === task.status) ?? statusOptions[0];
  const prio = localPrio ?? (typeof task.priority === "number" ? task.priority : 5);
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
    setUploadError(null);
    const uploadedBy = user?.id ?? "";
    try {
      for (const file of files) {
        await uploadTaskAttachment(projectId, task.id, file, uploadedBy);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadError(msg || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Child breadcrumb bar */}
      {depth > 0 && parentTask && (
        <div className="flex items-center gap-1.5 px-5 pt-3 pb-0 shrink-0">
          <span className="text-xs" style={{ color: "#4a7090" }}>↳ Subtask of</span>
          <span className="text-xs font-semibold truncate" style={{ color: "#38b6e8" }}>{parentTask.title}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 shrink-0" style={{ borderBottom: `1px solid ${depth > 0 ? "#1c3a52" : "#1c3248"}` }}>
        {canGoBack && (
          <button onClick={onGoBack} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: "#4a7090" }}>
            ←
          </button>
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {depth > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
              style={{ background: "#38b6e822", color: "#38b6e8", border: "1px solid #38b6e845" }}>
              ↳ SUBTASK
            </span>
          )}
          {task.recurring && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: "#38b6e820", color: "#38b6e8" }}>
              <RefreshCw size={10} /> {{ weekly: "Weekly", monthly: "Monthly", "every-3-months": "Every 3 mo", "every-4-months": "Every 4 mo", "every-6-months": "Every 6 mo", yearly: "Yearly" }[task.recurring] ?? task.recurring}
            </span>
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
        {canEdit && titleEditing ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") { setTitleDraft(task.title); setTitleEditing(false); } }}
            className="text-xl font-semibold leading-snug w-full px-2 py-1 rounded-lg outline-none"
            style={{ color: "#cce4ff", background: "#0e1e30", border: "1px solid #38b6e8" }}
          />
        ) : (
          <h2
            className="text-xl font-semibold leading-snug cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: "#cce4ff" }}
            onClick={() => { if (canEdit) { setTitleDraft(task.title); setTitleEditing(true); } }}
            title={canEdit ? "Click to edit title" : undefined}
          >
            {task.title}
          </h2>
        )}

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
                {statusOptions
                  .filter((s) => isAdmin || (s.key !== "pending_review" && s.key !== "revision_required" && s.key !== "done"))
                  .map((s) => (
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
          <div>
            <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Priority</p>
            <div className="flex flex-col gap-2 px-3 py-2.5 rounded-lg"
              style={{ background: "#0e1e30", border: `1px solid ${priorityColor(prio)}40` }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold px-2 py-0.5 rounded"
                  style={{ background: priorityColor(prio) + "25", color: priorityColor(prio), minWidth: 28, textAlign: "center" }}>
                  P{prio}
                </span>
                <span className="flex-1 text-sm font-medium" style={{ color: priorityColor(prio) }}>
                  {PRIORITY_LABELS[prio] ?? `P${prio}`}
                </span>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "#ef4444" }}>1</span>
                  <input
                    type="range" min={1} max={10} step={1} value={prio}
                    onChange={(e) => setLocalPrio(Number(e.target.value))}
                    onPointerUp={(e) => {
                      const v = Number((e.target as HTMLInputElement).value);
                      setLocalPrio(null);
                      updateTaskPriority(projectId, task.id, v);
                    }}
                    className="flex-1"
                    style={{ accentColor: priorityColor(prio) }}
                  />
                  <span className="text-xs" style={{ color: "#22c55e" }}>10</span>
                </div>
              )}
            </div>
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
            <input
              type="date"
              value={task.dueDate ?? ""}
              onChange={(e) => canEdit && updateTaskDueDate(projectId, task.id, e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff", opacity: canEdit ? 1 : 0.6 }}
              readOnly={!canEdit}
            />
          </div>

          {/* Recurring */}
          <div>
            <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Recurring</p>
            <select
              value={task.recurring ?? ""}
              onChange={(e) => updateTaskRecurring(projectId, task.id, (e.target.value || null) as "weekly" | "monthly" | "every-3-months" | "every-4-months" | "every-6-months" | "yearly" | null)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
            >
              <option value="">One-time</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="every-3-months">Every 3 months</option>
              <option value="every-4-months">Every 4 months</option>
              <option value="every-6-months">Every 6 months</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: "#4a7090" }}>DESCRIPTION</p>
          {descEditing ? (
            <RichEditor
              key={task.id}
              initialHtml={task.description}
              onSave={(html) => {
                if (html !== task.description) updateTaskDescription(projectId, task.id, html);
                setDescEditing(false);
              }}
            />
          ) : (
            <div onClick={() => canEdit && setDescEditing(true)} className="rounded-lg p-3 min-h-20"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", cursor: canEdit ? "text" : "default" }}>
              {task.description ? (
                isHtml(task.description)
                  ? <div className="rich-content text-sm leading-relaxed" style={{ color: "#cce4ff" }}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(task.description) }} />
                  : <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#cce4ff" }}>{task.description}</p>
              ) : (
                <p className="text-sm" style={{ color: "#8b90a750" }}>{canEdit ? "Click to add a description..." : "No description."}</p>
              )}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isDone) {
                          updateSubtaskStatus(projectId, task.id, sub.id, "todo");
                        } else if (isAdmin) {
                          updateSubtaskStatus(projectId, task.id, sub.id, "done");
                        } else {
                          updateSubtaskStatus(projectId, task.id, sub.id, "pending_review");
                        }
                      }}
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const staffOrder: TaskStatus[] = ["todo", "in_progress", "pending_review"];
                        const adminOrder: TaskStatus[] = ["todo", "in_progress", "pending_review", "revision_required", "done"];
                        const order = isAdmin ? adminOrder : staffOrder;
                        const idx = order.indexOf(sub.status as TaskStatus);
                        const next = order[(idx === -1 ? 0 : idx + 1) % order.length];
                        updateSubtaskStatus(projectId, task.id, sub.id, next);
                      }}
                      className="text-xs px-1.5 py-0.5 rounded-full shrink-0 hover:opacity-70 transition-opacity"
                      style={{ background: subStatus.color + "20", color: subStatus.color }}
                    >
                      {subStatus.label}
                    </button>
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
                const isImage = att.type === "image";
                return (
                  <div key={att.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg group"
                    style={{ background: "#0e1e30", border: "1px solid #1c3248", cursor: isImage ? "pointer" : "default" }}
                    onClick={() => isImage && setImagePreviewUrl(att.url)}
                  >
                    {isImage ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border" style={{ borderColor: "#1c3248" }}>
                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <Icon size={15} style={{ color: "#38b6e8" }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "#cce4ff" }}>{att.name}</p>
                      <p className="text-xs" style={{ color: "#4a7090" }}>
                        {att.size}{isImage ? " · click to preview" : ""}
                      </p>
                    </div>
                    <a href={att.url} target="_blank" rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg hover:opacity-70 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "#4a7090" }} title="Open in new tab">
                      <ExternalLink size={13} />
                    </a>
                    <a href={att.url} download={att.name}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg hover:opacity-70 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "#38b6e8" }} title="Download">
                      <Download size={13} />
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteAttachmentId(att.id); }}
                      className="p-1.5 rounded-lg hover:opacity-70 opacity-0 group-hover:opacity-100 transition-opacity"
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
          {uploadError && (
            <p className="text-xs mt-1.5 px-1" style={{ color: "#ef4444" }}>⚠ {uploadError}</p>
          )}
        </div>
      </div>

      {/* Image lightbox */}
      {imagePreviewUrl && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-8"
          style={{ background: "#000000b0" }}
          onClick={() => setImagePreviewUrl(null)}>
          <div className="relative max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img src={imagePreviewUrl} alt="preview" className="max-w-full max-h-[85vh] rounded-xl object-contain"
              style={{ boxShadow: "0 24px 64px #00000080" }} />
            <button onClick={() => setImagePreviewUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#00000080", color: "#fff" }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Delete attachment confirmation */}
      {confirmDeleteAttachmentId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "#000000b0" }}>
          <div className="rounded-2xl p-6 flex flex-col gap-4 w-72"
            style={{ background: "#0f1d2e", border: "1px solid #1c3248", boxShadow: "0 16px 48px #00000060" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#ef444420" }}>
                <Trash2 size={18} style={{ color: "#ef4444" }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "#cce4ff" }}>Delete attachment?</p>
                <p className="text-xs mt-0.5" style={{ color: "#4a7090" }}>This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDeleteAttachmentId(null)}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ background: "#1c3248", color: "#cce4ff" }}>
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteAttachment(projectId, task.id, confirmDeleteAttachmentId);
                  setConfirmDeleteAttachmentId(null);
                }}
                className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "#ef4444", color: "#fff" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col gap-2 px-6 py-4 shrink-0" style={{ borderTop: "1px solid #1c3248" }}>
        {/* Admin: approve + reject when pending review */}
        {isAdmin && task.status === "pending_review" && (
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={approvalLoading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "#f59e0b20", border: "1px solid #f59e0b40", color: "#f59e0b", opacity: approvalLoading ? 0.7 : 1 }}
            >
              {approvalLoading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              Request Revision
            </button>
            <button
              onClick={handleApprove}
              disabled={approvalLoading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "#22c55e", color: "#fff", opacity: approvalLoading ? 0.7 : 1 }}
            >
              {approvalLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Approve
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          {canGoBack && (
            <button onClick={onGoBack} className="py-2 px-4 rounded-lg text-sm font-medium" style={{ background: "#1c3248", color: "#cce4ff" }}>← Back</button>
          )}
          {/* Staff on own task: request review or show pending state */}
          {!isAdmin && isMyTask && task.status !== "done" && task.status !== "pending_review" && (
            <button
              onClick={handleRequestApproval}
              disabled={approvalLoading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "#a855f7", color: "#fff", opacity: approvalLoading ? 0.7 : 1 }}
            >
              {approvalLoading ? <Loader2 size={14} className="animate-spin" /> : null}
              Submit for Review
            </button>
          )}
          {!isAdmin && isMyTask && task.status === "pending_review" && (
            <div className="flex-1 py-2 rounded-lg text-sm font-medium text-center" style={{ background: "#a855f720", color: "#a855f7", border: "1px solid #a855f740" }}>
              Awaiting Admin Review...
            </div>
          )}
          {/* Default close button */}
          {(isAdmin ? task.status !== "pending_review" : (!isMyTask || task.status === "done")) && !canGoBack && (
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: "#38b6e8", color: "#fff" }}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}
