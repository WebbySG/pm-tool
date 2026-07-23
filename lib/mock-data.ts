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
export type TaskStatus = "todo" | "in_progress" | "pending_review" | "revision_required" | "done" | "missed";
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
