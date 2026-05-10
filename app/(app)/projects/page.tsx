"use client";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, useDroppable, useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/topbar";
import { useStore } from "@/lib/store";
import { type Project, type Channel } from "@/lib/mock-data";
import { Calendar, CheckSquare, Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight, GripVertical, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

interface LiveStaff {
  id: string; user_id: string | null; email: string;
  first_name: string | null; last_name: string | null; avatar_initials: string;
}
function staffAuthId(s: LiveStaff) { return s.user_id ?? s.id; }
function staffName(s: LiveStaff) { return [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email; }
function staffInitials(s: LiveStaff) { return s.avatar_initials || staffName(s).slice(0, 2).toUpperCase(); }

const AVATAR_COLORS = ["#818cf8", "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#22d3ee"];

const CHANNEL_COLORS = ["#38b6e8", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#ec4899"];

// ─── Draggable project card ───────────────────────────────────────────────
function DraggableProjectCard({ project, isAdmin, liveStaff }: { project: Project; isAdmin: boolean; liveStaff: LiveStaff[] }) {
  const { deleteProject } = useStore();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1, touchAction: "none" };
  const [confirmDelete, setConfirmDelete] = useState(false);


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
        href={`/projects/${project.id}`}
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
          {/* Staff avatars */}
          <div className="flex items-center gap-1.5">
            {assignedStaff.length === 0 ? (
              <span className="text-xs" style={{ color: "#2d4a64" }}>Unassigned</span>
            ) : (
              <>
                <div className="flex -space-x-2">
                  {assignedStaff.slice(0, 4).map((s, si) => (
                    <div
                      key={s.id}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2"
                      style={{
                        background: AVATAR_COLORS[si % AVATAR_COLORS.length],
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
export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.pmRole === "admin";
  const { projects: allProjects, channels, addChannel, moveProjectToChannel } = useStore();
  const projects = isAdmin
    ? allProjects
    : allProjects.filter((p) => p.assignedStaff.includes(user?.id ?? ""));
  const [liveStaff, setLiveStaff] = useState<LiveStaff[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const [filterStaff, setFilterStaff] = useState("all");

  useEffect(() => {
    supabase.from("staff_members").select("id,user_id,email,first_name,last_name,avatar_initials")
      .eq("status", "active")
      .then(({ data }) => setLiveStaff((data as LiveStaff[]) ?? []));
  }, []);
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
      moveProjectToChannel(String(active.id), newChannelId);
    }
  }

  function handleAddChannel() {
    if (!newChannelName.trim()) return;
    addChannel(newChannelName.trim(), newChannelColor);
    setNewChannelName("");
    setShowAddChannel(false);
  }

  const visibleProjects = filterStaff === "all"
    ? projects
    : projects.filter((p) => p.assignedStaff.includes(filterStaff));

  const ungrouped = visibleProjects.filter((p) => !p.channelId || !channels.find((c) => c.id === p.channelId));

  return (
    <>
      <Topbar title="Projects" action={isAdmin ? { label: "New Project", href: "/projects/new" } : undefined} />
      <div className="p-6 flex flex-col gap-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            {visibleProjects.length} project{visibleProjects.length !== 1 ? "s" : ""}
          </span>

          {/* Staff filter */}
          {liveStaff.length > 0 && (
            <select
              value={filterStaff}
              onChange={(e) => setFilterStaff(e.target.value)}
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
            {channels.map((channel) => (
              <ChannelGroup
                key={channel.id}
                channel={channel}
                projects={visibleProjects.filter((p) => p.channelId === channel.id)}
                isOver={overChannelId === channel.id}
                isAdmin={isAdmin}
                liveStaff={liveStaff}
              />
            ))}

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
