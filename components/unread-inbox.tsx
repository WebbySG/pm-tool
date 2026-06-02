"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { loadConversationsForUser, subscribeToInboxForUser } from "@/lib/chat-db";
import type { ConversationWithUnread } from "@/lib/chat-types";
import { MessageSquare, Hash, Users as UsersIcon, X } from "lucide-react";

type Staff = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_initials: string | null;
};
const staffAuthId = (s: Staff) => s.user_id ?? s.id;
const staffName = (s: Staff) => [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email;

const AVATAR_COLORS = ["#818cf8", "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#22d3ee"];
function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Floating bottom-right launcher: shows total unread chat count; click opens a
// popup listing every conversation with unread messages. Clicking one deep-links
// into that conversation on /chat.
export function UnreadInbox() {
  const { user } = useAuth();
  const { projects } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [convs, setConvs] = useState<ConversationWithUnread[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.from("staff_members").select("id,user_id,first_name,last_name,email,avatar_initials")
      .eq("status", "active")
      .then(({ data }) => setStaff((data as Staff[]) ?? []));
  }, []);

  useEffect(() => {
    if (!user?.id) { setConvs([]); return; }
    let cancelled = false;
    const refresh = async () => {
      const list = await loadConversationsForUser(user.id);
      if (!cancelled) setConvs(list);
    };
    refresh();
    const unsub = subscribeToInboxForUser(user.id, refresh);
    return () => { cancelled = true; unsub(); };
  }, [user?.id]);

  const unreadConvs = useMemo(
    () => convs.filter((c) => c.unreadCount > 0).sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1)),
    [convs],
  );
  const total = unreadConvs.reduce((s, c) => s + c.unreadCount, 0);

  function displayName(c: ConversationWithUnread): string {
    if (c.kind === "project") {
      const p = projects.find((pp) => pp.id === c.projectId);
      return p ? `# ${p.name}` : "# Project";
    }
    if (c.kind === "group") return c.name ?? "Group";
    const otherUid = c.members.find((m) => m.userId !== user?.id)?.userId;
    const other = staff.find((s) => staffAuthId(s) === otherUid);
    return other ? staffName(other) : "Direct message";
  }
  function icon(c: ConversationWithUnread) {
    if (c.kind === "project") return <Hash size={13} style={{ color: "#60a5fa" }} />;
    if (c.kind === "group") return <UsersIcon size={13} style={{ color: "#a78bfa" }} />;
    return <MessageSquare size={13} style={{ color: "#34d399" }} />;
  }

  if (!user?.id) return null;

  function openConversation(id: string) {
    setOpen(false);
    router.push(`/chat?c=${id}`);
  }

  // On /chat, lift the bubble above the message composer so it doesn't cover Send.
  const onChat = Boolean(pathname && pathname.startsWith("/chat"));

  return (
    <div className="fixed z-50 flex flex-col items-end gap-2" style={{ right: 20, bottom: onChat ? 92 : 20 }}>
      {open && (
        <div ref={panelRef} className="rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{ width: 340, maxHeight: 460, background: "var(--bg-base)", border: "1px solid var(--border)", boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}>
          <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
            <MessageSquare size={14} style={{ color: "var(--accent)" }} />
            <p className="text-sm font-semibold flex-1" style={{ color: "var(--text)" }}>
              Unread messages{total > 0 ? ` · ${total}` : ""}
            </p>
            <button onClick={() => setOpen(false)} className="opacity-60 hover:opacity-100" style={{ color: "var(--text-muted)" }}>
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {unreadConvs.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>You&apos;re all caught up! 🎉</p>
              </div>
            ) : (
              unreadConvs.map((c) => (
                <button key={c.id} onClick={() => openConversation(c.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-opacity hover:opacity-90"
                  style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${colorFor(c.id)}25` }}>
                    {icon(c)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate flex-1" style={{ color: "var(--text)" }}>{displayName(c)}</p>
                      <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{timeAgo(c.lastMessageAt)}</span>
                    </div>
                    {c.lastMessagePreview && (
                      <p className="text-xs line-clamp-1 break-words mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {c.lastMessagePreview}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                    style={{ background: "#ef4444", color: "#fff" }}>
                    {c.unreadCount}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <button onClick={() => setOpen((v) => !v)}
        className="relative w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", boxShadow: "0 8px 24px rgba(var(--accent-rgb),0.45)" }}
        title="Unread messages">
        <MessageSquare size={22} />
        {total > 0 && !open && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center"
            style={{ background: "#ef4444", color: "#fff", border: "2px solid var(--bg-base)" }}>
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>
    </div>
  );
}
