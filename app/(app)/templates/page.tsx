"use client";
import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { useStore } from "@/lib/store";
import {
  type ProjectTemplate, type TaskTemplate,
  type TaskType, type TaskPriority, type RecurringFrequency,
} from "@/lib/mock-data";
import {
  Plus, ChevronDown, ChevronRight, Pencil, Trash2, Check, X,
  Clock, RefreshCw, CalendarDays, GripVertical, Save, ArrowUp, Copy,
} from "lucide-react";
import { AdminOnly } from "@/components/admin-guard";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const TYPE_OPTIONS: { value: TaskType | "any"; label: string; color: string }[] = [
  { value: "seo", label: "SEO", color: "#22c55e" },
  { value: "webdev", label: "Web Dev", color: "#38b6e8" },
  { value: "any", label: "Any", color: "#4a7090" },
];

function PRIORITY_COLOR(p: TaskPriority): string {
  const n = typeof p === "number" ? p : 5;
  if (n <= 2) return "#ef4444";
  if (n <= 4) return "#f59e0b";
  if (n <= 6) return "#38b6e8";
  return "#22c55e";
}

const PRIORITY_OPTIONS: TaskPriority[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function typeColor(type: TaskType | "any") {
  return TYPE_OPTIONS.find((t) => t.value === type)?.color ?? "#4a7090";
}

// ─── Inline add form ─────────────────────────────────────────────────────────
type FormFields = {
  title: string;
  description: string;
  priority: TaskPriority;
  type: TaskType;
  daysFromStart: number;
  recurring: RecurringFrequency;
  tags: string[];
};

function AddTaskForm({
  onAdd,
  onCancel,
  defaultType = "seo",
  compact = false,
}: {
  onAdd: (fields: FormFields) => void;
  onCancel: () => void;
  defaultType?: TaskType;
  compact?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(5);
  const [type, setType] = useState<TaskType>(defaultType);
  const [daysFromStart, setDaysFromStart] = useState(0);
  const [recurring, setRecurring] = useState<RecurringFrequency>(null);
  const [tags, setTags] = useState("");

  function submit() {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description: description.trim(),
      priority, type,
      daysFromStart,
      recurring,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
  }

  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-lg"
      style={{ background: "#080f1a", border: "1px solid #38b6e840" }}
    >
      <div className="flex gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
          placeholder="Task title *"
          className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
          style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
        />
        {!compact && (
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
          />
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "#4a7090" }}>Day</span>
          <input
            type="number" min={0} value={daysFromStart}
            onChange={(e) => setDaysFromStart(Number(e.target.value))}
            className="w-14 px-2 py-1 rounded text-sm text-center outline-none"
            style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
          />
        </div>
        <select
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value) as TaskPriority)}
          className="px-2 py-1 rounded text-xs outline-none"
          style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
        >
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>P{p}</option>)}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TaskType)}
          className="px-2 py-1 rounded text-xs outline-none"
          style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
        >
          <option value="seo">SEO</option>
          <option value="webdev">Web Dev</option>
        </select>
        <select
          value={recurring ?? ""}
          onChange={(e) => setRecurring((e.target.value || null) as RecurringFrequency)}
          className="px-2 py-1 rounded text-xs outline-none"
          style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
        >
          <option value="">One-time</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags (comma-separated)"
          className="flex-1 min-w-0 px-2 py-1 rounded text-xs outline-none"
          style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
        />
        <button
          onClick={submit}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0"
          style={{ background: "#38b6e8", color: "#fff" }}
        >
          <Check size={12} /> Add
        </button>
        <button onClick={onCancel} className="p-1.5 rounded-lg shrink-0" style={{ color: "#4a7090" }}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Sortable wrapper for top-level template tasks ────────────────────────────
function SortableTaskNode({ task, tplId, defaultType }: { task: TaskTemplate; tplId: string; defaultType: TaskType }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      <TaskNode task={task} tplId={tplId} defaultType={defaultType} dragHandle={
        <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 rounded" style={{ color: "#8b90a750", touchAction: "none" }}>
          <GripVertical size={13} />
        </span>
      } />
    </div>
  );
}

// ─── Recursive task node ──────────────────────────────────────────────────────
function TaskNode({
  task,
  tplId,
  defaultType,
  depth = 0,
  dragHandle,
}: {
  task: TaskTemplate;
  tplId: string;
  defaultType: TaskType;
  depth?: number;
  dragHandle?: React.ReactNode;
}) {
  const { addTemplateTask, updateTemplateTask, removeTemplateTask, promoteTemplateTask } = useStore();
  const [expanded, setExpanded] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description);
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);
  const [editType, setEditType] = useState<TaskType>(task.type);
  const [editRecurring, setEditRecurring] = useState<RecurringFrequency>(task.recurring);
  const [editDays, setEditDays] = useState(task.daysFromStart);
  const [editTags, setEditTags] = useState(task.tags.join(", "));

  function openEdit() {
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditPriority(task.priority);
    setEditType(task.type);
    setEditRecurring(task.recurring);
    setEditDays(task.daysFromStart);
    setEditTags(task.tags.join(", "));
    setEditing(true);
  }

  function saveEdit() {
    if (!editTitle.trim()) return;
    updateTemplateTask(tplId, task.id, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      priority: editPriority,
      type: editType,
      recurring: editRecurring,
      daysFromStart: editDays,
      tags: editTags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setEditing(false);
  }

  const hasChildren = task.subtasks.length > 0;

  return (
    <div style={{ paddingLeft: depth * 18 }}>
      {editing ? (
        /* ── inline edit form ── */
        <div
          className="flex flex-col gap-2 p-3 rounded-lg mb-1"
          style={{ background: "#080f1a", border: "1px solid #38b6e840" }}
        >
          <div className="flex gap-2">
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
              placeholder="Task title *"
              className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none font-medium"
              style={{ background: "#0e1e30", border: "1px solid #38b6e8", color: "#cce4ff" }}
            />
            <input
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Description"
              className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: "#4a7090" }}>Day</span>
              <input
                type="number" min={0} value={editDays}
                onChange={(e) => setEditDays(Number(e.target.value))}
                className="w-14 px-2 py-1 rounded text-sm text-center outline-none"
                style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
              />
            </div>
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(Number(e.target.value) as TaskPriority)}
              className="px-2 py-1 rounded text-xs outline-none"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
            >
              {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>P{p}</option>)}
            </select>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value as TaskType)}
              className="px-2 py-1 rounded text-xs outline-none"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
            >
              <option value="seo">SEO</option>
              <option value="webdev">Web Dev</option>
            </select>
            <select
              value={editRecurring ?? ""}
              onChange={(e) => setEditRecurring((e.target.value || null) as RecurringFrequency)}
              className="px-2 py-1 rounded text-xs outline-none"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
            >
              <option value="">One-time</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <input
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="flex-1 min-w-0 px-2 py-1 rounded text-xs outline-none"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
            />
            <button
              onClick={saveEdit}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0"
              style={{ background: "#38b6e8", color: "#fff" }}
            >
              <Save size={12} /> Save
            </button>
            <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg shrink-0" style={{ color: "#4a7090" }}>
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* ── normal row ── */
        <div
          className="group flex items-center gap-2 px-3 py-2 rounded-lg mb-1"
          style={{ background: "#080f1a", border: "1px solid #1c3248" }}
        >
          {/* drag handle (only at root depth) */}
          {dragHandle}

          {/* expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0"
            style={{ color: "#4a7090", visibility: hasChildren ? "visible" : "hidden" }}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

          {/* content */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" style={{ color: "#cce4ff" }}>{task.title}</p>
            {task.description && (
              <p className="text-xs truncate" style={{ color: "#4a7090" }}>{task.description}</p>
            )}
          </div>

          {/* meta badges */}
          <div className="flex items-center gap-2 shrink-0">
            {task.recurring && <RefreshCw size={11} style={{ color: "#38b6e8" }} />}
            <span
              className="text-xs px-1.5 py-0.5 rounded-full capitalize"
              style={{ background: PRIORITY_COLOR(task.priority) + "20", color: PRIORITY_COLOR(task.priority) }}
            >
              {task.priority}
            </span>
            {task.daysFromStart > 0 && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "#4a7090" }}>
                <Clock size={10} /> Day {task.daysFromStart}
              </span>
            )}
            {task.tags.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#1c3248", color: "#4a7090" }}>
                {task.tags[0]}{task.tags.length > 1 ? ` +${task.tags.length - 1}` : ""}
              </span>
            )}
          </div>

          {/* hover actions */}
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={openEdit}
              className="p-1 rounded"
              style={{ color: "#8b90a750" }}
              title="Edit task"
            >
              <Pencil size={12} />
            </button>
            {depth > 0 && (
              <button
                onClick={() => promoteTemplateTask(tplId, task.id)}
                className="p-1 rounded"
                style={{ color: "#f59e0b" }}
                title="Promote to main task"
              >
                <ArrowUp size={12} />
              </button>
            )}
            <button
              onClick={() => { setShowAddChild(true); setExpanded(true); }}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs"
              style={{ color: "#38b6e8", background: "#38b6e820" }}
              title="Add child task"
            >
              <Plus size={11} /> Child
            </button>
            <button
              onClick={() => {
                if (!confirmDelete) { setConfirmDelete(true); return; }
                removeTemplateTask(tplId, task.id);
              }}
              onBlur={() => setConfirmDelete(false)}
              className="p-1 rounded"
              style={{ color: confirmDelete ? "#ef4444" : "#8b90a750" }}
              title={confirmDelete ? "Click again to confirm" : "Delete task"}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}

      {/* child tasks */}
      {expanded && hasChildren && (
        <div>
          {task.subtasks.map((child) => (
            <TaskNode key={child.id} task={child} tplId={tplId} defaultType={defaultType} depth={depth + 1} />
          ))}
        </div>
      )}

      {/* add child form */}
      {showAddChild && (
        <div style={{ paddingLeft: (depth + 1) * 18 }}>
          <AddTaskForm
            compact
            defaultType={defaultType}
            onAdd={(fields) => {
              addTemplateTask(tplId, { ...fields, parentId: task.id, month: task.month, subtasks: [], recurringDay: undefined, sortOrder: 0 });
              setShowAddChild(false);
            }}
            onCancel={() => setShowAddChild(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Month section ────────────────────────────────────────────────────────────
function MonthSection({
  month,
  tasks,
  tplId,
  defaultType,
}: {
  month: number;
  tasks: TaskTemplate[];
  tplId: string;
  defaultType: TaskType;
}) {
  const { addTemplateTask, reorderTemplateTasks } = useStore();
  const [expanded, setExpanded] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(tasks, oldIndex, newIndex);
    reorderTemplateTasks(tplId, month, reordered.map((t) => t.id));
  }

  function countAll(ts: TaskTemplate[]): number {
    return ts.reduce((n, t) => n + 1 + countAll(t.subtasks), 0);
  }
  const total = countAll(tasks);

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #1c3248" }}>
      {/* month header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5"
        style={{ background: "#0e1e30" }}
      >
        {expanded ? <ChevronDown size={13} style={{ color: "#4a7090" }} /> : <ChevronRight size={13} style={{ color: "#4a7090" }} />}
        <CalendarDays size={13} style={{ color: "#38b6e8" }} />
        <span className="text-sm font-semibold" style={{ color: "#cce4ff" }}>Month {month}</span>
        <span
          className="text-xs px-1.5 py-0.5 rounded-full ml-1"
          style={{ background: "#1c3248", color: "#4a7090" }}
        >
          {total} task{total !== 1 ? "s" : ""}
        </span>
      </button>

      {/* month body */}
      {expanded && (
        <div className="p-3 flex flex-col gap-1" style={{ background: "#0f1d2e" }}>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {tasks.map((task) => (
                <SortableTaskNode key={task.id} task={task} tplId={tplId} defaultType={defaultType} />
              ))}
            </SortableContext>
          </DndContext>

          {tasks.length === 0 && !showAddTask && (
            <p className="text-xs text-center py-2" style={{ color: "#8b90a750" }}>No tasks yet</p>
          )}

          {showAddTask ? (
            <AddTaskForm
              defaultType={defaultType}
              onAdd={(fields) => {
                addTemplateTask(tplId, { ...fields, parentId: null, month, subtasks: [], recurringDay: undefined, sortOrder: 0 });
                setShowAddTask(false);
              }}
              onCancel={() => setShowAddTask(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddTask(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs mt-1 transition-colors hover:opacity-80"
              style={{ color: "#4a7090", border: "1px dashed #1c3248" }}
            >
              <Plus size={12} /> Add task to Month {month}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────
function TemplateCard({ template }: { template: ProjectTemplate }) {
  const { updateTemplate, deleteTemplate, duplicateTemplate } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(template.name);
  const [editDesc, setEditDesc] = useState(template.description);
  const [editType, setEditType] = useState<TaskType | "any">(template.type);
  const [editCategory, setEditCategory] = useState(template.category);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function saveEdit() {
    if (!editName.trim()) return;
    updateTemplate(template.id, {
      name: editName.trim(),
      description: editDesc.trim(),
      type: editType,
      category: editCategory.trim(),
    });
    setEditing(false);
  }

  // Group root tasks by month
  const tasksByMonth = new Map<number, TaskTemplate[]>();
  for (const task of template.tasks) {
    if (!tasksByMonth.has(task.month)) tasksByMonth.set(task.month, []);
    tasksByMonth.get(task.month)!.push(task);
  }
  const months = [...tasksByMonth.keys()].sort((a, b) => a - b);
  const defaultTaskType: TaskType = template.type === "any" ? "seo" : template.type;

  const [extraMonths, setExtraMonths] = useState<number[]>([]);
  // Remove extra months that already have tasks
  const pendingExtra = extraMonths.filter((m) => !tasksByMonth.has(m));
  const allMonths = [...new Set([...months, ...pendingExtra])].sort((a, b) => a - b);
  const nextMonthNum = allMonths.length > 0 ? Math.max(...allMonths) + 1 : 1;
  const [customMonth, setCustomMonth] = useState<number>(nextMonthNum);

  function addMonth() {
    const num = Math.max(1, customMonth);
    if (allMonths.includes(num)) return;
    setExpanded(true);
    setExtraMonths((prev) => [...prev, num]);
    setCustomMonth(Math.max(...allMonths, num) + 1);
  }

  const color = typeColor(template.type);

  function countAll(ts: TaskTemplate[]): number {
    return ts.reduce((n, t) => n + 1 + countAll(t.subtasks), 0);
  }
  const totalTasks = countAll(template.tasks);

  return (
    <div className="rounded-xl flex flex-col" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
      {/* Header */}
      <div
        className="flex items-start gap-3 p-4"
        onClick={() => !editing && setExpanded(!expanded)}
        style={{ cursor: editing ? "default" : "pointer" }}
      >
        <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
                className="px-2 py-1 rounded text-sm font-semibold outline-none"
                style={{ background: "#0e1e30", border: "1px solid #38b6e8", color: "#cce4ff" }}
              />
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Description"
                className="px-2 py-1 rounded text-xs outline-none"
                style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
              />
              <div className="flex gap-2">
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as TaskType | "any")}
                  className="px-2 py-1 rounded text-xs outline-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                >
                  {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="Category"
                  className="flex-1 px-2 py-1 rounded text-xs outline-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                />
                <button onClick={saveEdit} className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ background: "#38b6e8", color: "#fff" }}>
                  <Check size={11} /> Save
                </button>
                <button onClick={() => setEditing(false)} className="p-1 rounded" style={{ color: "#4a7090" }}>
                  <X size={13} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="font-semibold text-sm mb-0.5" style={{ color: "#cce4ff" }}>{template.name}</p>
              {template.description && (
                <p className="text-xs mb-2" style={{ color: "#4a7090" }}>{template.description}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-1.5 py-0.5 rounded-full capitalize font-medium" style={{ background: color + "20", color }}>
                  {template.type === "any" ? "Any type" : template.type === "seo" ? "SEO" : "Web Dev"}
                </span>
                {template.category && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#1c3248", color: "#4a7090" }}>{template.category}</span>
                )}
                <span className="text-xs" style={{ color: "#4a7090" }}>
                  {totalTasks} task{totalTasks !== 1 ? "s" : ""} · {months.length} month{months.length !== 1 ? "s" : ""}
                </span>
              </div>
            </>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="p-1.5 rounded hover:opacity-70 transition-opacity"
              style={{ color: "#4a7090" }}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(template.name); setEditDesc(template.description); setEditType(template.type); setEditCategory(template.category); }}
              className="p-1.5 rounded hover:opacity-70 transition-opacity"
              style={{ color: "#4a7090" }}
              title="Edit template"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); duplicateTemplate(template.id); }}
              className="p-1.5 rounded hover:opacity-70 transition-opacity"
              style={{ color: "#38b6e8" }}
              title="Duplicate template"
            >
              <Copy size={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); if (!confirmDelete) { setConfirmDelete(true); return; } deleteTemplate(template.id); }}
              onBlur={() => setConfirmDelete(false)}
              className="p-1.5 rounded hover:opacity-70 transition-opacity"
              style={{ color: confirmDelete ? "#ef4444" : "#8b90a750" }}
              title={confirmDelete ? "Click again to confirm delete" : "Delete template"}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Month sections */}
      {expanded && (
        <div className="flex flex-col gap-2 px-4 pb-4">
          <div className="h-px mb-1" style={{ background: "#1c3248" }} />

          {allMonths.length === 0 && (
            <p className="text-xs text-center py-2" style={{ color: "#8b90a750" }}>No months yet — add a month to get started</p>
          )}

          {allMonths.map((month) => (
            <MonthSection
              key={month}
              month={month}
              tasks={tasksByMonth.get(month) ?? []}
              tplId={template.id}
              defaultType={defaultTaskType}
            />
          ))}

          <div className="flex items-center gap-2 mt-1">
            <CalendarDays size={13} style={{ color: "#38b6e8" }} />
            <span className="text-xs" style={{ color: "#4a7090" }}>Month</span>
            <input
              type="number"
              min={1}
              value={customMonth}
              onChange={(e) => setCustomMonth(Number(e.target.value))}
              onKeyDown={(e) => { if (e.key === "Enter") addMonth(); }}
              className="w-16 px-2 py-1 rounded text-sm text-center outline-none"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
            />
            <button
              onClick={addMonth}
              disabled={allMonths.includes(Math.max(1, customMonth))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ color: "#38b6e8", border: "1px dashed #38b6e850" }}
            >
              <Plus size={12} /> Add Month
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New template form ────────────────────────────────────────────────────────
function NewTemplateForm({ onDone }: { onDone: () => void }) {
  const { addTemplate } = useStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType | "any">("seo");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await addTemplate({ name: name.trim(), description: description.trim(), type, category: category.trim() });
      onDone();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save template");
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "#0f1d2e", border: "1px solid #38b6e840" }}>
      <p className="text-sm font-semibold" style={{ color: "#cce4ff" }}>New Template</p>
      <div className="flex gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") onDone(); }}
          placeholder="Template name *"
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TaskType | "any")}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
        >
          {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (e.g. SEO, Onboarding)"
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
        />
      </div>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
      />
      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#ef444418", color: "#f87171", border: "1px solid #ef444430" }}>
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 justify-end">
        <button onClick={onDone} className="px-3 py-2 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>Cancel</button>
        <button
          onClick={submit}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          <Check size={13} /> {saving ? "Saving…" : "Create Template"}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const { templates } = useStore();
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<"all" | TaskType | "any">("all");

  const filtered = filter === "all" ? templates : templates.filter((t) => t.type === filter);

  const grouped = TYPE_OPTIONS.reduce<Record<string, ProjectTemplate[]>>((acc, opt) => {
    acc[opt.value] = filtered.filter((t) => t.type === opt.value);
    return acc;
  }, { seo: [], webdev: [], any: [] });

  return (
    <AdminOnly>
      <Topbar title="Templates" />
      <div className="p-6 flex flex-col gap-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
            {[{ value: "all", label: "All" }, ...TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label }))].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value as typeof filter)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: filter === value ? "#38b6e8" : "transparent",
                  color: filter === value ? "#fff" : "#4a7090",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-sm ml-2" style={{ color: "#4a7090" }}>
            {filtered.length} template{filtered.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg ml-auto hover:opacity-80 transition-opacity"
            style={{ background: "#38b6e8", color: "#fff" }}
          >
            <Plus size={13} /> New Template
          </button>
        </div>

        {showNew && <NewTemplateForm onDone={() => setShowNew(false)} />}

        {/* Grouped sections */}
        {(["seo", "webdev", "any"] as const).map((type) => {
          const group = grouped[type];
          if (group.length === 0) return null;
          const opt = TYPE_OPTIONS.find((t) => t.value === type)!;
          return (
            <div key={type} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
                <h2 className="text-sm font-semibold" style={{ color: "#cce4ff" }}>{opt.label}</h2>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#1c3248", color: "#4a7090" }}>{group.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {group.map((tpl) => <TemplateCard key={tpl.id} template={tpl} />)}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && !showNew && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm" style={{ color: "#8b90a750" }}>No templates yet</p>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg"
              style={{ background: "#38b6e8", color: "#fff" }}
            >
              <Plus size={13} /> Create your first template
            </button>
          </div>
        )}
      </div>
    </AdminOnly>
  );
}
