"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  dbListRecentActivity, type TaskActivity,
  dbListRecentComments, type RecentComment,
  dbListRecentUploads, type RecentUpload,
} from "@/lib/db";
import { loadRecentChatMessages, chatSnippet, type RecentChatMessage } from "@/lib/chat-db";
import { type Task } from "@/lib/mock-data";
import { History, RotateCw, ExternalLink, ChevronDown, MessageSquare, MessageCircle, Paperclip, ListChecks } from "lucide-react";

// ── Label maps (mirror components/task-drawer.tsx) ──────────────────────────
const STATUS_LABEL: Record<string, string> = {
  todo: "To Do", in_progress: "In Progress", pending_review: "Pending Review",
  revision_required: "Revision Required", done: "Done", missed: "Missed",
};
const PRIORITY_LABEL: Record<number, string> = {
  1: "P1 · Critical", 2: "P2 · Urgent", 3: "P3 · High", 4: "P4 · High",
  5: "P5 · Medium", 6: "P6 · Medium", 7: "P7 · Low", 8: "P8 · Low",
  9: "P9 · Minimal", 10: "P10 · Minimal",
};
const FIELD_LABEL: Record<string, string> = {
  title: "title", status: "status", priority: "priority", assignee: "assignee",
  due_date: "due date", recurring: "recurring", tags: "tags", type: "type",
  project: "project", description: "description",
};

interface StaffLite { id: string; user_id: string | null; first_name: string | null; last_name: string | null; email: string; }
function authId(s: StaffLite) { return s.user_id ?? s.id; }
function staffLabel(s: StaffLite) { return [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email; }

function dayKey(iso: string) { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function dayHeading(iso: string) {
  const d = new Date(iso); const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((t.getTime() - that.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

type FeedKind = "task" | "comment" | "chat" | "file";

type FeedItem = {
  id: string;
  at: string;
  actorId: string | null;
  kind: FeedKind;
  act?: TaskActivity;          // kind === "task"
  text?: string;               // snippet (comment/chat) or file name
  taskId?: string | null;      // deep-link target (comment/file)
  chat?: RecentChatMessage;    // kind === "chat"
};

const KIND_META: Record<FeedKind, { label: string; color: string }> = {
  task:    { label: "Task changes", color: "#38b6e8" },
  comment: { label: "Comments",     color: "#f59e0b" },
  chat:    { label: "Chat",         color: "#f472b6" },
  file:    { label: "Files",        color: "#22c55e" },
};

export default function ActivityPage() {
  return (
    <AdminOnly>
      <Topbar title="Activity Log" />
      <ActivityInner />
    </AdminOnly>
  );
}

function ActivityInner() {
  const { projects } = useStore();
  const [acts, setActs] = useState<TaskActivity[]>([]);
  const [comments, setComments] = useState<RecentComment[]>([]);
  const [uploads, setUploads] = useState<RecentUpload[]>([]);
  const [chats, setChats] = useState<RecentChatMessage[]>([]);
  const [staff, setStaff] = useState<StaffLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<"all" | FeedKind>("all");

  async function load() {
    setLoading(true);
    const [a, c, u, m] = await Promise.all([
      dbListRecentActivity(300),
      dbListRecentComments(200),
      dbListRecentUploads(120),
      loadRecentChatMessages(200),
    ]);
    setActs(a); setComments(c); setUploads(u); setChats(m);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    supabase.from("staff_members").select("id,user_id,first_name,last_name,email")
      .eq("status", "active")
      .then(({ data }) => setStaff((data as StaffLite[]) ?? []));
  }, []);

  const actorName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of staff) m.set(authId(s), staffLabel(s));
    return (id: string | null) => (id ? (m.get(id) ?? "Unknown user") : "System");
  }, [staff]);

  const projectName = useMemo(() => {
    const m = new Map(projects.map((p) => [p.id, p.name]));
    return (id: string | null) => (id ? (m.get(id) ?? null) : null);
  }, [projects]);

  // Task index (title + project + slug link) for comments/uploads context.
  const taskIndex = useMemo(() => {
    const m = new Map<string, { title: string; href: string; projectName: string }>();
    for (const p of projects) {
      const base = `/projects/${p.slug || p.id}`;
      const walk = (ts: Task[]) => {
        for (const t of ts) {
          m.set(t.id, { title: t.title, href: `${base}?task=${t.id}`, projectName: p.name });
          walk(t.subtasks);
        }
      };
      walk(p.tasks);
    }
    return m;
  }, [projects]);

  function valueLabel(field: string | null, v: string | null): string {
    if (v === null || v === "") return "—";
    if (field === "status") return STATUS_LABEL[v] ?? v;
    if (field === "priority") { const n = Number(v); return PRIORITY_LABEL[n] ?? v; }
    if (field === "assignee") return actorName(v);
    if (field === "project") return projectName(v) ?? "another project";
    if (field === "due_date") { const d = new Date(v); return isNaN(d.getTime()) ? v : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
    return v;
  }
  function sentence(a: TaskActivity): string {
    if (a.action === "created") return "created this task";
    if (a.action === "deleted") return "deleted this task";
    if (a.action === "moved") return `moved to ${valueLabel("project", a.newValue)}`;
    if (a.field === "description") return "edited the description";
    if (a.field === "title") return `renamed to “${a.newValue ?? ""}”`;
    const fl = a.field ? (FIELD_LABEL[a.field] ?? a.field) : "field";
    const nv = valueLabel(a.field, a.newValue);
    if (!a.oldValue) return `set ${fl} to ${nv}`;
    return `changed ${fl} from ${valueLabel(a.field, a.oldValue)} to ${nv}`;
  }

  // ── Merge all streams into one timeline ────────────────────────────────────
  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    for (const a of acts) items.push({ id: `a-${a.id}`, at: a.createdAt, actorId: a.actorId, kind: "task", act: a });
    for (const c of comments) items.push({
      id: `c-${c.id}`, at: c.createdAt, actorId: c.authorId, kind: "comment",
      text: chatSnippet(c.body) || (c.hasAttachment ? "📎 attachment" : ""), taskId: c.taskId,
    });
    for (const u of uploads) items.push({ id: `u-${u.id}`, at: u.uploadedAt, actorId: u.uploadedBy || null, kind: "file", text: u.name, taskId: u.taskId });
    for (const m of chats) items.push({
      id: `m-${m.id}`, at: m.createdAt, actorId: m.authorId, kind: "chat",
      text: chatSnippet(m.body) || (m.attachmentName ? (m.attachmentType === "image" ? "📷 Photo" : `📎 ${m.attachmentName}`) : ""),
      chat: m,
    });
    return items.sort((x, y) => (x.at < y.at ? 1 : -1));
  }, [acts, comments, uploads, chats]);

  const actorsPresent = useMemo(() => {
    const ids = Array.from(new Set(feed.map((r) => r.actorId).filter((x): x is string => !!x)));
    return ids.map((id) => ({ id, name: actorName(id) })).sort((a, b) => a.name.localeCompare(b.name));
  }, [feed, actorName]);

  const byActor = actorFilter === "all" ? feed : feed.filter((r) => r.actorId === actorFilter);
  const filtered = kindFilter === "all" ? byActor : byActor.filter((r) => r.kind === kindFilter);

  // Per-kind counts for the selected person (or everyone)
  const counts = useMemo(() => {
    const c: Record<FeedKind, number> = { task: 0, comment: 0, chat: 0, file: 0 };
    for (const r of byActor) c[r.kind]++;
    return c;
  }, [byActor]);

  const groups = useMemo(() => {
    const out: { key: string; heading: string; items: FeedItem[] }[] = [];
    for (const r of filtered) {
      const k = dayKey(r.at);
      let g = out.find((x) => x.key === k);
      if (!g) { g = { key: k, heading: dayHeading(r.at), items: [] }; out.push(g); }
      g.items.push(r);
    }
    return out;
  }, [filtered]);

  function chatContext(m: RecentChatMessage): { label: string; href: string } {
    const label = m.convKind === "project"
      ? `#${projectName(m.convProjectId) ?? "project channel"}`
      : m.convKind === "group"
        ? (m.convName || "Group chat")
        : "Direct message";
    return { label, href: `/chat?c=${m.conversationId}&m=${m.id}` };
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        {/* Controls */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Every task change, comment, chat message and file upload — newest first.
          </p>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <select
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm outline-none cursor-pointer"
                style={{ background: "var(--bg-surface)", color: "var(--text)", border: "1px solid var(--border)" }}
              >
                <option value="all">All people</option>
                {actorsPresent.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>
            <button
              onClick={() => void load()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium"
              style={{ background: "var(--bg-surface)", color: "var(--text)", border: "1px solid var(--border)" }}
            >
              <RotateCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Type filter chips with counts (for the selected person) */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button onClick={() => setKindFilter("all")}
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: kindFilter === "all" ? "rgba(var(--accent-rgb),0.2)" : "var(--bg-surface)",
              color: kindFilter === "all" ? "var(--accent)" : "var(--text-muted)",
              border: `1px solid ${kindFilter === "all" ? "var(--accent)" : "var(--border)"}`,
            }}>
            All · {byActor.length}
          </button>
          {(Object.keys(KIND_META) as FeedKind[]).map((k) => (
            <button key={k} onClick={() => setKindFilter(k)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: kindFilter === k ? `${KIND_META[k].color}25` : "var(--bg-surface)",
                color: kindFilter === k ? KIND_META[k].color : "var(--text-muted)",
                border: `1px solid ${kindFilter === k ? KIND_META[k].color : "var(--border)"}`,
              }}>
              {KIND_META[k].label} · {counts[k]}
            </button>
          ))}
        </div>

        {loading && feed.length === 0 ? (
          <p className="text-sm px-1" style={{ color: "var(--text-muted)" }}>Loading activity…</p>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <History size={24} style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Nothing recorded yet for this filter.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((g) => (
              <div key={g.key}>
                <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{g.heading}</p>
                <div className="flex flex-col gap-1.5">
                  {g.items.map((item) => {
                    const time = new Date(item.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                    // ── task audit rows keep their original rendering ──
                    if (item.kind === "task" && item.act) {
                      const a = item.act;
                      const pName = projectName(a.projectId);
                      const canOpen = !!a.taskId && !!a.projectId;
                      return (
                        <div key={item.id} className="flex gap-3 px-4 py-3 rounded-xl"
                          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                          <div className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                            style={{ background: a.action === "created" ? "#22c55e" : a.action === "deleted" ? "#ef4444" : a.action === "moved" ? "#a855f7" : "#38b6e8" }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm" style={{ color: "var(--text)" }}>
                              <span className="font-semibold">{actorName(a.actorId)}</span>{" "}
                              <span style={{ color: "var(--text-muted)" }}>{sentence(a)}</span>
                            </p>
                            <p className="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ color: "var(--text-muted)" }}>
                              {canOpen ? (
                                <Link href={`/projects/${a.projectId}?task=${a.taskId}`}
                                  className="inline-flex items-center gap-1 font-medium hover:underline" style={{ color: "#38b6e8" }}>
                                  {a.taskTitle || "Untitled task"} <ExternalLink size={11} />
                                </Link>
                              ) : (
                                <span style={{ color: "var(--text)" }}>{a.taskTitle || "Untitled task"}</span>
                              )}
                              {pName && <span>· {pName}</span>}
                              <span>· {time}</span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    // ── comment / chat / file rows ──
                    const meta = KIND_META[item.kind];
                    const Icon = item.kind === "comment" ? MessageSquare : item.kind === "chat" ? MessageCircle : Paperclip;
                    const taskCtx = item.taskId ? taskIndex.get(item.taskId) : undefined;
                    const chatCtx = item.chat ? chatContext(item.chat) : undefined;
                    return (
                      <div key={item.id} className="flex gap-3 px-4 py-3 rounded-xl"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                        <Icon size={13} className="mt-0.5 shrink-0" style={{ color: meta.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm" style={{ color: "var(--text)" }}>
                            <span className="font-semibold">{actorName(item.actorId)}</span>{" "}
                            <span style={{ color: "var(--text-muted)" }}>
                              {item.kind === "comment" && "commented"}
                              {item.kind === "chat" && "sent a message"}
                              {item.kind === "file" && `uploaded “${item.text}”`}
                            </span>
                            {item.kind !== "file" && item.text && (
                              <span style={{ color: "var(--text)" }}>: “{item.text.slice(0, 160)}{item.text.length > 160 ? "…" : ""}”</span>
                            )}
                          </p>
                          <p className="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ color: "var(--text-muted)" }}>
                            {taskCtx ? (
                              <>
                                <Link href={taskCtx.href} className="inline-flex items-center gap-1 font-medium hover:underline" style={{ color: "#38b6e8" }}>
                                  {taskCtx.title} <ExternalLink size={11} />
                                </Link>
                                <span>· {taskCtx.projectName}</span>
                              </>
                            ) : item.taskId ? (
                              <span>on an archived or deleted task</span>
                            ) : null}
                            {chatCtx && (
                              <Link href={chatCtx.href} className="inline-flex items-center gap-1 font-medium hover:underline" style={{ color: meta.color }}>
                                {chatCtx.label} <ExternalLink size={11} />
                              </Link>
                            )}
                            <span>· {time}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-center mt-6 flex items-center justify-center gap-1.5" style={{ color: "var(--text-muted)" }}>
          <ListChecks size={12} /> Showing the most recent ~300 task changes, 200 comments, 200 chat messages and 120 uploads.
        </p>
      </div>
    </div>
  );
}
