import { supabase } from "./supabase";
import type {
  ChatConversation, ChatMessage, ChatMember,
  ConversationKind, ChatAttachmentType, ConversationWithUnread, ChatCategory,
  ThreadMeta, ChatPinnedMessage, ChatReaction,
} from "./chat-types";

type Row = Record<string, unknown>;

const CHAT_BUCKET = "pm-attachments";

function rowToConversation(r: Row, members: ChatMember[] = []): ChatConversation {
  return {
    id: r.id as string,
    kind: r.kind as ConversationKind,
    name: (r.name as string | null) ?? null,
    projectId: (r.project_id as string | null) ?? null,
    createdBy: (r.created_by as string | null) ?? null,
    createdAt: r.created_at as string,
    lastMessageAt: r.last_message_at as string,
    members,
  };
}

function rowToMember(r: Row): ChatMember {
  return {
    userId: r.user_id as string,
    joinedAt: r.joined_at as string,
    lastReadAt: r.last_read_at as string,
  };
}

function rowToMessage(r: Row, mentions: string[] = []): ChatMessage {
  return {
    id: r.id as string,
    conversationId: r.conversation_id as string,
    authorId: r.author_id as string,
    body: (r.body as string) ?? "",
    attachmentUrl: (r.attachment_url as string | null) ?? null,
    attachmentName: (r.attachment_name as string | null) ?? null,
    attachmentType: (r.attachment_type as ChatAttachmentType | null) ?? null,
    editedAt: (r.edited_at as string | null) ?? null,
    deletedAt: (r.deleted_at as string | null) ?? null,
    createdAt: r.created_at as string,
    parentId: (r.parent_id as string | null) ?? null,
    mentionedUserIds: mentions,
  };
}

// ─── Conversations ─────────────────────────────────────────────────────────────

export async function loadConversationsForUser(userId: string): Promise<ConversationWithUnread[]> {
  // 1) Get all conversation IDs the user is a member of (+ their personal view state)
  const { data: memberRows, error: mErr } = await supabase
    .from("pm_chat_members")
    .select("conversation_id, last_read_at, pinned, category_id")
    .eq("user_id", userId);
  if (mErr) throw mErr;
  const lastReadByConv = new Map<string, string>();
  const pinnedByConv = new Map<string, boolean>();
  const categoryByConv = new Map<string, string | null>();
  for (const r of memberRows ?? []) {
    const row = r as Row;
    lastReadByConv.set(row.conversation_id as string, row.last_read_at as string);
    pinnedByConv.set(row.conversation_id as string, Boolean(row.pinned));
    categoryByConv.set(row.conversation_id as string, (row.category_id as string | null) ?? null);
  }
  const convIds = Array.from(lastReadByConv.keys());
  if (convIds.length === 0) return [];

  // 2) Conversations + all members + last message (in 3 queries)
  const [{ data: convRows, error: cErr }, { data: allMembersRows, error: amErr }, { data: lastMsgRows, error: lmErr }] = await Promise.all([
    supabase.from("pm_chat_conversations").select("*").in("id", convIds).order("last_message_at", { ascending: false }),
    supabase.from("pm_chat_members").select("*").in("conversation_id", convIds),
    // Latest non-deleted message per conversation (we fetch many then group client-side; OK for small N)
    supabase.from("pm_chat_messages")
      .select("conversation_id, author_id, body, attachment_name, created_at, deleted_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (cErr) throw cErr;
  if (amErr) throw amErr;
  if (lmErr) throw lmErr;

  const membersByConv = new Map<string, ChatMember[]>();
  for (const r of allMembersRows ?? []) {
    const m = rowToMember(r as Row);
    const arr = membersByConv.get((r as Row).conversation_id as string) ?? [];
    arr.push(m);
    membersByConv.set((r as Row).conversation_id as string, arr);
  }

  const previewByConv = new Map<string, { preview: string; authorId: string }>();
  for (const r of lastMsgRows ?? []) {
    const row = r as Row;
    if (row.deleted_at) continue;
    const cid = row.conversation_id as string;
    if (previewByConv.has(cid)) continue; // first non-deleted is latest (already ordered desc)
    const body = (row.body as string) ?? "";
    const attachment = (row.attachment_name as string | null) ?? null;
    const preview = body || (attachment ? `📎 ${attachment}` : "");
    previewByConv.set(cid, { preview, authorId: row.author_id as string });
  }

  // 3) Unread counts: for each conv, count non-deleted messages from others created after last_read_at
  const unreadByConv = new Map<string, number>();
  if (convIds.length > 0) {
    // We do one query per conv to keep SQL simple; for ~50 convs this is fine
    await Promise.all(convIds.map(async (cid) => {
      const lastRead = lastReadByConv.get(cid) ?? new Date(0).toISOString();
      const { count } = await supabase
        .from("pm_chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", cid)
        .gt("created_at", lastRead)
        .neq("author_id", userId)
        .is("deleted_at", null);
      unreadByConv.set(cid, count ?? 0);
    }));
  }

  return (convRows ?? []).map((r) => {
    const c = rowToConversation(r as Row, membersByConv.get((r as Row).id as string) ?? []);
    const preview = previewByConv.get(c.id);
    const withUnread: ConversationWithUnread = {
      ...c,
      unreadCount: unreadByConv.get(c.id) ?? 0,
      lastMessagePreview: preview?.preview ?? null,
      lastMessageAuthorId: preview?.authorId ?? null,
      pinned: pinnedByConv.get(c.id) ?? false,
      categoryId: categoryByConv.get(c.id) ?? null,
    };
    return withUnread;
  });
}

// ─── Conversation creation ─────────────────────────────────────────────────────

export async function findOrCreateDM(userA: string, userB: string): Promise<string> {
  // Find existing DM with exactly these two members
  const [a, b] = [userA, userB].sort();
  // Get all DM conversations where userA is a member
  const { data: aConvs, error: e1 } = await supabase
    .from("pm_chat_members")
    .select("conversation_id")
    .eq("user_id", a);
  if (e1) throw e1;
  const aIds = (aConvs ?? []).map((r) => (r as Row).conversation_id as string);
  if (aIds.length > 0) {
    const { data: candidates, error: e2 } = await supabase
      .from("pm_chat_conversations")
      .select("id, kind")
      .in("id", aIds)
      .eq("kind", "dm");
    if (e2) throw e2;
    const dmIds = (candidates ?? []).map((r) => (r as Row).id as string);
    if (dmIds.length > 0) {
      const { data: bIn, error: e3 } = await supabase
        .from("pm_chat_members")
        .select("conversation_id")
        .eq("user_id", b)
        .in("conversation_id", dmIds);
      if (e3) throw e3;
      const match = (bIn ?? [])[0];
      if (match) return (match as Row).conversation_id as string;
    }
  }

  // Otherwise create
  const { data: conv, error: cErr } = await supabase.from("pm_chat_conversations")
    .insert({ kind: "dm", created_by: userA })
    .select("id").single();
  if (cErr) throw cErr;
  const convId = (conv as { id: string }).id;
  await supabase.from("pm_chat_members").insert([
    { conversation_id: convId, user_id: a },
    { conversation_id: convId, user_id: b },
  ]);
  return convId;
}

export async function createGroup(name: string, memberIds: string[], createdBy: string): Promise<string> {
  const { data: conv, error: cErr } = await supabase.from("pm_chat_conversations")
    .insert({ kind: "group", name, created_by: createdBy })
    .select("id").single();
  if (cErr) throw cErr;
  const convId = (conv as { id: string }).id;
  const allMembers = Array.from(new Set([...memberIds, createdBy]));
  await supabase.from("pm_chat_members").insert(
    allMembers.map((uid) => ({ conversation_id: convId, user_id: uid })),
  );
  return convId;
}

export async function ensureProjectChannel(projectId: string, defaultMemberIds: string[], createdBy: string): Promise<string> {
  const { data: existing } = await supabase.from("pm_chat_conversations")
    .select("id").eq("project_id", projectId).eq("kind", "project").maybeSingle();
  if (existing) {
    // Make sure current user is a member (idempotent)
    await supabase.from("pm_chat_members").upsert(
      { conversation_id: (existing as { id: string }).id, user_id: createdBy },
      { onConflict: "conversation_id,user_id", ignoreDuplicates: true },
    );
    return (existing as { id: string }).id;
  }
  const { data: conv, error: cErr } = await supabase.from("pm_chat_conversations")
    .insert({ kind: "project", project_id: projectId, created_by: createdBy })
    .select("id").single();
  if (cErr) throw cErr;
  const convId = (conv as { id: string }).id;
  const allMembers = Array.from(new Set([...defaultMemberIds, createdBy]));
  await supabase.from("pm_chat_members").insert(
    allMembers.map((uid) => ({ conversation_id: convId, user_id: uid })),
  );
  return convId;
}

export async function renameConversation(conversationId: string, name: string): Promise<void> {
  const { error } = await supabase.from("pm_chat_conversations").update({ name }).eq("id", conversationId);
  if (error) throw error;
}

// Hard-deletes a conversation; cascades to messages/members/mentions via FK.
// For project channels: deletion is allowed (you can recreate by deleting+restoring the project,
// or by app-layer ensureProjectChannel call). UI should restrict this to admins.
export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await supabase.from("pm_chat_conversations").delete().eq("id", conversationId);
  if (error) throw error;
}

// "Leave" — remove yourself from a conversation without deleting it for others.
export async function leaveConversation(conversationId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("pm_chat_members").delete()
    .eq("conversation_id", conversationId).eq("user_id", userId);
  if (error) throw error;
}

export async function addConversationMember(conversationId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("pm_chat_members").upsert(
    { conversation_id: conversationId, user_id: userId },
    { onConflict: "conversation_id,user_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function removeConversationMember(conversationId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("pm_chat_members").delete()
    .eq("conversation_id", conversationId).eq("user_id", userId);
  if (error) throw error;
}

export async function syncProjectChannelMembers(conversationId: string, memberIds: string[]): Promise<void> {
  // Replace member set (additions only - never remove the channel creator)
  const { data: existing } = await supabase.from("pm_chat_members")
    .select("user_id").eq("conversation_id", conversationId);
  const existingIds = new Set((existing ?? []).map((r) => (r as Row).user_id as string));
  const toAdd = memberIds.filter((id) => !existingIds.has(id));
  if (toAdd.length > 0) {
    await supabase.from("pm_chat_members").insert(
      toAdd.map((uid) => ({ conversation_id: conversationId, user_id: uid })),
    );
  }
}

// ─── Pin & Categories (per-user) ────────────────────────────────────────────────

function rowToCategory(r: Row): ChatCategory {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    name: r.name as string,
    sortOrder: (r.sort_order as number) ?? 0,
  };
}

export async function loadChatCategories(userId: string): Promise<ChatCategory[]> {
  const { data, error } = await supabase.from("pm_chat_categories")
    .select("*").eq("user_id", userId)
    .order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowToCategory(r as Row));
}

export async function createChatCategory(userId: string, name: string): Promise<ChatCategory> {
  // Place new category at the end
  const { data: maxRow } = await supabase.from("pm_chat_categories")
    .select("sort_order").eq("user_id", userId)
    .order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const nextOrder = ((maxRow as Row | null)?.sort_order as number ?? -1) + 1;
  const { data, error } = await supabase.from("pm_chat_categories")
    .insert({ user_id: userId, name: name.trim(), sort_order: nextOrder })
    .select("*").single();
  if (error) throw error;
  return rowToCategory(data as Row);
}

export async function renameChatCategory(categoryId: string, name: string): Promise<void> {
  const { error } = await supabase.from("pm_chat_categories")
    .update({ name: name.trim() }).eq("id", categoryId);
  if (error) throw error;
}

// Deleting a category un-categorizes its conversations (FK ON DELETE SET NULL).
export async function deleteChatCategory(categoryId: string): Promise<void> {
  const { error } = await supabase.from("pm_chat_categories").delete().eq("id", categoryId);
  if (error) throw error;
}

export async function setConversationPinned(conversationId: string, userId: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from("pm_chat_members")
    .update({ pinned }).eq("conversation_id", conversationId).eq("user_id", userId);
  if (error) throw error;
}

export async function setConversationCategory(conversationId: string, userId: string, categoryId: string | null): Promise<void> {
  const { error } = await supabase.from("pm_chat_members")
    .update({ category_id: categoryId }).eq("conversation_id", conversationId).eq("user_id", userId);
  if (error) throw error;
}

// ─── Messages ──────────────────────────────────────────────────────────────────

// Attach mentioned_user_ids to a batch of already-loaded messages (in place).
async function attachMentions(msgs: ChatMessage[]): Promise<ChatMessage[]> {
  if (msgs.length === 0) return msgs;
  const ids = msgs.map((m) => m.id);
  const { data: mentionRows } = await supabase.from("pm_chat_mentions")
    .select("message_id, mentioned_user_id").in("message_id", ids);
  const mentionsByMsg = new Map<string, string[]>();
  for (const r of mentionRows ?? []) {
    const row = r as Row;
    const arr = mentionsByMsg.get(row.message_id as string) ?? [];
    arr.push(row.mentioned_user_id as string);
    mentionsByMsg.set(row.message_id as string, arr);
  }
  for (const m of msgs) m.mentionedUserIds = mentionsByMsg.get(m.id) ?? [];
  return msgs;
}

// Top-level timeline: only messages with parent_id IS NULL (thread replies are
// shown in the thread side-panel, not the main timeline).
export async function loadMessages(conversationId: string, limit = 200): Promise<ChatMessage[]> {
  const { data: rows, error } = await supabase.from("pm_chat_messages")
    .select("*").eq("conversation_id", conversationId).is("parent_id", null)
    .order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  const msgs = (rows ?? []).map((r) => rowToMessage(r as Row)).reverse();
  return attachMentions(msgs);
}

// Load all replies for a thread root, oldest first.
export async function loadThreadReplies(rootId: string): Promise<ChatMessage[]> {
  const { data: rows, error } = await supabase.from("pm_chat_messages")
    .select("*").eq("parent_id", rootId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const msgs = (rows ?? []).map((r) => rowToMessage(r as Row));
  return attachMentions(msgs);
}

// Reply summary per thread-root for the whole conversation (for the "N replies" badge).
export async function loadThreadMeta(conversationId: string): Promise<Map<string, ThreadMeta>> {
  const { data: rows, error } = await supabase.from("pm_chat_messages")
    .select("parent_id, author_id, created_at, deleted_at")
    .eq("conversation_id", conversationId)
    .not("parent_id", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const out = new Map<string, ThreadMeta>();
  for (const r of rows ?? []) {
    const row = r as Row;
    if (row.deleted_at) continue;
    const root = row.parent_id as string;
    const existing = out.get(root);
    if (existing) {
      existing.count += 1;
      existing.lastReplyAt = row.created_at as string;
      if (!existing.participantIds.includes(row.author_id as string)) existing.participantIds.push(row.author_id as string);
    } else {
      out.set(root, { count: 1, lastReplyAt: row.created_at as string, participantIds: [row.author_id as string] });
    }
  }
  return out;
}

export type SendMessageInput = {
  conversationId: string;
  authorId: string;
  body: string;
  attachment?: { url: string; name: string; type: ChatAttachmentType } | null;
  mentionedUserIds?: string[];
  // When set, this message is a reply within the given thread-root's thread.
  parentId?: string | null;
};

export async function sendMessage(input: SendMessageInput): Promise<ChatMessage> {
  const { data: row, error } = await supabase.from("pm_chat_messages").insert({
    conversation_id: input.conversationId,
    author_id: input.authorId,
    body: input.body,
    attachment_url: input.attachment?.url ?? null,
    attachment_name: input.attachment?.name ?? null,
    attachment_type: input.attachment?.type ?? null,
    parent_id: input.parentId ?? null,
  }).select("*").single();
  if (error) throw error;
  const msg = rowToMessage(row as Row);

  // Persist mentions
  const mentions = Array.from(new Set(input.mentionedUserIds ?? []));
  if (mentions.length > 0) {
    await supabase.from("pm_chat_mentions").insert(
      mentions.map((uid) => ({ message_id: msg.id, mentioned_user_id: uid })),
    );
    msg.mentionedUserIds = mentions;
  }

  return msg;
}

export async function editMessage(messageId: string, body: string, mentionedUserIds: string[] = []): Promise<void> {
  const { error } = await supabase.from("pm_chat_messages")
    .update({ body, edited_at: new Date().toISOString() })
    .eq("id", messageId);
  if (error) throw error;
  // Replace mentions
  await supabase.from("pm_chat_mentions").delete().eq("message_id", messageId);
  if (mentionedUserIds.length > 0) {
    await supabase.from("pm_chat_mentions").insert(
      mentionedUserIds.map((uid) => ({ message_id: messageId, mentioned_user_id: uid })),
    );
  }
}

export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from("pm_chat_messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId);
  if (error) throw error;
}

export async function markRead(conversationId: string, userId: string): Promise<void> {
  await supabase.from("pm_chat_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

// ─── Attachments ───────────────────────────────────────────────────────────────

export async function uploadChatAttachment(file: File, conversationId: string): Promise<{ url: string; name: string; type: ChatAttachmentType }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `chat/${conversationId}/${Date.now()}_${safeName}`;
  const contentType = file.type || "application/octet-stream";
  const { error } = await supabase.storage.from(CHAT_BUCKET).upload(path, file, { contentType });
  if (error) throw error;
  const { data } = supabase.storage.from(CHAT_BUCKET).getPublicUrl(path);
  const type: ChatAttachmentType = file.type.startsWith("image/") ? "image"
    : file.type.startsWith("video/") ? "video" : "document";
  return { url: data.publicUrl, name: file.name, type };
}

// ─── Pinned messages (per-conversation, shared, unlimited) ──────────────────────

export async function loadPinnedMessages(conversationId: string): Promise<ChatPinnedMessage[]> {
  const { data: pinRows, error } = await supabase.from("pm_chat_pinned_messages")
    .select("*").eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const pins = pinRows ?? [];
  if (pins.length === 0) return [];

  const msgIds = pins.map((r) => (r as Row).message_id as string);
  const { data: msgRows } = await supabase.from("pm_chat_messages").select("*").in("id", msgIds);
  const msgById = new Map<string, ChatMessage>();
  for (const r of msgRows ?? []) {
    const m = rowToMessage(r as Row);
    msgById.set(m.id, m);
  }
  await attachMentions(Array.from(msgById.values()));

  return pins.map((r) => {
    const row = r as Row;
    return {
      id: row.id as string,
      conversationId: row.conversation_id as string,
      messageId: row.message_id as string,
      pinnedBy: (row.pinned_by as string | null) ?? null,
      createdAt: row.created_at as string,
      message: msgById.get(row.message_id as string) ?? null,
    };
  });
}

export async function pinMessage(conversationId: string, messageId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("pm_chat_pinned_messages").upsert(
    { conversation_id: conversationId, message_id: messageId, pinned_by: userId },
    { onConflict: "conversation_id,message_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function unpinMessage(conversationId: string, messageId: string): Promise<void> {
  const { error } = await supabase.from("pm_chat_pinned_messages").delete()
    .eq("conversation_id", conversationId).eq("message_id", messageId);
  if (error) throw error;
}

export function subscribeToPinned(conversationId: string, onChange: () => void) {
  const channel = supabase.channel(`chat-pinned-${conversationId}`)
    .on("postgres_changes", {
      event: "*", schema: "public", table: "pm_chat_pinned_messages",
      filter: `conversation_id=eq.${conversationId}`,
    }, () => onChange())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ─── Emoji reactions ────────────────────────────────────────────────────────────

export async function loadReactions(conversationId: string): Promise<ChatReaction[]> {
  const { data, error } = await supabase.from("pm_chat_reactions")
    .select("*").eq("conversation_id", conversationId);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as Row;
    return {
      id: row.id as string,
      conversationId: row.conversation_id as string,
      messageId: row.message_id as string,
      userId: row.user_id as string,
      emoji: row.emoji as string,
    };
  });
}

export async function addReaction(conversationId: string, messageId: string, userId: string, emoji: string): Promise<void> {
  const { error } = await supabase.from("pm_chat_reactions").upsert(
    { conversation_id: conversationId, message_id: messageId, user_id: userId, emoji },
    { onConflict: "message_id,user_id,emoji", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
  const { error } = await supabase.from("pm_chat_reactions").delete()
    .eq("message_id", messageId).eq("user_id", userId).eq("emoji", emoji);
  if (error) throw error;
}

export function subscribeToReactions(conversationId: string, onChange: () => void) {
  const channel = supabase.channel(`chat-reactions-${conversationId}`)
    .on("postgres_changes", {
      event: "*", schema: "public", table: "pm_chat_reactions",
      filter: `conversation_id=eq.${conversationId}`,
    }, () => onChange())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ─── Unread totals ────────────────────────────────────────────────────────────

export async function getTotalUnreadForUser(userId: string): Promise<number> {
  const { data: memberRows, error: mErr } = await supabase
    .from("pm_chat_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);
  if (mErr) return 0;
  if (!memberRows || memberRows.length === 0) return 0;
  let total = 0;
  await Promise.all((memberRows as Row[]).map(async (r) => {
    const cid = r.conversation_id as string;
    const lastRead = (r.last_read_at as string) ?? new Date(0).toISOString();
    const { count } = await supabase
      .from("pm_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", cid)
      .gt("created_at", lastRead)
      .neq("author_id", userId)
      .is("deleted_at", null);
    total += count ?? 0;
  }));
  return total;
}

// ─── Realtime subscriptions ────────────────────────────────────────────────────

export function subscribeToConversation(
  conversationId: string,
  handlers: {
    onInsert?: (msg: ChatMessage) => void;
    onUpdate?: (msg: ChatMessage) => void;
  },
) {
  const channel = supabase.channel(`chat-conv-${conversationId}`)
    .on("postgres_changes", {
      event: "INSERT", schema: "public", table: "pm_chat_messages",
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      const m = rowToMessage(payload.new as Row);
      handlers.onInsert?.(m);
    })
    .on("postgres_changes", {
      event: "UPDATE", schema: "public", table: "pm_chat_messages",
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      const m = rowToMessage(payload.new as Row);
      handlers.onUpdate?.(m);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function subscribeToInboxForUser(
  _userId: string,
  onAnyChange: () => void,
) {
  const channel = supabase.channel(`chat-inbox`)
    .on("postgres_changes", {
      event: "*", schema: "public", table: "pm_chat_messages",
    }, () => onAnyChange())
    .on("postgres_changes", {
      event: "*", schema: "public", table: "pm_chat_conversations",
    }, () => onAnyChange())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ─── @-mention parsing ────────────────────────────────────────────────────────

// Match @firstname (alphanumeric + dash + underscore). Returns lowercased first names.
export function parseMentionTokens(body: string): string[] {
  const matches = body.match(/@([a-zA-Z][a-zA-Z0-9_-]{1,30})/g) ?? [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
}

export function resolveMentions(body: string, staff: Array<{ id: string; firstName: string | null }>): string[] {
  const tokens = parseMentionTokens(body);
  if (tokens.length === 0) return [];
  const byName = new Map<string, string>();
  for (const s of staff) {
    if (s.firstName) byName.set(s.firstName.toLowerCase(), s.id);
  }
  return tokens.map((t) => byName.get(t)).filter((id): id is string => !!id);
}
