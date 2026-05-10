"use client";
import { Topbar } from "@/components/topbar";
import { useStore } from "@/lib/store";
import { Bot, AlertTriangle, CheckSquare, UserPlus, RefreshCw, CheckCheck, ClipboardCheck, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

const typeConfig: Record<string, { icon: typeof Bot; color: string; bg: string; label: string }> = {
  ai_followup:      { icon: Bot,            color: "#38b6e8", bg: "#38b6e820", label: "AI Digest" },
  task_overdue:     { icon: AlertTriangle,   color: "#ef4444", bg: "#ef444420", label: "Overdue" },
  task_assigned:    { icon: UserPlus,        color: "#3b82f6", bg: "#3b82f620", label: "Assigned" },
  status_change:    { icon: RefreshCw,       color: "#f59e0b", bg: "#f59e0b20", label: "Status" },
  mention:          { icon: CheckSquare,     color: "#22c55e", bg: "#22c55e20", label: "Mention" },
  approval_request: { icon: ClipboardCheck,  color: "#a855f7", bg: "#a855f720", label: "Approval" },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllRead, approveTaskCompletion } = useStore();
  const { user } = useAuth();
  const isAdmin = user?.pmRole === "admin";
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  async function handleApprove(notifId: string, projectId: string, taskId: string, taskTitle: string) {
    setApprovingId(notifId);
    try {
      await approveTaskCompletion(projectId, taskId, taskTitle);
      await markNotificationRead(notifId);
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <>
      <Topbar title="Notifications" />
      <div className="p-6 max-w-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: "#4a7090" }}>{unread.length} unread</p>
          {unread.length > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm" style={{ color: "#38b6e8" }}>
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        {unread.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-3" style={{ color: "#4a7090" }}>UNREAD</p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1c3248" }}>
              {unread.map((n, i) => {
                const config = typeConfig[n.type] ?? typeConfig.mention;
                const Icon = config.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => n.type !== "approval_request" && markNotificationRead(n.id)}
                    className="flex items-start gap-4 px-5 py-4 transition-opacity"
                    style={{
                      background: "#0f1d2e",
                      borderBottom: i < unread.length - 1 ? "1px solid #1c3248" : "none",
                      cursor: n.type !== "approval_request" ? "pointer" : "default",
                    }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: config.bg }}>
                      <Icon size={16} style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold" style={{ color: "#cce4ff" }}>{n.title}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: config.bg, color: config.color }}>{config.label}</span>
                        <div className="w-2 h-2 rounded-full ml-auto shrink-0" style={{ background: "#38b6e8" }} />
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: "#4a7090" }}>{n.body}</p>
                      <p className="text-xs mt-1" style={{ color: "#8b90a750" }}>{timeAgo(n.createdAt)}</p>
                      {isAdmin && n.type === "approval_request" && n.projectId && n.taskId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(n.id, n.projectId!, n.taskId!, n.title);
                          }}
                          disabled={approvingId === n.id}
                          className="mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
                          style={{ background: "#22c55e", color: "#fff", opacity: approvingId === n.id ? 0.7 : 1 }}
                        >
                          {approvingId === n.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <Check size={11} />
                          }
                          Approve Completion
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {unread.length === 0 && (
          <div className="rounded-xl px-5 py-10 text-center" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
            <p className="text-sm" style={{ color: "#4a7090" }}>You're all caught up!</p>
          </div>
        )}

        {read.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-3" style={{ color: "#4a7090" }}>EARLIER</p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1c3248" }}>
              {read.map((n, i) => {
                const config = typeConfig[n.type] ?? typeConfig.mention;
                const Icon = config.icon;
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-4 px-5 py-4"
                    style={{ background: "#0f1d2e80", borderBottom: i < read.length - 1 ? "1px solid #1c3248" : "none" }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 opacity-50" style={{ background: config.bg }}>
                      <Icon size={16} style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 min-w-0 opacity-50">
                      <p className="text-sm font-semibold" style={{ color: "#cce4ff" }}>{n.title}</p>
                      <p className="text-sm" style={{ color: "#4a7090" }}>{n.body}</p>
                      <p className="text-xs mt-1" style={{ color: "#4a7090" }}>{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
