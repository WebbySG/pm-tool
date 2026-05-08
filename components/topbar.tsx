"use client";
import { Bell, Search, Plus, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";

interface TopbarProps {
  title: string;
  back?: { label: string; href: string };
  action?: { label: string; href: string };
}

export function Topbar({ title, back, action }: TopbarProps) {
  const { notifications } = useStore();
  const unreadCount = notifications.filter((n) => !n.read).length;

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

      {/* Search */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <Search size={13} style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-sm outline-none flex-1"
          style={{ color: "var(--text)" }}
        />
      </div>

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
