import { supabase } from "./supabase";
import type {
  Project, Task, TaskStatus, TaskPriority, Client, Channel,
  Credential, ProjectTemplate, TaskTemplate, Notification, TaskAttachment,
  Article, ArticleComment, ArticleStatus, ClientApproval, PostType, ProjectMedia,
} from "./mock-data";
import {
  type ProjectTier, DEFAULT_TIER_ICON, DEFAULT_TIER_COLOR, sortTiers,
} from "./project-tiers";

type Row = Record<string, unknown>;

// ─── Type mappings ────────────────────────────────────────────────────────────

function rowToTask(row: Row): Task {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    parentId: (row.parent_id as string | null) ?? null,
    title: row.title as string,
    description: (row.description as string) ?? "",
    status: row.status as TaskStatus,
    priority: typeof row.priority === "number" ? (row.priority as number) : 5,
    type: (row.type as "seo" | "webdev" | "both") ?? "webdev",
    assigneeId: (row.assignee_id as string) ?? "",
    dueDate: (row.due_date as string) ?? "",
    tags: (row.tags as string[]) ?? [],
    recurring: (row.recurring as "weekly" | "monthly" | "every-3-months" | "every-4-months" | "every-6-months" | "yearly" | null) ?? null,
    recurringDay: (row.recurring_day as string) ?? undefined,
    attachments: [],
    subtasks: [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: (row.created_by as string | null) ?? null,
    deletionRequestedBy: (row.deletion_requested_by as string | null) ?? null,
    deletionRequestedAt: (row.deletion_requested_at as string | null) ?? null,
    archivedAt: (row.archived_at as string | null) ?? null,
    requiresArticlePost: (row.requires_article_post as boolean) ?? false,
    articleUrl: (row.article_url as string | null) ?? null,
    statusChangedAt: (row.status_changed_at as string | null) ?? null,
    discussionNote: (row.discussion_note as string | null) ?? null,
    seoPhase: (row.seo_phase as string | null) ?? null,
    isArticle: (row.is_article as boolean) ?? false,
    seoWeek: (row.seo_week as string | null) ?? null,
    seoSlot: (row.seo_slot as string | null) ?? null,
  };
}

function rowToProjectMedia(row: Row): ProjectMedia {
  return {
    id: row.id as string,
    name: row.name as string,
    type: (row.type as ProjectMedia["type"]) ?? "document",
    url: row.url as string,
    size: (row.size as string) ?? "",
    uploadedBy: (row.uploaded_by as string) ?? "",
    uploadedAt: row.uploaded_at as string,
  };
}

function rowToTier(row: Row): ProjectTier {
  return {
    id: row.id as string,
    name: row.name as string,
    // NULL is meaningful (a package that is not a rung on the ladder), so this
    // must stay null rather than defaulting to a number.
    level: typeof row.level === "number" ? (row.level as number) : null,
    shortLabel: (row.short_label as string) ?? "",
    icon: (row.icon as string) || DEFAULT_TIER_ICON,
    color: (row.color as string) || DEFAULT_TIER_COLOR,
    scope: (row.scope as string) ?? "",
    sortOrder: typeof row.sort_order === "number" ? (row.sort_order as number) : 0,
  };
}

function rowToProject(row: Row, tasks: Task[] = [], media: ProjectMedia[] = []): Project {
  return {
    id: row.id as string,
    slug: (row.slug as string | null) ?? null,
    name: row.name as string,
    description: (row.description as string) ?? "",
    type: row.type as "seo" | "webdev" | "both",
    phase: row.phase as Project["phase"],
    clientId: (row.client_id as string | null) ?? null,
    channelId: (row.channel_id as string | null) ?? null,
    tierId: (row.tier_id as string | null) ?? null,
    startDate: row.start_date as string,
    dueDate: (row.due_date as string | null) ?? "",
    assignedStaff: (row.assigned_staff as string[]) ?? [],
    tasks,
    media,
    pinnedItems: [],
    archivedAt: (row.archived_at as string | null) ?? null,
  };
}

// ─── Load everything ──────────────────────────────────────────────────────────

export async function loadAll() {
  const [
    { data: clientRows },
    { data: channelRows },
    { data: projectRows },
    { data: taskRows },
    { data: attachmentRows },
    { data: credRows },
    { data: tplRows },
    { data: tplTaskRows },
    { data: notifRows },
    { data: articleRows },
    { data: mediaRows },
    { data: tierRows },
  ] = await Promise.all([
    supabase.from("pm_clients").select("*"),
    supabase.from("pm_channels").select("*").order("order"),
    supabase.from("pm_projects").select("*").is("archived_at", null),
    supabase.from("pm_tasks").select("*").is("archived_at", null).order("sort_order").order("created_at"),
    supabase.from("pm_task_attachments").select("*"),
    supabase.from("pm_credentials").select("*"),
    supabase.from("pm_project_templates").select("*"),
    supabase.from("pm_task_templates").select("*"),
    supabase.from("pm_notifications").select("*").order("created_at", { ascending: false }),
    supabase.from("pm_articles").select("*").order("created_at", { ascending: false }),
    supabase.from("pm_project_media").select("*").order("uploaded_at", { ascending: false }),
    supabase.from("pm_project_tiers").select("*").order("sort_order"),
  ]);

  // sortTiers, not the DB's `order by sort_order`: the tier LADDER (level 1, 2,
  // 3) is what the badges show, so the list has to be ordered the same way or
  // the picker would contradict the board.
  const tiers: ProjectTier[] = sortTiers((tierRows ?? []).map((r: Row) => rowToTier(r)));

  const clients: Client[] = (clientRows ?? []).map((r: Row) => ({
    id: r.id as string, name: r.name as string,
    website: (r.website as string) ?? "", industry: (r.industry as string) ?? "",
  }));

  const channels: Channel[] = (channelRows ?? []).map((r: Row) => ({
    id: r.id as string, name: r.name as string,
    color: r.color as string, order: r.order as number,
  }));

  const attachsByTask = new Map<string, TaskAttachment[]>();
  for (const a of (attachmentRows ?? []) as Row[]) {
    const tid = a.task_id as string;
    if (!attachsByTask.has(tid)) attachsByTask.set(tid, []);
    attachsByTask.get(tid)!.push({
      id: a.id as string, name: a.name as string,
      type: a.type as TaskAttachment["type"], url: a.url as string,
      size: (a.size as string) ?? "", uploadedBy: (a.uploaded_by as string) ?? "",
      uploadedAt: a.uploaded_at as string,
    });
  }

  const taskMap = new Map<string, Task>();
  for (const r of (taskRows ?? []) as Row[]) {
    const t = rowToTask(r);
    t.attachments = attachsByTask.get(t.id) ?? [];
    taskMap.set(t.id, t);
  }

  const projectTaskMap = new Map<string, Task[]>();
  for (const t of taskMap.values()) {
    if (t.parentId) {
      const parent = taskMap.get(t.parentId);
      if (parent) parent.subtasks.push(t);
    } else {
      if (!projectTaskMap.has(t.projectId)) projectTaskMap.set(t.projectId, []);
      projectTaskMap.get(t.projectId)!.push(t);
    }
  }

  // Project Files tab. Rows are already newest-first from the query.
  const mediaByProject = new Map<string, ProjectMedia[]>();
  for (const r of (mediaRows ?? []) as Row[]) {
    const pid = r.project_id as string;
    if (!mediaByProject.has(pid)) mediaByProject.set(pid, []);
    mediaByProject.get(pid)!.push(rowToProjectMedia(r));
  }

  const projects: Project[] = (projectRows ?? []).map((r: Row) =>
    rowToProject(
      r,
      projectTaskMap.get(r.id as string) ?? [],
      mediaByProject.get(r.id as string) ?? [],
    )
  );

  const credentials: Credential[] = (credRows ?? []).map((r: Row) => ({
    id: r.id as string, client: (r.client_name as string) ?? "",
    label: r.label as string, url: (r.url as string) ?? "",
    username: r.username as string, password: r.password as string,
    notes: (r.notes as string) ?? "", allowedStaff: (r.allowed_staff as string[]) ?? [],
  }));

  const templateMap = new Map<string, ProjectTemplate>();
  for (const r of (tplRows ?? []) as Row[]) {
    templateMap.set(r.id as string, {
      id: r.id as string, name: r.name as string,
      description: (r.description as string) ?? "",
      type: r.type as ProjectTemplate["type"],
      category: (r.category as string) ?? "", tasks: [],
    });
  }

  // Build template task tree
  const ttIdToTemplateId = new Map<string, string>();
  for (const r of (tplTaskRows ?? []) as Row[]) {
    ttIdToTemplateId.set(r.id as string, r.template_id as string);
  }

  const ttMap = new Map<string, TaskTemplate>();
  for (const r of (tplTaskRows ?? []) as Row[]) {
    ttMap.set(r.id as string, {
      id: r.id as string,
      parentId: (r.parent_id as string | null) ?? null,
      month: (r.month as number) ?? 1,
      title: r.title as string,
      description: (r.description as string) ?? "",
      priority: r.priority as TaskPriority,
      type: (r.type as "seo" | "webdev" | "both") ?? "webdev",
      tags: (r.tags as string[]) ?? [],
      recurring: (r.recurring as "weekly" | "monthly" | "every-3-months" | "every-4-months" | "every-6-months" | "yearly" | null) ?? null,
      recurringDay: (r.recurring_day as string) ?? undefined,
      daysFromStart: r.days_from_start as number,
      sortOrder: (r.sort_order as number) ?? 0,
      subtasks: [],
    });
  }
  for (const [ttId, tt] of ttMap.entries()) {
    if (tt.parentId) {
      const parent = ttMap.get(tt.parentId);
      if (parent) parent.subtasks.push(tt);
    } else {
      const tpl = templateMap.get(ttIdToTemplateId.get(ttId) ?? "");
      if (tpl) tpl.tasks.push(tt);
    }
  }

  const notifications: Notification[] = (notifRows ?? []).map((r: Row) => ({
    id: r.id as string, title: r.title as string,
    body: (r.body as string) ?? "", type: (r.type as string) ?? "info",
    projectId: (r.project_id as string | null) ?? null,
    taskId: (r.task_id as string | null) ?? null,
    userId: (r.user_id as string | null) ?? null,
    link: (r.link as string | null) ?? null,
    read: r.read as boolean, createdAt: r.created_at as string,
  }));

  const articles: Article[] = (articleRows ?? []).map(rowToArticle);

  return { clients, channels, projects, tiers, credentials, templates: [...templateMap.values()], notifications, articles };
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function dbAddProject(id: string, data: Omit<Project, "id" | "tasks" | "media" | "pinnedItems" | "archivedAt">) {
  const { error } = await supabase.from("pm_projects").insert({
    id, name: data.name, description: data.description, type: data.type,
    phase: data.phase, client_id: data.clientId ?? null,
    channel_id: data.channelId ?? null,
    tier_id: data.tierId ?? null,
    start_date: data.startDate || null,
    due_date: data.dueDate || null,
    assigned_staff: data.assignedStaff,
  });
  if (error) throw new Error(error.message);
}

export async function dbDeleteProject(id: string) {
  await supabase.from("pm_tasks").delete().eq("project_id", id);
  await supabase.from("pm_projects").delete().eq("id", id);
}

export async function dbUpdateProject(id: string, data: Partial<Pick<Project, "name" | "description" | "type" | "phase" | "channelId" | "clientId" | "tierId" | "startDate" | "dueDate" | "assignedStaff">>) {
  const patch: Row = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (data.type !== undefined) patch.type = data.type;
  if (data.phase !== undefined) patch.phase = data.phase;
  if (data.channelId !== undefined) patch.channel_id = data.channelId;
  if (data.clientId !== undefined) patch.client_id = data.clientId;
  if (data.tierId !== undefined) patch.tier_id = data.tierId;
  if (data.startDate !== undefined) patch.start_date = data.startDate || null;
  if (data.dueDate !== undefined) patch.due_date = data.dueDate || null;
  if (data.assignedStaff !== undefined) patch.assigned_staff = data.assignedStaff;
  // Must throw: every caller updates Zustand optimistically first, so a
  // swallowed error looks exactly like success until the next refresh silently
  // reverts it (staff assignment, project edits, channel moves).
  const { error } = await supabase.from("pm_projects").update(patch).eq("id", id);
  if (error) throw error;
}

// Archive / unarchive a project. Only the project row is stamped — its tasks
// keep their own archived_at untouched, but they disappear from every view
// anyway because loadAll drops the whole project (tasks are nested under
// projects in the store). Unarchiving therefore restores everything intact.
export async function dbSetProjectArchived(projectId: string, archived: boolean) {
  const stamp = archived ? new Date().toISOString() : null;
  const { error } = await supabase.from("pm_projects").update({ archived_at: stamp }).eq("id", projectId);
  if (error) throw error;
}

export async function dbListArchivedProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("pm_projects")
    .select("*")
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });
  if (error) { console.error("dbListArchivedProjects", error); return []; }
  return ((data ?? []) as Row[]).map((r) => rowToProject(r));
}

// ─── Project tiers (client packages) ─────────────────────────────────────────
//
// The package list behind the tier badge. Read by everyone; INSERT/UPDATE/DELETE
// are admin-only in the DATABASE (pm_project_tiers_admin_write reuses
// pm_is_admin()), so these throw rather than failing silently for a staff
// caller — every caller patches Zustand optimistically first.

export async function dbListProjectTiers(): Promise<ProjectTier[]> {
  const { data, error } = await supabase
    .from("pm_project_tiers").select("*").order("sort_order");
  if (error) { console.error("dbListProjectTiers", error); return []; }
  return sortTiers(((data ?? []) as Row[]).map(rowToTier));
}

export async function dbAddProjectTier(tier: Omit<ProjectTier, "id">): Promise<ProjectTier> {
  const { data, error } = await supabase
    .from("pm_project_tiers")
    .insert({
      name: tier.name, level: tier.level, short_label: tier.shortLabel, icon: tier.icon,
      color: tier.color, scope: tier.scope, sort_order: tier.sortOrder,
    })
    .select()
    .single();
  // The id is generated by Postgres, so the row has to come back before the
  // caller can put it in the store — no optimistic id to reconcile later.
  if (error) throw error;
  return rowToTier(data as Row);
}

export async function dbUpdateProjectTier(id: string, data: Partial<Omit<ProjectTier, "id">>) {
  const patch: Row = {};
  if (data.name !== undefined) patch.name = data.name;
  // `!== undefined`, not a truthiness check: null is how the admin takes a
  // package OFF the ladder, and it has to reach the database.
  if (data.level !== undefined) patch.level = data.level;
  if (data.shortLabel !== undefined) patch.short_label = data.shortLabel;
  if (data.icon !== undefined) patch.icon = data.icon;
  if (data.color !== undefined) patch.color = data.color;
  if (data.scope !== undefined) patch.scope = data.scope;
  if (data.sortOrder !== undefined) patch.sort_order = data.sortOrder;
  const { error } = await supabase.from("pm_project_tiers").update(patch).eq("id", id);
  if (error) throw error;
}

// Projects on this package are NOT deleted — pm_projects.tier_id is ON DELETE
// SET NULL, so they just lose the badge until they are relabelled.
export async function dbDeleteProjectTier(id: string) {
  const { error } = await supabase.from("pm_project_tiers").delete().eq("id", id);
  if (error) throw error;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function dbAddTask(id: string, projectId: string, data: Partial<Task> & { title: string }) {
  const { error } = await supabase.from("pm_tasks").insert({
    id, project_id: projectId,
    parent_id: data.parentId ?? null,
    title: data.title,
    description: data.description ?? "",
    status: data.status ?? "todo",
    priority: data.priority ?? 5,
    type: data.type ?? null,
    assignee_id: data.assigneeId ?? null,
    due_date: data.dueDate || null,
    tags: data.tags ?? [],
    recurring: data.recurring ?? null,
    recurring_day: data.recurringDay ?? null,
    seo_phase: data.seoPhase ?? null,
    is_article: data.isArticle ?? false,
    // Was missing until the Articles sheet shipped: "Add article" asks for the
    // live-link workflow, and dropping it here made admin Approve close the
    // task instead of parking it in pending_article_post.
    requires_article_post: data.requiresArticlePost ?? false,
  });


  if (error) {
    console.error("dbAddTask", error);
    throw new Error(error.message || error.details || error.hint || "Unknown DB error");
  }
}

// Which phases of the standard SEO work set a project already has, and the task
// holding each. Reads the TABLE, not the store: archived tasks keep their
// seo_phase and still occupy the pm_tasks_seo_phase_unique index, so seeding
// must see them or it would insert a duplicate and fail. Throws — the caller
// decides what to do with a failure.
export async function dbListSeoPhaseTasks(projectId: string): Promise<{ id: string; seoPhase: string }[]> {
  const { data, error } = await supabase
    .from("pm_tasks")
    .select("id, seo_phase")
    .eq("project_id", projectId)
    .not("seo_phase", "is", null);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: (r as Row).id as string,
    seoPhase: (r as Row).seo_phase as string,
  }));
}

export async function dbUpdateTask(taskId: string, patch: Row) {
  const { error } = await supabase.from("pm_tasks").update(patch).eq("id", taskId);
  // Must throw: every caller updates Zustand optimistically first, so a discarded
  // error looks like a successful save until the next refresh reverts it. This
  // silently lost description edits (incl. freshly uploaded images) for months.
  if (error) throw error;
}

/**
 * Mark (or unmark) a batch of tasks as articles — the Sheet's "Mark shown as
 * articles" action. Chunked so one oversized URL can't fail the batch, and it
 * THROWS: the caller patches Zustand optimistically, so a swallowed error would
 * look like it saved until the next refresh quietly undid it.
 */
export async function dbSetTasksArticle(taskIds: string[], value: boolean) {
  for (let i = 0; i < taskIds.length; i += 50) {
    const chunk = taskIds.slice(i, i + 50);
    const { error } = await supabase
      .from("pm_tasks")
      .update({ is_article: value })
      .in("id", chunk);
    if (error) throw error;
  }
}

export async function dbUpdateTasksBulk(taskIds: string[], patch: Row) {

  if (taskIds.length === 0) return;
  const { error } = await supabase.from("pm_tasks").update(patch).in("id", taskIds);
  if (error) console.error("dbUpdateTasksBulk", error);
}

export async function dbDeleteTask(taskId: string) {
  await supabase.from("pm_tasks").delete().eq("id", taskId);
}

// ─── Archive (admin) ─────────────────────────────────────────────────────────
// Archiving is top-level-task only; children are stamped with the same
// archived_at so the whole subtree disappears from loadAll (which filters
// archived_at IS NULL) and reappears together on unarchive.

export async function dbSetTaskArchived(taskId: string, archived: boolean) {
  const stamp = archived ? new Date().toISOString() : null;
  const { error } = await supabase.from("pm_tasks").update({ archived_at: stamp }).eq("id", taskId);
  if (error) throw error;
  const { error: childErr } = await supabase.from("pm_tasks").update({ archived_at: stamp }).eq("parent_id", taskId);
  if (childErr) throw childErr;
}

/** Archived top-level tasks (subtasks nested), most recently archived first. */
export async function dbListArchivedTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("pm_tasks")
    .select("*")
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });
  if (error) { console.error("dbListArchivedTasks", error); return []; }
  const rows = (data ?? []) as Row[];
  const map = new Map<string, Task>();
  for (const r of rows) map.set(r.id as string, rowToTask(r));
  const top: Task[] = [];
  for (const t of map.values()) {
    if (t.parentId && map.has(t.parentId)) map.get(t.parentId)!.subtasks.push(t);
    else top.push(t);
  }
  return top;
}

// ─── Attachments ──────────────────────────────────────────────────────────────

export async function dbAddAttachment(id: string, taskId: string, att: Omit<TaskAttachment, "id">) {
  const { error } = await supabase.from("pm_task_attachments").insert({
    id, task_id: taskId, name: att.name, type: att.type, url: att.url,
    size: att.size, uploaded_by: att.uploadedBy,
  });
  // Must throw, not log: the caller shows the attachment optimistically, so a
  // swallowed error means the file silently disappears on the next refresh.
  if (error) throw error;
}

export async function dbDeleteAttachment(attachmentId: string) {
  const { error } = await supabase.from("pm_task_attachments").delete().eq("id", attachmentId);
  if (error) throw error;
}

// ─── Project media (Files tab) ────────────────────────────────────────────────

export async function dbAddProjectMedia(id: string, projectId: string, media: Omit<ProjectMedia, "id">) {
  const { error } = await supabase.from("pm_project_media").insert({
    id, project_id: projectId, name: media.name, type: media.type,
    url: media.url, size: media.size, uploaded_by: media.uploadedBy || null,
  });
  if (error) throw error;
}

export async function dbDeleteProjectMedia(mediaId: string) {
  const { error } = await supabase.from("pm_project_media").delete().eq("id", mediaId);
  if (error) throw error;
}

// ─── Recent-activity feeds (admin Activity Log page) ─────────────────────────

export type RecentComment = { id: string; taskId: string; authorId: string; body: string; createdAt: string; hasAttachment: boolean };

export async function dbListRecentComments(limit = 200): Promise<RecentComment[]> {
  const { data, error } = await supabase.from("pm_task_comments")
    .select("id,task_id,author_id,body,created_at,attachments,attachment_url")
    .order("created_at", { ascending: false }).limit(limit);
  if (error) { console.error("dbListRecentComments", error); return []; }
  return (data ?? []).map((r: Row) => ({
    id: r.id as string,
    taskId: r.task_id as string,
    authorId: r.author_id as string,
    body: (r.body as string) ?? "",
    createdAt: r.created_at as string,
    hasAttachment: (Array.isArray(r.attachments) && (r.attachments as unknown[]).length > 0) || !!r.attachment_url,
  }));
}

export type RecentUpload = { id: string; taskId: string; name: string; uploadedBy: string; uploadedAt: string };

export async function dbListRecentUploads(limit = 120): Promise<RecentUpload[]> {
  const { data, error } = await supabase.from("pm_task_attachments")
    .select("id,task_id,name,uploaded_by,uploaded_at")
    .order("uploaded_at", { ascending: false }).limit(limit);
  if (error) { console.error("dbListRecentUploads", error); return []; }
  return (data ?? []).map((r: Row) => ({
    id: r.id as string,
    taskId: r.task_id as string,
    name: (r.name as string) ?? "file",
    uploadedBy: (r.uploaded_by as string) ?? "",
    uploadedAt: r.uploaded_at as string,
  }));
}

// ─── Task Comments ────────────────────────────────────────────────────────────

export type CommentAttachment = {
  url: string;
  name: string | null;
  size: number | null;
  type: string | null; // "image" | "video" | "document" (from uploadAttachment)
};

export type TaskComment = {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  // All of this comment's files. Legacy single-attachment rows (pre multi-
  // attachment, stored in attachment_url/name/size/type) are merged in here
  // at read time, so the UI only ever deals with this array.
  attachments: CommentAttachment[];
  mentionedUserIds: string[];
  createdAt: string;
  editedAt: string | null;
};

function rowToTaskComment(row: Row): TaskComment {
  const arr = Array.isArray(row.attachments) ? (row.attachments as CommentAttachment[]) : [];
  const attachments = arr.filter((a) => a && typeof a.url === "string" && a.url);
  if (attachments.length === 0 && row.attachment_url) {
    attachments.push({
      url: row.attachment_url as string,
      name: (row.attachment_name as string | null) ?? null,
      size: (row.attachment_size as number | null) ?? null,
      type: (row.attachment_type as string | null) ?? null,
    });
  }
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    authorId: row.author_id as string,
    body: (row.body as string) ?? "",
    attachments,
    mentionedUserIds: (row.mentioned_user_ids as string[] | null) ?? [],
    createdAt: row.created_at as string,
    editedAt: (row.edited_at as string | null) ?? null,
  };
}

export async function dbListTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from("pm_task_comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) { console.error("dbListTaskComments", error); return []; }
  return (data ?? []).map((r) => rowToTaskComment(r as Row));
}

export async function dbAddTaskComment(input: {
  taskId: string;
  authorId: string;
  body: string;
  attachments?: CommentAttachment[];
  mentionedUserIds?: string[];
}): Promise<TaskComment | null> {
  const { data, error } = await supabase
    .from("pm_task_comments")
    .insert({
      task_id: input.taskId,
      author_id: input.authorId,
      body: input.body,
      attachments: input.attachments ?? [],
      mentioned_user_ids: input.mentionedUserIds ?? [],
    })
    .select("*")
    .single();
  if (error) { console.error("dbAddTaskComment", error); return null; }
  return rowToTaskComment(data as Row);
}

export async function dbUpdateTaskComment(commentId: string, input: {
  body: string;
  mentionedUserIds?: string[];
}): Promise<TaskComment | null> {
  const patch: Record<string, unknown> = {
    body: input.body,
    edited_at: new Date().toISOString(),
  };
  if (input.mentionedUserIds !== undefined) patch.mentioned_user_ids = input.mentionedUserIds;
  const { data, error } = await supabase
    .from("pm_task_comments")
    .update(patch)
    .eq("id", commentId)
    .select("*")
    .single();
  if (error) { console.error("dbUpdateTaskComment", error); throw error; }
  return rowToTaskComment(data as Row);
}

export async function dbDeleteTaskComment(commentId: string) {
  const { error } = await supabase.from("pm_task_comments").delete().eq("id", commentId);
  if (error) console.error("dbDeleteTaskComment", error);
}

// ─── Task Activity (audit log) ────────────────────────────────────────────────
// Written ONLY by the pm_tasks trigger (pm_log_task_activity). Admin-only read
// (RLS = pm_is_admin()). Staff never see this table.

export type TaskActivity = {
  id: string;
  taskId: string | null;
  projectId: string | null;
  taskTitle: string | null;
  actorId: string | null;
  action: string;          // 'created' | 'updated' | 'moved' | 'deleted'
  field: string | null;    // for 'updated'/'moved': which field changed
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
};

function rowToTaskActivity(row: Row): TaskActivity {
  return {
    id: row.id as string,
    taskId: (row.task_id as string | null) ?? null,
    projectId: (row.project_id as string | null) ?? null,
    taskTitle: (row.task_title as string | null) ?? null,
    actorId: (row.actor_id as string | null) ?? null,
    action: (row.action as string) ?? "updated",
    field: (row.field as string | null) ?? null,
    oldValue: (row.old_value as string | null) ?? null,
    newValue: (row.new_value as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

// Per-task history (newest first). Returns [] for non-admins (RLS blocks the read).
export async function dbListTaskActivity(taskId: string): Promise<TaskActivity[]> {
  const { data, error } = await supabase
    .from("pm_task_activity")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  if (error) { console.error("dbListTaskActivity", error); return []; }
  return (data ?? []).map((r) => rowToTaskActivity(r as Row));
}

// Global feed for the admin Activity page (newest first, capped).
export async function dbListRecentActivity(limit = 200): Promise<TaskActivity[]> {
  const { data, error } = await supabase
    .from("pm_task_activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("dbListRecentActivity", error); return []; }
  return (data ?? []).map((r) => rowToTaskActivity(r as Row));
}

// ─── Task Comment Versions (edit history) ─────────────────────────────────────
// Written ONLY by the pm_task_comments trigger (pm_snapshot_comment_version).
// RLS = pm_is_admin() OR edited_by = auth.uid() (admin + the author).

export type CommentVersion = {
  id: string;
  commentId: string;
  body: string;
  editedBy: string | null;
  supersededAt: string;
};

// Previous bodies of a comment, oldest first (so v1 = original).
export async function dbListCommentVersions(commentId: string): Promise<CommentVersion[]> {
  const { data, error } = await supabase
    .from("pm_task_comment_versions")
    .select("*")
    .eq("comment_id", commentId)
    .order("superseded_at", { ascending: true });
  if (error) { console.error("dbListCommentVersions", error); return []; }
  return (data ?? []).map((r) => {
    const row = r as Row;
    return {
      id: row.id as string,
      commentId: row.comment_id as string,
      body: (row.body as string) ?? "",
      editedBy: (row.edited_by as string | null) ?? null,
      supersededAt: row.superseded_at as string,
    };
  });
}

// ─── Channels ────────────────────────────────────────────────────────────────

export async function dbAddChannel(id: string, name: string, color: string, order: number) {
  const { error } = await supabase.from("pm_channels").insert({ id, name, color, order });
  if (error) console.error("dbAddChannel", error);
}

export async function dbUpdateChannel(id: string, patch: { name?: string; color?: string }) {
  await supabase.from("pm_channels").update(patch).eq("id", id);
}

export async function dbDeleteChannel(id: string) {
  await supabase.from("pm_channels").delete().eq("id", id);
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function dbAddClient(id: string, data: Omit<Client, "id">) {
  const { error } = await supabase.from("pm_clients")
    .insert({ id, name: data.name, website: data.website, industry: data.industry });
  if (error) console.error("dbAddClient", error);
}

export async function dbUpdateClient(id: string, data: Partial<Omit<Client, "id">>) {
  await supabase.from("pm_clients").update(data).eq("id", id);
}

export async function dbDeleteClient(id: string) {
  await supabase.from("pm_clients").delete().eq("id", id);
}

// ─── Credentials ─────────────────────────────────────────────────────────────

export async function dbAddCredential(id: string, data: Omit<Credential, "id">) {
  const { error } = await supabase.from("pm_credentials").insert({
    id, client_name: data.client, label: data.label, url: data.url,
    username: data.username, password: data.password, notes: data.notes,
    allowed_staff: data.allowedStaff,
  });
  if (error) throw new Error(error.message);
}

export async function dbUpdateCredential(id: string, patch: Partial<Omit<Credential, "id">>) {
  const update: Record<string, unknown> = {};
  if (patch.client !== undefined) update.client_name = patch.client;
  if (patch.label !== undefined) update.label = patch.label;
  if (patch.url !== undefined) update.url = patch.url;
  if (patch.username !== undefined) update.username = patch.username;
  if (patch.password !== undefined) update.password = patch.password;
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (patch.allowedStaff !== undefined) update.allowed_staff = patch.allowedStaff;
  if (Object.keys(update).length === 0) return;
  const { error } = await supabase.from("pm_credentials").update(update).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function dbDeleteCredential(id: string) {
  await supabase.from("pm_credentials").delete().eq("id", id);
}

// ─── Templates ───────────────────────────────────────────────────────────────

export async function dbAddTemplate(id: string, data: Omit<ProjectTemplate, "id" | "tasks">) {
  const { error } = await supabase.from("pm_project_templates").insert({
    id, name: data.name, description: data.description, type: data.type, category: data.category,
  });
  if (error) throw new Error(error.message);
}

export async function dbUpdateTemplate(id: string, data: Partial<Omit<ProjectTemplate, "id" | "tasks">>) {
  const { error } = await supabase.from("pm_project_templates").update(data).eq("id", id);
  if (error) console.error("dbUpdateTemplate", error);
}

export async function dbDeleteTemplate(id: string) {
  const { error } = await supabase.from("pm_project_templates").delete().eq("id", id);
  if (error) console.error("dbDeleteTemplate", error);
}

export async function dbAddTemplateTask(id: string, templateId: string, task: Omit<TaskTemplate, "id">) {
  const { error } = await supabase.from("pm_task_templates").insert({
    id, template_id: templateId, title: task.title, description: task.description,
    priority: task.priority, type: task.type, tags: task.tags,
    recurring: task.recurring, recurring_day: task.recurringDay,
    days_from_start: task.daysFromStart,
    parent_id: task.parentId ?? null,
    month: task.month ?? 1,
    sort_order: task.sortOrder ?? 0,
  });
  if (error) throw new Error(error.message);
}

export async function dbUpdateTemplateTask(id: string, patch: Partial<{
  title: string; description: string; priority: TaskPriority;
  type: string; tags: string[]; recurring: string | null;
  recurring_day: string | null; days_from_start: number; month: number;
  parent_id: string | null;
}>): Promise<void> {
  const { error } = await supabase.from("pm_task_templates").update(patch).eq("id", id);
  if (error) console.error("dbUpdateTemplateTask", error);
}

export async function dbDeleteTemplateTask(taskTemplateId: string) {
  const { error } = await supabase.from("pm_task_templates").delete().eq("id", taskTemplateId);
  if (error) console.error("dbDeleteTemplateTask", error);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function dbAddNotification(id: string, data: Omit<Notification, "id" | "createdAt" | "read">) {
  const { error } = await supabase.from("pm_notifications").insert({
    id, title: data.title, body: data.body, type: data.type,
    project_id: data.projectId ?? null,
    task_id: data.taskId ?? null,
    user_id: data.userId ?? null,
    link: data.link ?? null,
  });
  if (error) console.error("dbAddNotification", error);
}

export async function dbMarkNotificationRead(id: string) {
  await supabase.from("pm_notifications").update({ read: true }).eq("id", id);
}

export async function dbMarkAllNotificationsRead() {
  await supabase.from("pm_notifications").update({ read: true }).eq("read", false);
}

// ─── Articles ─────────────────────────────────────────────────────────────────

function rowToArticle(row: Row): Article {
  return {
    id: row.id as string,
    projectId: (row.project_id as string | null) ?? null,
    clientId: (row.client_id as string | null) ?? null,
    postType: ((row.post_type as string) || "other") as PostType,
    title: row.title as string,
    content: row.content as string,
    wordCount: (row.word_count as number) ?? 0,
    targetKeyword: (row.target_keyword as string) ?? "",
    metaDescription: (row.meta_description as string) ?? "",
    status: row.status as ArticleStatus,
    adminNotes: (row.admin_notes as string) ?? "",
    reviewToken: row.review_token as string,
    submittedById: (row.submitted_by_id as string | null) ?? null,
    submittedByName: (row.submitted_by_name as string) ?? "",
    clientApproval: (row.client_approval as ClientApproval) ?? "pending",
    clientApprovedBy: (row.client_approved_by as string | null) ?? null,
    linkedTaskId: (row.linked_task_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToComment(row: Row): ArticleComment {
  return {
    id: row.id as string,
    articleId: row.article_id as string,
    paragraphIndex: row.paragraph_index as number,
    commenterName: row.commenter_name as string,
    body: row.body as string,
    resolved: (row.resolved as boolean) ?? false,
    createdAt: row.created_at as string,
  };
}

export async function dbGetArticles(): Promise<Article[]> {
  const { data } = await supabase
    .from("pm_articles")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map(rowToArticle);
}

export async function dbGetArticle(id: string): Promise<Article | null> {
  const { data } = await supabase.from("pm_articles").select("*").eq("id", id).maybeSingle();
  return data ? rowToArticle(data as Row) : null;
}

export async function dbGetArticleByToken(token: string): Promise<Article | null> {
  const { data } = await supabase.from("pm_articles").select("*").eq("review_token", token).maybeSingle();
  return data ? rowToArticle(data as Row) : null;
}

export async function dbCreateArticle(id: string, data: Omit<Article, "id" | "wordCount" | "reviewToken" | "createdAt" | "updatedAt">): Promise<void> {
  const { error } = await supabase.from("pm_articles").insert({
    id,
    project_id: data.projectId ?? null,
    client_id: data.clientId ?? null,
    post_type: data.postType ?? "other",
    title: data.title,
    content: data.content,
    target_keyword: data.targetKeyword || null,
    meta_description: data.metaDescription || null,
    status: data.status,
    admin_notes: data.adminNotes || null,
    submitted_by_id: data.submittedById ?? null,
    submitted_by_name: data.submittedByName,
    client_approval: data.clientApproval,
    linked_task_id: data.linkedTaskId ?? null,
  });
  if (error) console.error("dbCreateArticle", error);
}

export async function dbUpdateArticle(id: string, patch: Partial<{
  title: string; content: string; target_keyword: string; meta_description: string;
  status: ArticleStatus; admin_notes: string;
  client_approval: ClientApproval; client_approved_by: string;
}>): Promise<void> {
  await supabase.from("pm_articles").update(patch).eq("id", id);
}

export async function dbReorderTasks(tasks: { id: string; sortOrder: number }[]): Promise<void> {
  await Promise.all(tasks.map(({ id, sortOrder }) =>
    supabase.from("pm_tasks").update({ sort_order: sortOrder }).eq("id", id)
  ));
}

export async function dbReorderTemplateTasks(tasks: { id: string; sortOrder: number }[]): Promise<void> {
  await Promise.all(tasks.map(({ id, sortOrder }) =>
    supabase.from("pm_task_templates").update({ sort_order: sortOrder }).eq("id", id)
  ));
}

export async function dbDeleteArticle(id: string): Promise<void> {
  await supabase.from("pm_articles").delete().eq("id", id);
}

export async function dbGetArticleComments(articleId: string): Promise<ArticleComment[]> {
  const { data } = await supabase
    .from("pm_article_comments")
    .select("*")
    .eq("article_id", articleId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(rowToComment);
}

export async function dbAddArticleComment(data: Omit<ArticleComment, "id" | "createdAt">): Promise<ArticleComment | null> {
  const { data: row, error } = await supabase.from("pm_article_comments").insert({
    article_id: data.articleId,
    paragraph_index: data.paragraphIndex,
    commenter_name: data.commenterName,
    body: data.body,
    resolved: data.resolved,
  }).select().single();
  if (error) { console.error("dbAddArticleComment", error); return null; }
  return rowToComment(row as Row);
}

export async function dbResolveComment(commentId: string): Promise<void> {
  await supabase.from("pm_article_comments").update({ resolved: true }).eq("id", commentId);
}

// ─── Weekly Reports ───────────────────────────────────────────────────────────

export interface WeeklyReportTask {
  id: string;
  title: string;
  status: string;
  assigneeName: string;
  dueDate: string;
}

export interface WeeklyReport {
  id: string;
  projectId: string;
  weekStarting: string;
  summaryNotes: string;
  tasksSnapshot: WeeklyReportTask[];
  shareToken: string;
  createdBy: string | null;
  createdAt: string;
}

function rowToWeeklyReport(r: Row): WeeklyReport {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    weekStarting: r.week_starting as string,
    summaryNotes: (r.summary_notes as string) ?? "",
    tasksSnapshot: (r.tasks_snapshot as WeeklyReportTask[]) ?? [],
    shareToken: r.share_token as string,
    createdBy: (r.created_by as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

export async function dbGetWeeklyReports(projectId: string): Promise<WeeklyReport[]> {
  const { data } = await supabase
    .from("pm_weekly_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("week_starting", { ascending: false });
  return (data ?? []).map((r) => rowToWeeklyReport(r as Row));
}

export async function dbGetWeeklyReportByToken(token: string): Promise<WeeklyReport | null> {
  const { data } = await supabase
    .from("pm_weekly_reports")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();
  return data ? rowToWeeklyReport(data as Row) : null;
}

export async function dbCreateWeeklyReport(
  projectId: string,
  weekStarting: string,
  summaryNotes: string,
  tasksSnapshot: WeeklyReportTask[],
  createdBy: string | null,
): Promise<WeeklyReport | null> {
  const { data, error } = await supabase
    .from("pm_weekly_reports")
    .insert({ project_id: projectId, week_starting: weekStarting, summary_notes: summaryNotes, tasks_snapshot: tasksSnapshot, created_by: createdBy })
    .select()
    .single();
  if (error) { console.error("dbCreateWeeklyReport", error); return null; }
  return rowToWeeklyReport(data as Row);
}

export async function dbUpdateWeeklyReport(id: string, patch: { summaryNotes?: string; tasksSnapshot?: WeeklyReportTask[] }): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.summaryNotes !== undefined) update.summary_notes = patch.summaryNotes;
  if (patch.tasksSnapshot !== undefined) update.tasks_snapshot = patch.tasksSnapshot;
  await supabase.from("pm_weekly_reports").update(update).eq("id", id);
}

export async function dbDeleteWeeklyReport(id: string): Promise<void> {
  await supabase.from("pm_weekly_reports").delete().eq("id", id);
}

// ─── Weekly SEO plans (which projects are in the weekly loop) ─────────────────
// The generator (app/api/weekly-seo/run/route.ts) reads these rows with the
// service role; the admin UI (/weekly-seo and the project's Weekly SEO tab)
// reads and writes them through the helpers below. RLS is pm_allow_all, and
// every write path is admin-gated in the UI.

export interface WeeklySeoPlan {
  id: string;
  projectId: string;
  enabled: boolean;
  assigneeId: string | null;
  includeArticles: boolean;
  includeBacklinks: boolean;
  includeGmb: boolean;
  createdAt: string;
}

export interface WeeklySeoPlanPatch {
  enabled?: boolean;
  assigneeId?: string | null;
  includeArticles?: boolean;
  includeBacklinks?: boolean;
  includeGmb?: boolean;
}

function rowToWeeklySeoPlan(r: Row): WeeklySeoPlan {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    enabled: (r.enabled as boolean) ?? true,
    assigneeId: (r.assignee_id as string | null) ?? null,
    includeArticles: (r.include_articles as boolean) ?? true,
    includeBacklinks: (r.include_backlinks as boolean) ?? true,
    includeGmb: (r.include_gmb as boolean) ?? true,
    createdAt: r.created_at as string,
  };
}

export async function dbListWeeklySeoPlans(): Promise<WeeklySeoPlan[]> {
  const { data, error } = await supabase.from("pm_weekly_seo_plans").select("*");
  if (error) throw error;
  return (data ?? []).map((r) => rowToWeeklySeoPlan(r as Row));
}

export async function dbGetWeeklySeoPlan(projectId: string): Promise<WeeklySeoPlan | null> {
  const { data, error } = await supabase
    .from("pm_weekly_seo_plans").select("*").eq("project_id", projectId).maybeSingle();
  if (error) throw error;
  return data ? rowToWeeklySeoPlan(data as Row) : null;
}

/** Enrol a project in the weekly loop, or update its settings. project_id is unique. */
export async function dbSaveWeeklySeoPlan(projectId: string, patch: WeeklySeoPlanPatch): Promise<WeeklySeoPlan> {
  const row: Record<string, unknown> = { project_id: projectId };
  if (patch.enabled !== undefined) row.enabled = patch.enabled;
  if (patch.assigneeId !== undefined) row.assignee_id = patch.assigneeId || null;
  if (patch.includeArticles !== undefined) row.include_articles = patch.includeArticles;
  if (patch.includeBacklinks !== undefined) row.include_backlinks = patch.includeBacklinks;
  if (patch.includeGmb !== undefined) row.include_gmb = patch.includeGmb;
  const { data, error } = await supabase
    .from("pm_weekly_seo_plans")
    .upsert(row, { onConflict: "project_id" })
    .select()
    .single();
  if (error) throw error;
  return rowToWeeklySeoPlan(data as Row);
}

export async function dbDeleteWeeklySeoPlan(projectId: string): Promise<void> {
  const { error } = await supabase.from("pm_weekly_seo_plans").delete().eq("project_id", projectId);
  if (error) throw error;
}

/**
 * Point already-generated upcoming weekly-SEO tasks at a new assignee.
 * Scoped to untouched (`todo`) generator rows from `fromWeekIso` onwards, so
 * work someone has already started or submitted is never yanked away.
 * Returns how many tasks moved.
 */
export async function dbReassignFutureWeeklySeoTasks(
  projectId: string, assigneeId: string | null, fromWeekIso: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("pm_tasks")
    .update({ assignee_id: assigneeId || null })
    .eq("project_id", projectId)
    .eq("status", "todo")
    .gte("seo_week", fromWeekIso)
    .not("seo_slot", "is", null)
    .is("archived_at", null)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

/**
 * How many generator-owned tasks exist per project for each of the given
 * Monday dates — powers the "generated / not generated" column on /weekly-seo.
 * Returns { [projectId]: { [weekIso]: count } }.
 */
export async function dbWeeklySeoTaskCounts(weekIsos: string[]): Promise<Record<string, Record<string, number>>> {
  if (weekIsos.length === 0) return {};
  const { data, error } = await supabase
    .from("pm_tasks")
    .select("project_id,seo_week")
    .in("seo_week", weekIsos)
    .not("seo_slot", "is", null)
    .is("archived_at", null);
  if (error) throw error;
  const out: Record<string, Record<string, number>> = {};
  for (const r of (data ?? []) as Row[]) {
    const pid = r.project_id as string;
    const wk = r.seo_week as string;
    if (!out[pid]) out[pid] = {};
    out[pid][wk] = (out[pid][wk] ?? 0) + 1;
  }
  return out;
}

export interface WeeklySeoRunResult {
  ok: boolean;
  reason?: string;
  dryRun?: boolean;
  weeks?: { weekStarting: string; label: string }[];
  plans?: number;
  failed?: number;
  results?: { project: string; created?: number; closed?: number; tasks?: string[]; error?: string }[];
}

/**
 * Admin "Generate now" — runs the generator immediately instead of waiting for
 * the daily cron. Authorises with the caller's own Supabase access token; the
 * route re-checks admin server-side.
 */
export async function runWeeklySeoNow(projectId?: string): Promise<WeeklySeoRunResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not signed in.");
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  const res = await fetch(`/api/weekly-seo/run${qs}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const body = await res.json().catch(() => ({ ok: false, reason: `HTTP ${res.status}` }));
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.reason ? String(body.reason) : `Generator failed (HTTP ${res.status}).`);
  }
  return body as WeeklySeoRunResult;
}
