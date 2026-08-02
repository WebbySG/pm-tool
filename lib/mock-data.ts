export type Role = "admin" | "staff";
export type ArticleStatus = "draft" | "pending_review" | "changes_requested" | "approved" | "published";
export type ClientApproval = "pending" | "approved" | "changes_requested";

export interface Article {
  id: string;
  projectId: string | null;
  clientId: string | null;
  postType: PostType;
  title: string;
  content: string;
  wordCount: number;
  targetKeyword: string;
  metaDescription: string;
  status: ArticleStatus;
  adminNotes: string;
  reviewToken: string;
  submittedById: string | null;
  submittedByName: string;
  clientApproval: ClientApproval;
  clientApprovedBy: string | null;
  linkedTaskId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleComment {
  id: string;
  articleId: string;
  paragraphIndex: number;
  commenterName: string;
  body: string;
  resolved: boolean;
  createdAt: string;
}
// "missed" = a weekly SEO article slot that was never posted (tombstone written by
// the weekly generator when an unfinished article is carried to the next week).
// "pending_client_approval" = internally approved, now waiting on the CLIENT
// (admin-set only; sits between review and done in the workflow).
// "rejected" = admin refused the work outright — a CLOSED state, no redo loop
// (unlike revision_required, which reopens the task for another attempt).
// "to_be_discussed" = admin parked the task pending a discussion (admin-set
// only; open state; carries an admin discussionNote that clears on exit).
export type TaskStatus = "todo" | "in_progress" | "to_be_discussed" | "pending_review" | "pending_client_approval" | "pending_article_post" | "revision_required" | "done" | "missed" | "rejected";

// Closed (terminal) statuses — tasks in these states never count as active work.
export function isClosedStatus(s: string): boolean {
  return s === "done" || s === "missed" || s === "rejected";
}
export type TaskPriority = number; // 1 (highest) – 10 (lowest)
export type TaskType = "webdev" | "seo" | "both";
export type ProjectPhase = "discovery" | "design" | "development" | "qa" | "launch";
export type PinnedType = "link" | "document" | "message" | "image";
export type RecurringFrequency = "weekly" | "monthly" | "every-3-months" | "every-4-months" | "every-6-months" | "yearly" | null;
export type PostType = "gmb" | "website" | "other";

export interface Channel {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface TaskTemplate {
  id: string;
  parentId: string | null;
  month: number;
  title: string;
  description: string;
  priority: TaskPriority;
  type: TaskType;
  tags: string[];
  recurring: RecurringFrequency;
  recurringDay?: string;
  daysFromStart: number;
  sortOrder: number;
  subtasks: TaskTemplate[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  type: TaskType | "any";
  category: string;
  tasks: TaskTemplate[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
}

export interface Client {
  id: string;
  name: string;
  website: string;
  industry: string;
}

export interface Credential {
  id: string;
  client: string;
  label: string;
  url: string;
  username: string;
  password: string;
  notes: string;
  allowedStaff: string[];
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: "image" | "video" | "document" | "link";
  url: string;
  size?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  subtasks: Task[];
  attachments: TaskAttachment[];
  recurring: RecurringFrequency;
  recurringDay?: string;
  // Auth uid of whoever created the task (DB DEFAULT auth.uid()). Staff may only
  // request deletion of tasks they created. NULL for service-role/MCP inserts and
  // tasks created before the created_by column existed.
  createdBy: string | null;
  // Set when a staff member has requested this task be deleted; a non-null value
  // means the deletion is awaiting admin approval.
  deletionRequestedBy: string | null;
  deletionRequestedAt: string | null;
  // Set when an admin archives a completed task (hidden from all active views;
  // browsable/unarchivable from the Archive page).
  archivedAt: string | null;
  // Article-post workflow: when true, admin Approve parks the task in
  // 'pending_article_post' until the assignee uploads the article to the
  // website and records the live link. Auto-set on weekly SEO article slots;
  // admin-togglable on any task.
  requiresArticlePost: boolean;
  // The live URL recorded via "Mark as Posted" (permanent record).
  articleUrl: string | null;
  // When the task last changed status (DB trigger pm_tasks_set_status_changed_at;
  // stamped optimistically client-side too). Lets the admin tell a NEW
  // pending_review submission from an old one.
  statusChangedAt: string | null;
  // Admin's reference note while the task is parked in 'to_be_discussed'.
  // Transient by design: the pm_tasks_clear_discussion_note DB trigger nulls
  // it whenever the status moves to anything else (statusPatch mirrors this
  // optimistically), so it never lingers on a resumed task.
  discussionNote: string | null;
}

export interface ProjectMedia {
  id: string;
  name: string;
  type: "image" | "video" | "document";
  url: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  thumbnailUrl?: string;
}

export interface PinnedItem {
  id: string;
  type: PinnedType;
  title: string;
  content: string;
  url?: string;
  pinnedBy: string;
  pinnedAt: string;
}

export interface Project {
  id: string;
  // Human-readable URL slug (e.g. "asc-racking"), maintained by a DB trigger
  // from the name. Routes accept slug OR id; links prefer the slug.
  slug?: string | null;
  clientId: string | null;
  channelId: string | null;
  name: string;
  type: TaskType;
  phase: ProjectPhase;
  description: string;
  startDate: string;
  dueDate: string;
  assignedStaff: string[];
  tasks: Task[];
  media: ProjectMedia[];
  pinnedItems: PinnedItem[];
  // Admin archive — loadAll only returns projects where this is NULL, so an
  // archived project (and all its tasks with it) vanishes from active views.
  archivedAt: string | null;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  projectId: string | null;
  taskId?: string | null;
  userId?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

export const USERS: User[] = [
  { id: "u1", name: "Alex Tan", email: "admin@agency.com", role: "admin", avatar: "AT" },
  { id: "u2", name: "Jamie Lee", email: "jamie@agency.com", role: "staff", avatar: "JL" },
  { id: "u3", name: "Sam Cruz", email: "sam@agency.com", role: "staff", avatar: "SC" },
];
