export type ConversationKind = "project" | "dm" | "group";
export type ChatAttachmentType = "image" | "video" | "document" | "link";

export type ChatMember = {
  userId: string;
  joinedAt: string;
  lastReadAt: string;
};

// Per-user chat folder. Categories are personal — each user manages their own.
export type ChatCategory = {
  id: string;
  userId: string;
  name: string;
  sortOrder: number;
};

export type ChatConversation = {
  id: string;
  kind: ConversationKind;
  name: string | null;
  projectId: string | null;
  createdBy: string | null;
  createdAt: string;
  lastMessageAt: string;
  members: ChatMember[];
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  authorId: string;
  body: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: ChatAttachmentType | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  mentionedUserIds: string[];
};

export type ConversationWithUnread = ChatConversation & {
  unreadCount: number;
  lastMessagePreview: string | null;
  lastMessageAuthorId: string | null;
  // Current user's personal view state (from their pm_chat_members row)
  pinned: boolean;
  categoryId: string | null;
};
