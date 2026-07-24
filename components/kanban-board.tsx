"use client";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { type Task, type TaskStatus } from "@/lib/mock-data";

interface LiveStaff {
  id: string; user_id: string | null; email: string;
  first_name: string | null; last_name: string | null; avatar_initials: string;
}
function staffAuthId(s: LiveStaff) { return s.user_id ?? s.id; }
function staffInitials(s: LiveStaff) { return s.avatar_initials || [s.first_name, s.last_name].filter(Boolean).join(" ").slice(0, 2).toUpperCase() || s.email.slice(0, 2).toUpperCase(); }
import { useStore } from "@/lib/store";
import { Calendar, Plus, Paperclip, RefreshCw } from "lucide-react";

const STATUS_COLS: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo", label: "To Do", color: "#4a7090" },
  { key: "in_progress", label: "In Progress", color: "#3b82f6" },
  { key: "pending_review", label: "Pending Review", color: "#a855f7" },
  { key: "pending_client_approval", label: "Pending Client Approval", color: "#ec4899" },
  { key: "revision_required", label: "Revision Required", color: "#f59e0b" },
  { key: "done", label: "Done", color: "#22c55e" },
];

function priorityColor(p: number): string {
  if (p <= 2) return "#ef4444";
  if (p <= 4) return "#f59e0b";
  if (p <= 6) return "#38b6e8";
  return "#22c55e";
}

// ─── Static card (used in DragOverlay and SortableCard) ──────────────────────
export function TaskCard({ task, onClick, liveStaff = [] }: { task: Task; onClick: () => void; liveStaff?: LiveStaff[] }) {
  const assignee = liveStaff.find((s) => staffAuthId(s) === task.assigneeId);
  const overdue = task.status !== "done" && task.status !== "pending_review" && task.status !== "pending_client_approval" && !!task.dueDate && new Date(task.dueDate) < new Date();
  const subtaskDone = task.subtasks.filter((s) => s.status === "done").length;
  const prio = typeof task.priority === "number" ? task.priority : 5;

  return (
    <div
      onClick={onClick}
      className="rounded-lg p-3 flex flex-col gap-2 cursor-pointer hover:opacity-90 transition-opacity select-none"
      style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}
    >
      {task.status === "revision_required" && (
        <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit" style={{ background: "#f59e0b20", color: "#f59e0b", border: "1px solid #f59e0b40" }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#f59e0b" }} />
          Revision Required
        </div>
      )}
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-medium leading-snug flex-1" style={{ color: "#cce4ff" }}>{task.title}</p>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {task.recurring && <RefreshCw size={10} style={{ color: "#38b6e8" }} />}
          <span className="text-xs font-bold rounded px-1 leading-none" style={{ background: priorityColor(prio) + "25", color: priorityColor(prio), border: `1px solid ${priorityColor(prio)}40` }}>
            P{prio}
          </span>
        </div>
      </div>

      {task.subtasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: "#4a7090" }}>{subtaskDone}/{task.subtasks.length} subtasks</span>
          </div>
          <div className="h-1 rounded-full" style={{ background: "#1c3248" }}>
            <div className="h-full rounded-full" style={{ width: `${task.subtasks.length ? (subtaskDone / task.subtasks.length) * 100 : 0}%`, background: "#38b6e8" }} />
          </div>
        </div>
      )}

      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#1c3248", color: "#4a7090" }}>{tag}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.dueDate ? (
            <span className="flex items-center gap-1 text-xs" style={{ color: overdue ? "#ef4444" : "#4a7090" }}>
              <Calendar size={10} />
              {new Date(task.dueDate).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}
            </span>
          ) : (
            <span className="text-xs" style={{ color: "#1c3248" }}>No date</span>
          )}
          {task.attachments.length > 0 && (
            <span className="flex items-center gap-0.5 text-xs" style={{ color: "#4a7090" }}>
              <Paperclip size={10} />{task.attachments.length}
            </span>
          )}
        </div>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#38b6e8", color: "#fff" }}>
          {assignee ? staffInitials(assignee) : ""}
        </div>
      </div>
    </div>
  );
}

// ─── Sortable task card ────────────────────────────────────────────────────────
function SortableCard({ task, onClick, liveStaff }: { task: Task; onClick: () => void; liveStaff: LiveStaff[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: "none",
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard task={task} onClick={onClick} liveStaff={liveStaff} />
    </div>
  );
}

// ─── Droppable + sortable column ──────────────────────────────────────────────
function KanbanColumn({
  status, label, color, tasks, onTaskClick, onAddTask, liveStaff,
}: {
  status: TaskStatus;
  label: string;
  color: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  liveStaff: LiveStaff[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <h3 className="text-sm font-semibold" style={{ color: "#cce4ff" }}>{label}</h3>
        <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#1c3248", color: "#4a7090" }}>{tasks.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 min-h-16 rounded-lg p-1 transition-colors"
        style={{ background: isOver ? color + "10" : "transparent", border: isOver ? `1px dashed ${color}40` : "1px solid transparent" }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableCard key={task.id} task={task} onClick={() => onTaskClick(task)} liveStaff={liveStaff} />
          ))}
        </SortableContext>
      </div>

      <button
        onClick={() => onAddTask(status)}
        className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-colors hover:opacity-80"
        style={{ color: "#4a7090", border: "1px dashed #1c3248" }}
      >
        <Plus size={13} /> Add task
      </button>
    </div>
  );
}

// ─── Main kanban board ─────────────────────────────────────────────────────────
interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  liveStaff: LiveStaff[];
}

export function KanbanBoard({ projectId, tasks, onTaskClick, onAddTask, liveStaff }: KanbanBoardProps) {
  const { updateTaskStatus, reorderTasks } = useStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const movedTask = tasks.find((t) => t.id === active.id);
    if (!movedTask) return;

    const overIsColumn = STATUS_COLS.some((c) => c.key === over.id);

    if (overIsColumn) {
      const newStatus = over.id as TaskStatus;
      if (movedTask.status !== newStatus) {
        updateTaskStatus(projectId, movedTask.id, newStatus);
      }
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (!overTask) return;

      if (movedTask.status !== overTask.status) {
        updateTaskStatus(projectId, movedTask.id, overTask.status);
      } else {
        const colTasks = tasks.filter((t) => t.status === movedTask.status);
        const oldIndex = colTasks.findIndex((t) => t.id === movedTask.id);
        const newIndex = colTasks.findIndex((t) => t.id === overTask.id);
        if (oldIndex !== newIndex) {
          const reordered = arrayMove(colTasks, oldIndex, newIndex);
          reorderTasks(projectId, movedTask.status, reordered.map((t) => t.id));
        }
      }
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${STATUS_COLS.length}, minmax(200px, 1fr))`, overflowX: "auto" }}>
        {STATUS_COLS.map(({ key, label, color }) => (
          <KanbanColumn
            key={key}
            status={key}
            label={label}
            color={color}
            tasks={tasks.filter((t) => t.status === key)}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
            liveStaff={liveStaff}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
        {activeTask && <TaskCard task={activeTask} onClick={() => {}} liveStaff={liveStaff} />}
      </DragOverlay>
    </DndContext>
  );
}
