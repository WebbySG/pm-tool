"use client";
import { useEffect, useState } from "react";
import { Bell, BellRing, Search, Plus, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
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
  const { notifications } = useStore();
  const { user } = useAuth();
  const isAdmin = user?.pmRole === "admin";
  // Admin bell only counts approval requests; staff see their full stream.
  const unreadCount = notifications.filter((n) => {
    if (n.read) return false;
    // Admin tray: approval requests + anything targeted to them (e.g. renewal reminders)
    if (isAdmin) return n.type === "approval_request" || n.userId === user?.id;
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
