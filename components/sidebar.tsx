"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, CheckSquare, Key,
  Users, Bell, Settings, Zap, ListChecks, LogOut, FileEdit, Archive, Receipt, MessageSquare,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { useChatUnread } from "@/lib/use-chat-unread";

const ALL_NAV = [
  { href: "/dashboard",   label: "Dashboard",     icon: LayoutDashboard, color: "#818cf8", adminOnly: false },
  { href: "/projects",    label: "Projects",      icon: FolderKanban,    color: "#60a5fa", adminOnly: false },
  { href: "/tasks",       label: "All Tasks",     icon: CheckSquare,     color: "#34d399", adminOnly: false },
  { href: "/chat",        label: "Chat",          icon: MessageSquare,   color: "#f472b6", adminOnly: false, chatBadge: true },
  { href: "/content",     label: "Content",       icon: FileEdit,        color: "#10b981", adminOnly: false },
  { href: "/archive",     label: "Archive",       icon: Archive,         color: "#6b7280", adminOnly: false },
  { href: "/invoices",    label: "Invoices",      icon: Receipt,         color: "#fbbf24", adminOnly: true  },
  { href: "/templates",   label: "Templates",     icon: ListChecks,      color: "#a78bfa", adminOnly: true  },
  { href: "/credentials", label: "Credentials",   icon: Key,             color: "#f472b6", adminOnly: true  },
  { href: "/team",        label: "Team",          icon: Users,           color: "#22d3ee", adminOnly: true  },
  { href: "/notifications", label: "Notifications", icon: Bell,          color: "#fb923c", adminOnly: false, badge: true },
] as const;

export function Sidebar() {
  const path = usePathname();
  const { notifications } = useStore();
  const { user, signOut } = useAuth();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const chatUnread = useChatUnread(user?.id);

  const isAdmin = user?.pmRole === "admin";
  const NAV = ALL_NAV.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.href === "/content" && !isAdmin && !user?.canAccessContent) return false;
    return true;
  });

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-60 flex flex-col"
      style={{ background: "var(--bg-sidebar)", borderRight: "1px solid var(--border)" }}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 anim-float"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            boxShadow: "0 4px 18px rgba(var(--accent-rgb), 0.45)",
          }}
        >
          <Zap size={17} color="#fff" fill="#fff" />
        </div>
        <span className="font-extrabold text-base tracking-tight text-gradient">WebbyOps</span>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map((item, i) => {
          const { href, label, icon: Icon, color } = item;
          const badge = "badge" in item ? item.badge : false;
          const chatBadge = "chatBadge" in item ? item.chatBadge : false;
          const active = path === href || path.startsWith(href + "/");
          const count = badge ? unreadCount : chatBadge ? chatUnread : 0;

          return (
            <Link
              key={href}
              href={href}
              className={`nav-item anim-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium relative overflow-hidden ${active ? "nav-active" : ""}`}
              style={{
                animationDelay: `${i * 0.04}s`,
                color: active ? color : "var(--text-muted)",
                background: active ? `${color}18` : "transparent",
                borderLeft: `2px solid ${active ? color : "transparent"}`,
                boxShadow: active ? `inset 0 0 24px ${color}10` : "none",
              }}
            >
              <Icon size={16} style={{ filter: active ? `drop-shadow(0 0 5px ${color})` : "none" }} />
              <span>{label}</span>

              {typeof count === "number" && count > 0 && !active && (
                <span
                  className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full anim-pulse-dot"
                  style={{ background: "#ef4444", color: "#fff", boxShadow: "0 0 8px #ef444470" }}
                >
                  {count}
                </span>
              )}

              {active && (
                <span
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(105deg, transparent 30%, ${color}12 50%, transparent 70%)`,
                    animation: "shimmer 2.5s ease infinite",
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="px-3 pb-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
        <Link
          href="/settings"
          className="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          <Settings size={16} />
          Settings
        </Link>

        {/* User + sign out */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              color: "#fff",
              boxShadow: "0 0 12px rgba(var(--accent-rgb), 0.4)",
            }}
          >
            {user?.avatar ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
              {user?.name ?? "…"}
            </p>
            <p className="text-xs truncate capitalize" style={{ color: "var(--text-muted)" }}>
              {user?.pmRole ?? ""}
            </p>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="shrink-0 p-1 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
