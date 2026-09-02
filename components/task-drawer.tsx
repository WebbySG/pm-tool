"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  X, Plus, Paperclip, RefreshCw, ChevronDown, Check, Trash2,
  Image, FileText, Link2, Video, ChevronRight, Loader2, ExternalLink, Download,
  Bold, Italic, List, Heading, MessageSquare, Send, Palette, Eraser, Pencil,
  History, Clock, Archive,
} from "lucide-react";
import { type Task, type TaskStatus } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { supabase, uploadAttachment, dataUrlToFile } from "@/lib/supabase";
import { errorMessage, FILE_ACCEPT, MAX_UPLOAD_MB, MAX_UPLOAD_BYTES, formatBytes, sanitizeHtml, isHtml } from "@/lib/utils";
import { useDiscardGuard } from "@/components/discard-guard";
import {
  dbListTaskComments, dbAddTaskComment, dbUpdateTaskComment, dbDeleteTaskComment, type TaskComment,
  type CommentAttachment,
  dbListTaskActivity, type TaskActivity, dbListCommentVersions, type CommentVersion,
} from "@/lib/db";

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

// Comment body renderer: highlights @mentions and renders inline [img:url]
// tokens as images on their own line (click → lightbox). Mirrors chat's
// RenderBody but scoped to what comments support.
function CommentBody({ body, onOpenImage }: { body: string; onOpenImage: (url: string) => void }) {
  const combined = /(@[A-Za-z][A-Za-z0-9_-]*)|(\[img:[^\]\s]+\])/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0; let m: RegExpExecArray | null; let key = 0;
  while ((m = combined.exec(body)) !== null) {
    if (m.index > lastIdx) parts.push(<span key={`t${key++}`}>{body.slice(lastIdx, m.index)}</span>);
    if (m[1]) {
      parts.push(<span key={`m${key++}`} style={{ color: "#38b6e8", fontWeight: 600 }}>{m[1]}</span>);
    } else if (m[2]) {
      const url = m[2].slice(5, -1);
      parts.push(
        <button key={`i${key++}`} type="button" onClick={() => onOpenImage(url)}
          className="block my-1.5 w-fit hover:opacity-90" title="Click to enlarge">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" loading="lazy"
            style={{ maxWidth: 280, maxHeight: 240, borderRadius: 10, border: "1px solid #1c3248", display: "block" }} />
        </button>,
      );
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < body.length) parts.push(<span key={`t${key++}`}>{body.slice(lastIdx)}</span>);
  return <>{parts}</>;
}

// @-mention autocomplete list, shared by the comment composer and the in-place
// comment edit box. Parent positions it (absolute) via className.
function MentionDropdown({ candidates, activeIndex, onPick, className }: {
  candidates: LiveStaff[];
  activeIndex: number;
  onPick: (s: LiveStaff) => void;
  className: string;
}) {
  return (
    <div className={`${className} rounded-lg overflow-hidden z-10 min-w-[200px]`}
      style={{ background: "#0a1626", border: "1px solid #1c3248", boxShadow: "0 8px 24px #00000080" }}>
      {candidates.map((s, i) => {
        const active = i === activeIndex;
        return (
          <button key={staffAuthId(s)} type="button"
            onMouseDown={(e) => { e.preventDefault(); onPick(s); }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
            style={{ background: active ? "#1c3248" : "transparent", color: "#cce4ff" }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "#38b6e8", color: "#fff" }}>
              {staffInitials(s).charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{staffName(s)}</p>
              <p className="text-xs truncate" style={{ color: "#4a7090" }}>{s.email}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

const statusOptions: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo", label: "To Do", color: "#4a7090" },
  { key: "in_progress", label: "In Progress", color: "#3b82f6" },
  // Parked by the admin pending a discussion — carries an admin-only note
  // (discussionNote) that auto-clears when the status moves on. Admin-set only.
  { key: "to_be_discussed", label: "To Be Discussed", color: "#06b6d4" },
  { key: "pending_review", label: "Pending Review", color: "#a855f7" },
  // Waiting on the CLIENT (not internal review) — admin-set only.
  { key: "pending_client_approval", label: "Pending Client Approval", color: "#ec4899" },
  // Approved internally — waiting on the assignee to upload the article to the
  // website and record the live link (entered via admin Approve on tasks with
  // requiresArticlePost; completed via "Mark as Posted" in the drawer footer).
  { key: "pending_article_post", label: "Pending Article Post", color: "#f97316" },
  { key: "revision_required", label: "Revision Required", color: "#f59e0b" },
  { key: "done", label: "Done", color: "#22c55e" },
  // Weekly SEO tombstone: the slot's article was never posted (set by the
  // weekly generator on carry-forward; admins may also set it manually).
  { key: "missed", label: "Missed", color: "#ef4444" },
  // Admin refused the work outright — closed, no redo loop (admin-set only).
  { key: "rejected", label: "Rejected", color: "#dc2626" },
];

function priorityColor(p: number): string {
  if (p <= 2) return "#ef4444";
  if (p <= 4) return "#f59e0b";
  if (p <= 6) return "#38b6e8";
  return "#22c55e";
}

// Escape for use in an HTML attribute / text node.
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Convert legacy plain-text to HTML (escape + preserve line breaks) so appended
// markup (dropped images) renders alongside it without corrupting the old text.
function plainToHtml(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br>");
}

// Inline <img> markup for an uploaded image, matching the RichEditor's inserted style.
function imgHtml(url: string, name: string): string {
  return `<img src="${escapeHtml(url)}" alt="${escapeHtml(name)}" style="max-width:100%;border-radius:8px;margin:6px 0;" />`;
}

// Font-colour swatches for the description editor. "Default" clears the colour so
// text falls back to the editor's light theme colour (readable on the dark panel).
const TEXT_COLORS: { label: string; value: string }[] = [
  { label: "Default (theme)", value: "" },
  { label: "White", value: "#ffffff" },
  { label: "Light blue", value: "#cce4ff" },
  { label: "Sky", value: "#38b6e8" },
  { label: "Green", value: "#22c55e" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Red", value: "#ef4444" },
  { label: "Purple", value: "#a855f7" },
  { label: "Slate", value: "#94a3b8" },
  { label: "Black", value: "#0a0a0a" },
];

// WYSIWYG editor using contentEditable + document.execCommand. Real bolding,
// not markdown wrapping. Stores HTML; sanitised on save and on display.
function RichEditor({ initialHtml, onSave, onUploadFile }: {
  initialHtml: string;
  onSave: (html: string) => void;
  onUploadFile?: (file: File) => Promise<{ url: string; name: string; type: "image" | "video" | "document" | "link" } | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = isHtml(initialHtml)
        ? sanitizeHtml(initialHtml)
        : plainToHtml(initialHtml);
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

  // Apply a font colour to the current selection. styleWithCSS makes execCommand emit
  // inline `style="color:…"` (kept by the sanitiser) and, in Chromium, strips conflicting
  // colours from descendant nodes inside the range — so it overrides pasted dark text.
  function applyColor(color: string) {
    ref.current?.focus();
    if (color === "") {
      // "Default": drop the colour so text inherits the editor's light theme colour.
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("foreColor", false, "#cce4ff");
    } else {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("foreColor", false, color);
    }
    setShowColors(false);
    if (ref.current) {
      const html = sanitizeHtml(ref.current.innerHTML);
      onSave(html === "<br>" ? "" : html);
    }
  }

  // Strip bold/italic/colour/etc. from the selection — handy for cleaning up pasted
  // website content that carries its own (often unreadable) inline colours.
  function clearFormatting() {
    ref.current?.focus();
    document.execCommand("removeFormat");
    if (ref.current) {
      const html = sanitizeHtml(ref.current.innerHTML);
      onSave(html === "<br>" ? "" : html);
    }
  }

  function insertNodeAtCursor(node: Node) {
    ref.current?.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      ref.current?.appendChild(node);
    } else {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(node);
      range.setStartAfter(node);
      range.setEndAfter(node);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  // Place the caret where the file was dropped so the image lands at the drop
  // point rather than the previous cursor position. Falls back to focus() when
  // the browser lacks the caret-from-point APIs or the point is outside the editor.
  function placeCaretFromPoint(x: number, y: number) {
    const el = ref.current;
    if (!el) return;
    let range: Range | null = null;
    const doc = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    };
    if (doc.caretRangeFromPoint) {
      range = doc.caretRangeFromPoint(x, y);
    } else if (doc.caretPositionFromPoint) {
      const pos = doc.caretPositionFromPoint(x, y);
      if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); range.collapse(true); }
    }
    if (range && el.contains(range.startContainer)) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } else {
      el.focus();
    }
  }

  // Upload one or more files and insert them into the editor — images inline as
  // <img>, everything else as a link. Shared by the paperclip picker, drag-drop
  // and clipboard paste.
  async function insertUploadedFiles(files: File[], caret?: { x: number; y: number }) {
    if (!onUploadFile || files.length === 0) return;
    ref.current?.focus();
    if (caret) placeCaretFromPoint(caret.x, caret.y);
    setUploadingFile(true);
    try {
      for (const file of files) {
        const uploaded = await onUploadFile(file);
        if (!uploaded) continue;
        if (uploaded.type === "image") {
          const img = document.createElement("img");
          img.src = uploaded.url;
          img.alt = uploaded.name;
          img.style.maxWidth = "100%";
          img.style.borderRadius = "8px";
          img.style.margin = "6px 0";
          insertNodeAtCursor(img);
        } else {
          const link = document.createElement("a");
          link.href = uploaded.url;
          link.target = "_blank";
          link.rel = "noreferrer";
          link.textContent = `📎 ${uploaded.name}`;
          insertNodeAtCursor(link);
          insertNodeAtCursor(document.createElement("br"));
        }
      }
      if (ref.current) {
        const html = sanitizeHtml(ref.current.innerHTML);
        onSave(html === "<br>" ? "" : html);
      }
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleEditorFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await insertUploadedFiles([file]);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDrop(e: React.DragEvent) {
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length === 0) return; // let the browser handle internal content drags
    e.preventDefault();
    setDragActive(false);
    void insertUploadedFiles(files, { x: e.clientX, y: e.clientY });
  }

  function handleDragOver(e: React.DragEvent) {
    if (!onUploadFile) return;
    if (!Array.from(e.dataTransfer?.types ?? []).includes("Files")) return;
    e.preventDefault();
    setDragActive(true);
  }

  function handlePaste(e: React.ClipboardEvent) {
    if (!onUploadFile) return;

    // Case 1: a real clipboard file (screenshot, copied file) — upload directly.
    const imgs: File[] = [];
    for (const item of Array.from(e.clipboardData?.items ?? [])) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) imgs.push(f);
      }
    }
    if (imgs.length > 0) {
      e.preventDefault();
      void insertUploadedFiles(imgs);
      return;
    }

    // Case 2: an image copied from a WEB PAGE, Word or Google Docs. The browser
    // hands this over as text/html containing <img src="data:image/...;base64,…">,
    // NOT as a clipboard file — so it used to be pasted straight into the row.
    // That inflated descriptions to over 1.4 MB each, which every user then
    // downloaded on every navigation (loadAll selects * from pm_tasks) and which
    // made the save itself fail. Extract the data: URIs, upload them as real
    // files, and paste the HTML with storage URLs in their place.
    const html = e.clipboardData?.getData("text/html");
    if (!html || !/src\s*=\s*["']data:image\//i.test(html)) return; // normal paste
    e.preventDefault();
    void pasteHtmlWithUploadedImages(html);
  }

  // Replace every data: image in pasted HTML with an uploaded storage URL, then
  // insert the result. Images that fail to upload are dropped rather than
  // inlined — keeping a multi-MB base64 blob in the row is what caused the bug.
  async function pasteHtmlWithUploadedImages(html: string) {
    setUploadingFile(true);
    try {
      const holder = document.createElement("div");
      holder.innerHTML = html;
      const imgEls = Array.from(holder.querySelectorAll("img"));
      for (const el of imgEls) {
        const src = el.getAttribute("src") ?? "";
        if (!src.startsWith("data:image/")) continue;
        const file = dataUrlToFile(src, "pasted-image");
        const uploaded = file && onUploadFile ? await onUploadFile(file) : null;
        if (uploaded) {
          el.setAttribute("src", uploaded.url);
          el.removeAttribute("srcset");
          el.style.maxWidth = "100%";
          el.style.borderRadius = "8px";
          el.style.margin = "6px 0";
        } else {
          el.remove();
        }
      }
      const frag = document.createDocumentFragment();
      const clean = document.createElement("template");
      clean.innerHTML = sanitizeHtml(holder.innerHTML);
      frag.appendChild(clean.content);
      insertNodeAtCursor(frag);
      if (ref.current) {
        const out = sanitizeHtml(ref.current.innerHTML);
        onSave(out === "<br>" ? "" : out);
      }
    } finally {
      setUploadingFile(false);
    }
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
    <div
      className="rounded-lg overflow-hidden relative"
      style={{ border: "1px solid #38b6e8", background: "#0e1e30", boxShadow: dragActive ? "0 0 0 2px #38b6e8 inset" : "none" }}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      {dragActive && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none rounded-lg"
          style={{ background: "#0e1e30d0", border: "2px dashed #38b6e8" }}>
          <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#9dd8f5" }}>
            <Paperclip size={13} /> Drop image to insert
          </span>
        </div>
      )}
      <div className="flex items-center gap-1 px-2 py-1.5 relative" style={{ borderBottom: "1px solid #1c3248" }}>
        {btn(Bold, "bold", "Bold")}
        {btn(Italic, "italic", "Italic")}
        {btn(Heading, "formatBlock", "Heading", "<h3>")}
        {btn(List, "insertUnorderedList", "Bulleted list")}

        {/* Font colour */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setShowColors((v) => !v); }}
          className="p-1.5 rounded hover:opacity-80 transition-opacity"
          style={{ color: "#9dd8f5" }}
          title="Font colour"
        >
          <Palette size={13} />
        </button>
        {showColors && (
          <div
            className="absolute z-10 top-full left-0 mt-1 p-2 rounded-lg shadow-xl"
            style={{ background: "#0e1e30", border: "1px solid #1c3248", width: 168 }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="grid grid-cols-5 gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyColor(c.value); }}
                  title={c.label}
                  className="w-6 h-6 rounded transition-transform hover:scale-110"
                  style={{
                    background: c.value || "transparent",
                    border: c.value ? "1px solid #ffffff30" : "1px dashed #4a7090",
                  }}
                >
                  {!c.value && <span className="text-xs" style={{ color: "#9dd8f5" }}>A</span>}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 mt-2 pt-2 cursor-pointer"
              style={{ borderTop: "1px solid #1c3248" }}>
              <input
                type="color"
                defaultValue="#cce4ff"
                onChange={(e) => applyColor(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-5 h-5 p-0 bg-transparent border-0 cursor-pointer"
              />
              <span className="text-xs" style={{ color: "#9dd8f5" }}>Custom…</span>
            </label>
          </div>
        )}

        {/* Clear formatting (removes pasted colours/styles from the selection) */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); clearFormatting(); }}
          className="p-1.5 rounded hover:opacity-80 transition-opacity"
          style={{ color: "#9dd8f5" }}
          title="Clear formatting"
        >
          <Eraser size={13} />
        </button>

        {onUploadFile && (
          <>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
              disabled={uploadingFile}
              className="p-1.5 rounded hover:opacity-80 transition-opacity flex items-center gap-1"
              style={{ color: "#9dd8f5" }}
              title="Insert image or file — or drag & drop / paste a screenshot"
            >
              {uploadingFile ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
            </button>
            <input ref={fileInputRef} type="file" className="hidden"
              accept={FILE_ACCEPT}
              onChange={handleEditorFile} />
          </>
        )}
        <span className="text-xs ml-auto" style={{ color: "#4a7090" }}>Saves on click-away</span>
      </div>
      <div
        ref={ref}
        contentEditable
        onBlur={handleBlur}
        onPaste={handlePaste}
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

  // Which open panels are holding unsaved work. The drafts (comment body,
  // staged files, typed subtask…) live inside each TaskPanel, but the backdrop
  // that dismisses them all lives here — so panels report up.
  const [dirtyPanels, setDirtyPanels] = useState<string[]>([]);
  const [busyPanels, setBusyPanels] = useState<string[]>([]);
  const reportPanelState = useCallback((taskId: string, dirty: boolean, busy: boolean) => {
    const apply = (prev: string[], on: boolean) => {
      const has = prev.includes(taskId);
      if (on === has) return prev;
      return on ? [...prev, taskId] : prev.filter((x) => x !== taskId);
    };
    setDirtyPanels((prev) => apply(prev, dirty));
    setBusyPanels((prev) => apply(prev, busy));
  }, []);

  // Backdrop / ✕ / Done all go through this: an untouched drawer closes at
  // once, one holding an unposted comment or a typed-but-unadded subtask asks
  // first. Post-action closes (delete, archive, move) still call onClose
  // directly — the work is already committed, so there's nothing to protect.
  const { requestClose, guard } = useDiscardGuard({
    dirty: dirtyPanels.length > 0,
    busy: busyPanels.length > 0,
    onClose,
    title: "Close this task?",
    message: "You've got unsaved work here — a comment you haven't posted, a file you haven't attached, or an edit you haven't saved. Closing now will lose it.",
    discardLabel: "Close anyway",
  });

  // Side-by-side layout: drawers don't overlap
  const drawerWidth = stack.length === 1 ? 600 : stack.length === 2 ? 520 : 440;

  return (
    <>
      {guard}
      <div className="fixed inset-0 z-40" style={{ background: "#00000060" }} onClick={requestClose} />
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
                onRequestClose={requestClose}
                onDirtyChange={reportPanelState}
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
  task, projectId, isTop, canGoBack, depth, parentTask, onGoBack, onClose, onRequestClose, onDirtyChange, onOpenChild, liveStaff,
}: {
  task: Task;
  projectId: string;
  isTop: boolean;
  canGoBack: boolean;
  depth: number;
  parentTask?: Task;
  onGoBack: () => void;
  /** Close immediately — for after an action that already committed (delete, archive, move). */
  onClose: () => void;
  /** Close as a user gesture — confirms first if this panel holds unsaved work. */
  onRequestClose: () => void;
  /** Report unsaved-work / in-flight-upload state up to the stack's backdrop guard. */
  onDirtyChange: (taskId: string, dirty: boolean, busy: boolean) => void;
  onOpenChild: (task: Task) => void;
  liveStaff: LiveStaff[];
}) {
  const {
    updateTaskStatus, updateTaskPriority, updateTaskAssignee, updateTaskDescription,
    updateTaskTitle, updateTaskDueDate, updateTaskRecurring,
    addSubtask, updateSubtaskStatus, deleteTask, uploadTaskAttachment, deleteAttachment,
    requestTaskApproval, approveTaskCompletion, rejectTask, markTaskRejected, addNotification,
    markArticlePosted, setTaskRequiresArticlePost, setTaskIsArticle, setTaskDiscussionNote,
    requestTaskDeletion, approveTaskDeletion, rejectTaskDeletion,
    moveTaskToProject, archiveTask, projects,
  } = useStore();
  const { user } = useAuth();

  const isAdmin = user?.pmRole === "admin";
  const isMyTask = !!user?.id && task.assigneeId === user.id;
  // Staff may only request deletion of tasks THEY created (created_by = their uid).
  const isCreator = !!task.createdBy && task.createdBy === user?.id;
  // Nobody is on the hook for this task. Happens after revokeStaff reassigns a
  // revoked user's work and finds no live admin target (app/actions/invite.ts),
  // and on any task an admin clears the assignee on.
  const isUnassigned = !task.assigneeId;
  // Who may edit the title / description / due date / add child tasks.
  // Admins always; otherwise the assignee, the person who CREATED the task, or
  // anyone when it's unassigned. Creator and unassigned were missing, which left
  // staff staring at content they couldn't edit with no way to fix it — an
  // unassigned task was editable by admins ONLY, so a revocation could silently
  // freeze a whole project's tasks for every staff member.
  // Staff only ever reach tasks in projects they're assigned to, so this stays
  // inside the existing visibility boundary.
  const canEdit = isAdmin || isMyTask || isCreator || isUnassigned;
  const deletionPending = !!task.deletionRequestedBy;

  const [newSubtask, setNewSubtask] = useState("");
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState(task.assigneeId);
  const [description, setDescription] = useState(task.description);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [localPrio, setLocalPrio] = useState<number | null>(null);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [descEditing, setDescEditing] = useState(false);
  const [descDragActive, setDescDragActive] = useState(false);
  const [descUploading, setDescUploading] = useState(false);
  const [descSaving, setDescSaving] = useState(false);
  const [descSaveError, setDescSaveError] = useState<string | null>(null);
  const [commentDragActive, setCommentDragActive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteRequest, setConfirmDeleteRequest] = useState(false);
  const [deletionLoading, setDeletionLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [articleUrlDraft, setArticleUrlDraft] = useState("");
  const [articleFlagError, setArticleFlagError] = useState<string | null>(null);

  const [postingArticle, setPostingArticle] = useState(false);
  const [articlePostError, setArticlePostError] = useState<string | null>(null);
  // Admin's "to be discussed" reference note (task.discussionNote)
  const [noteDraft, setNoteDraft] = useState(task.discussionNote ?? "");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [confirmDeleteAttachmentId, setConfirmDeleteAttachmentId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep the discussion-note draft in sync when switching tasks or when the
  // status changes (leaving to_be_discussed clears the stored note).
  useEffect(() => {
    setNoteDraft(task.discussionNote ?? "");
    setNoteSaved(false);
    setNoteError(null);
  }, [task.id, task.status, task.discussionNote]);

  // ── Comments ─────────────────────────────────────────────────────────────
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [savingCommentEdit, setSavingCommentEdit] = useState(false);
  const [editCommentError, setEditCommentError] = useState<string | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
  const router = useRouter();
  // Comment edit history (admin + the comment's own author). Loaded on demand.
  const [openVersionsId, setOpenVersionsId] = useState<string | null>(null);
  const [versionsByComment, setVersionsByComment] = useState<Record<string, CommentVersion[]>>({});
  const [loadingVersionsId, setLoadingVersionsId] = useState<string | null>(null);
  // Task activity / audit log (admin only). Collapsed + lazy-loaded.
  const [showActivity, setShowActivity] = useState(false);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const commentFileRef = useRef<HTMLInputElement>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [pendingMentions, setPendingMentions] = useState<{ id: string; label: string }[]>([]);
  // @-mention state for the in-place comment EDIT textarea (mirrors the composer's)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [editMentionQuery, setEditMentionQuery] = useState<string | null>(null);
  const [editMentionIndex, setEditMentionIndex] = useState(0);
  const [editPendingMentions, setEditPendingMentions] = useState<{ id: string; label: string }[]>([]);

  // Compute mention candidates from current state (kept lean — derives from liveStaff)
  function mentionCandidatesFor(query: string | null): LiveStaff[] {
    if (query === null) return [];
    return liveStaff
      .filter((s) => {
        const id = staffAuthId(s);
        if (id === user?.id) return false;
        const q = query.toLowerCase();
        if (!q) return true;
        return staffName(s).toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      })
      .slice(0, 6);
  }
  const mentionCandidates = mentionCandidatesFor(mentionQuery);
  const editMentionCandidates = mentionCandidatesFor(editMentionQuery);

  useEffect(() => {
    let cancelled = false;
    setCommentsLoading(true);
    dbListTaskComments(task.id).then((rows) => {
      if (!cancelled) setComments(rows);
    }).finally(() => {
      if (!cancelled) setCommentsLoading(false);
    });
    return () => { cancelled = true; };
  }, [task.id]);

  // Newest comment first. `comments` stays in DB (chronological) order so posts
  // can append; only the render order is reversed.
  const commentsNewestFirst = useMemo(
    () => [...comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [comments],
  );

  // Detect "@token" immediately before cursor in textarea. Returns the token
  // (without @) and the start index of the @, or null if no active mention.
  function detectMentionToken(text: string, cursor: number): { token: string; start: number } | null {
    let i = cursor - 1;
    while (i >= 0) {
      const ch = text[i];
      if (ch === "@") {
        const before = i === 0 ? " " : text[i - 1];
        if (/\s|^$/.test(before) || i === 0) {
          return { token: text.slice(i + 1, cursor), start: i };
        }
        return null;
      }
      if (/\s/.test(ch)) return null;
      i--;
    }
    return null;
  }

  function handleCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    setCommentBody(text);
    const cursor = e.target.selectionStart ?? text.length;
    const mention = detectMentionToken(text, cursor);
    if (mention) {
      setMentionQuery(mention.token);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  }

  function insertMention(staff: LiveStaff) {
    const ta = commentTextareaRef.current;
    if (!ta) return;
    const text = commentBody;
    const cursor = ta.selectionStart ?? text.length;
    const mention = detectMentionToken(text, cursor);
    if (!mention) return;
    const label = staffName(staff).split(" ")[0] || staffName(staff);
    const before = text.slice(0, mention.start);
    const after = text.slice(cursor);
    const insertion = `@${label} `;
    const next = before + insertion + after;
    setCommentBody(next);
    const id = staffAuthId(staff);
    setPendingMentions((prev) => prev.some((m) => m.id === id) ? prev : [...prev, { id, label }]);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = before.length + insertion.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function handleCommentKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && mentionCandidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionCandidates[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handlePostComment();
    }
  }

  // ── @-mentions inside the in-place comment edit box ──────────────────────
  function handleEditCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    setEditingCommentBody(text);
    const cursor = e.target.selectionStart ?? text.length;
    const mention = detectMentionToken(text, cursor);
    if (mention) {
      setEditMentionQuery(mention.token);
      setEditMentionIndex(0);
    } else {
      setEditMentionQuery(null);
    }
  }

  function insertEditMention(staff: LiveStaff) {
    const ta = editTextareaRef.current;
    if (!ta) return;
    const text = editingCommentBody;
    const cursor = ta.selectionStart ?? text.length;
    const mention = detectMentionToken(text, cursor);
    if (!mention) return;
    const label = staffName(staff).split(" ")[0] || staffName(staff);
    const before = text.slice(0, mention.start);
    const after = text.slice(cursor);
    const insertion = `@${label} `;
    setEditingCommentBody(before + insertion + after);
    const id = staffAuthId(staff);
    setEditPendingMentions((prev) => prev.some((m) => m.id === id) ? prev : [...prev, { id, label }]);
    setEditMentionQuery(null);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = before.length + insertion.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function handleEditCommentKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, commentId: string) {
    if (editMentionQuery !== null && editMentionCandidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setEditMentionIndex((i) => (i + 1) % editMentionCandidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setEditMentionIndex((i) => (i - 1 + editMentionCandidates.length) % editMentionCandidates.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertEditMention(editMentionCandidates[editMentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setEditMentionQuery(null);
        return;
      }
    }
    if (e.key === "Escape") { e.preventDefault(); cancelEditComment(); return; }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSaveCommentEdit(commentId); }
  }

  // ── Inline comment images ──────────────────────────────────────────────────
  // Pasted/dropped images upload immediately and insert an [img:url] token at
  // the caret, so text and images interleave line-by-line (like chat).
  const [uploadingCommentImgs, setUploadingCommentImgs] = useState(0);

  // ── Unsaved-work guard ──────────────────────────────────────────────────────
  // What a stray backdrop click would silently bin. The comment draft is the
  // one that has actually cost someone their work before (CLAUDE.md Known
  // Recurring Mistake #12 — a pasted link, Enter, drawer closed, gone).
  const editingCommentOriginal = editingCommentId
    ? comments.find((c) => c.id === editingCommentId)?.body ?? ""
    : "";
  const panelDirty =
    commentBody.trim() !== ""
    || commentFiles.length > 0
    || (editingCommentId !== null && editingCommentBody !== editingCommentOriginal)
    || newSubtask.trim() !== ""
    || (titleEditing && titleDraft !== task.title)
    || articleUrlDraft.trim() !== ""
    || noteDraft !== (task.discussionNote ?? "");
  // The description editor commits on blur, so a click outside has already
  // saved it — only a write still in flight is worth refusing to close on.
  const panelBusy =
    uploading || descUploading || descSaving || postingComment
    || uploadingCommentImgs > 0 || postingArticle || noteSaving;

  useEffect(() => { onDirtyChange(task.id, panelDirty, panelBusy); }, [onDirtyChange, task.id, panelDirty, panelBusy]);
  // Stop vouching for a panel that's been closed/popped off the stack.
  useEffect(() => () => onDirtyChange(task.id, false, false), [onDirtyChange, task.id]);

  // Going Back pops THIS panel off the stack, which discards its draft just as
  // surely as closing the drawer — so it gets the same question, scoped to this
  // panel only (the stack's own guard covers the backdrop / ✕ / Done).
  const { requestClose: requestGoBack, guard: goBackGuard } = useDiscardGuard({
    dirty: panelDirty,
    busy: panelBusy,
    onClose: onGoBack,
    title: "Leave this subtask?",
    message: "You've got unsaved work here — a comment you haven't posted or an edit you haven't saved. Going back will lose it.",
    discardLabel: "Go back anyway",
  });

  async function insertCommentInlineImages(files: File[], target: "new" | "edit") {
    setUploadingCommentImgs((n) => n + files.length);
    for (const f of files) {
      try {
        const up = await uploadAttachment(f, task.id);
        const setBody = target === "new" ? setCommentBody : setEditingCommentBody;
        const ref = target === "new" ? commentTextareaRef : editTextareaRef;
        setBody((prev) => {
          const el = ref.current;
          const caret = el?.selectionStart ?? prev.length;
          const before = prev.slice(0, caret);
          const after = prev.slice(caret);
          const sep = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
          const insert = `${sep}[img:${up.url}]\n`;
          const pos = (before + insert).length;
          requestAnimationFrame(() => { const t = ref.current; if (t) { t.focus(); t.setSelectionRange(pos, pos); } });
          return before + insert + after;
        });
      } catch (err) {
        setCommentError(errorMessage(err));
      } finally {
        setUploadingCommentImgs((n) => n - 1);
      }
    }
  }

  function pastedImages(e: React.ClipboardEvent<HTMLTextAreaElement>): File[] {
    const out: File[] = [];
    for (const item of Array.from(e.clipboardData?.items ?? [])) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) out.push(f);
      }
    }
    return out;
  }

  // Paste images (e.g. screenshots) straight into the comment, inline at the caret.
  function handleCommentPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = pastedImages(e);
    if (pasted.length) {
      e.preventDefault();
      void insertCommentInlineImages(pasted, "new");
    }
  }

  function handleEditCommentPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = pastedImages(e);
    if (pasted.length) {
      e.preventDefault();
      void insertCommentInlineImages(pasted, "edit");
    }
  }

  async function handlePostComment() {
    const body = commentBody.trim();
    if (!body && commentFiles.length === 0) return;
    if (uploadingCommentImgs > 0) return; // wait for pasted images to finish uploading
    if (!user?.id) { setCommentError("You must be signed in to comment."); return; }
    setPostingComment(true);
    setCommentError(null);
    try {
      const attachments: CommentAttachment[] = [];
      for (const f of commentFiles) {
        const uploaded = await uploadAttachment(f, task.id);
        attachments.push({ url: uploaded.url, name: uploaded.name, size: f.size, type: uploaded.type });
      }
      // Keep only mentions whose label is still present in the body
      const activeMentions = pendingMentions.filter((m) => body.includes(`@${m.label}`));

      const inserted = await dbAddTaskComment({
        taskId: task.id, authorId: user.id, body,
        attachments,
        mentionedUserIds: activeMentions.map((m) => m.id),
      });
      if (!inserted) { setCommentError("Failed to post comment."); return; }
      setComments((prev) => [...prev, inserted]);
      setCommentBody("");
      setCommentFiles([]);
      setPendingMentions([]);
      if (commentFileRef.current) commentFileRef.current.value = "";

      // Only @-mentions trigger notifications — no generic "X commented" spam.
      // Staff who want someone to see their comment should @-mention them.
      const authorName = user.name ?? "Someone";
      for (const m of activeMentions) {
        if (m.id === user.id) continue;
        await addNotification({
          title: `${authorName} mentioned you in "${task.title}"`,
          body: body.replace(/\[img:[^\]\s]+\]/g, "📷").trim() || (attachments.length ? `Attached: ${attachments.map((a) => a.name).filter(Boolean).join(", ")}` : ""),
          type: "mention",
          projectId,
          taskId: task.id,
          userId: m.id,
          link: `/projects/${projectId}?task=${task.id}`,
        });
      }
    } catch (err: unknown) {
      const msg = errorMessage(err);
      setCommentError(msg || "Failed to post comment.");
    } finally {
      setPostingComment(false);
    }
  }

  async function handleDeleteComment(id: string) {
    await dbDeleteTaskComment(id);
    setComments((prev) => prev.filter((c) => c.id !== id));
    setConfirmDeleteCommentId(null);
  }

  // Jump to this project's chat channel with the task pre-referenced in the
  // composer (/chat?c=<conv>&ref=<taskId>) — keeps long discussions in Chat
  // instead of piling up as task comments.
  async function handleDiscussInChat() {
    // Prefer the readable project slug — the chat page resolves it to the
    // project's channel, keeping the URL human-friendly.
    const proj = projects.find((p) => p.id === projectId);
    if (proj?.slug) {
      router.push(`/chat?c=${proj.slug}&ref=${task.id}`);
      return;
    }
    setOpeningChat(true);
    try {
      const { data } = await supabase
        .from("pm_chat_conversations")
        .select("id")
        .eq("kind", "project")
        .eq("project_id", projectId)
        .limit(1)
        .maybeSingle();
      router.push(data?.id ? `/chat?c=${data.id}&ref=${task.id}` : "/chat");
    } finally {
      setOpeningChat(false);
    }
  }

  function startEditComment(c: TaskComment) {
    setEditingCommentId(c.id);
    setEditingCommentBody(c.body);
    setEditCommentError(null);
    // Seed with the comment's existing mentions (labels = first names, matching
    // what the composer inserts) so they stay persisted on save and are never
    // re-notified. Staff no longer active can't be resolved and drop off.
    setEditPendingMentions(
      c.mentionedUserIds.flatMap((id) => {
        const s = liveStaff.find((st) => staffAuthId(st) === id);
        if (!s) return [];
        const label = staffName(s).split(" ")[0] || staffName(s);
        return [{ id, label }];
      })
    );
    setEditMentionQuery(null);
    setEditMentionIndex(0);
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditingCommentBody("");
    setEditCommentError(null);
    setEditPendingMentions([]);
    setEditMentionQuery(null);
  }

  async function handleSaveCommentEdit(id: string) {
    const body = editingCommentBody.trim();
    const target = comments.find((c) => c.id === id);
    // Allow an empty body only when the comment still carries attachments.
    if (!body && !target?.attachments.length) { setEditCommentError("Comment can't be empty."); return; }
    if (savingCommentEdit) return;
    setSavingCommentEdit(true);
    setEditCommentError(null);
    try {
      // Keep only mentions whose label is still present in the edited body
      const activeMentions = editPendingMentions.filter((m) => body.includes(`@${m.label}`));
      const updated = await dbUpdateTaskComment(id, { body, mentionedUserIds: activeMentions.map((m) => m.id) });
      if (!updated) { setEditCommentError("Failed to save changes."); return; }
      setComments((prev) => prev.map((c) => (c.id === id ? updated : c)));

      // Notify ONLY mentions newly added by this edit — pre-existing ones never re-fire.
      const prevMentionIds = new Set(target?.mentionedUserIds ?? []);
      const authorName = user?.name ?? "Someone";
      for (const m of activeMentions) {
        if (m.id === user?.id || prevMentionIds.has(m.id)) continue;
        await addNotification({
          title: `${authorName} mentioned you in "${task.title}"`,
          body: body.replace(/\[img:[^\]\s]+\]/g, "📷").trim(),
          type: "mention",
          projectId,
          taskId: task.id,
          userId: m.id,
          link: `/projects/${projectId}?task=${task.id}`,
        });
      }
      cancelEditComment();
    } catch (err: unknown) {
      setEditCommentError(errorMessage(err) || "Failed to save changes.");
    } finally {
      setSavingCommentEdit(false);
    }
    // Refresh any open version history for this comment (the edit just archived one).
    if (openVersionsId === id) { setVersionsByComment((prev) => ({ ...prev, [id]: [] })); void loadCommentVersions(id, true); }
  }

  async function loadCommentVersions(commentId: string, force = false) {
    if (!force && versionsByComment[commentId]) return;
    setLoadingVersionsId(commentId);
    const rows = await dbListCommentVersions(commentId);
    setVersionsByComment((prev) => ({ ...prev, [commentId]: rows }));
    setLoadingVersionsId((cur) => (cur === commentId ? null : cur));
  }

  function toggleCommentVersions(commentId: string) {
    if (openVersionsId === commentId) { setOpenVersionsId(null); return; }
    setOpenVersionsId(commentId);
    void loadCommentVersions(commentId);
  }

  async function toggleActivity() {
    const next = !showActivity;
    setShowActivity(next);
    if (next && !activityLoaded) {
      setActivityLoading(true);
      const rows = await dbListTaskActivity(task.id);
      setActivity(rows);
      setActivityLoaded(true);
      setActivityLoading(false);
    }
  }

  // ── Activity formatting helpers (resolve codes → human labels) ──────────────
  function actorName(id: string | null): string {
    if (!id) return "System";
    const s = liveStaff.find((x) => staffAuthId(x) === id);
    return s ? staffName(s) : "Unknown user";
  }
  function activityFieldLabel(field: string | null): string {
    const map: Record<string, string> = {
      title: "title", status: "status", priority: "priority", assignee: "assignee",
      due_date: "due date", recurring: "recurring", tags: "tags", type: "type",
      project: "project", description: "description",
    };
    return field ? (map[field] ?? field) : "";
  }
  function activityValueLabel(field: string | null, v: string | null): string {
    if (v === null || v === "") return "—";
    if (field === "status") return statusOptions.find((o) => o.key === v)?.label ?? v;
    if (field === "priority") { const n = Number(v); return PRIORITY_LABELS[n] ?? v; }
    if (field === "assignee") return actorName(v);
    if (field === "project") return projects.find((p) => p.id === v)?.name ?? "another project";
    if (field === "due_date") { const d = new Date(v); return isNaN(d.getTime()) ? v : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
    return v;
  }
  function activitySentence(a: TaskActivity): string {
    if (a.action === "created") return "created this task";
    if (a.action === "deleted") return "deleted this task";
    if (a.action === "moved") return `moved this task to ${activityValueLabel("project", a.newValue)}`;
    if (a.field === "description") return "edited the description";
    if (a.field === "title") return `renamed to “${a.newValue ?? ""}”`;
    const fl = activityFieldLabel(a.field);
    const nv = activityValueLabel(a.field, a.newValue);
    if (!a.oldValue) return `set ${fl} to ${nv}`;
    return `changed ${fl} from ${activityValueLabel(a.field, a.oldValue)} to ${nv}`;
  }

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
      setConfirmReject(false);
    }
  }

  // Reject outright (closed, no redo) — distinct from handleReject's revision loop.
  async function handleMarkRejected() {
    setApprovalLoading(true);
    try {
      await markTaskRejected(projectId, task.id, task.title);
    } finally {
      setApprovalLoading(false);
      setConfirmReject(false);
    }
  }

  async function handleMarkPosted() {
    let url = articleUrlDraft.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      new URL(url);
    } catch {
      setArticlePostError("That doesn't look like a valid link — paste the full article URL.");
      return;
    }
    setArticlePostError(null);
    setPostingArticle(true);
    try {
      await markArticlePosted(projectId, task.id, task.title, user?.name ?? "Staff", url);
      setArticleUrlDraft("");
    } catch (e) {
      setArticlePostError(errorMessage(e));
    } finally {
      setPostingArticle(false);
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

  // Staff (creator) asks an admin to delete this task. Two-click confirm.
  async function handleRequestDeletion() {
    if (!confirmDeleteRequest) { setConfirmDeleteRequest(true); return; }
    setDeletionLoading(true);
    try {
      await requestTaskDeletion(projectId, task.id, user?.name ?? "A staff member", task.title);
      setConfirmDeleteRequest(false);
      if (canGoBack) onGoBack(); else onClose();
    } finally {
      setDeletionLoading(false);
    }
  }

  // Admin approves a pending deletion → the task is permanently removed.
  async function handleApproveDeletion() {
    setDeletionLoading(true);
    try {
      await approveTaskDeletion(projectId, task.id, task.title, task.deletionRequestedBy);
      if (canGoBack) onGoBack(); else onClose();
    } finally {
      setDeletionLoading(false);
    }
  }

  // Admin declines → clear the pending request, task stays.
  async function handleRejectDeletion() {
    setDeletionLoading(true);
    try {
      await rejectTaskDeletion(projectId, task.id, task.title, task.deletionRequestedBy);
    } finally {
      setDeletionLoading(false);
    }
  }

  // Drop files onto the read-only description (editor closed): upload each and
  // append to the saved description. When the editor is open the RichEditor
  // handles drops itself (inserting at the cursor), so this path only runs while
  // not editing — meaning task.description is the source of truth and nothing
  // unsaved gets clobbered.
  async function handleDescriptionDropFiles(files: File[]) {
    if (!canEdit || files.length === 0) return;
    setDescUploading(true);
    setUploadError(null);
    try {
      let html = task.description
        ? (isHtml(task.description) ? task.description : plainToHtml(task.description))
        : "";
      for (const file of files) {
        const uploaded = await uploadAttachment(file, task.id);
        html += uploaded.type === "image"
          ? imgHtml(uploaded.url, uploaded.name)
          : `<a href="${escapeHtml(uploaded.url)}" target="_blank" rel="noreferrer">📎 ${escapeHtml(uploaded.name)}</a><br>`;
      }
      await updateTaskDescription(projectId, task.id, sanitizeHtml(html));
    } catch (err: unknown) {
      setUploadError(errorMessage(err) || "Upload failed. Please try again.");
    } finally {
      setDescUploading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (!files.length) return;
    setUploadError(null);

    // Reject oversized files up front with a message that names the file and its
    // size, instead of letting storage return an opaque error mid-batch.
    const tooBig = files.filter((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig.length) {
      setUploadError(
        `${tooBig.map((f) => `${f.name} (${formatBytes(f.size)})`).join(", ")} ` +
        `${tooBig.length > 1 ? "are" : "is"} over the ${MAX_UPLOAD_MB} MB limit and ${tooBig.length > 1 ? "were" : "was"} not uploaded.`
      );
    }
    const toUpload = files.filter((f) => f.size <= MAX_UPLOAD_BYTES);
    if (!toUpload.length) return;

    setUploading(true);
    const uploadedBy = user?.id ?? "";
    // Report per-file so one bad file doesn't discard the whole batch.
    const failed: string[] = [];
    for (const file of toUpload) {
      try {
        await uploadTaskAttachment(projectId, task.id, file, uploadedBy);
      } catch (err: unknown) {
        console.error("attachment upload failed", file.name, err);
        failed.push(`${file.name} (${errorMessage(err)})`);
      }
    }
    if (failed.length) {
      setUploadError((prev) => [prev, `Couldn't upload ${failed.join(", ")}`].filter(Boolean).join(" "));
    }
    setUploading(false);
  }

  return (
    <div className="flex flex-col h-full">
      {goBackGuard}
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
          <button onClick={requestGoBack} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: "#4a7090" }}>
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
            {/* Staff who created the task: request deletion (needs admin approval) */}
            {!isAdmin && isCreator && !deletionPending && (
              <button
                onClick={handleRequestDeletion}
                disabled={deletionLoading}
                title="Request deletion — an admin must approve"
                className="p-1.5 rounded-lg hover:opacity-70 text-xs flex items-center gap-1"
                style={{ color: confirmDeleteRequest ? "#ef4444" : "#4a7090", opacity: deletionLoading ? 0.6 : 1 }}
              >
                <Trash2 size={14} /> {confirmDeleteRequest ? "Request?" : ""}
              </button>
            )}
            {!isAdmin && deletionPending && (
              <span className="text-[11px] font-semibold px-2 py-1 rounded-lg" style={{ background: "#ef444418", border: "1px solid #ef444440", color: "#f87171" }} title="Awaiting admin approval">
                Deletion requested
              </span>
            )}
            <button onClick={onRequestClose} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "#4a7090" }}>
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
                  .filter((s) => isAdmin || (s.key !== "to_be_discussed" && s.key !== "pending_review" && s.key !== "pending_client_approval" && s.key !== "pending_article_post" && s.key !== "revision_required" && s.key !== "done" && s.key !== "missed" && s.key !== "rejected"))
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
            {/* When it entered this status — tells a NEW review submission from an old one */}
            {task.statusChangedAt && (
              <p className="text-xs mt-1" style={{ color: "#4a7090" }}>
                since {new Date(task.statusChangedAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
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

          {/* Added (created date) — read-only */}
          {task.createdAt && (
            <div>
              <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Added</p>
              <p className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#8b90a7" }}>
                {new Date(task.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          )}

          {/* Article link — permanent record once posted */}
          {task.articleUrl && (
            <div>
              <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Article Link</p>
              <a
                href={task.articleUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:opacity-80 transition-opacity"
                style={{ background: "#0e1e30", border: "1px solid #22c55e40", color: "#22c55e" }}
                title={task.articleUrl}
              >
                <ExternalLink size={13} className="shrink-0" />
                <span className="truncate">{task.articleUrl.replace(/^https?:\/\//i, "")}</span>
              </a>
            </div>
          )}

          {/* Admin: count this task on the Articles sheet (/articles and the
              project's Articles tab). Identity for the sheet is this flag and
              nothing else — titles are never matched. */}
          {isAdmin && (
            <div>
              <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Articles Sheet</p>
              <button
                onClick={() => { setArticleFlagError(null); setTaskIsArticle(projectId, task.id, !task.isArticle).catch((e) => setArticleFlagError(errorMessage(e))); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-sm font-medium"
                style={{ background: "#0e1e30", border: `1px solid ${task.isArticle ? "#38b6e840" : "#1c3248"}`, color: task.isArticle ? "#38b6e8" : "#4a7090" }}
                title="When on, this task is counted as an article on the Articles page and the project's Articles tab"
              >
                <span className="w-4 h-4 rounded flex items-center justify-center border shrink-0"
                  style={{ borderColor: task.isArticle ? "#38b6e8" : "#4a7090", background: task.isArticle ? "#38b6e8" : "transparent" }}>
                  {task.isArticle && <Check size={11} color="#fff" />}
                </span>
                {task.isArticle ? "Counted as an article" : "Not an article"}
              </button>
              {articleFlagError && (
                <p className="text-xs mt-1" style={{ color: "#ef4444" }}>Not saved — {articleFlagError}</p>
              )}
            </div>
          )}

          {/* Admin: require a live article link before this task can complete */}
          {isAdmin && (
            <div>
              <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Article Post</p>

              <button
                onClick={() => setTaskRequiresArticlePost(projectId, task.id, !task.requiresArticlePost)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-sm font-medium"
                style={{ background: "#0e1e30", border: `1px solid ${task.requiresArticlePost ? "#f9731640" : "#1c3248"}`, color: task.requiresArticlePost ? "#f97316" : "#4a7090" }}
                title="When on, approving this task parks it in Pending Article Post until the assignee adds the live article link"
              >
                <span className="w-4 h-4 rounded flex items-center justify-center border shrink-0"
                  style={{ borderColor: task.requiresArticlePost ? "#f97316" : "#4a7090", background: task.requiresArticlePost ? "#f97316" : "transparent" }}>
                  {task.requiresArticlePost && <Check size={11} color="#fff" />}
                </span>
                {task.requiresArticlePost ? "Link required" : "Not required"}
              </button>
            </div>
          )}

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

        {/* Admin discussion note — only while parked in "To Be Discussed".
            The note is transient by design: the DB trigger (mirrored by
            statusPatch) clears it as soon as the status moves on. */}
        {isAdmin && task.status === "to_be_discussed" && (
          <div className="rounded-lg p-3 flex flex-col gap-2"
            style={{ background: "#06b6d410", border: "1px solid #06b6d440" }}>
            <div className="flex items-center gap-2">
              <MessageSquare size={14} style={{ color: "#06b6d4" }} />
              <p className="text-sm font-semibold" style={{ color: "#06b6d4" }}>Discussion note</p>
            </div>
            <textarea
              value={noteDraft}
              onChange={(e) => { setNoteDraft(e.target.value); setNoteSaved(false); }}
              placeholder="What do you want to discuss? (only you and other admins see this)"
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-y"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setNoteSaving(true);
                  setNoteError(null);
                  try {
                    await setTaskDiscussionNote(projectId, task.id, noteDraft);
                    setNoteSaved(true);
                  } catch (err) {
                    setNoteError(errorMessage(err) || "Failed to save note.");
                  } finally {
                    setNoteSaving(false);
                  }
                }}
                disabled={noteSaving || (noteDraft.trim() === (task.discussionNote ?? ""))}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40"
                style={{ background: "#06b6d4", color: "#04222c" }}
              >
                {noteSaving ? "Saving…" : "Save note"}
              </button>
              {noteSaved && <span className="text-xs" style={{ color: "#22c55e" }}>✓ Saved</span>}
              <span className="text-xs ml-auto" style={{ color: "#4a7090" }}>
                Cleared automatically when the status changes
              </span>
            </div>
            {noteError && <p className="text-xs" style={{ color: "#ef4444" }}>⚠ {noteError}</p>}
          </div>
        )}

        {/* Move to another project (admin, top-level task only) */}
        {isAdmin && !task.parentId && (
          <div className="relative">
            <p className="text-xs mb-1.5" style={{ color: "#4a7090" }}>Move to another project</p>
            <button
              onClick={() => { setShowMoveMenu(!showMoveMenu); setShowStatusMenu(false); setShowPriorityMenu(false); setShowAssigneeMenu(false); }}
              disabled={moving}
              className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-sm"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff", opacity: moving ? 0.6 : 1 }}
            >
              <span className="truncate flex-1 text-left">
                {projects.find((p) => p.id === projectId)?.name ?? "Unknown project"}
              </span>
              <span className="text-xs shrink-0" style={{ color: "#4a7090" }}>Move task</span>
              {moving
                ? <Loader2 size={13} className="animate-spin shrink-0" style={{ color: "#4a7090" }} />
                : <ChevronDown size={13} className="shrink-0" style={{ color: "#4a7090" }} />}
            </button>
            {showMoveMenu && (
              <div className="absolute top-full left-0 mt-1 w-full rounded-lg overflow-hidden z-20 shadow-lg max-h-72 overflow-y-auto"
                style={{ background: "#0e1e30", border: "1px solid #1c3248" }}>
                {projects.filter((p) => p.id !== projectId).length === 0 && (
                  <p className="px-3 py-2.5 text-xs" style={{ color: "#4a7090" }}>No other projects available.</p>
                )}
                {projects.filter((p) => p.id !== projectId).map((p) => (
                  <button key={p.id}
                    className="w-full px-3 py-2.5 text-sm text-left hover:opacity-80"
                    style={{ color: "#cce4ff" }}
                    onClick={async () => {
                      setShowMoveMenu(false);
                      setMoveError(null);
                      setMoving(true);
                      try {
                        await moveTaskToProject(projectId, task.id, p.id);
                        onClose();
                      } catch (err) {
                        const msg = errorMessage(err);
                        setMoveError(msg || "Failed to move task.");
                      } finally {
                        setMoving(false);
                      }
                    }}>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            {moveError && (
              <p className="text-xs mt-1.5 px-1" style={{ color: "#ef4444" }}>⚠ {moveError}</p>
            )}
            {task.subtasks.length > 0 && (
              <p className="text-xs mt-1.5 px-1" style={{ color: "#4a7090" }}>
                Subtasks ({task.subtasks.length}) will move with this task.
              </p>
            )}
          </div>
        )}

        {/* Description */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: "#4a7090" }}>DESCRIPTION</p>
          {descEditing ? (
            <RichEditor
              key={task.id}
              initialHtml={task.description}
              onSave={(html) => {
                // Must be reported, not fire-and-forget. This save previously
                // dropped its promise while dbUpdateTask discarded the error, so
                // a failed save (e.g. an oversized description) looked fine until
                // the next refresh silently reverted it — losing uploaded images.
                if (html !== task.description) {
                  setDescSaveError(null);
                  setDescSaving(true);
                  updateTaskDescription(projectId, task.id, html)
                    .catch((err) => {
                      console.error("description save failed", err);
                      setDescSaveError(errorMessage(err) || "Couldn't save the description.");
                    })
                    .finally(() => setDescSaving(false));
                }
                setDescEditing(false);
              }}
              onUploadFile={async (file) => {
                try {
                  return await uploadAttachment(file, task.id);
                } catch (err) {
                  console.error("description upload failed", err);
                  return null;
                }
              }}
            />
          ) : (
            <div
              onClick={() => canEdit && !descUploading && setDescEditing(true)}
              onDragOver={(e) => {
                if (!canEdit || !Array.from(e.dataTransfer?.types ?? []).includes("Files")) return;
                e.preventDefault();
                setDescDragActive(true);
              }}
              onDragLeave={() => setDescDragActive(false)}
              onDrop={(e) => {
                if (!canEdit) return;
                const files = Array.from(e.dataTransfer?.files ?? []);
                if (!files.length) return;
                e.preventDefault();
                setDescDragActive(false);
                void handleDescriptionDropFiles(files);
              }}
              className="rounded-lg p-3 min-h-20 relative"
              style={{
                background: "#0e1e30",
                border: `1px ${descDragActive ? "dashed" : "solid"} ${descDragActive ? "#38b6e8" : "#1c3248"}`,
                cursor: canEdit ? "text" : "default",
              }}
            >
              {task.description ? (
                isHtml(task.description)
                  ? <div className="rich-content text-sm leading-relaxed" style={{ color: "#cce4ff" }}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(task.description) }} />
                  : <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: "#cce4ff" }}>{task.description}</p>
              ) : (
                <p className="text-sm" style={{ color: "#8b90a750" }}>
                  {canEdit ? "Click to add a description, or drag & drop / paste an image..." : "No description."}
                </p>
              )}
              {(descDragActive || descUploading) && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none"
                  style={{ background: "#0e1e30d0", border: "2px dashed #38b6e8" }}>
                  <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#9dd8f5" }}>
                    {descUploading
                      ? <><Loader2 size={13} className="animate-spin" /> Uploading…</>
                      : <><Paperclip size={13} /> Drop image to add to description</>}
                  </span>
                </div>
              )}
            </div>
          )}
          {descSaving && (
            <p className="text-xs mt-1.5 flex items-center gap-1.5" style={{ color: "#4a7090" }}>
              <Loader2 size={11} className="animate-spin" /> Saving description…
            </p>
          )}
          {descSaveError && (
            <div className="mt-1.5 rounded-lg px-2.5 py-2 text-xs" style={{ background: "#ef444415", border: "1px solid #ef444440", color: "#fca5a5" }}>
              ⚠ Description not saved — {descSaveError}
              <br />
              <span style={{ color: "#ef9a9a" }}>Copy your text before closing this task, then try again.</span>
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
                        // "missed" tombstones and admin rejections are a permanent
                        // record — only admins may reopen.
                        if ((sub.status === "missed" || sub.status === "rejected") && !isAdmin) return;
                        // pending_article_post completes via the child's Mark-as-Posted
                        // panel (link required) — staff can't shortcut it here.
                        // to_be_discussed is admin-parked — staff can't move it either.
                        if ((sub.status === "pending_article_post" || sub.status === "to_be_discussed") && !isAdmin) { onOpenChild(sub); return; }
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
                        // "missed" tombstones and admin rejections are a permanent
                        // record — only admins may reopen.
                        if ((sub.status === "missed" || sub.status === "rejected") && !isAdmin) return;
                        // pending_article_post is resolved via the child's link panel;
                        // to_be_discussed is admin-parked — staff can't cycle either.
                        if ((sub.status === "pending_article_post" || sub.status === "to_be_discussed") && !isAdmin) { onOpenChild(sub); return; }
                        const staffOrder: TaskStatus[] = ["todo", "in_progress", "pending_review"];
                        const adminOrder: TaskStatus[] = ["todo", "in_progress", "pending_review", "pending_client_approval", "revision_required", "done"];
                        const order = isAdmin ? adminOrder : staffOrder;
                        const idx = order.indexOf(sub.status as TaskStatus);
                        const next = order[(idx === -1 ? 0 : idx + 1) % order.length];
                        updateSubtaskStatus(projectId, task.id, sub.id, next);
                      }}
                      className="text-xs px-1.5 py-0.5 rounded-full shrink-0 hover:opacity-70 transition-opacity"
                      style={{ background: subStatus.color + "20", color: subStatus.color }}
                      title={sub.statusChangedAt ? `${subStatus.label} since ${new Date(sub.statusChangedAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : undefined}
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
                        {att.size}
                        {att.uploadedAt && ` · ${new Date(att.uploadedAt).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`}
                        {isImage ? " · click to preview" : ""}
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

        {/* Comments */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={13} style={{ color: "#4a7090" }} />
            <p className="text-xs font-semibold" style={{ color: "#4a7090" }}>
              COMMENTS{comments.length > 0 ? ` · ${comments.length}` : ""}
            </p>
            <div className="flex-1" />
            <button
              onClick={handleDiscussInChat}
              disabled={openingChat}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
              style={{ background: "#f472b615", color: "#f472b6", border: "1px solid #f472b635", opacity: openingChat ? 0.6 : 1 }}
              title="Open the project chat with this task referenced — keeps discussion in one place"
            >
              {openingChat ? <Loader2 size={11} className="animate-spin" /> : <MessageSquare size={11} />}
              Discuss in Chat →
            </button>
          </div>

          {/* Composer sits above the list: comments are newest-first, so a new
              post appears directly below it instead of at the far end. */}
          <div
            className="flex flex-col gap-2 px-3 py-2.5 rounded-lg relative"
            style={{ background: "#0e1e30", border: `1px ${commentDragActive ? "dashed" : "solid"} ${commentDragActive ? "#38b6e8" : "#1c3248"}` }}
            onDragOver={(e) => {
              if (!Array.from(e.dataTransfer?.types ?? []).includes("Files")) return;
              e.preventDefault();
              setCommentDragActive(true);
            }}
            onDragLeave={() => setCommentDragActive(false)}
            onDrop={(e) => {
              const files = Array.from(e.dataTransfer?.files ?? []);
              if (!files.length) return;
              e.preventDefault();
              setCommentDragActive(false);
              const imgs = files.filter((f) => f.type.startsWith("image/"));
              if (imgs.length) void insertCommentInlineImages(imgs, "new");
              const others = files.filter((f) => !f.type.startsWith("image/"));
              if (others.length) setCommentFiles((prev) => [...prev, ...others]);
            }}
          >
            {commentDragActive && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg pointer-events-none"
                style={{ background: "#0e1e30d0", border: "2px dashed #38b6e8" }}>
                <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#9dd8f5" }}>
                  <Paperclip size={13} /> Drop images to attach
                </span>
              </div>
            )}
            <textarea
              ref={commentTextareaRef}
              value={commentBody}
              onChange={handleCommentChange}
              onKeyDown={handleCommentKeyDown}
              onPaste={handleCommentPaste}
              onBlur={() => setTimeout(() => setMentionQuery(null), 150)}
              placeholder="Leave a comment, ask a question, or @mention someone... (paste images anywhere — they appear inline)"
              rows={6}
              className="bg-transparent text-sm outline-none resize-y"
              style={{ color: "#cce4ff", minHeight: 110 }}
            />
            {mentionQuery !== null && mentionCandidates.length > 0 && (
              <MentionDropdown
                candidates={mentionCandidates}
                activeIndex={mentionIndex}
                onPick={insertMention}
                className="absolute left-2 top-full mt-1"
              />
            )}
            {commentFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {commentFiles.map((f, fi) => {
                  const isImg = f.type.startsWith("image/");
                  return isImg ? (
                    <div key={fi} className="relative rounded-lg overflow-hidden" style={{ border: "1px solid #1c3248" }}>
                      <img src={window.URL.createObjectURL(f)} alt={f.name} className="object-cover" style={{ width: 72, height: 72 }} />
                      <button
                        onClick={() => setCommentFiles((prev) => prev.filter((_, idx) => idx !== fi))}
                        className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: "#000000a0", color: "#fff" }} title="Remove">
                        <X size={9} />
                      </button>
                    </div>
                  ) : (
                    <div key={fi} className="flex items-center gap-2 px-2 py-1 rounded text-xs"
                      style={{ background: "#0a1626", color: "#cce4ff", border: "1px solid #1c3248" }}>
                      <Paperclip size={11} style={{ color: "#38b6e8" }} />
                      <span className="truncate max-w-[160px]">{f.name}</span>
                      <button onClick={() => setCommentFiles((prev) => prev.filter((_, idx) => idx !== fi))}
                        style={{ color: "#ef4444" }} title="Remove"><X size={11} /></button>
                    </div>
                  );
                })}
              </div>
            )}
            {uploadingCommentImgs > 0 && (
              <p className="text-xs flex items-center gap-1.5" style={{ color: "#38b6e8" }}>
                <Loader2 size={11} className="animate-spin" /> Uploading image{uploadingCommentImgs > 1 ? "s" : ""}…
              </p>
            )}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80"
                style={{ color: "#4a7090" }}>
                <Paperclip size={12} />
                Attach files
                <input ref={commentFileRef} type="file" className="hidden" multiple
                  accept={FILE_ACCEPT}
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? []);
                    const imgs = picked.filter((f) => f.type.startsWith("image/"));
                    if (imgs.length) void insertCommentInlineImages(imgs, "new");
                    const others = picked.filter((f) => !f.type.startsWith("image/"));
                    if (others.length) setCommentFiles((prev) => [...prev, ...others]);
                    e.target.value = "";
                  }} />
              </label>
              <div className="flex-1" />
              <button onClick={handlePostComment}
                disabled={postingComment || uploadingCommentImgs > 0 || (!commentBody.trim() && commentFiles.length === 0)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  background: "#38b6e8", color: "#fff",
                  opacity: postingComment || uploadingCommentImgs > 0 || (!commentBody.trim() && commentFiles.length === 0) ? 0.5 : 1,
                }}>
                {postingComment ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                Post
              </button>
            </div>
          </div>
          {commentError && (
            <p className="text-xs mt-1.5 px-1" style={{ color: "#ef4444" }}>⚠ {commentError}</p>
          )}

          {commentsLoading && comments.length === 0 && (
            <p className="text-xs px-1" style={{ color: "#4a7090" }}>Loading comments...</p>
          )}

          {commentsNewestFirst.length > 0 && (
            <div className="flex flex-col gap-2 mt-3">
              {commentsNewestFirst.map((c) => {
                const author = liveStaff.find((s) => staffAuthId(s) === c.authorId);
                const initials = author ? staffInitials(author).charAt(0) : "?";
                const name = author ? staffName(author) : "Unknown";
                const canDelete = c.authorId === user?.id || isAdmin;
                const canEditOwn = c.authorId === user?.id; // only the author may edit their own words
                const isEditing = editingCommentId === c.id;
                const imageAtts = c.attachments.filter((a) => a.type === "image");
                const fileAtts = c.attachments.filter((a) => a.type !== "image");
                return (
                  <div key={c.id} className="flex gap-2.5 px-3 py-2.5 rounded-lg group"
                    style={{ background: "#0e1e30", border: "1px solid #1c3248" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "#38b6e8", color: "#fff" }}>{initials}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold" style={{ color: "#cce4ff" }}>{name}</p>
                        <p className="text-xs" style={{ color: "#8b90a750" }}>
                          {new Date(c.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          {c.editedAt && (
                            (isAdmin || canEditOwn) ? (
                              <button
                                onClick={() => toggleCommentVersions(c.id)}
                                className="inline-flex items-center gap-1 hover:underline align-baseline"
                                style={{ color: "#8b90a7" }}
                                title="View edit history"
                              >
                                <span> · </span><History size={9} />
                                edited{openVersionsId === c.id ? " ▴" : ""}
                              </button>
                            ) : (
                              <span title={`Edited ${new Date(c.editedAt).toLocaleString()}`}> · edited</span>
                            )
                          )}
                        </p>
                      </div>

                      {/* Comment edit history (admin + author). Prior bodies, oldest first. */}
                      {openVersionsId === c.id && (
                        <div className="mb-2 rounded-lg overflow-hidden" style={{ border: "1px solid #1c3248", background: "#0a1626" }}>
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{ borderBottom: "1px solid #1c3248" }}>
                            <History size={10} style={{ color: "#4a7090" }} />
                            <p className="text-xs font-semibold" style={{ color: "#4a7090" }}>EDIT HISTORY</p>
                          </div>
                          {loadingVersionsId === c.id && !versionsByComment[c.id] ? (
                            <p className="text-xs px-2.5 py-2" style={{ color: "#4a7090" }}>Loading…</p>
                          ) : (versionsByComment[c.id]?.length ?? 0) === 0 ? (
                            <p className="text-xs px-2.5 py-2" style={{ color: "#4a7090" }}>No earlier versions found.</p>
                          ) : (
                            <div className="flex flex-col">
                              {versionsByComment[c.id]!.map((v, i) => (
                                <div key={v.id} className="px-2.5 py-2" style={{ borderBottom: "1px solid #12283e" }}>
                                  <p className="text-[10px] mb-0.5 flex items-center gap-1" style={{ color: "#4a7090" }}>
                                    <span className="px-1.5 rounded" style={{ background: "#12283e", color: "#8b90a7" }}>
                                      {i === 0 ? "Original" : `Revision ${i}`}
                                    </span>
                                    <Clock size={9} />
                                    replaced {new Date(v.supersededAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                  <p className="text-xs whitespace-pre-wrap break-words" style={{ color: "#9fb6cf" }}>
                                    {v.body || <span style={{ color: "#4a7090", fontStyle: "italic" }}>(empty)</span>}
                                  </p>
                                </div>
                              ))}
                              <div className="px-2.5 py-2">
                                <p className="text-[10px] mb-0.5 flex items-center gap-1" style={{ color: "#4a7090" }}>
                                  <span className="px-1.5 rounded" style={{ background: "#16351f", color: "#4ade80" }}>Current</span>
                                  {c.editedAt && (<><Clock size={9} />edited {new Date(c.editedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</>)}
                                </p>
                                <p className="text-xs whitespace-pre-wrap break-words" style={{ color: "#cce4ff" }}>
                                  {c.body || <span style={{ color: "#4a7090", fontStyle: "italic" }}>(empty)</span>}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <div className="relative">
                            <textarea
                              ref={editTextareaRef}
                              autoFocus
                              value={editingCommentBody}
                              onChange={handleEditCommentChange}
                              onKeyDown={(e) => handleEditCommentKeyDown(e, c.id)}
                              onPaste={handleEditCommentPaste}
                              onBlur={() => setTimeout(() => setEditMentionQuery(null), 150)}
                              placeholder="Edit your comment... type @ to mention someone, paste images inline"
                              rows={6}
                              className="w-full px-2.5 py-2 rounded-lg text-sm outline-none resize-y block"
                              style={{ background: "#0a1626", border: "1px solid #38b6e8", color: "#cce4ff", minHeight: 110 }}
                            />
                            {editMentionQuery !== null && editMentionCandidates.length > 0 && (
                              <MentionDropdown
                                candidates={editMentionCandidates}
                                activeIndex={editMentionIndex}
                                onPick={insertEditMention}
                                className="absolute left-0 bottom-full mb-1"
                              />
                            )}
                          </div>
                          {editCommentError && (
                            <p className="text-xs" style={{ color: "#ef4444" }}>⚠ {editCommentError}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveCommentEdit(c.id)}
                              disabled={savingCommentEdit}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                              style={{ background: "#38b6e8", color: "#fff", opacity: savingCommentEdit ? 0.6 : 1 }}
                            >
                              {savingCommentEdit ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                              Save
                            </button>
                            <button
                              onClick={cancelEditComment}
                              disabled={savingCommentEdit}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium"
                              style={{ background: "#1c3248", color: "#cce4ff" }}
                            >
                              Cancel
                            </button>
                            <span className="text-xs ml-auto" style={{ color: "#4a7090" }}>⌘/Ctrl+Enter to save</span>
                          </div>
                        </div>
                      ) : (
                        c.body && (
                          <div className="text-sm whitespace-pre-wrap break-words" style={{ color: "#cce4ff" }}>
                            <CommentBody body={c.body} onOpenImage={(url) => setImagePreviewUrl(url)} />
                          </div>
                        )
                      )}
                      {/* Image attachments — thumbnails, click to enlarge */}
                      {imageAtts.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {imageAtts.map((a, ai) => (
                            <button key={ai} onClick={() => setImagePreviewUrl(a.url)}
                              className="rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                              style={{ border: "1px solid #1c3248" }}
                              title={a.name ? `${a.name} — click to enlarge` : "Click to enlarge"}>
                              <img src={a.url} alt={a.name ?? ""}
                                className="object-cover"
                                style={{ width: imageAtts.length === 1 ? 220 : 108, height: imageAtts.length === 1 ? 150 : 108 }} />
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Non-image attachments — file chips */}
                      {fileAtts.map((a, ai) => (
                        <div key={ai} className="mt-1.5 flex items-center gap-2 px-2 py-1.5 rounded-lg"
                          style={{ background: "#0a1626", border: "1px solid #1c3248" }}>
                          <FileText size={13} style={{ color: "#38b6e8" }} />
                          <p className="text-xs flex-1 truncate" style={{ color: "#cce4ff" }}>{a.name}</p>
                          <a href={a.url} target="_blank" rel="noreferrer"
                            className="p-1 rounded hover:opacity-70" style={{ color: "#4a7090" }} title="Open">
                            <ExternalLink size={11} />
                          </a>
                          <a href={a.url} download={a.name ?? "file"}
                            className="p-1 rounded hover:opacity-70" style={{ color: "#38b6e8" }} title="Download">
                            <Download size={11} />
                          </a>
                        </div>
                      ))}
                    </div>
                    {!isEditing && (canEditOwn || canDelete) && (
                      <div className="flex items-center gap-0.5 self-start opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEditOwn && (
                          <button onClick={() => startEditComment(c)}
                            className="p-1 rounded-lg hover:opacity-70"
                            style={{ color: "#4a7090" }} title="Edit comment">
                            <Pencil size={12} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setConfirmDeleteCommentId(c.id)}
                            className="p-1 rounded-lg hover:opacity-70"
                            style={{ color: "#ef4444" }} title="Delete comment">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
              <p className="text-xs" style={{ color: "#8b90a750" }}>Images, videos, PDFs, Word docs, text files · max 50 MB</p>
            </div>
            <input ref={fileRef} type="file" className="hidden" multiple
              accept={FILE_ACCEPT}
              onChange={handleFileChange}
              disabled={uploading} />
          </label>
          {uploadError && (
            <p className="text-xs mt-1.5 px-1" style={{ color: "#ef4444" }}>⚠ {uploadError}</p>
          )}
        </div>

        {/* Activity log (admin only) — every add/edit is recorded server-side */}
        {isAdmin && (
          <div>
            <button
              onClick={toggleActivity}
              className="flex items-center gap-2 w-full mb-2"
              title="Who changed what, and when"
            >
              <History size={13} style={{ color: "#4a7090" }} />
              <p className="text-xs font-semibold" style={{ color: "#4a7090" }}>
                ACTIVITY{activityLoaded && activity.length > 0 ? ` · ${activity.length}` : ""}
              </p>
              {showActivity ? <ChevronDown size={13} style={{ color: "#4a7090" }} /> : <ChevronRight size={13} style={{ color: "#4a7090" }} />}
            </button>
            {showActivity && (
              activityLoading ? (
                <p className="text-xs px-1" style={{ color: "#4a7090" }}>Loading activity…</p>
              ) : activity.length === 0 ? (
                <p className="text-xs px-1" style={{ color: "#4a7090" }}>No changes recorded yet.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {activity.map((a) => (
                    <div key={a.id} className="flex gap-2 px-3 py-2 rounded-lg"
                      style={{ background: "#0e1e30", border: "1px solid #1c3248" }}>
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                        style={{ background: a.action === "created" ? "#22c55e" : a.action === "deleted" ? "#ef4444" : a.action === "moved" ? "#a855f7" : "#38b6e8" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs" style={{ color: "#cce4ff" }}>
                          <span className="font-semibold">{actorName(a.actorId)}</span>{" "}
                          <span style={{ color: "#9fb6cf" }}>{activitySentence(a)}</span>
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: "#4a7090" }}>
                          {new Date(a.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
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

      {/* Delete comment confirmation */}
      {confirmDeleteCommentId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "#000000b0" }}>
          <div className="rounded-2xl p-6 flex flex-col gap-4 w-72"
            style={{ background: "#0f1d2e", border: "1px solid #1c3248", boxShadow: "0 16px 48px #00000060" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#ef444420" }}>
                <Trash2 size={18} style={{ color: "#ef4444" }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "#cce4ff" }}>Delete comment?</p>
                <p className="text-xs mt-0.5" style={{ color: "#4a7090" }}>This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDeleteCommentId(null)}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ background: "#1c3248", color: "#cce4ff" }}>Cancel</button>
              <button onClick={() => handleDeleteComment(confirmDeleteCommentId)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "#ef4444", color: "#fff" }}>Delete</button>
            </div>
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
                  setUploadError(null);
                  deleteAttachment(projectId, task.id, confirmDeleteAttachmentId)
                    .catch((err) => setUploadError(errorMessage(err) || "Couldn't delete the attachment."));
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
        {/* Admin: approve or reject a staff deletion request */}
        {isAdmin && deletionPending && (
          <div className="flex flex-col gap-2 p-3 rounded-lg" style={{ background: "#ef444414", border: "1px solid #ef444440" }}>
            <p className="text-xs" style={{ color: "#f87171" }}>
              <span className="font-semibold">
                {(() => { const r = liveStaff.find((s) => staffAuthId(s) === task.deletionRequestedBy); return r ? staffName(r) : "A staff member"; })()}
              </span>{" "}
              requested to delete this task. Approving permanently removes it.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRejectDeletion}
                disabled={deletionLoading}
                className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: "#1c3248", color: "#cce4ff", opacity: deletionLoading ? 0.7 : 1 }}
              >
                {deletionLoading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Reject
              </button>
              <button
                onClick={handleApproveDeletion}
                disabled={deletionLoading}
                className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: "#ef4444", color: "#fff", opacity: deletionLoading ? 0.7 : 1 }}
              >
                {deletionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Approve deletion
              </button>
            </div>
          </div>
        )}
        {/* Article-post: the ASSIGNEE records the live link. The admin only gets
            the input when the task is theirs or unassigned (user rule 2026-07-31)
            — posting is the assignee's job; reassign to yourself to override. */}
        {task.status === "pending_article_post" && (isMyTask || (isAdmin && !task.assigneeId)) && (
          <div className="flex flex-col gap-2 p-3 rounded-lg" style={{ background: "#f9731614", border: "1px solid #f9731640" }}>
            <p className="text-xs" style={{ color: "#fb923c" }}>
              <span className="font-semibold">Approved.</span> Upload this article to the website, then paste the live link here to complete the task.
            </p>
            <div className="flex gap-2">
              <input
                value={articleUrlDraft}
                onChange={(e) => { setArticleUrlDraft(e.target.value); setArticlePostError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleMarkPosted(); }}
                placeholder="https://clientwebsite.com/blog/article-title"
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
              />
              <button
                onClick={handleMarkPosted}
                disabled={postingArticle || !articleUrlDraft.trim()}
                className="py-2 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shrink-0"
                style={{ background: "#f97316", color: "#fff", opacity: postingArticle || !articleUrlDraft.trim() ? 0.6 : 1 }}
              >
                {postingArticle ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Mark as Posted
              </button>
            </div>
            {articlePostError && (
              <p className="text-xs" style={{ color: "#f87171" }}>{articlePostError}</p>
            )}
          </div>
        )}
        {/* Admin viewing a staff-assigned article task: the link is the staff's
            job — show who owns it instead of the input. */}
        {task.status === "pending_article_post" && isAdmin && !isMyTask && !!task.assigneeId && (
          <div className="p-3 rounded-lg text-xs" style={{ background: "#f9731614", border: "1px solid #f9731640", color: "#fb923c" }}>
            <span className="font-semibold">Approved — waiting on {assignee ? staffName(assignee) : "the assignee"}</span> to upload the article to the website and add the live link
            {task.statusChangedAt && ` (since ${new Date(task.statusChangedAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })})`}.
          </div>
        )}
        {/* Admin: approve + reject when pending review */}
        {isAdmin && task.status === "pending_review" && (
          <div className="flex flex-col gap-2">
            {task.statusChangedAt && (
              <p className="text-xs text-center" style={{ color: "#a855f7" }}>
                Submitted for review {new Date(task.statusChangedAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            <div className="flex gap-2">
            {/* Reject outright — closes the task as `rejected` (two-click confirm) */}
            <button
              onClick={() => { if (!confirmReject) { setConfirmReject(true); return; } handleMarkRejected(); }}
              disabled={approvalLoading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              style={confirmReject
                ? { background: "#dc2626", color: "#fff", opacity: approvalLoading ? 0.7 : 1 }
                : { background: "#dc262620", border: "1px solid #dc262640", color: "#dc2626", opacity: approvalLoading ? 0.7 : 1 }}
            >
              {approvalLoading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              {confirmReject ? "Confirm Reject?" : "Reject"}
            </button>
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
          </div>
        )}
        <div className="flex items-center gap-2">
          {canGoBack && (
            <button onClick={requestGoBack} className="py-2 px-4 rounded-lg text-sm font-medium" style={{ background: "#1c3248", color: "#cce4ff" }}>← Back</button>
          )}
          {/* Staff on own task: request review or show pending state
              (pending_article_post uses the Mark-as-Posted panel above instead;
              rejected is a closed admin decision — no resubmit) */}
          {!isAdmin && isMyTask && task.status !== "done" && task.status !== "rejected" && task.status !== "pending_review" && task.status !== "pending_article_post" && (
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
          {!isAdmin && isMyTask && task.status === "rejected" && (
            <div className="flex-1 py-2 rounded-lg text-sm font-medium text-center" style={{ background: "#dc262620", color: "#dc2626", border: "1px solid #dc262640" }}>
              Rejected by Admin
            </div>
          )}
          {/* Admin: archive a closed top-level task (hides it from all active views) */}
          {isAdmin && !task.parentId && (task.status === "done" || task.status === "rejected") && (
            <button
              onClick={async () => { await archiveTask(projectId, task.id); onClose(); }}
              className="py-2 px-4 rounded-lg text-sm font-medium flex items-center gap-2"
              style={{ background: "#6b728020", border: "1px solid #6b728040", color: "#9ca3af" }}
              title="Archive this completed task"
            >
              <Archive size={14} /> Archive
            </button>
          )}
          {/* Default close button */}
          {(isAdmin ? task.status !== "pending_review" : (!isMyTask || task.status === "done" || task.status === "rejected")) && !canGoBack && (
            <button onClick={onRequestClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: "#38b6e8", color: "#fff" }}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}
