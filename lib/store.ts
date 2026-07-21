import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
import {
  type Project, type Task, type TaskStatus, type TaskPriority,
  type Notification, type ProjectMedia, type PinnedItem,
  type Credential, type Client, type Channel, type ProjectTemplate,
  type TaskTemplate, type TaskAttachment, type RecurringFrequency,
  type Article, type ArticleStatus,
} from "./mock-data";
import * as db from "./db";
import { uploadAttachment, supabase } from "./supabase";
import { notifyPush } from "./push";
import { errorMessage } from "./utils";

interface Store {
  projects: Project[];
  notifications: Notification[];
  credentials: Credential[];
  clients: Client[];
  channels: Channel[];
  templates: ProjectTemplate[];
  articles: Article[];
  initialized: boolean;

  // Init
  init: () => Promise<void>;
  refresh: () => Promise<void>;

  // Channel actions
  addChannel: (name: string, color: string) => Promise<void>;
  renameChannel: (channelId: string, name: string) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
  moveProjectToChannel: (projectId: string, channelId: string | null) => Promise<void>;

  // Template actions
  addTemplate: (tpl: Omit<ProjectTemplate, "id" | "tasks">) => Promise<void>;
  updateTemplate: (tplId: string, data: Partial<Omit<ProjectTemplate, "id" | "tasks">>) => Promise<void>;
  deleteTemplate: (tplId: string) => Promise<void>;
  duplicateTemplate: (tplId: string) => Promise<void>;
  addTemplateTask: (tplId: string, task: Omit<TaskTemplate, "id">) => Promise<void>;
  updateTemplateTask: (tplId: string, taskId: string, data: Partial<Omit<TaskTemplate, "id" | "subtasks">>) => Promise<void>;
  removeTemplateTask: (tplId: string, taskId: string) => Promise<void>;
  promoteTemplateTask: (tplId: string, taskId: string) => Promise<void>;

  // Client actions
  addClient: (client: Omit<Client, "id">) => Promise<void>;
  updateClient: (clientId: string, data: Partial<Omit<Client, "id">>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;

  // Credential actions
  addCredential: (cred: Omit<Credential, "id">) => Promise<void>;
  updateCredential: (credId: string, data: Partial<Pick<Credential, "client" | "label" | "url" | "username" | "password" | "notes">>) => Promise<void>;
  updateCredentialAccess: (credId: string, allowedStaff: string[]) => Promise<void>;
  deleteCredential: (credId: string) => Promise<void>;

  // Task actions
  requestTaskApproval: (projectId: string, taskId: string, staffName: string, taskTitle: string) => Promise<void>;
  approveTaskCompletion: (projectId: string, taskId: string, taskTitle: string) => Promise<void>;
  rejectTask: (projectId: string, taskId: string, taskTitle: string) => Promise<void>;
  updateTaskStatus: (projectId: string, taskId: string, status: TaskStatus) => Promise<void>;
  updateTaskPriority: (projectId: string, taskId: string, priority: TaskPriority) => Promise<void>;
  updateTaskAssignee: (projectId: string, taskId: string, assigneeId: string) => Promise<void>;
  updateTaskDescription: (projectId: string, taskId: string, description: string) => Promise<void>;
  updateTaskTitle: (projectId: string, taskId: string, title: string) => Promise<void>;
  updateTaskDueDate: (projectId: string, taskId: string, dueDate: string) => Promise<void>;
  updateTaskRecurring: (projectId: string, taskId: string, recurring: RecurringFrequency) => Promise<void>;
  addTask: (projectId: string, task: Partial<Task> & { title: string }) => Promise<string>;
  addSubtask: (projectId: string, parentTaskId: string, subtask: { title: string; assigneeId: string; dueDate: string }) => Promise<void>;
  updateSubtask: (projectId: string, taskId: string, subtaskId: string, data: Partial<Task>) => Promise<void>;
  updateSubtaskStatus: (projectId: string, taskId: string, subtaskId: string, status: TaskStatus) => Promise<void>;
  deleteTask: (projectId: string, taskId: string) => Promise<void>;
  moveTaskToProject: (fromProjectId: string, taskId: string, toProjectId: string) => Promise<void>;
  uploadTaskAttachment: (projectId: string, taskId: string, file: File, uploadedBy: string) => Promise<void>;
  deleteAttachment: (projectId: string, taskId: string, attachmentId: string) => Promise<void>;

  // Project actions
  addProject: (project: Omit<Project, "id" | "tasks" | "media" | "pinnedItems">, seedTasks?: Task[]) => Promise<string>;
  updateProject: (projectId: string, data: Partial<Pick<Project, "name" | "description" | "type" | "phase" | "clientId" | "channelId" | "startDate" | "dueDate">>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  assignStaff: (projectId: string, userId: string) => Promise<void>;
  removeStaff: (projectId: string, userId: string) => Promise<void>;

  // Media/pinned (local only for now)
  addMedia: (projectId: string, media: Omit<ProjectMedia, "id">) => void;
  removeMedia: (projectId: string, mediaId: string) => void;
  addPinnedItem: (projectId: string, item: Omit<PinnedItem, "id" | "pinnedAt">) => void;
  removePinnedItem: (projectId: string, itemId: string) => void;

  // Notifications
  markNotificationRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNotification: (n: Omit<Notification, "id" | "createdAt" | "read">) => Promise<void>;

  // Reorder actions
  reorderTasks: (projectId: string, status: TaskStatus, orderedIds: string[]) => Promise<void>;
  reorderTemplateTasks: (tplId: string, month: number, orderedIds: string[]) => Promise<void>;

  // Article actions
  loadArticles: () => Promise<void>;
  createArticle: (data: Omit<Article, "id" | "wordCount" | "reviewToken" | "createdAt" | "updatedAt">) => Promise<string>;
  updateArticleStatus: (id: string, status: ArticleStatus, adminNotes?: string) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  approveArticleAsAdmin: (id: string, adminNotes?: string) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function patchTaskInTree(tasks: Task[], taskId: string, patch: Partial<Task>): Task[] {
  return tasks.map((t) => {
    if (t.id === taskId) return { ...t, ...patch, updatedAt: new Date().toISOString() };
    if (t.subtasks.length) return { ...t, subtasks: patchTaskInTree(t.subtasks, taskId, patch) };
    return t;
  });
}

function appendChildInTree(tasks: Task[], parentId: string, child: Task): Task[] {
  return tasks.map((t) => {
    if (t.id === parentId) return { ...t, subtasks: [...t.subtasks, child] };
    if (t.subtasks.length) return { ...t, subtasks: appendChildInTree(t.subtasks, parentId, child) };
    return t;
  });
}

function removeTaskFromTree(tasks: Task[], taskId: string): Task[] {
  return tasks
    .filter((t) => t.id !== taskId)
    .map((t) => t.subtasks.length ? { ...t, subtasks: removeTaskFromTree(t.subtasks, taskId) } : t);
}

function findTaskInTree(tasks: Task[], taskId: string): Task | null {
  for (const t of tasks) {
    if (t.id === taskId) return t;
    const found = findTaskInTree(t.subtasks, taskId);
    if (found) return found;
  }
  return null;
}

function patchProject(projects: Project[], projectId: string, fn: (p: Project) => Project): Project[] {
  return projects.map((p) => p.id === projectId ? fn(p) : p);
}

function appendChildInTemplateTree(tasks: TaskTemplate[], parentId: string, child: TaskTemplate): TaskTemplate[] {
  return tasks.map((t) => {
    if (t.id === parentId) return { ...t, subtasks: [...t.subtasks, child] };
    if (t.subtasks.length) return { ...t, subtasks: appendChildInTemplateTree(t.subtasks, parentId, child) };
    return t;
  });
}

function removeFromTemplateTree(tasks: TaskTemplate[], taskId: string): TaskTemplate[] {
  return tasks
    .filter((t) => t.id !== taskId)
    .map((t) => t.subtasks.length ? { ...t, subtasks: removeFromTemplateTree(t.subtasks, taskId) } : t);
}

function findInTemplateTree(tasks: TaskTemplate[], taskId: string): TaskTemplate | null {
  for (const t of tasks) {
    if (t.id === taskId) return t;
    const found = findInTemplateTree(t.subtasks, taskId);
    if (found) return found;
  }
  return null;
}

let mediaCounter = 100;
let pinCounter = 100;

export const useStore = create<Store>()(
  persist(
  (set, get) => ({
  projects: [],
  notifications: [],
  credentials: [],
  clients: [],
  channels: [],
  templates: [],
  articles: [],
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    const bail = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("init timeout")), 10000)
    );
    try {
      const data = await Promise.race([db.loadAll(), bail]);
      set({ ...data, initialized: true });
    } catch (e) {
      console.error("store init failed", e);
      set({ initialized: true });
    }
  },

  refresh: async () => {
    try {
      const data = await db.loadAll();
      set(data);
    } catch (e) {
      console.error("store refresh failed", e);
    }
  },

  // ─── Channels ─────────────────────────────────────────────────────────────

  addChannel: async (name, color) => {
    const id = uuid();
    const order = get().channels.length;
    set((s) => ({ channels: [...s.channels, { id, name, color, order }] }));
    db.dbAddChannel(id, name, color, order);
  },

  renameChannel: async (channelId, name) => {
    set((s) => ({ channels: s.channels.map((c) => c.id !== channelId ? c : { ...c, name }) }));
    await db.dbUpdateChannel(channelId, { name });
  },

  deleteChannel: async (channelId) => {
    set((s) => ({
      channels: s.channels.filter((c) => c.id !== channelId),
      projects: s.projects.map((p) => p.channelId === channelId ? { ...p, channelId: null } : p),
    }));
    await db.dbDeleteChannel(channelId);
  },

  moveProjectToChannel: async (projectId, channelId) => {
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, channelId })) }));
    await db.dbUpdateProject(projectId, { channelId });
  },

  // ─── Templates ────────────────────────────────────────────────────────────

  addTemplate: async (tplData) => {
    const id = uuid();
    const newTpl = { ...tplData, id, tasks: [] };
    await db.dbAddTemplate(id, tplData);
    set((s) => ({ templates: [...s.templates, newTpl] }));
  },

  updateTemplate: async (tplId, data) => {
    set((s) => ({ templates: s.templates.map((t) => t.id !== tplId ? t : { ...t, ...data }) }));
    await db.dbUpdateTemplate(tplId, data);
  },

  deleteTemplate: async (tplId) => {
    set((s) => ({ templates: s.templates.filter((t) => t.id !== tplId) }));
    await db.dbDeleteTemplate(tplId);
  },

  duplicateTemplate: async (tplId) => {
    const tpl = get().templates.find((t) => t.id === tplId);
    if (!tpl) return;
    const newTplId = uuid();

    function cloneTasks(tasks: TaskTemplate[], parentId: string | null): TaskTemplate[] {
      return tasks.map((t) => {
        const newId = uuid();
        return { ...t, id: newId, parentId, subtasks: cloneTasks(t.subtasks, newId) };
      });
    }

    const newTasks = cloneTasks(tpl.tasks, null);
    const newTpl: ProjectTemplate = { ...tpl, id: newTplId, name: `Copy of ${tpl.name}`, tasks: newTasks };

    set((s) => ({ templates: [...s.templates, newTpl] }));
    await db.dbAddTemplate(newTplId, { name: newTpl.name, description: newTpl.description, type: newTpl.type, category: newTpl.category });

    function flattenTasks(tasks: TaskTemplate[]): TaskTemplate[] {
      return tasks.flatMap((t) => [{ ...t }, ...flattenTasks(t.subtasks)]);
    }
    for (const task of flattenTasks(newTasks)) {
      await db.dbAddTemplateTask(task.id, newTplId, task);
    }
  },

  updateTemplateTask: async (tplId, taskId, data) => {
    function patchInTree(tasks: TaskTemplate[]): TaskTemplate[] {
      return tasks.map((t) => {
        if (t.id === taskId) return { ...t, ...data };
        if (t.subtasks.length) return { ...t, subtasks: patchInTree(t.subtasks) };
        return t;
      });
    }
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id !== tplId ? t : { ...t, tasks: patchInTree(t.tasks) }
      ),
    }));
    const patch: Parameters<typeof db.dbUpdateTemplateTask>[1] = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.type !== undefined) patch.type = data.type;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.recurring !== undefined) patch.recurring = data.recurring;
    if (data.recurringDay !== undefined) patch.recurring_day = data.recurringDay;
    if (data.daysFromStart !== undefined) patch.days_from_start = data.daysFromStart;
    if (data.month !== undefined) patch.month = data.month;
    await db.dbUpdateTemplateTask(taskId, patch);
  },

  addTemplateTask: async (tplId, taskData) => {
    const id = uuid();
    const newTask: TaskTemplate = { ...taskData, id, subtasks: [] };
    await db.dbAddTemplateTask(id, tplId, taskData);
    set((s) => ({
      templates: s.templates.map((t) => {
        if (t.id !== tplId) return t;
        if (taskData.parentId) {
          return { ...t, tasks: appendChildInTemplateTree(t.tasks, taskData.parentId, newTask) };
        }
        return { ...t, tasks: [...t.tasks, newTask] };
      }),
    }));
  },

  removeTemplateTask: async (tplId, taskId) => {
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id !== tplId ? t : { ...t, tasks: removeFromTemplateTree(t.tasks, taskId) }
      ),
    }));
    await db.dbDeleteTemplateTask(taskId);
  },

  promoteTemplateTask: async (tplId, taskId) => {
    set((s) => {
      const tpl = s.templates.find((t) => t.id === tplId);
      if (!tpl) return s;
      const task = findInTemplateTree(tpl.tasks, taskId);
      if (!task) return s;
      const promoted: TaskTemplate = { ...task, parentId: null, subtasks: [] };
      const withoutTask = removeFromTemplateTree(tpl.tasks, taskId);
      return {
        templates: s.templates.map((t) =>
          t.id !== tplId ? t : { ...t, tasks: [...withoutTask, promoted] }
        ),
      };
    });
    await db.dbUpdateTemplateTask(taskId, { parent_id: null });
  },

  // ─── Clients ──────────────────────────────────────────────────────────────

  addClient: async (clientData) => {
    const id = uuid();
    set((s) => ({ clients: [...s.clients, { ...clientData, id }] }));
    db.dbAddClient(id, clientData);
  },

  updateClient: async (clientId, data) => {
    set((s) => ({ clients: s.clients.map((c) => c.id !== clientId ? c : { ...c, ...data }) }));
    await db.dbUpdateClient(clientId, data);
  },

  deleteClient: async (clientId) => {
    set((s) => ({
      clients: s.clients.filter((c) => c.id !== clientId),
      projects: s.projects.map((p) => p.clientId === clientId ? { ...p, clientId: null } : p),
    }));
    await db.dbDeleteClient(clientId);
  },

  // ─── Credentials ──────────────────────────────────────────────────────────

  addCredential: async (credData) => {
    const id = uuid();
    set((s) => ({ credentials: [...s.credentials, { ...credData, id }] }));
    await db.dbAddCredential(id, credData);
  },

  updateCredential: async (credId, data) => {
    set((s) => ({ credentials: s.credentials.map((c) => c.id !== credId ? c : { ...c, ...data }) }));
    await db.dbUpdateCredential(credId, data);
  },

  updateCredentialAccess: async (credId, allowedStaff) => {
    set((s) => ({ credentials: s.credentials.map((c) => c.id !== credId ? c : { ...c, allowedStaff }) }));
    await db.dbUpdateCredential(credId, { allowedStaff });
  },

  deleteCredential: async (credId) => {
    set((s) => ({ credentials: s.credentials.filter((c) => c.id !== credId) }));
    await db.dbDeleteCredential(credId);
  },

  // ─── Tasks ────────────────────────────────────────────────────────────────

  requestTaskApproval: async (projectId, taskId, staffName, taskTitle) => {
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, tasks: patchTaskInTree(p.tasks, taskId, { status: "pending_review" }) })) }));
    await db.dbUpdateTask(taskId, { status: "pending_review" });
    await get().addNotification({
      title: "Task Approval Requested",
      body: `${staffName} has completed "${taskTitle}" and is requesting your approval.`,
      type: "approval_request",
      projectId,
      taskId,
    });
  },

  approveTaskCompletion: async (projectId, taskId, taskTitle) => {
    const proj = get().projects.find((p) => p.id === projectId);
    const assigneeId = proj ? findTaskInTree(proj.tasks, taskId)?.assigneeId ?? null : null;
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, tasks: patchTaskInTree(p.tasks, taskId, { status: "done" }) })) }));
    await db.dbUpdateTask(taskId, { status: "done" });
    await get().addNotification({
      title: "Task Approved",
      body: `"${taskTitle}" has been approved and marked as complete.`,
      type: "task_assigned",
      projectId,
      taskId,
      userId: assigneeId,
      link: `/projects/${projectId}?task=${taskId}`,
    });
  },

  rejectTask: async (projectId, taskId, taskTitle) => {
    const proj = get().projects.find((p) => p.id === projectId);
    const assigneeId = proj ? findTaskInTree(proj.tasks, taskId)?.assigneeId ?? null : null;
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, tasks: patchTaskInTree(p.tasks, taskId, { status: "revision_required" }) })) }));
    await db.dbUpdateTask(taskId, { status: "revision_required" });
    await get().addNotification({
      title: "Revision Required",
      body: `"${taskTitle}" requires revisions before it can be approved.`,
      type: "task_assigned",
      projectId,
      taskId,
      userId: assigneeId,
      link: `/projects/${projectId}?task=${taskId}`,
    });
  },

  updateTaskStatus: async (projectId, taskId, status) => {
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, tasks: patchTaskInTree(p.tasks, taskId, { status }) })) }));
    await db.dbUpdateTask(taskId, { status });
  },

  updateTaskPriority: async (projectId, taskId, priority) => {
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, tasks: patchTaskInTree(p.tasks, taskId, { priority }) })) }));
    await db.dbUpdateTask(taskId, { priority });
  },

  updateTaskAssignee: async (projectId, taskId, assigneeId) => {
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, tasks: patchTaskInTree(p.tasks, taskId, { assigneeId }) })) }));
    await db.dbUpdateTask(taskId, { assignee_id: assigneeId });
  },

  updateTaskDescription: async (projectId, taskId, description) => {
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, tasks: patchTaskInTree(p.tasks, taskId, { description }) })) }));
    await db.dbUpdateTask(taskId, { description });
  },

  updateTaskTitle: async (projectId, taskId, title) => {
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, tasks: patchTaskInTree(p.tasks, taskId, { title }) })) }));
    await db.dbUpdateTask(taskId, { title });
  },

  updateTaskDueDate: async (projectId, taskId, dueDate) => {
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, tasks: patchTaskInTree(p.tasks, taskId, { dueDate }) })) }));
    await db.dbUpdateTask(taskId, { due_date: dueDate || null });
  },

  updateTaskRecurring: async (projectId, taskId, recurring) => {
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, tasks: patchTaskInTree(p.tasks, taskId, { recurring }) })) }));
    await db.dbUpdateTask(taskId, { recurring });
  },

  addTask: async (projectId, taskData) => {
    const id = uuid();
    const newTask: Task = {
      id, projectId,
      parentId: taskData.parentId ?? null,
      title: taskData.title,
      description: taskData.description ?? "",
      status: taskData.status ?? "todo",
      priority: taskData.priority ?? 5,
      type: taskData.type ?? "webdev",
      assigneeId: taskData.assigneeId ?? "",
      dueDate: taskData.dueDate ?? new Date().toISOString().slice(0, 10),
      tags: taskData.tags ?? [],
      recurring: taskData.recurring ?? null,
      recurringDay: taskData.recurringDay,
      subtasks: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (newTask.parentId) {
      set((s) => ({
        projects: patchProject(s.projects, projectId, (p) => ({
          ...p, tasks: appendChildInTree(p.tasks, newTask.parentId!, newTask),
        })),
      }));
    } else {
      set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, tasks: [...p.tasks, newTask] })) }));
    }
    try {
      await db.dbAddTask(id, projectId, taskData);
    } catch (err: unknown) {
      const msg = errorMessage(err);
      // FK violation on project_id: project exists in store but not DB. Try to recover.
      if (/foreign key|not present in table/i.test(msg) && /project/i.test(msg)) {
        const project = get().projects.find((p) => p.id === projectId);
        if (project) {
          try {
            await db.dbAddProject(projectId, {
              clientId: project.clientId, channelId: project.channelId,
              name: project.name, type: project.type, phase: project.phase,
              description: project.description, startDate: project.startDate,
              dueDate: project.dueDate, assignedStaff: project.assignedStaff,
            });
            await db.dbAddTask(id, projectId, taskData);
            return id;
          } catch (recoverErr) {
            console.error("project recovery failed", recoverErr);
          }
        }
      }
      // Roll back optimistic update
      set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, tasks: removeTaskFromTree(p.tasks, id) })) }));
      throw err;
    }
    return id;
  },

  addSubtask: async (projectId, parentTaskId, subtaskData) => {
    const parent = findTaskInTree(
      get().projects.find((p) => p.id === projectId)?.tasks ?? [],
      parentTaskId
    );
    const id = uuid();
    const newTask: Task = {
      id, projectId, parentId: parentTaskId,
      title: subtaskData.title, description: "",
      status: "todo", priority: parent?.priority ?? 5,
      type: parent?.type ?? "webdev",
      assigneeId: subtaskData.assigneeId,
      dueDate: subtaskData.dueDate,
      tags: [], recurring: null, subtasks: [], attachments: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    set((s) => ({
      projects: patchProject(s.projects, projectId, (p) => ({
        ...p, tasks: appendChildInTree(p.tasks, parentTaskId, newTask),
      })),
    }));
    db.dbAddTask(id, projectId, { ...newTask, parentId: parentTaskId });
  },

  updateSubtask: async (projectId, _parentTaskId, subtaskId, data) => {
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, tasks: patchTaskInTree(p.tasks, subtaskId, data) })) }));
    const patch: Record<string, unknown> = {};
    if (data.status) patch.status = data.status;
    if (data.assigneeId) patch.assignee_id = data.assigneeId;
    if (data.dueDate) patch.due_date = data.dueDate;
    if (data.description !== undefined) patch.description = data.description;
    if (Object.keys(patch).length) await db.dbUpdateTask(subtaskId, patch);
  },

  updateSubtaskStatus: async (projectId, _parentTaskId, subtaskId, status) => {
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, tasks: patchTaskInTree(p.tasks, subtaskId, { status }) })) }));
    await db.dbUpdateTask(subtaskId, { status });
  },

  deleteTask: async (projectId, taskId) => {
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, tasks: removeTaskFromTree(p.tasks, taskId) })) }));
    await db.dbDeleteTask(taskId);
  },

  moveTaskToProject: async (fromProjectId, taskId, toProjectId) => {
    if (fromProjectId === toProjectId) return;
    const fromProject = get().projects.find((p) => p.id === fromProjectId);
    if (!fromProject) return;
    const task = findTaskInTree(fromProject.tasks, taskId);
    if (!task) return;
    // Only top-level tasks may be moved (subtasks travel with their parent)
    if (task.parentId) return;

    function collectIds(t: Task): string[] {
      return [t.id, ...t.subtasks.flatMap(collectIds)];
    }
    function rewriteProjectId(t: Task, pid: string): Task {
      return { ...t, projectId: pid, subtasks: t.subtasks.map((s) => rewriteProjectId(s, pid)) };
    }
    const allIds = collectIds(task);
    const moved = rewriteProjectId(task, toProjectId);

    // Optimistic move in local state
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id === fromProjectId) return { ...p, tasks: removeTaskFromTree(p.tasks, taskId) };
        if (p.id === toProjectId) return { ...p, tasks: [...p.tasks, moved] };
        return p;
      }),
    }));

    try {
      await supabase.from("pm_tasks").update({ project_id: toProjectId }).in("id", allIds);
    } catch (err) {
      // Roll back on failure
      set((s) => ({
        projects: s.projects.map((p) => {
          if (p.id === toProjectId) return { ...p, tasks: removeTaskFromTree(p.tasks, taskId) };
          if (p.id === fromProjectId) return { ...p, tasks: [...p.tasks, task] };
          return p;
        }),
      }));
      throw err;
    }
  },

  uploadTaskAttachment: async (projectId, taskId, file, uploadedBy) => {
    const { url, name, size, type } = await uploadAttachment(file, taskId);
    const id = uuid();
    const attachment: TaskAttachment = {
      id, name, type, url, size: size ?? "", uploadedBy, uploadedAt: new Date().toISOString(),
    };
    set((s) => ({
      projects: patchProject(s.projects, projectId, (p) => ({
        ...p, tasks: patchTaskInTree(p.tasks, taskId, {
          attachments: [...(findTaskInTree(p.tasks, taskId)?.attachments ?? []), attachment],
        }),
      })),
    }));
    db.dbAddAttachment(id, taskId, attachment);
  },

  deleteAttachment: async (projectId, taskId, attachmentId) => {
    set((s) => ({
      projects: patchProject(s.projects, projectId, (p) => ({
        ...p, tasks: patchTaskInTree(p.tasks, taskId, {
          attachments: (findTaskInTree(p.tasks, taskId)?.attachments ?? []).filter((a) => a.id !== attachmentId),
        }),
      })),
    }));
    await db.dbDeleteAttachment(attachmentId);
  },

  // ─── Projects ────────────────────────────────────────────────────────────

  addProject: async (projectData, seedTaskDefs = []) => {
    const id = uuid();
    const seedTasks: Task[] = seedTaskDefs.map((t) => ({
      ...t, id: uuid(), projectId: id, parentId: null,
    }));
    const newProject: Project = { ...projectData, id, tasks: seedTasks, media: [], pinnedItems: [] };
    set((s) => ({ projects: [...s.projects, newProject] }));
    await db.dbAddProject(id, projectData);
    for (const t of seedTasks) {
      await db.dbAddTask(t.id, id, { ...t, parentId: null });
    }
    return id;
  },

  updateProject: async (projectId, data) => {
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, ...data })) }));
    await db.dbUpdateProject(projectId, data);
  },

  deleteProject: async (projectId) => {
    set((s) => ({ projects: s.projects.filter((p) => p.id !== projectId) }));
    await db.dbDeleteProject(projectId);
  },

  assignStaff: async (projectId, userId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project || project.assignedStaff.includes(userId)) return;
    const assignedStaff = [...project.assignedStaff, userId];
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, assignedStaff })) }));
    await db.dbUpdateProject(projectId, { assignedStaff });
  },

  removeStaff: async (projectId, userId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;
    const assignedStaff = project.assignedStaff.filter((id) => id !== userId);
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, assignedStaff })) }));
    await db.dbUpdateProject(projectId, { assignedStaff });
  },

  // ─── Media / Pinned (local only) ─────────────────────────────────────────

  addMedia: (projectId, mediaData) => {
    const id = `m-${++mediaCounter}`;
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, media: [...p.media, { id, ...mediaData }] })) }));
  },

  removeMedia: (projectId, mediaId) => {
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, media: p.media.filter((m) => m.id !== mediaId) })) }));
  },

  addPinnedItem: (projectId, itemData) => {
    const id = `pin-${++pinCounter}`;
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, pinnedItems: [...p.pinnedItems, { id, ...itemData, pinnedAt: new Date().toISOString() }] })) }));
  },

  removePinnedItem: (projectId, itemId) => {
    set((s) => ({ projects: patchProject(s.projects, projectId, (p) => ({ ...p, pinnedItems: p.pinnedItems.filter((i) => i.id !== itemId) })) }));
  },

  // ─── Notifications ────────────────────────────────────────────────────────

  markNotificationRead: async (id) => {
    set((s) => ({ notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n) }));
    await db.dbMarkNotificationRead(id);
  },

  markAllRead: async () => {
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
    await db.dbMarkAllNotificationsRead();
  },

  addNotification: async (data) => {
    const id = uuid();
    set((s) => ({
      notifications: [
        { id, ...data, read: false, createdAt: new Date().toISOString() },
        ...s.notifications,
      ],
    }));
    // Await the insert so the push route can read the row, then fire Web Push
    // (the route only pushes targeted, non-mention notifications).
    await db.dbAddNotification(id, data);
    notifyPush("notification", id);
  },

  // ─── Reorder ──────────────────────────────────────────────────────────────

  reorderTasks: async (projectId, status, orderedIds) => {
    set((s) => ({
      projects: patchProject(s.projects, projectId, (p) => {
        const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
        return {
          ...p,
          tasks: [...p.tasks].sort((a, b) => {
            if (a.status !== status || b.status !== status) return 0;
            const ai = orderMap.get(a.id) ?? 0;
            const bi = orderMap.get(b.id) ?? 0;
            return ai - bi;
          }),
        };
      }),
    }));
    await db.dbReorderTasks(orderedIds.map((id, i) => ({ id, sortOrder: i })));
  },

  reorderTemplateTasks: async (tplId, month, orderedIds) => {
    set((s) => ({
      templates: s.templates.map((t) => {
        if (t.id !== tplId) return t;
        const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
        const reordered = [...t.tasks].sort((a, b) => {
          if (a.month !== month || b.month !== month) return 0;
          const ai = orderMap.get(a.id) ?? Infinity;
          const bi = orderMap.get(b.id) ?? Infinity;
          return ai - bi;
        });
        return { ...t, tasks: reordered };
      }),
    }));
    await db.dbReorderTemplateTasks(orderedIds.map((id, i) => ({ id, sortOrder: i })));
  },

  // ─── Articles ─────────────────────────────────────────────────────────────

  loadArticles: async () => {
    const articles = await db.dbGetArticles();
    set({ articles });
  },

  createArticle: async (data) => {
    const id = uuid();
    await db.dbCreateArticle(id, data);
    const articles = await db.dbGetArticles();
    set({ articles });
    return id;
  },

  updateArticleStatus: async (id, status, adminNotes) => {
    const patch: Parameters<typeof db.dbUpdateArticle>[1] = { status };
    if (adminNotes !== undefined) patch.admin_notes = adminNotes;
    await db.dbUpdateArticle(id, patch);
    set((s) => ({
      articles: s.articles.map((a) =>
        a.id === id ? { ...a, status, adminNotes: adminNotes ?? a.adminNotes } : a
      ),
    }));
  },

  deleteArticle: async (id) => {
    await db.dbDeleteArticle(id);
    set((s) => ({ articles: s.articles.filter((a) => a.id !== id) }));
  },

  approveArticleAsAdmin: async (id, adminNotes) => {
    const patch: Parameters<typeof db.dbUpdateArticle>[1] = {
      status: "approved",
      client_approval: "approved",
    };
    if (adminNotes !== undefined) patch.admin_notes = adminNotes;
    await db.dbUpdateArticle(id, patch);
    set((s) => ({
      articles: s.articles.map((a) =>
        a.id === id ? { ...a, status: "approved" as const, clientApproval: "approved" as const, adminNotes: adminNotes ?? a.adminNotes } : a
      ),
    }));
  },
  }),
  {
    name: "pm-store-v2",
    storage: createJSONStorage(() =>
      typeof window !== "undefined" ? sessionStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      }
    ),
    partialize: (s) => ({
      projects: s.projects,
      notifications: s.notifications,
      credentials: s.credentials,
      clients: s.clients,
      channels: s.channels,
      templates: s.templates,
      articles: s.articles,
    }),
  }
));
