"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, Search, Plus, ChevronLeft, FolderKanban, CheckSquare } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { type Task } from "@/lib/mock-data";
import {
  getNotificationPermission, requestNotificationPermission, type WebNotificationPermission,
} from "@/lib/web-notifications";
import { subscribeToPush } from "@/lib/push";
import { playNotificationSound, isChatSoundMuted } from "@/lib/notification-sound";

interface TopbarProps {
  title: string;
  back?: { label: string; href: string };
  action?: { label: string; href: string };
}

export function Topbar({ title, back, action }: TopbarProps) {
  const { notifications, projects } = useStore();
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.pmRole === "admin";

  // ── Global quick-search: matches project names + task titles, jump on click ──
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return { projects: [], tasks: [] as { task: Task; projectName: string; href: string }[] };
    const visibleProjects = isAdmin
      ? projects
      : projects.filter((p) => !!user?.id && p.assignedStaff.includes(user.id));
    const projHits = visibleProjects
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 6);
    const taskHits: { task: Task; projectName: string; href: string }[] = [];
    for (const p of visibleProjects) {
      const base = `/projects/${p.slug || p.id}`;
      const walk = (ts: Task[]) => {
        for (const t of ts) {
          if (taskHits.length >= 8) return;
          if (t.title.toLowerCase().includes(q) && (isAdmin || t.assigneeId === user?.id || !t.assigneeId)) {
            taskHits.push({ task: t, projectName: p.name, href: `${base}?task=${t.id}` });
          }
          walk(t.subtasks);
        }
      };
      walk(p.tasks);
      if (taskHits.length >= 8) break;
    }
    return { projects: projHits, tasks: taskHits };
  }, [q, projects, isAdmin, user?.id]);

  const hasResults = results.projects.length > 0 || results.tasks.length > 0;
  const searchOpen = searchFocused && q.length > 0;

  function goTo(href: string) {
    setQuery("");
    setSearchFocused(false);
    router.push(href);
  }
  // Admin bell only counts approval requests; staff see their full stream.
  const unreadCount = notifications.filter((n) => {
    if (n.read) return false;
    // Admin tray: approval requests + anything targeted to them (e.g. renewal reminders)
    if (isAdmin) return n.type === "approval_request" || n.type === "deletion_request" || n.userId === user?.id;
    // Staff: see their targeted notifications + workspace-global (userId IS NULL) ones
    return !n.userId || n.userId === user?.id;
  }).length;

  // Desktop (OS) notification permission — offer to enable from any page.
  const [notifPerm, setNotifPerm] = useState<WebNotificationPermission>("granted");
  useEffect(() => {
    setNotifPerm(getNotificationPermission());
    // Keep this browser's push subscription fresh for already-opted-in users.
    if (getNotificationPermission() === "granted" && user?.id) subscribeToPush(user.id);
  }, [user?.id]);

  return (
    <header
      className="flex items-center gap-4 px-6 py-4 relative"
      style={{ background: "var(--bg-base)", borderBottom: "1px solid var(--border)" }}
    >
      {/* gradient accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(var(--accent-rgb),0.3) 30%, rgba(var(--accent-rgb),0.5) 50%, rgba(var(--accent-rgb),0.3) 70%, transparent 100%)",
        }}
      />

      {back && (
        <Link
          href={back.href}
          className="flex items-center gap-1 text-sm rounded-lg px-2 py-1 -ml-2 transition-opacity hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
        >
          <ChevronLeft size={16} />
          {back.label}
        </Link>
      )}

      <h1 className="text-lg font-bold flex-1 tracking-tight" style={{ color: "var(--text)" }}>
        {title}
      </h1>

      {/* Search — matches projects + tasks, click a result to jump there */}
      <div className="relative flex-1 max-w-xs">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "var(--bg-surface)", border: `1px solid ${searchOpen ? "var(--accent)" : "var(--border)"}` }}
        >
          <Search size={13} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search projects & tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setQuery(""); setSearchFocused(false); (e.target as HTMLInputElement).blur(); }
              if (e.key === "Enter") {
                const first = results.projects[0]
                  ? `/projects/${results.projects[0].slug || results.projects[0].id}`
                  : results.tasks[0]?.href;
                if (first) goTo(first);
              }
            }}
            className="bg-transparent text-sm outline-none flex-1"
            style={{ color: "var(--text)" }}
          />
          {query && (
            <button onMouseDown={(e) => { e.preventDefault(); setQuery(""); }} style={{ color: "var(--text-muted)" }} title="Clear">✕</button>
          )}
        </div>

        {searchOpen && (
          <div
            className="absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden z-50"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "0 12px 32px #00000070", maxHeight: "60vh", overflowY: "auto" }}
          >
            {!hasResults && (
              <p className="text-xs px-3 py-3" style={{ color: "var(--text-muted)" }}>No projects or tasks match “{query.trim()}”.</p>
            )}
            {results.projects.length > 0 && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest px-3 pt-2.5 pb-1" style={{ color: "var(--text-muted)" }}>Projects</p>
                {results.projects.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={(e) => { e.preventDefault(); goTo(`/projects/${p.slug || p.id}`); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:opacity-80"
                    style={{ color: "var(--text)" }}
                  >
                    <FolderKanban size={14} style={{ color: "var(--accent)" }} className="shrink-0" />
                    <span className="text-sm font-medium truncate flex-1">{p.name}</span>
                    <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{p.type === "webdev" ? "Web" : p.type === "seo" ? "SEO" : "Web + SEO"}</span>
                  </button>
                ))}
              </>
            )}
            {results.tasks.length > 0 && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest px-3 pt-2.5 pb-1" style={{ color: "var(--text-muted)" }}>Tasks</p>
                {results.tasks.map(({ task, projectName, href }) => (
                  <button
                    key={task.id}
                    onMouseDown={(e) => { e.preventDefault(); goTo(href); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:opacity-80"
                    style={{ color: "var(--text)" }}
                  >
                    <CheckSquare size={14} style={{ color: task.status === "done" ? "#22c55e" : "var(--text-muted)" }} className="shrink-0" />
                    <span className="text-sm truncate flex-1" style={{ textDecoration: task.status === "done" ? "line-through" : "none" }}>{task.title}</span>
                    <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{projectName}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Enable desktop alerts (only when not yet granted) */}
      {notifPerm === "default" && (
        <button
          onClick={async () => {
            if (!isChatSoundMuted()) playNotificationSound(); // audible confirmation + unlocks audio
            const perm = await requestNotificationPermission();
            setNotifPerm(perm);
            if (perm === "granted" && user?.id) await subscribeToPush(user.id);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
          style={{ background: "rgba(var(--accent-rgb),0.15)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.4)" }}
          title="Get OS notifications when this tab isn't focused"
        >
          <BellRing size={14} /> Enable alerts
        </button>
      )}

      {/* Bell */}
      <Link
        href="/notifications"
        className="relative p-2 rounded-xl transition-all hover:opacity-80"
        style={{ color: "var(--text-muted)" }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="anim-pulse-dot absolute top-1 right-1 w-2.5 h-2.5 rounded-full"
            style={{ background: "#ef4444", boxShadow: "0 0 7px #ef444480" }}
          />
        )}
      </Link>

      {/* CTA */}
      {action && (
        <Link
          href={action.href}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            boxShadow: "0 4px 16px rgba(var(--accent-rgb), 0.35)",
          }}
        >
          <Plus size={14} />
          {action.label}
        </Link>
      )}
    </header>
  );
}
