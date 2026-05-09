"use client";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, useDroppable, useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { useStore } from "@/lib/store";
import { type Project, type Channel } from "@/lib/mock-data";
import { Calendar, CheckSquare, Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight, GripVertical, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

const PHASE_COLOR: Record<string, string> = {
  discovery: "#4a7090", design: "#a855f7", development: "#3b82f6", qa: "#f59e0b", launch: "#22c55e",
};

const CHANNEL_COLORS = ["#38b6e8", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#ec4899"];

// ─── Draggable project card ───────────────────────────────────────────────
function DraggableProjectCard({ project, isAdmin }: { project: Project; isAdmin: boolean }) {
  const { clients, deleteProject } = useStore();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1, touchAction: "none" };
  const [confirmDelete, setConfirmDelete] = useState(false);

  const client = clients.find((c) => c.id === project.clientId);
  const done = project.tasks.filter((t) => t.status === "done").length;
  const total = project.tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const typeColor = project.type === "seo" ? "#22c55e" : "#38b6e8";
  const daysLeft = Math.ceil((new Date(project.dueDate).getTime() - Date.now()) / 86400000);

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

      {/* Delete button — admin only */}
      {isAdmin && (
        <button
          onClick={(e) => {
            e.preventDefault();
            if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); return; }
            deleteProject(project.id);
          }}
          className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
          style={{
            background: confirmDelete ? "#ef4444" : "#ef444420",
            color: confirmDelete ? "#fff" : "#f87171",
            border: `1px solid ${confirmDelete ? "#ef4444" : "#ef444440"}`,
          }}
          title={confirmDelete ? "Click again to confirm delete" : "Delete project"}
        >
          {confirmDelete ? <><AlertTriangle size={11} /> Confirm</> : <Trash2 size={11} />}
        </button>
      )}

      <Link
        href={`/projects/${project.id}`}
        className="rounded-xl p-5 pl-7 flex flex-col gap-3 hover:shadow-md transition-shadow block"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        draggable={false}
      >
        <div className="flex items-start justify-between pr-16">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: typeColor + "20", color: typeColor }}>
            {project.type === "seo" ? "SEO" : "Web Dev"}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: PHASE_COLOR[project.phase] + "20", color: PHASE_COLOR[project.phase] }}>
            {project.phase}
          </span>
        </div>

        <div>
          <p className="font-bold text-base mb-0.5" style={{ color: "var(--text)" }}>{project.name}</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{client?.name ?? "—"}</p>
        </div>

        {project.description && (
          <p className="text-sm line-clamp-2" style={{ color: "var(--text-muted)" }}>{project.description}</p>
        )}

        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Progress</span>
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{pct}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: "var(--bg-surface)" }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
            <CheckSquare size={13} /> {done}/{total} tasks
          </div>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: daysLeft < 7 && daysLeft >= 0 ? "#f59e0b" : daysLeft < 0 ? "#ef4444" : "var(--text-muted)" }}>
            <Calendar size={13} />
            {daysLeft < 0 ? "Overdue" : `${daysLeft}d left`}
          </div>
        </div>
      </Link>
    </div>
  );
}

// ─── Droppable channel group ───────────────────────────────────────────────
function ChannelGroup({
  channel, projects, isOver, isAdmin,
}: {
  channel: Channel | null;
  projects: Project[];
  isOver: boolean;
  isAdmin: boolean;
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
            <DraggableProjectCard key={project.id} project={project} isAdmin={isAdmin} />
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
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [overChannelId, setOverChannelId] = useState<string | null>(null);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelColor, setNewChannelColor] = useState(CHANNEL_COLORS[0]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragStart(e: DragStartEvent) {
    const proj = projects.find((p) => p.id === e.active.id);
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

  const ungrouped = projects.filter((p) => !p.channelId || !channels.find((c) => c.id === p.channelId));

  return (
    <>
      <Topbar title="Projects" action={isAdmin ? { label: "New Project", href: "/projects/new" } : undefined} />
      <div className="p-6 flex flex-col gap-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{projects.length} project{projects.length !== 1 ? "s" : ""}</span>
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
                projects={projects.filter((p) => p.channelId === channel.id)}
                isOver={overChannelId === channel.id}
                isAdmin={isAdmin}
              />
            ))}

            {ungrouped.length > 0 && (
              <ChannelGroup
                channel={null}
                projects={ungrouped}
                isOver={overChannelId === "ungrouped"}
                isAdmin={isAdmin}
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
