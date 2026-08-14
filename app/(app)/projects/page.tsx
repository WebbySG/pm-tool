"use client";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, useDroppable, useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState, useEffect, useRef, Suspense } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { useStore } from "@/lib/store";
import { type Project, type Channel } from "@/lib/mock-data";
import { Calendar, CheckSquare, Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight, GripVertical, AlertTriangle, Archive, UserPlus, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/utils";

interface LiveStaff {
  id: string; user_id: string | null; email: string;
  first_name: string | null; last_name: string | null; avatar_initials: string;
}
function staffAuthId(s: LiveStaff) { return s.user_id ?? s.id; }
function staffName(s: LiveStaff) { return [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email; }
function staffInitials(s: LiveStaff) { return s.avatar_initials || staffName(s).slice(0, 2).toUpperCase(); }

const AVATAR_COLORS = ["#818cf8", "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#22d3ee"];
// Keyed off the person's position in the full staff list, not their position in
// one project's assignees — so the same person is the same colour on every card
// and inside the assign popup.
function staffColor(s: LiveStaff, all: LiveStaff[]) {
  const i = all.findIndex((x) => x.id === s.id);
  return AVATAR_COLORS[(i < 0 ? 0 : i) % AVATAR_COLORS.length];
}

const CHANNEL_COLORS = ["#38b6e8", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#ec4899"];

// ─── Assign / remove staff popup (admin) ──────────────────────────────────
// Rendered through a PORTAL to document.body on purpose: the project card is
// `overflow-hidden` (and gets a dnd-kit transform while dragging), either of
// which would clip or re-anchor a nested dropdown — the same trap the
// credentials page hit. Position is fixed against the trigger's rect.
function StaffAssignMenu({
  project, liveStaff, anchor, triggerRef, onClose,
}: {
  project: Project;
  liveStaff: LiveStaff[];
  anchor: DOMRect;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const { assignStaff, removeStaff } = useStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node;
      // Leave the trigger alone — it toggles itself, and closing here first
      // would make the click that follows reopen the menu immediately.
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      onClose();
      // The click that dismisses the popup lands on a project card, which is a
      // <Link> — without this it would navigate into the project, exactly what
      // this popup exists to avoid. preventDefault only kills the anchor's
      // navigation (next/link bails on defaultPrevented); React onClick
      // handlers still run, so clicking ANOTHER card's staff button closes this
      // menu and opens that one in a single click.
      const swallow = (ev: MouseEvent) => ev.preventDefault();
      document.addEventListener("click", swallow, { capture: true, once: true });
      // Safety net for a press with no click (drag, right-click) — otherwise the
      // listener would linger and eat an unrelated click later.
      window.setTimeout(() => document.removeEventListener("click", swallow, true), 400);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    // The rect is captured once at open time, so page scroll/resize would leave
    // the panel floating away from its card — close instead of chasing it.
    // Scrolling INSIDE the staff list must not count.
    function onScroll(e: Event) {
      if (panelRef.current?.contains(e.target as Node)) return;
      onClose();
    }
    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose, triggerRef]);

  async function toggle(s: LiveStaff) {
    const authId = staffAuthId(s);
    const assigned = project.assignedStaff.includes(authId);
    setBusyId(authId);
    setError(null);
    try {
      if (assigned) await removeStaff(project.id, authId);
      else await assignStaff(project.id, authId);
    } catch (e) {
      setError(`Couldn't ${assigned ? "remove" : "assign"} ${staffName(s)}: ${errorMessage(e)}`);
    } finally {
      setBusyId(null);
    }
  }

  const WIDTH = 250;
  const searchable = liveStaff.length > 6;
  const q = query.trim().toLowerCase();
  const shown = q ? liveStaff.filter((s) => staffName(s).toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) : liveStaff;

  // Flip above the trigger when there isn't room below it.
  const spaceBelow = window.innerHeight - anchor.bottom;
  const openUp = spaceBelow < 280 && anchor.top > spaceBelow;
  const left = Math.min(Math.max(8, anchor.left), window.innerWidth - WIDTH - 8);

  const panel = (
    <div
      ref={panelRef}
      className="fixed rounded-xl shadow-2xl overflow-hidden flex flex-col"
      style={{
        left,
        ...(openUp ? { bottom: window.innerHeight - anchor.top + 6 } : { top: anchor.bottom + 6 }),
        width: WIDTH,
        maxHeight: 340,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        zIndex: 60,
      }}
    >
      <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <UserPlus size={12} style={{ color: "var(--text-muted)" }} />
        <span className="text-xs font-semibold flex-1 truncate" style={{ color: "var(--text)" }} title={project.name}>
          Staff on {project.name}
        </span>
        <button onClick={onClose} className="p-0.5 rounded hover:opacity-70" style={{ color: "var(--text-muted)" }} title="Close">
          <X size={12} />
        </button>
      </div>

      {searchable && (
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search staff…"
          className="mx-2 mt-2 px-2 py-1.5 rounded-lg text-xs outline-none"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {liveStaff.length === 0 ? (
          <p className="px-3 py-3 text-xs" style={{ color: "var(--text-muted)" }}>Loading staff…</p>
        ) : shown.length === 0 ? (
          <p className="px-3 py-3 text-xs" style={{ color: "var(--text-muted)" }}>No staff match “{query}”.</p>
        ) : shown.map((s) => {
          const authId = staffAuthId(s);
          const assigned = project.assignedStaff.includes(authId);
          const busy = busyId === authId;
          return (
            <button
              key={s.id}
              onClick={() => toggle(s)}
              disabled={busy}
              className="flex items-center gap-2 w-full px-2.5 py-2 text-left hover:opacity-80 transition-opacity"
              style={{ background: assigned ? "#38b6e812" : "transparent", opacity: busy ? 0.5 : 1 }}
              title={assigned ? `Remove ${staffName(s)} from this project` : `Assign ${staffName(s)} to this project`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: staffColor(s, liveStaff), color: "#fff" }}
              >
                {staffInitials(s)}
              </div>
              <span className="text-xs flex-1 truncate" style={{ color: assigned ? "var(--text)" : "var(--text-muted)" }}>
                {staffName(s)}
              </span>
              {busy ? (
                <Loader2 size={13} className="animate-spin shrink-0" style={{ color: "var(--text-muted)" }} />
              ) : assigned ? (
                <Check size={13} className="shrink-0" style={{ color: "#22c55e" }} />
              ) : (
                <Plus size={13} className="shrink-0" style={{ color: "var(--text-muted)" }} />
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="px-3 py-2 text-[11px]" style={{ borderTop: "1px solid var(--border)", background: "#ef444415", color: "#f87171" }}>
          {error}
        </p>
      )}
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(panel, document.body);
}

// ─── Draggable project card ───────────────────────────────────────────────
function DraggableProjectCard({ project, isAdmin, liveStaff }: { project: Project; isAdmin: boolean; liveStaff: LiveStaff[] }) {
  const { deleteProject, archiveProject } = useStore();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1, touchAction: "none" };
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const staffBtnRef = useRef<HTMLButtonElement>(null);
  const [staffAnchor, setStaffAnchor] = useState<DOMRect | null>(null);


  const done = project.tasks.filter((t) => t.status === "done").length;
  const total = project.tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const typeColor = project.type === "seo" ? "#22c55e" : project.type === "both" ? "#a855f7" : "#38b6e8";
  const dueDateMs = project.dueDate ? new Date(project.dueDate).getTime() : NaN;
  const daysLeft = isNaN(dueDateMs) ? null : Math.ceil((dueDateMs - Date.now()) / 86400000);
  const assignedStaff = liveStaff.filter((s) => project.assignedStaff.includes(staffAuthId(s)));

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle */}
      <div
        {...listeners} {...attributes}
        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
        style={{ color: "#4a7090" }}
      >
        <GripVertical size={14} />
      </div>

      <Link
        href={`/projects/${project.slug || project.id}`}
        className="rounded-xl pl-7 flex flex-col hover:shadow-lg transition-all block overflow-hidden"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderLeft: `4px solid ${typeColor}`,
        }}
        draggable={false}
      >
        {/* Colored header strip */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: typeColor + "25", color: typeColor }}
          >
            {project.type === "seo" ? "SEO" : project.type === "both" ? "Web + SEO" : "Web Dev"}
          </span>
          <div className="flex-1" />
          {isAdmin && (
            <button
              onClick={(e) => {
                e.preventDefault();
                if (!confirmArchive) { setConfirmArchive(true); setTimeout(() => setConfirmArchive(false), 3000); return; }
                archiveProject(project.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
              style={{
                background: confirmArchive ? "#6b7280" : "#6b728018",
                color: confirmArchive ? "#fff" : "#9ca3af",
                border: `1px solid ${confirmArchive ? "#6b7280" : "#6b728040"}`,
              }}
              title={confirmArchive ? "Click again to archive (restore anytime from Archive page)" : "Archive project (hide from active views)"}
            >
              {confirmArchive ? <><AlertTriangle size={11} /> Confirm</> : <Archive size={11} />}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={(e) => {
                e.preventDefault();
                if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); return; }
                deleteProject(project.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
              style={{
                background: confirmDelete ? "#ef4444" : "#ef444418",
                color: confirmDelete ? "#fff" : "#f87171",
                border: `1px solid ${confirmDelete ? "#ef4444" : "#ef444430"}`,
              }}
              title={confirmDelete ? "Click again to confirm delete" : "Delete project"}
            >
              {confirmDelete ? <><AlertTriangle size={11} /> Confirm</> : <Trash2 size={11} />}
            </button>
          )}
        </div>

        <div className="px-4 pt-3 pb-1">
          <p className="font-bold text-base leading-snug" style={{ color: "#e2f0ff" }}>{project.name}</p>
          {project.description && (
            <p className="text-sm line-clamp-2 mt-1" style={{ color: "#5c7fa0" }}>{project.description}</p>
          )}
        </div>

        {/* Progress */}
        <div className="px-4 pt-2 pb-2">
          <div className="flex justify-between mb-1.5">
            <span className="text-xs" style={{ color: "#4a7090" }}>Progress</span>
            <span className="text-xs font-semibold" style={{ color: pct === 100 ? "#22c55e" : "#cce4ff" }}>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: "#1c3248" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: pct === 100 ? "#22c55e" : pct > 50 ? "#38b6e8" : typeColor,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex items-center justify-between gap-3 pt-2" style={{ borderTop: "1px solid #1c324850" }}>
          {/* Staff avatars — admins click through to the assign/remove popup
              without leaving the projects list. */}
          {isAdmin ? (
            <button
              ref={staffBtnRef}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setStaffAnchor(staffAnchor ? null : (staffBtnRef.current?.getBoundingClientRect() ?? null));
              }}
              title="Assign or remove staff on this project"
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
              style={{
                background: staffAnchor ? "#38b6e820" : "var(--bg-surface)",
                border: `1px solid ${staffAnchor ? "#38b6e8" : "var(--border)"}`,
              }}
            >
              {assignedStaff.length === 0 ? (
                <span className="text-xs font-medium" style={{ color: staffAnchor ? "#38b6e8" : "#4a7090" }}>Assign staff</span>
              ) : (
                <>
                  <div className="flex -space-x-2">
                    {assignedStaff.slice(0, 4).map((s) => (
                      <div
                        key={s.id}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2"
                        style={{
                          background: staffColor(s, liveStaff),
                          color: "#fff",
                          borderColor: "var(--bg-card)",
                        }}
                        title={staffName(s)}
                      >
                        {staffInitials(s)}
                      </div>
                    ))}
                  </div>
                  {assignedStaff.length > 4 && (
                    <span className="text-xs" style={{ color: "#4a7090" }}>+{assignedStaff.length - 4}</span>
                  )}
                </>
              )}
              <UserPlus size={12} style={{ color: staffAnchor ? "#38b6e8" : "#4a7090" }} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              {assignedStaff.length === 0 ? (
                <span className="text-xs" style={{ color: "#2d4a64" }}>Unassigned</span>
              ) : (
                <>
                  <div className="flex -space-x-2">
                    {assignedStaff.slice(0, 4).map((s) => (
                      <div
                        key={s.id}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2"
                        style={{
                          background: staffColor(s, liveStaff),
                          color: "#fff",
                          borderColor: "var(--bg-card)",
                        }}
                        title={staffName(s)}
                      >
                        {staffInitials(s)}
                      </div>
                    ))}
                  </div>
                  {assignedStaff.length > 4 && (
                    <span className="text-xs" style={{ color: "#4a7090" }}>+{assignedStaff.length - 4}</span>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs" style={{ color: "#4a7090" }}>
              <CheckSquare size={11} /> {done}/{total}
            </div>
            <div
              className="flex items-center gap-1 text-xs"
              style={{ color: daysLeft === null ? "#2d4a64" : daysLeft < 0 ? "#ef4444" : daysLeft < 7 ? "#f59e0b" : "#4a7090" }}
            >
              <Calendar size={11} />
              {daysLeft === null ? "No date" : daysLeft < 0 ? "Overdue" : `${daysLeft}d`}
            </div>
          </div>
        </div>
      </Link>

      {isAdmin && staffAnchor && (
        <StaffAssignMenu
          project={project}
          liveStaff={liveStaff}
          anchor={staffAnchor}
          triggerRef={staffBtnRef}
          onClose={() => setStaffAnchor(null)}
        />
      )}
    </div>
  );
}

// ─── Droppable channel group ───────────────────────────────────────────────
function ChannelGroup({
  channel, projects, isOver, isAdmin, liveStaff,
}: {
  channel: Channel | null;
  projects: Project[];
  isOver: boolean;
  isAdmin: boolean;
  liveStaff: LiveStaff[];
}) {
  const { renameChannel, deleteChannel } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(channel?.name ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { setNodeRef } = useDroppable({ id: channel?.id ?? "ungrouped" });
  const color = channel?.color ?? "#4a7090";

  function saveRename() {
    if (channel && editName.trim()) renameChannel(channel.id, editName.trim());
    setEditing(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Channel header */}
      <div
        ref={setNodeRef}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
        style={{ background: isOver ? color + "15" : "transparent", border: isOver ? `1px dashed ${color}50` : "1px solid transparent" }}
      >
        <button onClick={() => setCollapsed(!collapsed)} style={{ color: "var(--text-muted)" }}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />

        {editing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setEditing(false); }}
            onBlur={saveRename}
            className="flex-1 px-2 py-0.5 rounded text-sm font-semibold outline-none"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--accent)", color: "var(--text)" }}
          />
        ) : (
          <h2 className="text-sm font-semibold flex-1" style={{ color: "var(--text)" }}>{channel?.name ?? "Ungrouped"}</h2>
        )}

        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>{projects.length}</span>

        {channel && !editing && isAdmin && (
          <>
            <button onClick={() => { setEditing(true); setEditName(channel.name); }} className="p-1 rounded hover:opacity-70 transition-opacity opacity-0 group-hover:opacity-100" style={{ color: "var(--text-muted)" }}>
              <Pencil size={12} />
            </button>
            <button
              onClick={() => { if (!confirmDelete) { setConfirmDelete(true); return; } deleteChannel(channel.id); }}
              onBlur={() => setConfirmDelete(false)}
              className="p-1 rounded hover:opacity-70 transition-opacity"
              style={{ color: confirmDelete ? "#ef4444" : "var(--text-muted)" }}
              title={confirmDelete ? "Click again to confirm" : "Delete channel"}
            >
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>

      {/* Project cards grid */}
      {!collapsed && (
        <div className="grid grid-cols-3 gap-4 pl-5">
          {projects.map((project) => (
            <DraggableProjectCard key={project.id} project={project} isAdmin={isAdmin} liveStaff={liveStaff} />
          ))}
          {projects.length === 0 && (
            <div className="col-span-3 py-6 text-center rounded-xl" style={{ border: "1px dashed var(--border)" }}>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Drag a project here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
type TypeFilter = "all" | "webdev" | "both" | "seo";
const TYPE_FILTER_KEYS: TypeFilter[] = ["all", "webdev", "both", "seo"];

function ProjectsPageInner() {
  const { user } = useAuth();
  const isAdmin = user?.pmRole === "admin";
  const { projects: allProjects, channels, addChannel, moveProjectToChannel } = useStore();
  const projects = isAdmin
    ? allProjects
    : allProjects.filter((p) => p.assignedStaff.includes(user?.id ?? ""));
  const [liveStaff, setLiveStaff] = useState<LiveStaff[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // Filters live in the URL (?type=seo&staff=<uuid>) so the selection survives
  // navigating into a project and pressing back, and filtered views can be
  // opened in a new tab / shared.
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") as TypeFilter | null;
  const [filterStaff, setFilterStaff] = useState(searchParams.get("staff") ?? "all");
  const [filterType, setFilterType] = useState<TypeFilter>(
    typeParam && TYPE_FILTER_KEYS.includes(typeParam) ? typeParam : "all"
  );

  function applyFilters(type: TypeFilter, staff: string) {
    setFilterType(type);
    setFilterStaff(staff);
    const q = new URLSearchParams();
    if (type !== "all") q.set("type", type);
    if (staff !== "all") q.set("staff", staff);
    const qs = q.toString();
    router.replace(qs ? `/projects?${qs}` : "/projects", { scroll: false });
  }

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("staff_members").select("id,user_id,email,first_name,last_name,avatar_initials")
      .eq("status", "active")
      .then(({ data }) => setLiveStaff((data as LiveStaff[]) ?? []));
  }, [user?.id]);
  const [overChannelId, setOverChannelId] = useState<string | null>(null);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelColor, setNewChannelColor] = useState(CHANNEL_COLORS[0]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragStart(e: DragStartEvent) {
    const proj = visibleProjects.find((p) => p.id === e.active.id);
    if (proj) setActiveProject(proj);
  }

  function handleDragOver(e: { over: { id: string } | null }) {
    setOverChannelId(e.over?.id ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveProject(null);
    setOverChannelId(null);
    const { active, over } = e;
    if (!over) return;
    const newChannelId = over.id === "ungrouped" ? null : String(over.id);
    const project = projects.find((p) => p.id === active.id);
    if (project && project.channelId !== newChannelId) {
      // The store snaps the card back if the write fails — say why, otherwise
      // the card silently jumps home with no explanation.
      moveProjectToChannel(String(active.id), newChannelId).catch((err) =>
        setPageError(`Couldn't move "${project.name}": ${errorMessage(err)}`)
      );
    }
  }

  function handleAddChannel() {
    if (!newChannelName.trim()) return;
    addChannel(newChannelName.trim(), newChannelColor);
    setNewChannelName("");
    setShowAddChannel(false);
  }

  const staffFiltered = filterStaff === "all"
    ? projects
    : projects.filter((p) => p.assignedStaff.includes(filterStaff));

  // Service-based type matching: "seo" and "webdev" also include "Web + SEO"
  // projects (they contain that service); "both" isolates the combined ones.
  const typeMatches = (p: Project, key: typeof filterType) =>
    key === "all" ? true
    : key === "seo" ? p.type === "seo" || p.type === "both"
    : key === "webdev" ? p.type !== "seo"
    : p.type === "both";

  const visibleProjects = staffFiltered.filter((p) => typeMatches(p, filterType));
  const typeCount = (key: typeof filterType) => staffFiltered.filter((p) => typeMatches(p, key)).length;
  const isFiltering = filterStaff !== "all" || filterType !== "all";

  // Stable, predictable order within each channel (alphabetical) so cards don't
  // appear in arbitrary database order.
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  const projectsInChannel = (channelId: string) => visibleProjects.filter((p) => p.channelId === channelId).sort(byName);

  const ungrouped = visibleProjects
    .filter((p) => !p.channelId || !channels.find((c) => c.id === p.channelId))
    .sort(byName);

  return (
    <>
      <Topbar title="Projects" action={isAdmin ? { label: "New Project", href: "/projects/new" } : undefined} />
      <div className="p-6 flex flex-col gap-6">
        {pageError && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl" style={{ background: "#ef444415", border: "1px solid #ef444440" }}>
            <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: "#f87171" }} />
            <p className="flex-1 text-sm" style={{ color: "#fca5a5" }}>{pageError}</p>
            <button onClick={() => setPageError(null)} className="hover:opacity-70" style={{ color: "#fca5a5" }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            {visibleProjects.length} project{visibleProjects.length !== 1 ? "s" : ""}
          </span>

          {/* Type filter — SEO / Web Dev also match "Web + SEO" projects */}
          <div className="flex items-center gap-1.5">
            {([
              { key: "all", label: "All Types", color: "#4a7090", title: "Show every project" },
              { key: "webdev", label: "Web Dev", color: "#38b6e8", title: "Website projects (includes Web + SEO)" },
              { key: "seo", label: "SEO", color: "#22c55e", title: "SEO projects (includes Web + SEO)" },
              { key: "both", label: "Web + SEO", color: "#a855f7", title: "Only combined Web + SEO projects" },
            ] as const).map((t) => {
              const active = filterType === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => applyFilters(t.key, filterStaff)}
                  title={t.title}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: active ? t.color + "25" : "var(--bg-card)",
                    border: `1px solid ${active ? t.color : "var(--border)"}`,
                    color: active ? t.color : "var(--text-muted)",
                  }}
                >
                  {t.label} · {typeCount(t.key)}
                </button>
              );
            })}
          </div>

          {/* Staff filter */}
          {liveStaff.length > 0 && (
            <select
              value={filterStaff}
              onChange={(e) => applyFilters(filterType, e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: filterStaff === "all" ? "var(--text-muted)" : "var(--text)" }}
            >
              <option value="all">All Staff</option>
              {user?.id && <option value={user.id}>Myself</option>}
              {liveStaff
                .filter((s) => staffAuthId(s) !== user?.id)
                .map((s) => (
                  <option key={s.id} value={staffAuthId(s)}>{staffName(s)}</option>
                ))}
            </select>
          )}

          {isAdmin && (
            <button
              onClick={() => setShowAddChannel(!showAddChannel)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg ml-auto hover:opacity-80 transition-opacity font-medium"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              <Plus size={13} /> New Channel
            </button>
          )}
        </div>

        {/* New channel form */}
        {isAdmin && showAddChannel && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <input
              autoFocus
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddChannel(); if (e.key === "Escape") setShowAddChannel(false); }}
              placeholder="Channel name..."
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <div className="flex gap-1.5">
              {CHANNEL_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewChannelColor(c)}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ background: c, borderColor: newChannelColor === c ? "#111" : "transparent" }}
                />
              ))}
            </div>
            <button onClick={handleAddChannel} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: "var(--accent)", color: "#fff" }}>
              <Check size={13} /> Create
            </button>
            <button onClick={() => setShowAddChannel(false)} className="p-2 rounded-lg" style={{ color: "var(--text-muted)" }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* DnD area */}
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver as any} onDragEnd={handleDragEnd}>
          <div className="flex flex-col gap-8 group">
            {channels.map((channel) => {
              const channelProjects = projectsInChannel(channel.id);
              // While a filter is active, hide channels with no matches so the
              // remaining groups are easy to scan (they stay drop targets otherwise).
              if (isFiltering && channelProjects.length === 0) return null;
              return (
                <ChannelGroup
                  key={channel.id}
                  channel={channel}
                  projects={channelProjects}
                  isOver={overChannelId === channel.id}
                  isAdmin={isAdmin}
                  liveStaff={liveStaff}
                />
              );
            })}

            {ungrouped.length > 0 && (
              <ChannelGroup
                channel={null}
                projects={ungrouped}
                isOver={overChannelId === "ungrouped"}
                isAdmin={isAdmin}
                liveStaff={liveStaff}
              />
            )}
          </div>

          <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
            {activeProject && (
              <div className="rounded-xl p-5 opacity-90 shadow-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--accent)", width: "280px" }}>
                <p className="font-bold text-base" style={{ color: "var(--text)" }}>{activeProject.name}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* New project shortcut — admin only */}
        {isAdmin && (
          <Link
            href="/projects/new"
            className="flex items-center justify-center gap-2 rounded-xl py-4 hover:opacity-80 transition-opacity"
            style={{ border: "2px dashed var(--border)" }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>+</div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>New Project</p>
          </Link>
        )}
      </div>
    </>
  );
}

// useSearchParams requires a Suspense boundary on statically-rendered routes
// (same idiom as credentials/new).
export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsPageInner />
    </Suspense>
  );
}
