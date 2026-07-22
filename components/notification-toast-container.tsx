"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { playNotificationSound } from "@/lib/notification-sound";
import { showWebNotification } from "@/lib/web-notifications";
import {
  Bot, AlertTriangle, UserPlus, RefreshCw, CheckSquare, ClipboardCheck, Bell, X, CalendarClock, Trash2,
} from "lucide-react";

// Slack-style transient popups for new app notifications (pm_notifications).
// Chat messages are handled separately by ChatToastContainer; @-mentions are
// excluded here to avoid double-popping (the chat toast already covers them).

type NotifToast = {
  id: string;
  title: string;
  body: string;
  type: string;
  href: string;
};

type NotifRow = {
  id: string;
  title: string | null;
  body: string | null;
  type: string;
  project_id: string | null;
  task_id: string | null;
  user_id: string | null;
  link: string | null;
};

const TOAST_LIFETIME_MS = 6000;

const typeConfig: Record<string, { icon: typeof Bot; color: string; bg: string; label: string }> = {
  ai_followup:      { icon: Bot,           color: "#38b6e8", bg: "#38b6e820", label: "AI Digest" },
  task_overdue:     { icon: AlertTriangle, color: "#ef4444", bg: "#ef444420", label: "Overdue" },
  task_assigned:    { icon: UserPlus,      color: "#3b82f6", bg: "#3b82f620", label: "Assigned" },
  status_change:    { icon: RefreshCw,     color: "#f59e0b", bg: "#f59e0b20", label: "Status" },
  mention:          { icon: CheckSquare,   color: "#22c55e", bg: "#22c55e20", label: "Mention" },
  approval_request: { icon: ClipboardCheck, color: "#a855f7", bg: "#a855f720", label: "Approval" },
  deletion_request: { icon: Trash2,        color: "#ef4444", bg: "#ef444420", label: "Deletion" },
  billing_reminder: { icon: CalendarClock,  color: "#f59e0b", bg: "#f59e0b20", label: "Renewal" },
};

function hrefFor(n: NotifRow): string {
  if (n.link) return n.link;
  if (n.project_id && n.task_id) return `/projects/${n.project_id}?task=${n.task_id}`;
  if (n.project_id) return `/projects/${n.project_id}`;
  return "/notifications";
}

export function NotificationToastContainer() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [toasts, setToasts] = useState<NotifToast[]>([]);

  const isAdmin = user?.pmRole === "admin";

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel("notif-toast-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pm_notifications" }, (payload) => {
        const n = payload.new as NotifRow;
        if (!n) return;
        // Chat already pops its own toast for mentions — don't double up.
        if (n.type === "mention") return;
        // Mirror the bell's relevance rules:
        // - Admin: only approval requests are worth interrupting for.
        // - Staff: targeted (user_id === self) or workspace-global (user_id IS NULL).
        if (isAdmin) {
          // Admins get approval + deletion requests + anything targeted to them (e.g. renewal reminders).
          if (n.type !== "approval_request" && n.type !== "deletion_request" && n.user_id !== user.id) return;
        } else {
          if (n.user_id && n.user_id !== user.id) return;
        }
        // Don't interrupt while the user is already reading the notifications page.
        if (pathname && pathname.startsWith("/notifications")) return;

        playNotificationSound();

        const toast: NotifToast = {
          id: n.id,
          title: (n.title ?? "").trim() || "Notification",
          body: (n.body ?? "").trim(),
          type: n.type,
          href: hrefFor(n),
        };
        // OS-level notification when the tab isn't focused
        showWebNotification({ title: toast.title, body: toast.body, url: toast.href, tag: `notif-${n.id}` });
        setToasts((prev) => [...prev.filter((t) => t.id !== n.id), toast]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== n.id));
        }, TOAST_LIFETIME_MS);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, isAdmin, pathname]);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function open(t: NotifToast) {
    dismiss(t.id);
    router.push(t.href);
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed z-50 flex flex-col gap-2" style={{ right: 20, top: 20, width: 340 }}>
      {toasts.map((t, i) => {
        const config = typeConfig[t.type] ?? { icon: Bell, color: "var(--accent)", bg: "var(--accent)20", label: "Update" };
        const Icon = config.icon;
        return (
          <button key={t.id} onClick={() => open(t)}
            className="flex items-start gap-2.5 p-3 rounded-xl shadow-lg text-left transition-all w-full"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              animation: `slideInDown 0.25s ease ${i * 0.04}s both`,
              boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
            }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: config.bg }}>
              <Icon size={15} style={{ color: config.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-xs font-semibold truncate flex-1" style={{ color: "var(--text)" }}>{t.title}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: config.bg, color: config.color }}>{config.label}</span>
              </div>
              {t.body && <p className="text-xs line-clamp-2 break-words" style={{ color: "var(--text-muted)" }}>{t.body}</p>}
            </div>
            <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismiss(t.id); }}
              className="shrink-0 opacity-50 hover:opacity-100"
              style={{ color: "var(--text-muted)" }}>
              <X size={12} />
            </span>
          </button>
        );
      })}
      <style jsx>{`
        @keyframes slideInDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
