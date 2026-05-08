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
import { Calendar, CheckSquare, Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

const PHASE_COLOR: Record<string, string> = {
  discovery: "#4a7090", design: "#a855f7", development: "#3b82f6", qa: "#f59e0b", launch: "#22c55e",
};

const CHANNEL_COLORS = ["#38b6e8", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#ec4899"];

// ─── Draggable project card ───────────────────────────────────────────────
function DraggableProjectCard({ project }: { project: Project }) {
  const { clients } = useStore();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1, touchAction: "none" };

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

      <Link
        href={`/projects/${project.id}`}
        className="rounded-xl p-5 pl-7 flex flex-col gap-3 hover:opacity-90 transition-opacity block"
        style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}
        draggable={false}
      >
        <div className="flex items-start justify-between">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: typeColor + "20", color: typeColor }}>
            {project.type === "seo" ? "SEO" : "Web Dev"}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full capitalize" style={{ background: PHASE_COLOR[project.phase] + "20", color: PHASE_COLOR[project.phase] }}>
            {project.phase}
          </span>
        </div>

        <div>
          <p className="font-semibold text-sm mb-0.5" style={{ color: "#cce4ff" }}>{project.name}</p>
          <p className="text-xs" style={{ color: "#4a7090" }}>{client?.name ?? "—"}</p>
        </div>

        {project.description && (
          <p className="text-xs line-clamp-2" style={{ color: "#4a7090" }}>{project.description}</p>
        )}

        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-xs" style={{ color: "#4a7090" }}>Progress</span>
            <span className="text-xs font-medium" style={{ color: "#cce4ff" }}>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: "#1c3248" }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#38b6e8" }} />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1" style={{ borderTop: "1px solid #1c3248" }}>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#4a7090" }}>
            <CheckSquare size={12} /> {done}/{total} tasks
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: daysLeft < 7 && daysLeft >= 0 ? "#f59e0b" : daysLeft < 0 ? "#ef4444" : "#4a7090" }}>
            <Calendar size={12} />
            {daysLeft < 0 ? "Overdue" : `${daysLeft}d left`}
          </div>
        </div>
      </Link>
    </div>
  );
}

// ─── Droppable channel group ───────────────────────────────────────────────
function ChannelGroup({
  channel, projects, isOver,
}: {
  channel: Channel | null;
  projects: Project[];
  isOver: boolean;
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
        <button onClick={() => setCollapsed(!collapsed)} style={{ color: "#4a7090" }}>
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
            style={{ background: "#0e1e30", border: "1px solid #38b6e8", color: "#cce4ff" }}
          />
        ) : (
          <h2 className="text-sm font-semibold flex-1" style={{ color: "#cce4ff" }}>{channel?.name ?? "Ungrouped"}</h2>
        )}

        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#1c3248", color: "#4a7090" }}>{projects.length}</span>

        {channel && !editing && (
          <>
            <button onClick={() => { setEditing(true); setEditName(channel.name); }} className="p-1 rounded hover:opacity-70 transition-opacity opacity-0 group-hover:opacity-100" style={{ color: "#4a7090" }}>
              <Pencil size={12} />
            </button>
            <button
              onClick={() => { if (!confirmDelete) { setConfirmDelete(true); return; } deleteChannel(channel.id); }}
              onBlur={() => setConfirmDelete(false)}
              className="p-1 rounded hover:opacity-70 transition-opacity"
              style={{ color: confirmDelete ? "#ef4444" : "#8b90a750" }}
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
            <DraggableProjectCard key={project.id} project={project} />
          ))}
          {projects.length === 0 && (
            <div className="col-span-3 py-6 text-center rounded-xl" style={{ border: "1px dashed #1c3248" }}>
              <p className="text-xs" style={{ color: "#8b90a750" }}>Drag a project here</p>
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
  const { projects: allProjects, channels, addChannel, moveProjectToChannel } = useStore();
  const projects = user?.pmRole === "admin"
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
      <Topbar title="Projects" action={{ label: "New Project", href: "/projects/new" }} />
      <div className="p-6 flex flex-col gap-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "#4a7090" }}>{projects.length} project{projects.length !== 1 ? "s" : ""}</span>
          <button
            onClick={() => setShowAddChannel(!showAddChannel)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg ml-auto hover:opacity-80 transition-opacity"
            style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#4a7090" }}
          >
            <Plus size={13} /> New Channel
          </button>
        </div>

        {/* New channel form */}
        {showAddChannel && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "#0f1d2e", border: "1px solid #38b6e840" }}>
            <input
              autoFocus
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddChannel(); if (e.key === "Escape") setShowAddChannel(false); }}
              placeholder="Channel name..."
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
            />
            <div className="flex gap-1.5">
              {CHANNEL_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewChannelColor(c)}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ background: c, borderColor: newChannelColor === c ? "#fff" : "transparent" }}
                />
              ))}
            </div>
            <button onClick={handleAddChannel} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium" style={{ background: "#38b6e8", color: "#fff" }}>
              <Check size={13} /> Create
            </button>
            <button onClick={() => setShowAddChannel(false)} className="p-2 rounded-lg" style={{ color: "#4a7090" }}>
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
              />
            ))}

            {ungrouped.length > 0 && (
              <ChannelGroup
                channel={null}
                projects={ungrouped}
                isOver={overChannelId === "ungrouped"}
              />
            )}
          </div>

          <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
            {activeProject && (
              <div className="rounded-xl p-5 opacity-90 shadow-2xl" style={{ background: "#0f1d2e", border: "1px solid #38b6e8", width: "280px" }}>
                <p className="font-semibold text-sm" style={{ color: "#cce4ff" }}>{activeProject.name}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* New project shortcut */}
        <Link
          href="/projects/new"
          className="flex items-center justify-center gap-2 rounded-xl py-4 hover:opacity-80 transition-opacity"
          style={{ border: "2px dashed #1c3248" }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xl" style={{ background: "#1c3248", color: "#4a7090" }}>+</div>
          <p className="text-sm font-medium" style={{ color: "#4a7090" }}>New Project</p>
        </Link>
      </div>
    </>
  );
}
