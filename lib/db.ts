import { supabase } from "./supabase";
import type {
  Project, Task, TaskStatus, TaskPriority, Client, Channel,
  Credential, ProjectTemplate, TaskTemplate, Notification, TaskAttachment,
  Article, ArticleComment, ArticleStatus, ClientApproval, PostType,
} from "./mock-data";

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
    priority: row.priority as TaskPriority,
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
  };
}

function rowToProject(row: Row, tasks: Task[] = []): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    type: row.type as "seo" | "webdev" | "both",
    phase: row.phase as Project["phase"],
    clientId: (row.client_id as string | null) ?? null,
    channelId: (row.channel_id as string | null) ?? null,
    startDate: row.start_date as string,
    dueDate: (row.due_date as string | null) ?? "",
    assignedStaff: (row.assigned_staff as string[]) ?? [],
    tasks,
    media: [],
    pinnedItems: [],
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
  ] = await Promise.all([
    supabase.from("pm_clients").select("*"),
    supabase.from("pm_channels").select("*").order("order"),
    supabase.from("pm_projects").select("*"),
    supabase.from("pm_tasks").select("*").order("sort_order").order("created_at"),
    supabase.from("pm_task_attachments").select("*"),
    supabase.from("pm_credentials").select("*"),
    supabase.from("pm_project_templates").select("*"),
    supabase.from("pm_task_templates").select("*"),
    supabase.from("pm_notifications").select("*").order("created_at", { ascending: false }),
    supabase.from("pm_articles").select("*").order("created_at", { ascending: false }),
  ]);

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

  const projects: Project[] = (projectRows ?? []).map((r: Row) =>
    rowToProject(r, projectTaskMap.get(r.id as string) ?? [])
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
    read: r.read as boolean, createdAt: r.created_at as string,
  }));

  const articles: Article[] = (articleRows ?? []).map(rowToArticle);

  return { clients, channels, projects, credentials, templates: [...templateMap.values()], notifications, articles };
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function dbAddProject(id: string, data: Omit<Project, "id" | "tasks" | "media" | "pinnedItems">) {
  const { error } = await supabase.from("pm_projects").insert({
    id, name: data.name, description: data.description, type: data.type,
    phase: data.phase, client_id: data.clientId ?? null,
    channel_id: data.channelId ?? null,
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

export async function dbUpdateProject(id: string, data: Partial<Pick<Project, "name" | "description" | "type" | "phase" | "channelId" | "clientId" | "startDate" | "dueDate" | "assignedStaff">>) {
  const patch: Row = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (data.type !== undefined) patch.type = data.type;
  if (data.phase !== undefined) patch.phase = data.phase;
  if (data.channelId !== undefined) patch.channel_id = data.channelId;
  if (data.clientId !== undefined) patch.client_id = data.clientId;
  if (data.startDate !== undefined) patch.start_date = data.startDate || null;
  if (data.dueDate !== undefined) patch.due_date = data.dueDate || null;
  if (data.assignedStaff !== undefined) patch.assigned_staff = data.assignedStaff;
  await supabase.from("pm_projects").update(patch).eq("id", id);
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function dbAddTask(id: string, projectId: string, data: Partial<Task> & { title: string }) {
  const { error } = await supabase.from("pm_tasks").insert({
    id, project_id: projectId,
    parent_id: data.parentId ?? null,
    title: data.title,
    description: data.description ?? "",
    status: data.status ?? "todo",
    priority: data.priority ?? "medium",
    type: data.type ?? null,
    assignee_id: data.assigneeId ?? null,
    due_date: data.dueDate || null,
    tags: data.tags ?? [],
    recurring: data.recurring ?? null,
    recurring_day: data.recurringDay ?? null,
  });
  if (error) console.error("dbAddTask", error);
}

export async function dbUpdateTask(taskId: string, patch: Row) {
  await supabase.from("pm_tasks").update(patch).eq("id", taskId);
}

export async function dbDeleteTask(taskId: string) {
  await supabase.from("pm_tasks").delete().eq("id", taskId);
}

// ─── Attachments ──────────────────────────────────────────────────────────────

export async function dbAddAttachment(id: string, taskId: string, att: Omit<TaskAttachment, "id">) {
  const { error } = await supabase.from("pm_task_attachments").insert({
    id, task_id: taskId, name: att.name, type: att.type, url: att.url,
    size: att.size, uploaded_by: att.uploadedBy,
  });
  if (error) console.error("dbAddAttachment", error);
}

export async function dbDeleteAttachment(attachmentId: string) {
  await supabase.from("pm_task_attachments").delete().eq("id", attachmentId);
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

export async function dbUpdateCredential(id: string, patch: { allowedStaff?: string[] }) {
  if (patch.allowedStaff !== undefined)
    await supabase.from("pm_credentials").update({ allowed_staff: patch.allowedStaff }).eq("id", id);
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
