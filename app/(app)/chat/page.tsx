"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  loadConversationsForUser, loadMessages, sendMessage, markRead,
  findOrCreateDM, createGroup, ensureProjectChannel,
  subscribeToConversation, uploadChatAttachment, resolveMentions,
  editMessage, deleteMessage, parseMentionTokens,
} from "@/lib/chat-db";
import type { ConversationWithUnread, ChatMessage } from "@/lib/chat-types";
import {
  Hash, Users as UsersIcon, MessageSquare, Plus, Send, Paperclip, Search,
  X, Loader2, AtSign, Pencil, Trash2, Image as ImageIcon, FileText,
} from "lucide-react";

interface LiveStaff {
  id: string; user_id: string | null; email: string;
  first_name: string | null; last_name: string | null; avatar_initials: string;
}
const staffAuthId = (s: LiveStaff) => s.user_id ?? s.id;
const staffName = (s: LiveStaff) => [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email;
const staffInitials = (s: LiveStaff) => s.avatar_initials || staffName(s).slice(0, 2).toUpperCase();
const AVATAR_COLORS = ["#818cf8", "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#22d3ee"];

function avatarColor(s: LiveStaff | undefined, all: LiveStaff[]): string {
  if (!s) return "#64748b";
  return AVATAR_COLORS[all.indexOf(s) % AVATAR_COLORS.length] ?? "#64748b";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function formatDateHeader(iso: string) {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const dDay = new Date(d); dDay.setHours(0, 0, 0, 0);
  if (dDay.getTime() === today.getTime()) return "Today";
  if (dDay.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-SG", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}
function isSameDay(a: string, b: string) {
  const dA = new Date(a), dB = new Date(b);
  return dA.toDateString() === dB.toDateString();
}

export default function ChatPage() {
  const { user } = useAuth();
  const { projects } = useStore();
  const [liveStaff, setLiveStaff] = useState<LiveStaff[]>([]);
  const [convs, setConvs] = useState<ConversationWithUnread[]>([]);
  const [convSearch, setConvSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);

  // Load staff + conversations
  useEffect(() => {
    supabase.from("staff_members").select("id,user_id,email,first_name,last_name,avatar_initials")
      .eq("status", "active")
      .then(({ data }) => setLiveStaff((data as LiveStaff[]) ?? []));
  }, []);

  const reloadConvs = async () => {
    if (!user?.id) return;
    setLoadingConvs(true);
    try {
      const list = await loadConversationsForUser(user.id);
      setConvs(list);
      if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    } finally {
      setLoadingConvs(false);
    }
  };

  useEffect(() => { reloadConvs(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  // Re-load conversation list whenever a new message arrives anywhere (for sort + unread)
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel("chat-inbox-page")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pm_chat_messages" }, () => reloadConvs())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pm_chat_conversations" }, () => reloadConvs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const selectedConv = useMemo(() => convs.find((c) => c.id === selectedId) ?? null, [convs, selectedId]);

  // ─── Conversation display helpers ──────────────────────────────────────
  function getConvDisplayName(c: ConversationWithUnread): string {
    if (c.kind === "project") {
      const p = projects.find((pp) => pp.id === c.projectId);
      return p ? `# ${p.name}` : "# Project";
    }
    if (c.kind === "group") return c.name ?? "Group";
    // DM
    const otherUid = c.members.find((m) => m.userId !== user?.id)?.userId;
    const other = liveStaff.find((s) => staffAuthId(s) === otherUid);
    return other ? staffName(other) : "Direct Message";
  }
  function getConvIcon(c: ConversationWithUnread) {
    if (c.kind === "project") return <Hash size={14} style={{ color: "#60a5fa" }} />;
    if (c.kind === "group") return <UsersIcon size={14} style={{ color: "#a78bfa" }} />;
    return <MessageSquare size={14} style={{ color: "#34d399" }} />;
  }

  const filteredConvs = useMemo(() => {
    if (!convSearch.trim()) return convs;
    const q = convSearch.toLowerCase();
    return convs.filter((c) => getConvDisplayName(c).toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convs, convSearch, liveStaff, projects, user?.id]);

  return (
    <>
      <Topbar title="Chat" />
      <div className="flex" style={{ height: "calc(100vh - 65px)" }}>

        {/* ── Conversation list ── */}
        <aside className="flex flex-col shrink-0" style={{ width: 320, borderRight: "1px solid var(--border)", background: "var(--bg-sidebar)" }}>
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <Search size={13} style={{ color: "var(--text-muted)" }} />
              <input value={convSearch} onChange={(e) => setConvSearch(e.target.value)}
                placeholder="Search conversations" className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "var(--text)" }} />
            </div>
            <button onClick={() => setShowNew(true)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
              title="New conversation">
              <Plus size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {loadingConvs ? (
              <div className="flex items-center gap-2 text-xs px-3 py-3" style={{ color: "var(--text-muted)" }}>
                <Loader2 size={12} className="animate-spin" /> Loading…
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="text-xs text-center py-8 px-3" style={{ color: "var(--text-muted)" }}>
                No conversations yet. Click + to start one.
              </div>
            ) : filteredConvs.map((c) => {
              const active = c.id === selectedId;
              return (
                <button key={c.id} onClick={() => setSelectedId(c.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-opacity hover:opacity-90 mb-0.5"
                  style={{ background: active ? "var(--bg-surface)" : "transparent" }}>
                  <div className="shrink-0">{getConvIcon(c)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate" style={{ color: active ? "var(--text)" : "var(--text-muted)" }}>
                        {getConvDisplayName(c)}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="text-xs px-1.5 rounded-full font-bold ml-auto shrink-0"
                          style={{ background: "#ef4444", color: "#fff" }}>{c.unreadCount}</span>
                      )}
                    </div>
                    {c.lastMessagePreview && (
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {c.lastMessagePreview}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Message view ── */}
        <main className="flex-1 flex flex-col min-w-0">
          {selectedConv ? (
            <MessageView
              key={selectedConv.id}
              conversation={selectedConv}
              displayName={getConvDisplayName(selectedConv)}
              liveStaff={liveStaff}
              currentUserId={user?.id ?? ""}
              currentUserName={user?.name ?? ""}
              onAfterChange={reloadConvs}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Select or start a conversation</p>
            </div>
          )}
        </main>
      </div>

      {/* New conversation dialog */}
      {showNew && (
        <NewConversationDialog
          liveStaff={liveStaff}
          currentUserId={user?.id ?? ""}
          isAdmin={user?.pmRole === "admin"}
          projects={projects.map((p) => ({ id: p.id, name: p.name, assignedStaff: p.assignedStaff }))}
          onClose={() => setShowNew(false)}
          onCreated={async (newId) => {
            setShowNew(false);
            await reloadConvs();
            setSelectedId(newId);
          }}
        />
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Message view
// ────────────────────────────────────────────────────────────────────────────

function MessageView({
  conversation, displayName, liveStaff, currentUserId, currentUserName, onAfterChange,
}: {
  conversation: ConversationWithUnread;
  displayName: string;
  liveStaff: LiveStaff[];
  currentUserId: string;
  currentUserName: string;
  onAfterChange: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadMessages(conversation.id).then((m) => {
      if (cancelled) return;
      setMessages(m);
      setLoading(false);
      // mark read
      if (currentUserId) markRead(conversation.id, currentUserId).then(onAfterChange);
    });
    const unsub = subscribeToConversation(conversation.id, {
      onInsert: (msg) => {
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        if (currentUserId) markRead(conversation.id, currentUserId).then(onAfterChange);
      },
      onUpdate: (msg) => {
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...msg, mentionedUserIds: m.mentionedUserIds } : m));
      },
    });
    return () => { cancelled = true; unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, currentUserId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-base)" }}>
        <div>
          <p className="text-base font-semibold" style={{ color: "var(--text)" }}>{displayName}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {conversation.members.length} member{conversation.members.length !== 1 ? "s" : ""}
            {conversation.kind === "project" && " · Project channel"}
            {conversation.kind === "group" && " · Group chat"}
            {conversation.kind === "dm" && " · Direct message"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={14} className="animate-spin" /> Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No messages yet. Say hi 👋</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const showDateHeader = !prev || !isSameDay(prev.createdAt, msg.createdAt);
              const groupWithPrev = prev && prev.authorId === msg.authorId && isSameDay(prev.createdAt, msg.createdAt)
                && new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000;
              return (
                <div key={msg.id}>
                  {showDateHeader && (
                    <div className="text-center my-3">
                      <span className="text-xs px-3 py-1 rounded-full"
                        style={{ background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                        {formatDateHeader(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <MessageItem
                    msg={msg}
                    grouped={Boolean(groupWithPrev)}
                    liveStaff={liveStaff}
                    isOwn={msg.authorId === currentUserId}
                    onSaved={() => { /* realtime will update */ }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Composer */}
      <Composer
        conversationId={conversation.id}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        liveStaff={liveStaff}
        onSent={() => { /* realtime will update */ }}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Individual message
// ────────────────────────────────────────────────────────────────────────────

function MessageItem({
  msg, grouped, liveStaff, isOwn, onSaved,
}: {
  msg: ChatMessage;
  grouped: boolean;
  liveStaff: LiveStaff[];
  isOwn: boolean;
  onSaved: () => void;
}) {
  const author = liveStaff.find((s) => staffAuthId(s) === msg.authorId);
  const color = avatarColor(author, liveStaff);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(msg.body);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSaveEdit() {
    if (!editBody.trim()) return;
    const mentions = resolveMentions(editBody, liveStaff.map((s) => ({ id: staffAuthId(s), firstName: s.first_name })));
    await editMessage(msg.id, editBody, mentions);
    setEditing(false);
    onSaved();
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); return; }
    await deleteMessage(msg.id);
  }

  if (msg.deletedAt) {
    return (
      <div className="flex items-center gap-3 pl-12 py-1">
        <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>Message deleted</p>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3 px-2 py-1 rounded-lg hover:bg-opacity-50"
      style={{ background: "transparent" }}>
      <div className="w-9 shrink-0 flex justify-center pt-0.5">
        {grouped ? (
          <span className="text-xs opacity-0 group-hover:opacity-100" style={{ color: "var(--text-muted)" }}>
            {formatTime(msg.createdAt)}
          </span>
        ) : (
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: color, color: "#fff" }}>
            {author ? staffInitials(author) : "?"}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {!grouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {author ? staffName(author) : "Unknown"}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatTime(msg.createdAt)}</span>
            {msg.editedAt && <span className="text-xs italic" style={{ color: "var(--text-muted)" }}>(edited)</span>}
          </div>
        )}

        {editing ? (
          <div className="flex flex-col gap-1.5">
            <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)}
              rows={Math.max(2, editBody.split("\n").length)}
              className="bg-transparent text-sm outline-none px-2 py-1.5 rounded resize-y w-full"
              style={{ color: "var(--text)", border: "1px solid var(--border)" }}
              onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }} />
            <div className="flex gap-2">
              <button onClick={handleSaveEdit}
                className="text-xs font-semibold px-3 py-1 rounded text-white"
                style={{ background: "var(--accent)" }}>Save</button>
              <button onClick={() => { setEditing(false); setEditBody(msg.body); }}
                className="text-xs px-3 py-1 rounded" style={{ color: "var(--text-muted)" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            {msg.body && (
              <p className="text-sm whitespace-pre-wrap break-words" style={{ color: "var(--text)" }}>
                <RenderBodyWithMentions body={msg.body} liveStaff={liveStaff} />
              </p>
            )}
            {msg.attachmentUrl && (
              <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-1.5 px-3 py-2 rounded-lg text-sm hover:opacity-80"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
                {msg.attachmentType === "image" ? <ImageIcon size={13} /> : <FileText size={13} />}
                {msg.attachmentName}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Hover actions on own messages */}
      {isOwn && !editing && (
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 shrink-0">
          <button onClick={() => setEditing(true)}
            className="w-7 h-7 rounded flex items-center justify-center hover:opacity-70"
            style={{ color: "var(--text-muted)" }} title="Edit">
            <Pencil size={12} />
          </button>
          <button onClick={handleDelete}
            className="w-7 h-7 rounded flex items-center justify-center hover:opacity-70"
            style={{ color: confirmDelete ? "#ef4444" : "var(--text-muted)" }}
            title={confirmDelete ? "Click again to confirm" : "Delete"}>
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function RenderBodyWithMentions({ body, liveStaff }: { body: string; liveStaff: LiveStaff[] }) {
  const tokens = parseMentionTokens(body);
  if (tokens.length === 0) return <>{body}</>;
  const names = new Set(liveStaff.filter((s) => s.first_name).map((s) => s.first_name!.toLowerCase()));
  const parts: React.ReactNode[] = [];
  const regex = /@([a-zA-Z][a-zA-Z0-9_-]{1,30})/g;
  let lastIdx = 0; let m: RegExpExecArray | null;
  while ((m = regex.exec(body)) !== null) {
    if (m.index > lastIdx) parts.push(body.slice(lastIdx, m.index));
    const lower = m[1].toLowerCase();
    if (names.has(lower)) {
      parts.push(
        <span key={m.index} className="px-1 rounded font-semibold"
          style={{ background: "#a78bfa30", color: "#a78bfa" }}>@{m[1]}</span>,
      );
    } else {
      parts.push(m[0]);
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < body.length) parts.push(body.slice(lastIdx));
  return <>{parts}</>;
}

// ────────────────────────────────────────────────────────────────────────────
// Composer
// ────────────────────────────────────────────────────────────────────────────

function Composer({
  conversationId, currentUserId, currentUserName, liveStaff, onSent,
}: {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
  liveStaff: LiveStaff[];
  onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentionMenu, setMentionMenu] = useState<{ query: string; startIdx: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Track @ mentions in input
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setText(v);
    const caret = e.target.selectionStart ?? v.length;
    const before = v.slice(0, caret);
    const m = before.match(/@([a-zA-Z0-9_-]*)$/);
    if (m) {
      setMentionMenu({ query: m[1].toLowerCase(), startIdx: caret - m[0].length });
    } else {
      setMentionMenu(null);
    }
  }

  function pickMention(s: LiveStaff) {
    if (!mentionMenu || !s.first_name) return;
    const before = text.slice(0, mentionMenu.startIdx);
    const after = text.slice((textareaRef.current?.selectionStart ?? text.length));
    const insert = `@${s.first_name} `;
    setText(before + insert + after);
    setMentionMenu(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  const mentionMatches = useMemo(() => {
    if (!mentionMenu) return [];
    return liveStaff.filter((s) => s.first_name && s.first_name.toLowerCase().startsWith(mentionMenu.query)).slice(0, 6);
  }, [mentionMenu, liveStaff]);

  async function handleSend() {
    if (!text.trim() && !file) return;
    setSending(true); setError(null);
    try {
      let attachment = null;
      if (file) {
        attachment = await uploadChatAttachment(file, conversationId);
      }
      const mentions = resolveMentions(text, liveStaff.map((s) => ({ id: staffAuthId(s), firstName: s.first_name })));
      const newMsg = await sendMessage({
        conversationId,
        authorId: currentUserId,
        body: text.trim(),
        attachment,
        mentionedUserIds: mentions,
      });

      // Fire targeted notifications for @-mentions (excluding self)
      if (mentions.length > 0) {
        const notes = mentions
          .filter((uid) => uid !== currentUserId)
          .map((uid) => ({
            user_id: uid,
            type: "mention",
            title: `${currentUserName} mentioned you in chat`,
            body: text.slice(0, 200),
            link: `/chat`,
          }));
        if (notes.length > 0) await supabase.from("pm_notifications").insert(notes);
      }

      setText("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onSent();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !mentionMenu) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="shrink-0 px-5 py-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-base)" }}>
      {file && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg text-xs"
          style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>
          <Paperclip size={11} />
          <span className="flex-1 truncate">{file.name}</span>
          <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
            style={{ color: "#ef4444" }}><X size={11} /></button>
        </div>
      )}

      {mentionMenu && mentionMatches.length > 0 && (
        <div className="mb-2 rounded-lg overflow-hidden"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs px-3 py-1.5 flex items-center gap-1.5"
            style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
            <AtSign size={10} /> mention
          </div>
          {mentionMatches.map((s) => (
            <button key={s.id} onClick={() => pickMention(s)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:opacity-80"
              style={{ color: "var(--text)" }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: avatarColor(s, liveStaff), color: "#fff" }}>
                {staffInitials(s)}
              </div>
              <span>{staffName(s)}</span>
              <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>@{s.first_name?.toLowerCase()}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <label className="cursor-pointer">
          <input ref={fileRef} type="file" className="hidden"
            accept="image/*,video/*,text/*,.pdf,.doc,.docx,.txt,.text,.log,.md,.csv,.rtf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            <Paperclip size={14} />
          </div>
        </label>
        <textarea ref={textareaRef} value={text} onChange={handleChange} onKeyDown={onKeyDown}
          rows={1} placeholder="Type a message — Enter to send, Shift+Enter for newline. Use @ to mention."
          className="flex-1 bg-transparent text-sm outline-none px-3 py-2 rounded-lg resize-none"
          style={{ color: "var(--text)", border: "1px solid var(--border)", minHeight: 38, maxHeight: 160, background: "var(--bg-surface)" }} />
        <button onClick={handleSend} disabled={sending || (!text.trim() && !file)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            opacity: sending || (!text.trim() && !file) ? 0.5 : 1,
          }}>
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </button>
      </div>
      {error && <p className="text-xs mt-1.5" style={{ color: "#ef4444" }}>⚠ {error}</p>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// New conversation dialog
// ────────────────────────────────────────────────────────────────────────────

function NewConversationDialog({
  liveStaff, currentUserId, isAdmin, projects, onClose, onCreated,
}: {
  liveStaff: LiveStaff[];
  currentUserId: string;
  isAdmin: boolean;
  projects: Array<{ id: string; name: string; assignedStaff: string[] }>;
  onClose: () => void;
  onCreated: (newId: string) => void;
}) {
  const [kind, setKind] = useState<"dm" | "group" | "project">("dm");
  const [dmTarget, setDmTarget] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setBusy(true); setError(null);
    try {
      let id = "";
      if (kind === "dm") {
        if (!dmTarget) { setError("Pick someone to message"); setBusy(false); return; }
        id = await findOrCreateDM(currentUserId, dmTarget);
      } else if (kind === "group") {
        if (!groupName.trim()) { setError("Name your group"); setBusy(false); return; }
        if (groupMembers.length < 2) { setError("Pick at least 2 others"); setBusy(false); return; }
        id = await createGroup(groupName.trim(), groupMembers, currentUserId);
      } else {
        if (!projectId) { setError("Pick a project"); setBusy(false); return; }
        const p = projects.find((pp) => pp.id === projectId);
        const defaults = p ? p.assignedStaff : [];
        id = await ensureProjectChannel(projectId, defaults, currentUserId);
      }
      onCreated(id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "#000000b0" }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md flex flex-col gap-4 p-6"
        style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>New conversation</h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>

        {/* Kind switcher */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-surface)" }}>
          {([
            { v: "dm", label: "Direct Message", icon: <MessageSquare size={12} /> },
            { v: "group", label: "Group", icon: <UsersIcon size={12} /> },
            { v: "project", label: "Project Channel", icon: <Hash size={12} /> },
          ] as const).map(({ v, label, icon }) => (
            <button key={v} onClick={() => setKind(v)}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold"
              style={{
                background: kind === v ? "var(--bg-base)" : "transparent",
                color: kind === v ? "var(--text)" : "var(--text-muted)",
              }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {kind === "dm" && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--text-muted)" }}>Message</label>
            <select value={dmTarget} onChange={(e) => setDmTarget(e.target.value)}
              className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
              style={{ color: "var(--text)", border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
              <option value="">— Pick a person —</option>
              {liveStaff.filter((s) => staffAuthId(s) !== currentUserId)
                .map((s) => <option key={s.id} value={staffAuthId(s)}>{staffName(s)}</option>)}
            </select>
          </div>
        )}

        {kind === "group" && (
          <>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--text-muted)" }}>Group name</label>
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Q3 Planning"
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--text-muted)" }}>Add members</label>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto rounded-lg p-1"
                style={{ border: "1px solid var(--border)" }}>
                {liveStaff.filter((s) => staffAuthId(s) !== currentUserId).map((s) => {
                  const id = staffAuthId(s);
                  const checked = groupMembers.includes(id);
                  return (
                    <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:opacity-80"
                      style={{ background: checked ? "var(--bg-surface)" : "transparent" }}>
                      <input type="checkbox" checked={checked}
                        onChange={(e) => setGroupMembers((prev) => e.target.checked ? [...prev, id] : prev.filter((x) => x !== id))} />
                      <span className="text-sm" style={{ color: "var(--text)" }}>{staffName(s)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {kind === "project" && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--text-muted)" }}>Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
              className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
              style={{ color: "var(--text)", border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
              <option value="">— Pick a project —</option>
              {projects.filter((p) => isAdmin || p.assignedStaff.includes(currentUserId))
                .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              Members will default to everyone assigned to that project + admins.
            </p>
          </div>
        )}

        {error && <p className="text-xs" style={{ color: "#ef4444" }}>⚠ {error}</p>}

        <div className="flex gap-2 mt-2">
          <button onClick={handleCreate} disabled={busy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", opacity: busy ? 0.7 : 1 }}>
            {busy && <Loader2 size={12} className="animate-spin" />}
            Create
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ color: "var(--text-muted)", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
