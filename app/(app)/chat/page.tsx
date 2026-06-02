"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  loadConversationsForUser, loadMessages, sendMessage, markRead,
  findOrCreateDM, createGroup, ensureProjectChannel,
  subscribeToConversation, uploadChatAttachment, resolveMentions,
  editMessage, deleteMessage, parseMentionTokens,
  renameConversation, addConversationMember, removeConversationMember,
  deleteConversation, leaveConversation,
  loadChatCategories, createChatCategory, renameChatCategory, deleteChatCategory,
  setConversationPinned, setConversationCategory,
  loadThreadReplies, loadThreadMeta, loadPinnedMessages, pinMessage, unpinMessage, subscribeToPinned,
  loadReactions, addReaction, removeReaction, subscribeToReactions,
} from "@/lib/chat-db";
import type { ConversationWithUnread, ChatMessage, ChatCategory, ThreadMeta, ChatPinnedMessage, ChatReaction } from "@/lib/chat-types";
import type { Project, Task } from "@/lib/mock-data";
import { playNotificationSound, playSentSound, isChatSoundMuted, setChatSoundMuted } from "@/lib/notification-sound";
import {
  getNotificationPermission, requestNotificationPermission, type WebNotificationPermission,
} from "@/lib/web-notifications";
import { subscribeToPush, notifyPush } from "@/lib/push";
import { TaskDrawer } from "@/components/task-drawer";
import {
  Hash, Users as UsersIcon, MessageSquare, MessageCircle, Plus, Send, Paperclip, Search,
  X, Loader2, AtSign, Pencil, Trash2, Image as ImageIcon, FileText,
  Settings, UserPlus, CheckSquare, CircleDashed, ListTodo, LogOut, CornerUpLeft,
  Pin, PinOff, MoreVertical, Folder, FolderPlus, ChevronDown, ChevronRight, Check,
  Volume2, VolumeX, BellRing, Smile,
} from "lucide-react";

// Walk projects to find a task by ID (top-level or subtask)
function findTaskById(projects: Project[], taskId: string): { task: Task; projectId: string; projectName: string } | null {
  for (const p of projects) {
    for (const t of p.tasks) {
      if (t.id === taskId) return { task: t, projectId: p.id, projectName: p.name };
      for (const sub of t.subtasks) {
        if (sub.id === taskId) return { task: sub, projectId: p.id, projectName: p.name };
      }
    }
  }
  return null;
}

const TASK_REF_REGEX = /\[task:([0-9a-fA-F-]{36})\]/g;
const taskStatusColor: Record<string, string> = {
  todo: "#64748b",
  in_progress: "#3b82f6",
  pending_review: "#a855f7",
  revision_required: "#f59e0b",
  done: "#22c55e",
};
const taskStatusLabel: Record<string, string> = {
  todo: "To Do", in_progress: "In Progress", pending_review: "Pending Review",
  revision_required: "Revision Required", done: "Done",
};

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
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [categories, setCategories] = useState<ChatCategory[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newCatInput, setNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  // Deep-link: /chat?c=<id> opens that conversation (e.g. from the unread popup).
  const searchParams = useSearchParams();
  const deepLinkRef = useRef<string | null>(null);
  useEffect(() => { const c = searchParams.get("c"); if (c) deepLinkRef.current = c; }, [searchParams]);

  // Resolve the open task drawer (live from store)
  const openTaskRef = useMemo(() => openTaskId ? findTaskById(projects, openTaskId) : null, [openTaskId, projects]);

  // Apply the deep link once the target conversation is present in the list.
  useEffect(() => {
    const target = deepLinkRef.current;
    if (target && convs.some((c) => c.id === target)) {
      setSelectedId(target);
      deepLinkRef.current = null;
    }
  }, [convs]);

  // Load staff + conversations
  useEffect(() => {
    supabase.from("staff_members").select("id,user_id,email,first_name,last_name,avatar_initials")
      .eq("status", "active")
      .then(({ data }) => setLiveStaff((data as LiveStaff[]) ?? []));
  }, []);

  // `silent` = background refresh (realtime, after sending): update the list in place
  // WITHOUT flipping the loading spinner, so the sidebar doesn't flash on every message.
  const reloadConvs = async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLoadingConvs(true);
    try {
      const list = await loadConversationsForUser(user.id);
      setConvs(list);
      if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    } finally {
      if (!silent) setLoadingConvs(false);
    }
  };

  useEffect(() => { reloadConvs(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const reloadCategories = async () => {
    if (!user?.id) { setCategories([]); return; }
    setCategories(await loadChatCategories(user.id));
  };
  useEffect(() => { reloadCategories(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  // Restore collapsed sections from localStorage (per user)
  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(`chat-collapsed-${user.id}`);
      if (raw) setCollapsed(new Set(JSON.parse(raw) as string[]));
    } catch { /* ignore */ }
  }, [user?.id]);

  function toggleCollapsed(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      if (user?.id) {
        try { localStorage.setItem(`chat-collapsed-${user.id}`, JSON.stringify([...next])); } catch { /* ignore */ }
      }
      return next;
    });
  }

  // ─── Pin / category mutations (optimistic local update + persist) ──────────
  async function handleTogglePin(c: ConversationWithUnread) {
    if (!user?.id) return;
    const next = !c.pinned;
    setConvs((prev) => prev.map((x) => (x.id === c.id ? { ...x, pinned: next } : x)));
    try { await setConversationPinned(c.id, user.id, next); }
    catch { reloadConvs(); }
  }

  async function handleMoveToCategory(c: ConversationWithUnread, categoryId: string | null) {
    if (!user?.id) return;
    setConvs((prev) => prev.map((x) => (x.id === c.id ? { ...x, categoryId } : x)));
    try { await setConversationCategory(c.id, user.id, categoryId); }
    catch { reloadConvs(); }
  }

  // Create a category and immediately move the conversation into it
  async function handleCreateCategoryAndMove(c: ConversationWithUnread, name: string) {
    if (!user?.id || !name.trim()) return;
    try {
      const cat = await createChatCategory(user.id, name);
      setCategories((prev) => [...prev, cat]);
      await handleMoveToCategory(c, cat.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not create category (name may already exist).");
    }
  }

  async function handleRenameCategory(categoryId: string, name: string) {
    if (!name.trim()) return;
    setCategories((prev) => prev.map((cat) => (cat.id === categoryId ? { ...cat, name: name.trim() } : cat)));
    try { await renameChatCategory(categoryId, name); }
    catch { reloadCategories(); }
  }

  async function handleDeleteCategory(categoryId: string) {
    setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
    setConvs((prev) => prev.map((x) => (x.categoryId === categoryId ? { ...x, categoryId: null } : x)));
    try { await deleteChatCategory(categoryId); }
    catch { reloadCategories(); reloadConvs(); }
  }

  async function submitNewCategory() {
    const name = newCatName.trim();
    setNewCatInput(false); setNewCatName("");
    if (!user?.id || !name) return;
    try {
      const cat = await createChatCategory(user.id, name);
      setCategories((prev) => [...prev, cat]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not create category (name may already exist).");
    }
  }

  // Re-load conversation list whenever a new message arrives anywhere (for sort + unread)
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel("chat-inbox-page")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pm_chat_messages" }, () => reloadConvs(true))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pm_chat_conversations" }, () => reloadConvs(true))
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

  // Count of active (not done) tasks relevant to this conversation
  function getConvTaskCount(c: ConversationWithUnread): number {
    if (c.kind === "project") {
      const p = projects.find((pp) => pp.id === c.projectId);
      if (!p) return 0;
      let n = 0;
      for (const t of p.tasks) {
        if (t.status !== "done") n++;
        for (const s of t.subtasks) if (s.status !== "done") n++;
      }
      return n;
    }
    const memberIds = new Set(c.members.map((m) => m.userId));
    let n = 0;
    for (const p of projects) {
      for (const t of p.tasks) {
        if (t.status !== "done" && memberIds.has(t.assigneeId)) n++;
        for (const s of t.subtasks) {
          if (s.status !== "done" && memberIds.has(s.assigneeId)) n++;
        }
      }
    }
    return n;
  }

  const filteredConvs = useMemo(() => {
    if (!convSearch.trim()) return convs;
    const q = convSearch.toLowerCase();
    return convs.filter((c) => getConvDisplayName(c).toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convs, convSearch, liveStaff, projects, user?.id]);

  const searching = convSearch.trim().length > 0;

  // Build sidebar sections: Pinned → each category → Uncategorized.
  // When the user has no pins and no categories, we render a plain flat list (no headers).
  const useSections = categories.length > 0 || filteredConvs.some((c) => c.pinned);
  const sections = useMemo(() => {
    const knownCatIds = new Set(categories.map((c) => c.id));
    const pinned = filteredConvs.filter((c) => c.pinned);
    const out: Array<{ key: string; label: string; categoryId: string | null; isPinned: boolean; items: ConversationWithUnread[] }> = [];
    if (pinned.length > 0) out.push({ key: "pinned", label: "Pinned", categoryId: null, isPinned: true, items: pinned });
    for (const cat of categories) {
      out.push({
        key: `cat-${cat.id}`, label: cat.name, categoryId: cat.id, isPinned: false,
        items: filteredConvs.filter((c) => !c.pinned && c.categoryId === cat.id),
      });
    }
    out.push({
      key: "uncategorized", label: "Uncategorized", categoryId: null, isPinned: false,
      items: filteredConvs.filter((c) => !c.pinned && (!c.categoryId || !knownCatIds.has(c.categoryId))),
    });
    // While searching, hide empty sections to cut noise.
    return searching ? out.filter((s) => s.items.length > 0) : out;
  }, [filteredConvs, categories, searching]);

  // Shared row renderer (used in both flat and sectioned modes)
  const renderRow = (c: ConversationWithUnread) => (
    <ConversationRow
      key={c.id}
      c={c}
      active={c.id === selectedId}
      displayName={getConvDisplayName(c)}
      icon={getConvIcon(c)}
      taskCount={getConvTaskCount(c)}
      categories={categories}
      onSelect={() => setSelectedId(c.id)}
      onTogglePin={() => handleTogglePin(c)}
      onMoveToCategory={(catId) => handleMoveToCategory(c, catId)}
      onCreateCategoryAndMove={(name) => handleCreateCategoryAndMove(c, name)}
    />
  );

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

          {/* New category affordance */}
          <div className="px-4 pb-2">
            {newCatInput ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <FolderPlus size={12} style={{ color: "var(--accent)" }} />
                <input autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitNewCategory(); if (e.key === "Escape") { setNewCatInput(false); setNewCatName(""); } }}
                  onBlur={submitNewCategory}
                  placeholder="Category name…" className="flex-1 bg-transparent outline-none text-xs"
                  style={{ color: "var(--text)" }} />
              </div>
            ) : (
              <button onClick={() => setNewCatInput(true)}
                className="flex items-center gap-1.5 text-xs font-semibold w-full px-2.5 py-1.5 rounded-lg hover:opacity-80"
                style={{ color: "var(--text-muted)", border: "1px dashed var(--border)" }}>
                <FolderPlus size={12} /> New category
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {loadingConvs ? (
              <div className="flex items-center gap-2 text-xs px-3 py-3" style={{ color: "var(--text-muted)" }}>
                <Loader2 size={12} className="animate-spin" /> Loading…
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="text-xs text-center py-8 px-3" style={{ color: "var(--text-muted)" }}>
                {searching ? "No conversations match your search." : "No conversations yet. Click + to start one."}
              </div>
            ) : !useSections ? (
              filteredConvs.map(renderRow)
            ) : (
              sections.map((sec) => {
                const isCollapsed = collapsed.has(sec.key);
                return (
                  <div key={sec.key} className="mb-1.5">
                    <SectionHeader
                      label={sec.label}
                      count={sec.items.length}
                      collapsed={isCollapsed}
                      pinned={sec.isPinned}
                      categoryId={sec.categoryId}
                      onToggle={() => toggleCollapsed(sec.key)}
                      onRename={(name) => sec.categoryId && handleRenameCategory(sec.categoryId, name)}
                      onDelete={() => sec.categoryId && handleDeleteCategory(sec.categoryId)}
                    />
                    {!isCollapsed && sec.items.map(renderRow)}
                    {!isCollapsed && sec.items.length === 0 && sec.categoryId && !searching && (
                      <p className="text-xs px-3 py-1.5" style={{ color: "var(--text-muted)" }}>
                        Empty — move a chat here from its ⋮ menu.
                      </p>
                    )}
                  </div>
                );
              })
            )}
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
              projects={projects}
              currentUserId={user?.id ?? ""}
              currentUserName={user?.name ?? ""}
              isAdmin={user?.pmRole === "admin"}
              onAfterChange={() => reloadConvs(true)}
              onDeleted={() => { setSelectedId(null); reloadConvs(true); }}
              onOpenTask={(taskId) => setOpenTaskId(taskId)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Select or start a conversation</p>
            </div>
          )}
        </main>
      </div>

      {/* Task drawer popup — opened inline from message refs or Tasks panel */}
      {openTaskRef && (
        <TaskDrawer
          task={openTaskRef.task}
          projectId={openTaskRef.projectId}
          onClose={() => setOpenTaskId(null)}
        />
      )}

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
  conversation, displayName, liveStaff, projects, currentUserId, currentUserName, isAdmin, onAfterChange, onDeleted, onOpenTask,
}: {
  conversation: ConversationWithUnread;
  displayName: string;
  liveStaff: LiveStaff[];
  projects: Project[];
  currentUserId: string;
  currentUserName: string;
  isAdmin: boolean;
  onAfterChange: () => void;
  onDeleted: () => void;
  onOpenTask: (taskId: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [pendingTaskInsert, setPendingTaskInsert] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Threading
  const [threadMeta, setThreadMeta] = useState<Map<string, ThreadMeta>>(new Map());
  const [threadRoot, setThreadRoot] = useState<ChatMessage | null>(null);
  const [threadReplies, setThreadReplies] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const threadRootRef = useRef<ChatMessage | null>(null);
  useEffect(() => { threadRootRef.current = threadRoot; }, [threadRoot]);

  // Pinned messages (shared per conversation)
  const [pinned, setPinned] = useState<ChatPinnedMessage[]>([]);
  const [showPinned, setShowPinned] = useState(false);
  const pinnedIds = useMemo(() => new Set(pinned.map((p) => p.messageId)), [pinned]);

  // Sound mute (per browser)
  const [muted, setMuted] = useState(false);
  useEffect(() => { setMuted(isChatSoundMuted()); }, []);

  // Desktop (OS) notification permission
  const [notifPerm, setNotifPerm] = useState<WebNotificationPermission>("default");
  useEffect(() => {
    setNotifPerm(getNotificationPermission());
    // If already granted, make sure this browser has an active push subscription.
    if (getNotificationPermission() === "granted" && currentUserId) subscribeToPush(currentUserId);
  }, [currentUserId]);
  async function enableDesktopAlerts() {
    // Play a test chime right away so you can hear the sound works (this also
    // unlocks audio). Desktop-notification permission is requested separately.
    if (!isChatSoundMuted()) playNotificationSound();
    const perm = await requestNotificationPermission();
    setNotifPerm(perm);
    if (perm === "granted" && currentUserId) await subscribeToPush(currentUserId);
  }

  // Emoji reactions (shared per conversation), grouped by message id
  const [reactions, setReactions] = useState<Map<string, ChatReaction[]>>(new Map());
  function groupReactions(list: ChatReaction[]): Map<string, ChatReaction[]> {
    const map = new Map<string, ChatReaction[]>();
    for (const r of list) {
      const arr = map.get(r.messageId) ?? [];
      arr.push(r); map.set(r.messageId, arr);
    }
    return map;
  }
  async function handleToggleReaction(messageId: string, emoji: string) {
    const mine = (reactions.get(messageId) ?? []).some((r) => r.userId === currentUserId && r.emoji === emoji);
    setReactions((prev) => {
      const next = new Map(prev);
      const arr = (next.get(messageId) ?? []).slice();
      if (mine) next.set(messageId, arr.filter((r) => !(r.userId === currentUserId && r.emoji === emoji)));
      else { arr.push({ id: `tmp-${messageId}-${emoji}`, conversationId: conversation.id, messageId, userId: currentUserId, emoji }); next.set(messageId, arr); }
      return next;
    });
    try {
      if (mine) await removeReaction(messageId, currentUserId, emoji);
      else await addReaction(conversation.id, messageId, currentUserId, emoji);
    } catch {
      loadReactions(conversation.id).then((list) => setReactions(groupReactions(list)));
    }
  }

  // In-conversation search
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Jump from the pinned panel to a message in the timeline (flash highlight)
  function scrollToMessage(messageId: string) {
    setShowPinned(false);
    setSearchOpen(false); setSearch("");
    setTimeout(() => {
      const el = scrollRef.current?.querySelector(`[data-mid="${messageId}"]`) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("msg-flash");
      setTimeout(() => el.classList.remove("msg-flash"), 1600);
    }, 60);
  }

  // Only one right-hand panel at a time
  function openThread(root: ChatMessage) {
    setShowTasks(false); setShowPinned(false);
    setThreadRoot(root); setThreadLoading(true); setThreadReplies([]);
    loadThreadReplies(root.id).then((r) => { setThreadReplies(r); setThreadLoading(false); });
  }
  function togglePinnedPanel() { setThreadRoot(null); setShowTasks(false); setShowPinned((v) => !v); }
  function toggleTasksPanel() { setThreadRoot(null); setShowPinned(false); setShowTasks((v) => !v); }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setChatSoundMuted(next);
    if (!next) playNotificationSound(); // turning sound ON → play a test chime
  }

  async function reloadPinned() { setPinned(await loadPinnedMessages(conversation.id)); }

  async function handleTogglePin(msg: ChatMessage) {
    const already = pinnedIds.has(msg.id);
    if (already) {
      setPinned((prev) => prev.filter((p) => p.messageId !== msg.id));
      try { await unpinMessage(conversation.id, msg.id); } catch { reloadPinned(); }
    } else {
      const optimistic: ChatPinnedMessage = {
        id: `tmp-${msg.id}`, conversationId: conversation.id, messageId: msg.id,
        pinnedBy: currentUserId, createdAt: new Date().toISOString(), message: msg,
      };
      setPinned((prev) => [optimistic, ...prev]);
      try { await pinMessage(conversation.id, msg.id, currentUserId); reloadPinned(); } catch { reloadPinned(); }
    }
  }

  // Capture last_read_at when this conversation is first opened in this view.
  // Stays stable for the lifetime of this MessageView (until conv switch / unmount),
  // so the "X new messages" divider doesn't move while you're reading.
  const initialLastReadAt = useMemo(() => {
    const me = conversation.members.find((m) => m.userId === currentUserId);
    return me?.lastReadAt ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setThreadRoot(null); setThreadReplies([]); setShowPinned(false); setShowTasks(false);
    setReactions(new Map()); setSearchOpen(false); setSearch("");
    Promise.all([
      loadMessages(conversation.id),
      loadThreadMeta(conversation.id),
      loadPinnedMessages(conversation.id),
      loadReactions(conversation.id),
    ]).then(([m, meta, pins, reacts]) => {
      if (cancelled) return;
      setMessages(m); setThreadMeta(meta); setPinned(pins); setReactions(groupReactions(reacts));
      setLoading(false);
      if (currentUserId) markRead(conversation.id, currentUserId).then(onAfterChange);
    });
    const unsub = subscribeToConversation(conversation.id, {
      onInsert: (msg) => {
        // Chime for messages from other people (covers the case where you're already on /chat)
        if (msg.authorId !== currentUserId) playNotificationSound();
        if (msg.parentId) {
          // Thread reply — update the reply badge meta, and the open thread if it matches
          setThreadMeta((prev) => {
            const next = new Map(prev);
            const ex = next.get(msg.parentId!);
            next.set(msg.parentId!, ex
              ? {
                  count: ex.count + 1, lastReplyAt: msg.createdAt,
                  participantIds: ex.participantIds.includes(msg.authorId) ? ex.participantIds : [...ex.participantIds, msg.authorId],
                }
              : { count: 1, lastReplyAt: msg.createdAt, participantIds: [msg.authorId] });
            return next;
          });
          if (threadRootRef.current?.id === msg.parentId) {
            setThreadReplies((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          }
        } else {
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        }
        if (currentUserId) markRead(conversation.id, currentUserId).then(onAfterChange);
      },
      onUpdate: (msg) => {
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...msg, mentionedUserIds: m.mentionedUserIds } : m));
        setThreadReplies((prev) => prev.map((m) => m.id === msg.id ? { ...msg, mentionedUserIds: m.mentionedUserIds } : m));
        setThreadRoot((prev) => prev && prev.id === msg.id ? { ...msg, mentionedUserIds: prev.mentionedUserIds } : prev);
        // A pinned message may have been edited/deleted — refresh the pinned list
        if (pinnedIds.has(msg.id)) reloadPinned();
      },
    });
    const unsubPin = subscribeToPinned(conversation.id, () => {
      loadPinnedMessages(conversation.id).then((p) => { if (!cancelled) setPinned(p); });
    });
    const unsubReact = subscribeToReactions(conversation.id, () => {
      loadReactions(conversation.id).then((list) => { if (!cancelled) setReactions(groupReactions(list)); });
    });
    return () => { cancelled = true; unsub(); unsubPin(); unsubReact(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, currentUserId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const latestPin = pinned[0];
  const q = search.trim().toLowerCase();
  const shown = q ? messages.filter((m) => !m.deletedAt && (m.body || "").toLowerCase().includes(q)) : messages;

  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-base)" }}>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold truncate" style={{ color: "var(--text)" }}>{displayName}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {conversation.members.length} member{conversation.members.length !== 1 ? "s" : ""}
            {conversation.kind === "project" && " · Project channel"}
            {conversation.kind === "group" && " · Group chat"}
            {conversation.kind === "dm" && " · Direct message"}
          </p>
        </div>
        {notifPerm !== "granted" && notifPerm !== "unsupported" && (
          <button onClick={enableDesktopAlerts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
            style={{ background: "var(--accent)20", color: "var(--accent)", border: "1px solid var(--accent)40" }}
            title={notifPerm === "denied"
              ? "Desktop alerts are blocked — enable them in your browser site settings"
              : "Get OS notifications when the tab isn't focused"}>
            <BellRing size={12} /> {notifPerm === "denied" ? "Alerts blocked" : "Enable desktop alerts"}
          </button>
        )}
        <button onClick={toggleMute}
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
          title={muted ? "Sound off — click to enable" : "Sound on — click to mute"}>
          {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
        <button onClick={() => { setSearchOpen((v) => !v); if (searchOpen) setSearch(""); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: searchOpen ? "var(--accent)25" : "var(--bg-surface)",
            color: searchOpen ? "var(--accent)" : "var(--text-muted)",
            border: `1px solid ${searchOpen ? "var(--accent)" : "var(--border)"}`,
          }}
          title="Search this conversation">
          <Search size={13} />
        </button>
        <button onClick={togglePinnedPanel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
          style={{
            background: showPinned ? "var(--accent)25" : "var(--bg-surface)",
            color: showPinned ? "var(--accent)" : "var(--text-muted)",
            border: `1px solid ${showPinned ? "var(--accent)" : "var(--border)"}`,
          }}>
          <Pin size={12} /> Pinned{pinned.length > 0 ? ` · ${pinned.length}` : ""}
        </button>
        <button onClick={toggleTasksPanel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
          style={{
            background: showTasks ? "var(--accent)25" : "var(--bg-surface)",
            color: showTasks ? "var(--accent)" : "var(--text-muted)",
            border: `1px solid ${showTasks ? "var(--accent)" : "var(--border)"}`,
          }}>
          <ListTodo size={12} /> Tasks
        </button>
        {conversation.kind !== "dm" && (
          <button onClick={() => setShowMembers(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
            style={{ background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            <Settings size={12} /> Members
          </button>
        )}
      </div>

      {/* Pinned banner (latest pin) — quick access; click to open the full panel */}
      {latestPin && latestPin.message && !showPinned && (
        <button onClick={togglePinnedPanel}
          className="flex items-center gap-2 px-5 py-2 shrink-0 text-left hover:opacity-90"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
          <Pin size={12} style={{ color: "var(--accent)" }} className="shrink-0" />
          <span className="text-xs truncate flex-1" style={{ color: "var(--text-muted)" }}>
            {pinnedSnippet(latestPin.message)}
          </span>
          {pinned.length > 1 && (
            <span className="text-xs font-semibold shrink-0" style={{ color: "var(--accent)" }}>
              +{pinned.length - 1} more
            </span>
          )}
        </button>
      )}

      {/* Search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-5 py-2 shrink-0"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
          <Search size={13} style={{ color: "var(--text-muted)" }} />
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); setSearch(""); } }}
            placeholder="Search messages in this conversation"
            className="flex-1 bg-transparent outline-none text-sm" style={{ color: "var(--text)" }} />
          {q && <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{shown.length} match{shown.length !== 1 ? "es" : ""}</span>}
          <button onClick={() => { setSearchOpen(false); setSearch(""); }} className="shrink-0" style={{ color: "var(--text-muted)" }}><X size={13} /></button>
        </div>
      )}

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
        ) : shown.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No messages match “{search.trim()}”.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {shown.map((msg, i) => {
              const prev = shown[i - 1];
              const showDateHeader = !prev || !isSameDay(prev.createdAt, msg.createdAt);
              const groupWithPrev = prev && prev.authorId === msg.authorId && isSameDay(prev.createdAt, msg.createdAt)
                && new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000;
              // Unread divider: first message from another user that arrived after the captured last_read_at
              const isFirstUnread = initialLastReadAt
                && msg.authorId !== currentUserId
                && new Date(msg.createdAt) > new Date(initialLastReadAt)
                && (!prev || new Date(prev.createdAt) <= new Date(initialLastReadAt) || prev.authorId === currentUserId);
              return (
                <div key={msg.id} data-mid={msg.id} className="rounded-lg">
                  {showDateHeader && (
                    <div className="text-center my-3">
                      <span className="text-xs px-3 py-1 rounded-full"
                        style={{ background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                        {formatDateHeader(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  {isFirstUnread && !showDateHeader && (
                    <div className="flex items-center gap-3 my-3 px-2">
                      <div className="flex-1 h-px" style={{ background: "#ef4444" }} />
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "#ef4444", color: "#fff" }}>NEW</span>
                      <div className="flex-1 h-px" style={{ background: "#ef4444" }} />
                    </div>
                  )}
                  <MessageItem
                    msg={msg}
                    grouped={Boolean(groupWithPrev)}
                    liveStaff={liveStaff}
                    projects={projects}
                    isOwn={msg.authorId === currentUserId}
                    isPinned={pinnedIds.has(msg.id)}
                    replyMeta={threadMeta.get(msg.id)}
                    reactions={reactions.get(msg.id)}
                    currentUserId={currentUserId}
                    onToggleReaction={(emoji) => handleToggleReaction(msg.id, emoji)}
                    onReply={() => openThread(msg)}
                    onOpenThread={() => openThread(msg)}
                    onTogglePin={() => handleTogglePin(msg)}
                    onSaved={() => { /* realtime will update */ }}
                    onOpenTask={onOpenTask}
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
        projects={projects}
        pendingTaskInsert={pendingTaskInsert}
        onTaskInsertConsumed={() => setPendingTaskInsert(null)}
        onSent={() => { /* realtime will update */ }}
      />
      </div>

      {/* Right side panel: Thread */}
      {threadRoot && (
        <ThreadPanel
          root={threadRoot}
          replies={threadReplies}
          loading={threadLoading}
          liveStaff={liveStaff}
          projects={projects}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          reactions={reactions}
          onToggleReaction={handleToggleReaction}
          onOpenTask={onOpenTask}
          onClose={() => setThreadRoot(null)}
        />
      )}

      {/* Right side panel: Pinned */}
      {showPinned && (
        <PinnedPanel
          pinned={pinned}
          liveStaff={liveStaff}
          projects={projects}
          onUnpin={(messageId) => { setPinned((prev) => prev.filter((p) => p.messageId !== messageId)); unpinMessage(conversation.id, messageId).catch(reloadPinned); }}
          onJump={(messageId) => scrollToMessage(messageId)}
          onOpenTask={onOpenTask}
          onClose={() => setShowPinned(false)}
        />
      )}

      {/* Right side panel: Tasks */}
      {showTasks && (
        <TasksPanel
          conversation={conversation}
          projects={projects}
          liveStaff={liveStaff}
          onPick={(taskId) => setPendingTaskInsert(taskId)}
          onOpenTask={onOpenTask}
          onClose={() => setShowTasks(false)}
        />
      )}

      {/* Members dialog */}
      {showMembers && (
        <MembersDialog
          conversation={conversation}
          liveStaff={liveStaff}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onClose={() => setShowMembers(false)}
          onChanged={onAfterChange}
          onDeleted={onDeleted}
        />
      )}
      <style jsx global>{`
        .msg-flash {
          animation: msgFlash 1.6s ease;
        }
        @keyframes msgFlash {
          0%, 100% { background: transparent; }
          15%, 50% { background: rgba(var(--accent-rgb), 0.18); }
        }
      `}</style>
    </div>
  );
}

// Short one-line preview of a (possibly attachment-only) message for the pinned bar.
function pinnedSnippet(msg: ChatMessage): string {
  const body = (msg.body || "").replace(/\[task:[0-9a-fA-F-]{36}\]/g, "🔗 task").trim();
  if (body) return body;
  if (msg.attachmentName) return `📎 ${msg.attachmentName}`;
  return "Pinned message";
}

// ────────────────────────────────────────────────────────────────────────────
// Individual message
// ────────────────────────────────────────────────────────────────────────────

const REACTION_CHOICES = ["👍", "❤️", "✅", "😂", "🎉", "👀", "🙏", "🔥"];

function MessageItem({
  msg, grouped, liveStaff, projects, isOwn, isPinned, replyMeta, inThread,
  reactions, currentUserId, onToggleReaction,
  onReply, onOpenThread, onTogglePin, onSaved, onOpenTask,
}: {
  msg: ChatMessage;
  grouped: boolean;
  liveStaff: LiveStaff[];
  projects: Project[];
  isOwn: boolean;
  isPinned?: boolean;
  replyMeta?: ThreadMeta;
  inThread?: boolean;
  reactions?: ChatReaction[];
  currentUserId?: string;
  onToggleReaction?: (emoji: string) => void;
  onReply?: () => void;
  onOpenThread?: () => void;
  onTogglePin?: () => void;
  onSaved: () => void;
  onOpenTask: (taskId: string) => void;
}) {
  const author = liveStaff.find((s) => staffAuthId(s) === msg.authorId);
  const color = avatarColor(author, liveStaff);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(msg.body);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Group this message's reactions by emoji → { count, mine }
  const reactionGroups = useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const r of reactions ?? []) {
      const g = map.get(r.emoji) ?? { count: 0, mine: false };
      g.count += 1;
      if (r.userId === currentUserId) g.mine = true;
      map.set(r.emoji, g);
    }
    return Array.from(map.entries());
  }, [reactions, currentUserId]);

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
            {isPinned && <span className="inline-flex items-center" title="Pinned"><Pin size={10} style={{ color: "var(--accent)" }} /></span>}
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
              <div className="text-sm whitespace-pre-wrap break-words" style={{ color: "var(--text)" }}>
                <RenderBody body={msg.body} liveStaff={liveStaff} projects={projects} onOpenTask={onOpenTask} />
              </div>
            )}
            {msg.attachmentUrl && (
              <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-1.5 px-3 py-2 rounded-lg text-sm hover:opacity-80"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
                {msg.attachmentType === "image" ? <ImageIcon size={13} /> : <FileText size={13} />}
                {msg.attachmentName}
              </a>
            )}
            {/* Thread reply badge */}
            {!inThread && replyMeta && replyMeta.count > 0 && (
              <button onClick={onOpenThread}
                className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md text-xs font-semibold hover:opacity-80"
                style={{ color: "var(--accent)", background: "var(--accent)15", border: "1px solid var(--accent)30" }}>
                <MessageCircle size={11} />
                {replyMeta.count} {replyMeta.count === 1 ? "reply" : "replies"}
                <span style={{ color: "var(--text-muted)" }}>· {formatTime(replyMeta.lastReplyAt)}</span>
              </button>
            )}
            {/* Reaction chips */}
            {reactionGroups.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {reactionGroups.map(([emoji, g]) => (
                  <button key={emoji} onClick={() => onToggleReaction?.(emoji)}
                    title={g.mine ? "Remove your reaction" : "React"}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs hover:opacity-80"
                    style={{
                      background: g.mine ? "var(--accent)25" : "var(--bg-surface)",
                      border: `1px solid ${g.mine ? "var(--accent)" : "var(--border)"}`,
                      color: "var(--text)",
                    }}>
                    <span>{emoji}</span>
                    <span style={{ color: "var(--text-muted)" }}>{g.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {!editing && (
        <div className={`${showEmojiPicker ? "opacity-100" : "opacity-0 group-hover:opacity-100"} flex gap-1 shrink-0`}>
          {onToggleReaction && (
            <div className="relative">
              <button onClick={() => setShowEmojiPicker((v) => !v)} title="Add reaction"
                className="w-7 h-7 rounded flex items-center justify-center hover:opacity-70"
                style={{ color: "var(--text-muted)" }}>
                <Smile size={12} />
              </button>
              {showEmojiPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)} />
                  <div className="absolute right-0 z-20 mt-1 p-1.5 rounded-lg flex gap-1 shadow-xl"
                    style={{ background: "var(--bg-base)", border: "1px solid var(--border)", top: "100%" }}>
                    {REACTION_CHOICES.map((e) => (
                      <button key={e} onClick={() => { onToggleReaction?.(e); setShowEmojiPicker(false); }}
                        className="w-7 h-7 rounded hover:scale-125 transition-transform text-base leading-none">
                        {e}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {!inThread && onReply && (
            <button onClick={onReply} title="Reply in thread"
              className="w-7 h-7 rounded flex items-center justify-center hover:opacity-70"
              style={{ color: "var(--text-muted)" }}>
              <CornerUpLeft size={12} />
            </button>
          )}
          {!inThread && onTogglePin && (
            <button onClick={onTogglePin} title={isPinned ? "Unpin message" : "Pin message"}
              className="w-7 h-7 rounded flex items-center justify-center hover:opacity-70"
              style={{ color: isPinned ? "var(--accent)" : "var(--text-muted)" }}>
              {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
            </button>
          )}
          {isOwn && (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RenderBody({ body, liveStaff, projects, onOpenTask }: { body: string; liveStaff: LiveStaff[]; projects: Project[]; onOpenTask: (taskId: string) => void }) {
  // Combined regex: @mentions OR [task:UUID]
  const combined = /(@[a-zA-Z][a-zA-Z0-9_-]{1,30})|(\[task:[0-9a-fA-F-]{36}\])/g;
  const firstNames = new Set(liveStaff.filter((s) => s.first_name).map((s) => s.first_name!.toLowerCase()));
  const parts: React.ReactNode[] = [];
  let lastIdx = 0; let m: RegExpExecArray | null; let key = 0;
  while ((m = combined.exec(body)) !== null) {
    if (m.index > lastIdx) parts.push(<span key={`t${key++}`}>{body.slice(lastIdx, m.index)}</span>);
    if (m[1]) {
      // @-mention
      const name = m[1].slice(1).toLowerCase();
      if (firstNames.has(name)) {
        parts.push(
          <span key={`m${key++}`} className="px-1 rounded font-semibold"
            style={{ background: "#a78bfa30", color: "#a78bfa" }}>{m[1]}</span>,
        );
      } else {
        parts.push(<span key={`t${key++}`}>{m[1]}</span>);
      }
    } else if (m[2]) {
      // Task reference
      const taskId = m[2].slice(6, -1);
      const ref = findTaskById(projects, taskId);
      if (ref) {
        const color = taskStatusColor[ref.task.status] ?? "#64748b";
        const tid = ref.task.id;
        parts.push(
          <button key={`task${key++}`} type="button" onClick={() => onOpenTask(tid)}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded-md border align-baseline hover:opacity-80 cursor-pointer"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text)" }}>
            <CheckSquare size={11} style={{ color }} />
            <span className="text-xs font-medium">{ref.task.title}</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {ref.projectName}</span>
            <span className="text-xs font-semibold px-1 rounded"
              style={{ background: `${color}25`, color }}>{taskStatusLabel[ref.task.status]}</span>
          </button>,
        );
      } else {
        parts.push(<span key={`t${key++}`} className="text-xs italic" style={{ color: "var(--text-muted)" }}>[task unavailable]</span>);
      }
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < body.length) parts.push(<span key={`t${key++}`}>{body.slice(lastIdx)}</span>);
  return <>{parts}</>;
}

// ────────────────────────────────────────────────────────────────────────────
// Composer
// ────────────────────────────────────────────────────────────────────────────

function Composer({
  conversationId, currentUserId, currentUserName, liveStaff, projects, onSent,
  pendingTaskInsert, onTaskInsertConsumed, parentId, placeholder, autoFocus,
}: {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
  liveStaff: LiveStaff[];
  projects: Project[];
  onSent: () => void;
  pendingTaskInsert?: string | null;
  onTaskInsertConsumed?: () => void;
  parentId?: string | null;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");

  // External task insertion (from the Tasks side-panel)
  useEffect(() => {
    if (!pendingTaskInsert) return;
    setText((prev) => {
      const sep = prev.length > 0 && !prev.endsWith(" ") ? " " : "";
      return `${prev}${sep}[task:${pendingTaskInsert}] `;
    });
    onTaskInsertConsumed?.();
    setTimeout(() => textareaRef.current?.focus(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTaskInsert]);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentionMenu, setMentionMenu] = useState<{ query: string; startIdx: number } | null>(null);
  const [taskMenu, setTaskMenu] = useState<{ query: string; startIdx: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Flatten tasks across all projects user can see (top-level + subtasks)
  const allTasksFlat = useMemo(() => {
    const out: Array<{ id: string; title: string; projectName: string; status: string }> = [];
    for (const p of projects) {
      for (const t of p.tasks) {
        out.push({ id: t.id, title: t.title, projectName: p.name, status: t.status });
        for (const sub of t.subtasks) {
          out.push({ id: sub.id, title: sub.title, projectName: p.name, status: sub.status });
        }
      }
    }
    return out;
  }, [projects]);

  // Track @ mentions and # task references in input
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setText(v);
    const caret = e.target.selectionStart ?? v.length;
    const before = v.slice(0, caret);
    const mention = before.match(/@([a-zA-Z0-9_-]*)$/);
    const taskTrigger = before.match(/(?:^|\s)#([a-zA-Z0-9 _-]*)$/);
    if (mention) {
      setMentionMenu({ query: mention[1].toLowerCase(), startIdx: caret - mention[0].length });
      setTaskMenu(null);
    } else if (taskTrigger) {
      // startIdx points at the '#' character (skip the leading space/start)
      const hashOffset = taskTrigger[0].startsWith("#") ? 0 : 1;
      setTaskMenu({ query: taskTrigger[1].toLowerCase(), startIdx: caret - taskTrigger[0].length + hashOffset });
      setMentionMenu(null);
    } else {
      setMentionMenu(null);
      setTaskMenu(null);
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

  function pickTask(taskId: string) {
    if (!taskMenu) return;
    const before = text.slice(0, taskMenu.startIdx);
    const after = text.slice((textareaRef.current?.selectionStart ?? text.length));
    const insert = `[task:${taskId}] `;
    setText(before + insert + after);
    setTaskMenu(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  const mentionMatches = useMemo(() => {
    if (!mentionMenu) return [];
    return liveStaff.filter((s) => s.first_name && s.first_name.toLowerCase().startsWith(mentionMenu.query)).slice(0, 6);
  }, [mentionMenu, liveStaff]);

  const taskMatches = useMemo(() => {
    if (!taskMenu) return [];
    const q = taskMenu.query.trim();
    const list = q
      ? allTasksFlat.filter((t) => t.title.toLowerCase().includes(q) || t.projectName.toLowerCase().includes(q))
      : allTasksFlat.filter((t) => t.status !== "done");
    return list.slice(0, 8);
  }, [taskMenu, allTasksFlat]);

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
        parentId: parentId ?? null,
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

      // Deliver Web Push to recipients who aren't looking at the app.
      notifyPush("chat", newMsg.id);
      // Audible "sent" feedback for the sender.
      playSentSound();

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
    if (e.key === "Enter" && !e.shiftKey && !mentionMenu && !taskMenu) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") { setMentionMenu(null); setTaskMenu(null); }
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

      {taskMenu && taskMatches.length > 0 && (
        <div className="mb-2 rounded-lg overflow-hidden"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs px-3 py-1.5 flex items-center gap-1.5"
            style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
            <CheckSquare size={10} /> reference a task
          </div>
          {taskMatches.map((t) => {
            const c = taskStatusColor[t.status] ?? "#64748b";
            return (
              <button key={t.id} onClick={() => pickTask(t.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:opacity-80"
                style={{ color: "var(--text)" }}>
                <CircleDashed size={11} style={{ color: c }} />
                <span className="truncate flex-1">{t.title}</span>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{t.projectName}</span>
              </button>
            );
          })}
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
          autoFocus={autoFocus}
          rows={1} placeholder={placeholder ?? "Type a message — Enter to send, Shift+Enter for newline. @ to mention, # to reference a task."}
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
// Thread side panel (Slack-style)
// ────────────────────────────────────────────────────────────────────────────

function ThreadPanel({
  root, replies, loading, liveStaff, projects, currentUserId, currentUserName,
  reactions, onToggleReaction, onOpenTask, onClose,
}: {
  root: ChatMessage;
  replies: ChatMessage[];
  loading: boolean;
  liveStaff: LiveStaff[];
  projects: Project[];
  currentUserId: string;
  currentUserName: string;
  reactions: Map<string, ChatReaction[]>;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenTask: (taskId: string) => void;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [replies.length]);

  return (
    <aside className="flex flex-col shrink-0" style={{ width: 360, borderLeft: "1px solid var(--border)", background: "var(--bg-base)" }}>
      <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <MessageCircle size={14} style={{ color: "var(--accent)" }} />
        <p className="text-sm font-semibold flex-1" style={{ color: "var(--text)" }}>Thread</p>
        <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center hover:opacity-70"
          style={{ color: "var(--text-muted)" }}><X size={14} /></button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        {/* Root message */}
        <MessageItem
          msg={root} grouped={false} liveStaff={liveStaff} projects={projects}
          isOwn={root.authorId === currentUserId} inThread
          reactions={reactions.get(root.id)} currentUserId={currentUserId}
          onToggleReaction={(emoji) => onToggleReaction(root.id, emoji)}
          onSaved={() => { /* realtime */ }} onOpenTask={onOpenTask}
        />
        <div className="flex items-center gap-3 my-2 px-2">
          <span className="text-xs font-semibold shrink-0" style={{ color: "var(--text-muted)" }}>
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs px-2" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={12} className="animate-spin" /> Loading…
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {replies.map((r) => (
              <MessageItem
                key={r.id} msg={r} grouped={false} liveStaff={liveStaff} projects={projects}
                isOwn={r.authorId === currentUserId} inThread
                reactions={reactions.get(r.id)} currentUserId={currentUserId}
                onToggleReaction={(emoji) => onToggleReaction(r.id, emoji)}
                onSaved={() => { /* realtime */ }} onOpenTask={onOpenTask}
              />
            ))}
          </div>
        )}
      </div>

      <Composer
        conversationId={root.conversationId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        liveStaff={liveStaff}
        projects={projects}
        parentId={root.id}
        placeholder="Reply in thread…"
        autoFocus
        onSent={() => { /* realtime will update */ }}
      />
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Pinned messages side panel
// ────────────────────────────────────────────────────────────────────────────

function PinnedPanel({
  pinned, liveStaff, projects, onUnpin, onJump, onOpenTask, onClose,
}: {
  pinned: ChatPinnedMessage[];
  liveStaff: LiveStaff[];
  projects: Project[];
  onUnpin: (messageId: string) => void;
  onJump: (messageId: string) => void;
  onOpenTask: (taskId: string) => void;
  onClose: () => void;
}) {
  return (
    <aside className="flex flex-col shrink-0" style={{ width: 360, borderLeft: "1px solid var(--border)", background: "var(--bg-base)" }}>
      <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <Pin size={14} style={{ color: "var(--accent)" }} />
        <p className="text-sm font-semibold flex-1" style={{ color: "var(--text)" }}>
          Pinned{pinned.length > 0 ? ` · ${pinned.length}` : ""}
        </p>
        <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center hover:opacity-70"
          style={{ color: "var(--text-muted)" }}><X size={14} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {pinned.length === 0 ? (
          <div className="text-center py-10 px-4">
            <Pin size={20} style={{ color: "var(--text-muted)" }} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No pinned messages yet. Hover any message and click the pin icon to keep links, files or notes handy here.
            </p>
          </div>
        ) : (
          pinned.map((p) => {
            const msg = p.message;
            const author = msg ? liveStaff.find((s) => staffAuthId(s) === msg.authorId) : undefined;
            return (
              <div key={p.id} className="rounded-lg p-3 group"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: avatarColor(author, liveStaff), color: "#fff" }}>
                    {author ? staffInitials(author) : "?"}
                  </div>
                  <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                    {author ? staffName(author) : "Unknown"}
                  </span>
                  {msg && <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{formatTime(msg.createdAt)}</span>}
                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    {msg && !msg.deletedAt && (
                      <button onClick={() => onJump(p.messageId)} title="Jump to message"
                        className="text-xs font-semibold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100"
                        style={{ color: "var(--accent)", background: "var(--accent)15" }}>
                        Jump →
                      </button>
                    )}
                    <button onClick={() => onUnpin(p.messageId)} title="Unpin"
                      className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100"
                      style={{ color: "var(--text-muted)" }}>
                      <PinOff size={12} />
                    </button>
                  </div>
                </div>
                {msg && !msg.deletedAt ? (
                  <>
                    {msg.body && (
                      <div className="text-sm whitespace-pre-wrap break-words" style={{ color: "var(--text)" }}>
                        <RenderBody body={msg.body} liveStaff={liveStaff} projects={projects} onOpenTask={onOpenTask} />
                      </div>
                    )}
                    {msg.attachmentUrl && (
                      <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-1.5 px-2.5 py-1.5 rounded-lg text-xs hover:opacity-80"
                        style={{ background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text)" }}>
                        {msg.attachmentType === "image" ? <ImageIcon size={12} /> : <FileText size={12} />}
                        {msg.attachmentName}
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>Message deleted</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
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

// ────────────────────────────────────────────────────────────────────────────
// Members dialog — manage members + rename groups
// ────────────────────────────────────────────────────────────────────────────

function MembersDialog({
  conversation, liveStaff, currentUserId, isAdmin, onClose, onChanged, onDeleted,
}: {
  conversation: ConversationWithUnread;
  liveStaff: LiveStaff[];
  currentUserId: string;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [nameDraft, setNameDraft] = useState(conversation.name ?? "");
  const [adding, setAdding] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberIds = new Set(conversation.members.map((m) => m.userId));
  const memberStaff = liveStaff.filter((s) => memberIds.has(staffAuthId(s)));
  const candidates = liveStaff.filter((s) => !memberIds.has(staffAuthId(s)) && staffAuthId(s) !== currentUserId);

  // Permissions: groups – members can manage; project channels – admins only; DMs – no manage UI shown anyway
  const canManage = conversation.kind === "group" || isAdmin;
  // Delete: admin-only for any conversation kind. DMs still not deletable from UI.
  const canDelete = isAdmin && conversation.kind !== "dm";
  // Leave: any member can leave a group; for project channels, admins can remain or leave; DMs no leave
  const canLeave = (conversation.kind === "group" || conversation.kind === "project") && memberIds.has(currentUserId);

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setBusy(true); setError(null);
    try {
      await deleteConversation(conversation.id);
      onDeleted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function handleLeave() {
    if (!confirmLeave) {
      setConfirmLeave(true);
      setTimeout(() => setConfirmLeave(false), 4000);
      return;
    }
    setBusy(true); setError(null);
    try {
      await leaveConversation(conversation.id, currentUserId);
      onDeleted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function handleRename() {
    if (!nameDraft.trim()) return;
    setBusy(true); setError(null);
    try {
      await renameConversation(conversation.id, nameDraft.trim());
      onChanged();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  async function handleAdd() {
    if (!adding) return;
    setBusy(true); setError(null);
    try {
      await addConversationMember(conversation.id, adding);
      setAdding("");
      onChanged();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  async function handleRemove(userId: string) {
    if (confirmRemove !== userId) {
      setConfirmRemove(userId);
      setTimeout(() => setConfirmRemove((c) => (c === userId ? null : c)), 3000);
      return;
    }
    setRemovingId(userId); setError(null);
    try {
      await removeConversationMember(conversation.id, userId);
      setConfirmRemove(null);
      onChanged();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setRemovingId(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "#000000b0" }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md flex flex-col gap-4 p-6"
        style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>
            {conversation.kind === "project" ? "Channel members" : conversation.kind === "group" ? "Group members" : "Members"}
          </h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>

        {/* Rename (groups only) */}
        {conversation.kind === "group" && canManage && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--text-muted)" }}>Group name</label>
            <div className="flex gap-2">
              <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg flex-1"
                style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
              <button onClick={handleRename} disabled={busy || nameDraft.trim() === conversation.name}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ background: "var(--accent)", opacity: (busy || nameDraft.trim() === conversation.name) ? 0.5 : 1 }}>
                Save
              </button>
            </div>
          </div>
        )}

        {/* Current members */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
            {memberStaff.length} member{memberStaff.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
            {memberStaff.map((s) => {
              const sid = staffAuthId(s);
              const removing = removingId === sid;
              const isSelf = sid === currentUserId;
              return (
                <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded"
                  style={{ background: "var(--bg-surface)" }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: avatarColor(s, liveStaff), color: "#fff" }}>
                    {staffInitials(s)}
                  </div>
                  <span className="text-sm flex-1 truncate" style={{ color: "var(--text)" }}>
                    {staffName(s)} {isSelf && <span style={{ color: "var(--text-muted)" }}>(you)</span>}
                  </span>
                  {canManage && !isSelf && (
                    <button onClick={() => handleRemove(sid)} disabled={removing}
                      className="text-xs px-2 py-1 rounded hover:opacity-80"
                      style={{
                        background: confirmRemove === sid ? "#ef444425" : "transparent",
                        color: confirmRemove === sid ? "#ef4444" : "var(--text-muted)",
                      }}>
                      {removing ? "…" : confirmRemove === sid ? "Confirm" : "Remove"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add member */}
        {canManage && candidates.length > 0 && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--text-muted)" }}>
              Invite someone
            </label>
            <div className="flex gap-2">
              <select value={adding} onChange={(e) => setAdding(e.target.value)}
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg flex-1"
                style={{ color: "var(--text)", border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
                <option value="">— Pick a person —</option>
                {candidates.map((s) => <option key={s.id} value={staffAuthId(s)}>{staffName(s)}</option>)}
              </select>
              <button onClick={handleAdd} disabled={!adding || busy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", opacity: (!adding || busy) ? 0.5 : 1 }}>
                <UserPlus size={11} /> Add
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs" style={{ color: "#ef4444" }}>⚠ {error}</p>}

        {/* Danger zone */}
        {(canDelete || canLeave) && (
          <div className="pt-3 mt-1 flex flex-wrap gap-2" style={{ borderTop: "1px solid var(--border)" }}>
            {canLeave && conversation.kind === "group" && (
              <button onClick={handleLeave} disabled={busy}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{
                  background: confirmLeave ? "#f59e0b25" : "transparent",
                  color: confirmLeave ? "#f59e0b" : "var(--text-muted)",
                  border: `1px solid ${confirmLeave ? "#f59e0b" : "var(--border)"}`,
                }}>
                <LogOut size={11} /> {confirmLeave ? "Click again to leave" : "Leave group"}
              </button>
            )}
            {canDelete && (
              <button onClick={handleDelete} disabled={busy}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ml-auto"
                style={{
                  background: confirmDelete ? "#ef444425" : "transparent",
                  color: "#ef4444",
                  border: `1px solid ${confirmDelete ? "#ef4444" : "var(--border)"}`,
                }}>
                <Trash2 size={11} />
                {confirmDelete
                  ? `Click again to delete ${conversation.kind === "project" ? "channel" : "group"}`
                  : `Delete ${conversation.kind === "project" ? "channel" : "group"}`}
              </button>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ color: "var(--text-muted)", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tasks side-panel — inside each chat, reference tasks for discussion
// ────────────────────────────────────────────────────────────────────────────

function TasksPanel({
  conversation, projects, liveStaff, onPick, onOpenTask, onClose,
}: {
  conversation: ConversationWithUnread;
  projects: Project[];
  liveStaff: LiveStaff[];
  onPick: (taskId: string) => void;
  onOpenTask: (taskId: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  // Decide the task pool based on conversation kind
  const tasks = useMemo(() => {
    const flat: Array<{ id: string; title: string; status: string; assigneeId: string; projectId: string; projectName: string; dueDate: string }> = [];
    const memberIds = new Set(conversation.members.map((m) => m.userId));
    for (const p of projects) {
      // For project channels, only include this project's tasks
      if (conversation.kind === "project" && p.id !== conversation.projectId) continue;
      for (const t of p.tasks) {
        const include = conversation.kind === "project"
          ? true
          : memberIds.has(t.assigneeId);
        if (include) flat.push({
          id: t.id, title: t.title, status: t.status, assigneeId: t.assigneeId,
          projectId: p.id, projectName: p.name, dueDate: t.dueDate ?? "",
        });
        for (const sub of t.subtasks) {
          const subInclude = conversation.kind === "project"
            ? true
            : memberIds.has(sub.assigneeId);
          if (subInclude) flat.push({
            id: sub.id, title: sub.title, status: sub.status, assigneeId: sub.assigneeId,
            projectId: p.id, projectName: p.name, dueDate: sub.dueDate ?? "",
          });
        }
      }
    }
    return flat;
  }, [conversation, projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? tasks.filter((t) => t.title.toLowerCase().includes(q) || t.projectName.toLowerCase().includes(q))
      : tasks.filter((t) => t.status !== "done");
    return base.slice(0, 200);
  }, [tasks, search]);

  // Group by status for project channels (cleaner overview)
  const grouped = useMemo(() => {
    const order = ["pending_review", "revision_required", "in_progress", "todo", "done"] as const;
    const out: Record<string, typeof filtered> = { todo: [], in_progress: [], pending_review: [], revision_required: [], done: [] };
    for (const t of filtered) {
      (out[t.status] ?? out.todo).push(t);
    }
    return order.map((s) => ({ status: s, items: out[s] ?? [] }));
  }, [filtered]);

  return (
    <aside className="shrink-0 flex flex-col"
      style={{ width: 320, borderLeft: "1px solid var(--border)", background: "var(--bg-base)" }}>
      <div className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <ListTodo size={14} style={{ color: "var(--accent)" }} />
        <p className="text-sm font-semibold flex-1" style={{ color: "var(--text)" }}>
          Tasks <span style={{ color: "var(--text-muted)" }}>· {filtered.length}</span>
        </p>
        <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={14} /></button>
      </div>

      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <Search size={11} style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: "var(--text)" }} />
        </div>
        <p className="text-xs mt-2 px-1" style={{ color: "var(--text-muted)" }}>
          {conversation.kind === "project"
            ? "Tasks from this project."
            : "Tasks assigned to members of this conversation."}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {filtered.length === 0 ? (
          <p className="text-xs text-center py-6 px-3" style={{ color: "var(--text-muted)" }}>
            No tasks to reference.
          </p>
        ) : grouped.map(({ status, items }) => {
          if (items.length === 0) return null;
          const color = taskStatusColor[status];
          return (
            <div key={status} className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide px-2 mb-1.5"
                style={{ color }}>
                {taskStatusLabel[status]} · {items.length}
              </p>
              {items.map((t) => {
                const assignee = liveStaff.find((s) => staffAuthId(s) === t.assigneeId);
                return (
                  <div key={t.id} className="rounded-lg px-3 py-2 mb-1 group"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                    <div className="flex items-start gap-2">
                      <CircleDashed size={11} style={{ color, marginTop: 2 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                          {t.title}
                        </p>
                        <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {conversation.kind === "project"
                            ? (assignee ? staffName(assignee) : "Unassigned")
                            : `${t.projectName}${assignee ? " · " + staffName(assignee) : ""}`}
                          {t.dueDate ? ` · Due ${new Date(t.dueDate).toLocaleDateString("en-SG", { day: "2-digit", month: "short" })}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <button onClick={() => onPick(t.id)}
                        className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                        style={{ background: "var(--accent)20", color: "var(--accent)" }}>
                        <CheckSquare size={10} /> Reference in chat
                      </button>
                      <button onClick={() => onOpenTask(t.id)}
                        className="text-xs px-2 py-1 rounded hover:opacity-80"
                        style={{ color: "var(--text-muted)" }}>
                        Open →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Conversation row — single conversation button + pin/category kebab menu
// ────────────────────────────────────────────────────────────────────────────

function ConversationRow({
  c, active, displayName, icon, taskCount, categories,
  onSelect, onTogglePin, onMoveToCategory, onCreateCategoryAndMove,
}: {
  c: ConversationWithUnread;
  active: boolean;
  displayName: string;
  icon: React.ReactNode;
  taskCount: number;
  categories: ChatCategory[];
  onSelect: () => void;
  onTogglePin: () => void;
  onMoveToCategory: (categoryId: string | null) => void;
  onCreateCategoryAndMove: (name: string) => void;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const btnRef = useRef<HTMLButtonElement | null>(null);

  function openMenu(e: React.MouseEvent) {
    e.stopPropagation();
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setMenu({ x: Math.min(r.left - 200, window.innerWidth - 240), y: Math.min(r.bottom + 4, window.innerHeight - 320) });
    setCreatingCat(false); setNewCatName("");
  }
  function closeMenu() { setMenu(null); setCreatingCat(false); setNewCatName(""); }

  return (
    <div className="relative group/row">
      <button onClick={onSelect}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-opacity hover:opacity-90 mb-0.5"
        style={{ background: active ? "var(--bg-surface)" : "transparent" }}>
        <div className="shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {c.pinned && <Pin size={10} style={{ color: "var(--accent)", transform: "rotate(45deg)" }} className="shrink-0" />}
            <p className="text-sm font-semibold truncate flex-1" style={{ color: active ? "var(--text)" : "var(--text-muted)" }}>
              {displayName}
            </p>
            {taskCount > 0 && (
              <span title={`${taskCount} active task${taskCount !== 1 ? "s" : ""}`}
                className="text-xs px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5 shrink-0 group-hover/row:hidden"
                style={{ background: "var(--accent)15", color: "var(--accent)", border: "1px solid var(--accent)40" }}>
                <ListTodo size={9} /> {taskCount}
              </span>
            )}
            {c.unreadCount > 0 && (
              <span title={`${c.unreadCount} unread`}
                className="text-xs px-1.5 py-0.5 rounded-full font-bold shrink-0 group-hover/row:hidden"
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

      {/* Kebab — appears on hover */}
      <button ref={btnRef} onClick={openMenu}
        className="absolute right-1.5 top-2.5 w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover/row:opacity-100"
        style={{ background: "var(--bg-base)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
        title="Pin or move to category">
        <MoreVertical size={13} />
      </button>

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} />
          <div className="fixed z-50 rounded-lg py-1 text-sm overflow-hidden"
            style={{ left: menu.x, top: menu.y, width: 224, background: "var(--bg-base)", border: "1px solid var(--border)", boxShadow: "0 8px 24px #00000040" }}>
            <button onClick={() => { onTogglePin(); closeMenu(); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:opacity-80" style={{ color: "var(--text)" }}>
              {c.pinned ? <PinOff size={13} /> : <Pin size={13} />}
              {c.pinned ? "Unpin" : "Pin to top"}
            </button>

            <div className="my-1" style={{ borderTop: "1px solid var(--border)" }} />
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Move to category</p>

            <div className="max-h-44 overflow-y-auto">
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => { onMoveToCategory(cat.id); closeMenu(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:opacity-80" style={{ color: "var(--text)" }}>
                  <Folder size={13} style={{ color: "var(--text-muted)" }} />
                  <span className="flex-1 truncate">{cat.name}</span>
                  {c.categoryId === cat.id && <Check size={13} style={{ color: "var(--accent)" }} />}
                </button>
              ))}
              {c.categoryId && (
                <button onClick={() => { onMoveToCategory(null); closeMenu(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:opacity-80" style={{ color: "var(--text-muted)" }}>
                  <X size={13} /> Remove from category
                </button>
              )}
            </div>

            {creatingCat ? (
              <div className="px-2 py-1.5 flex gap-1" style={{ borderTop: "1px solid var(--border)" }}>
                <input autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCatName.trim()) { onCreateCategoryAndMove(newCatName.trim()); closeMenu(); }
                    if (e.key === "Escape") setCreatingCat(false);
                  }}
                  placeholder="New category…" className="flex-1 bg-transparent text-xs outline-none px-2 py-1 rounded"
                  style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
                <button onClick={() => { if (newCatName.trim()) { onCreateCategoryAndMove(newCatName.trim()); closeMenu(); } }}
                  className="px-2 rounded text-white text-xs font-semibold" style={{ background: "var(--accent)" }}>Add</button>
              </div>
            ) : (
              <button onClick={() => setCreatingCat(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:opacity-80"
                style={{ color: "var(--accent)", borderTop: "1px solid var(--border)" }}>
                <FolderPlus size={13} /> New category…
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Section header — collapsible group header with optional rename/delete
// ────────────────────────────────────────────────────────────────────────────

function SectionHeader({
  label, count, collapsed, pinned, categoryId, onToggle, onRename, onDelete,
}: {
  label: string;
  count: number;
  collapsed: boolean;
  pinned: boolean;
  categoryId: string | null;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(label);
  const [confirmDel, setConfirmDel] = useState(false);
  const isCategory = categoryId !== null;

  if (renaming) {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) { onRename(draft.trim()); setRenaming(false); }
            if (e.key === "Escape") { setDraft(label); setRenaming(false); }
          }}
          onBlur={() => { if (draft.trim() && draft.trim() !== label) onRename(draft.trim()); setRenaming(false); }}
          className="flex-1 bg-transparent text-xs outline-none px-2 py-1 rounded"
          style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-1 px-2 py-1 group/sec">
      <button onClick={onToggle}
        className="flex items-center gap-1 flex-1 min-w-0 text-left hover:opacity-80"
        style={{ color: "var(--text-muted)" }}>
        {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        {pinned ? <Pin size={11} style={{ color: "var(--accent)", transform: "rotate(45deg)" }} />
          : isCategory ? <Folder size={11} /> : null}
        <span className="text-xs font-semibold uppercase tracking-wide truncate">{label}</span>
        <span className="text-xs">· {count}</span>
      </button>

      {isCategory && (
        <button onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); setConfirmDel(false); }}
          className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/sec:opacity-100"
          style={{ color: "var(--text-muted)" }} title="Rename or delete category">
          <MoreVertical size={12} />
        </button>
      )}

      {menuOpen && isCategory && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setMenuOpen(false); setConfirmDel(false); }} />
          <div className="absolute right-2 top-7 z-50 rounded-lg py-1 text-sm overflow-hidden w-40"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)", boxShadow: "0 8px 24px #00000040" }}>
            <button onClick={() => { setDraft(label); setRenaming(true); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:opacity-80" style={{ color: "var(--text)" }}>
              <Pencil size={12} /> Rename
            </button>
            <button onClick={() => { if (confirmDel) { onDelete(); setMenuOpen(false); } else { setConfirmDel(true); } }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:opacity-80"
              style={{ color: "#ef4444" }}>
              <Trash2 size={12} /> {confirmDel ? "Click to confirm" : "Delete category"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
