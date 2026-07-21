"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { dbListRecentActivity, type TaskActivity } from "@/lib/db";
import { History, RotateCw, ExternalLink, ChevronDown } from "lucide-react";

// ── Label maps (mirror components/task-drawer.tsx) ──────────────────────────
const STATUS_LABEL: Record<string, string> = {
  todo: "To Do", in_progress: "In Progress", pending_review: "Pending Review",
  revision_required: "Revision Required", done: "Done",
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
  const [rows, setRows] = useState<TaskActivity[]>([]);
  const [staff, setStaff] = useState<StaffLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorFilter, setActorFilter] = useState<string>("all");

  async function load() {
    setLoading(true);
    const [acts] = await Promise.all([dbListRecentActivity(300)]);
    setRows(acts);
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

  const actorsPresent = useMemo(() => {
    const ids = Array.from(new Set(rows.map((r) => r.actorId).filter((x): x is string => !!x)));
    return ids.map((id) => ({ id, name: actorName(id) })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, actorName]);

  const filtered = actorFilter === "all" ? rows : rows.filter((r) => r.actorId === actorFilter);

  const groups = useMemo(() => {
    const out: { key: string; heading: string; items: TaskActivity[] }[] = [];
    for (const r of filtered) {
      const k = dayKey(r.createdAt);
      let g = out.find((x) => x.key === k);
      if (!g) { g = { key: k, heading: dayHeading(r.createdAt), items: [] }; out.push(g); }
      g.items.push(r);
    }
    return out;
  }, [filtered]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        {/* Controls */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Every task add, edit, move and delete is recorded here — newest first.
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

        {loading && rows.length === 0 ? (
          <p className="text-sm px-1" style={{ color: "var(--text-muted)" }}>Loading activity…</p>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <History size={24} style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No task activity yet. Changes will appear here as they happen.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((g) => (
              <div key={g.key}>
                <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{g.heading}</p>
                <div className="flex flex-col gap-1.5">
                  {g.items.map((a) => {
                    const pName = projectName(a.projectId);
                    const canOpen = !!a.taskId && !!a.projectId;
                    return (
                      <div key={a.id} className="flex gap-3 px-4 py-3 rounded-xl"
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
                            <span>· {new Date(a.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
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
        {rows.length >= 300 && (
          <p className="text-xs text-center mt-6" style={{ color: "var(--text-muted)" }}>
            Showing the most recent 300 changes.
          </p>
        )}
      </div>
    </div>
  );
}
