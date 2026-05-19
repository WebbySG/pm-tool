"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { MessageSquare, X } from "lucide-react";

type Toast = {
  id: string;
  authorName: string;
  authorInitials: string;
  body: string;
  conversationId: string;
};

const TOAST_LIFETIME_MS = 5000;
const AVATAR_COLORS = ["#818cf8", "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#22d3ee"];

export function ChatToastContainer() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const memberConvIdsRef = useRef<Set<string>>(new Set());
  const staffByIdRef = useRef<Map<string, { name: string; initials: string }>>(new Map());

  // Cache the set of conversation IDs current user belongs to
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const refreshMembership = async () => {
      const { data } = await supabase.from("pm_chat_members")
        .select("conversation_id").eq("user_id", user.id);
      if (cancelled) return;
      memberConvIdsRef.current = new Set((data ?? []).map((r) => (r as { conversation_id: string }).conversation_id));
    };
    refreshMembership();
    const ch = supabase.channel("chat-toast-membership")
      .on("postgres_changes", { event: "*", schema: "public", table: "pm_chat_members", filter: `user_id=eq.${user.id}` },
        () => refreshMembership())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user?.id]);

  // Cache staff names
  useEffect(() => {
    let cancelled = false;
    supabase.from("staff_members").select("user_id, first_name, last_name, email, avatar_initials")
      .eq("status", "active")
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map = new Map<string, { name: string; initials: string }>();
        for (const r of data) {
          const row = r as { user_id: string | null; first_name: string | null; last_name: string | null; email: string; avatar_initials: string | null };
          if (!row.user_id) continue;
          const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || row.email;
          map.set(row.user_id, {
            name,
            initials: row.avatar_initials || name.slice(0, 2).toUpperCase(),
          });
        }
        staffByIdRef.current = map;
      });
    return () => { cancelled = true; };
  }, []);

  // Subscribe to all new chat messages; show toast if relevant
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel("chat-toast-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pm_chat_messages" }, (payload) => {
        const m = payload.new as { id: string; conversation_id: string; author_id: string; body: string; attachment_name?: string | null };
        if (!m) return;
        if (m.author_id === user.id) return;
        if (!memberConvIdsRef.current.has(m.conversation_id)) return;
        // Skip if user is currently on the chat page (they'll see inline)
        if (pathname && pathname.startsWith("/chat")) return;

        const author = staffByIdRef.current.get(m.author_id);
        const body = (m.body && m.body.trim()) || (m.attachment_name ? `📎 ${m.attachment_name}` : "");
        if (!body) return;

        const toast: Toast = {
          id: m.id,
          authorName: author?.name ?? "Someone",
          authorInitials: author?.initials ?? "?",
          body: body.slice(0, 140),
          conversationId: m.conversation_id,
        };
        setToasts((prev) => [...prev.filter((t) => t.id !== m.id), toast]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== m.id));
        }, TOAST_LIFETIME_MS);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, pathname]);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed z-50 flex flex-col gap-2"
      style={{ right: 20, bottom: 20, width: 320 }}>
      {toasts.map((t, i) => {
        const color = AVATAR_COLORS[Math.abs(t.id.charCodeAt(0)) % AVATAR_COLORS.length];
        return (
          <Link key={t.id} href="/chat" onClick={() => dismiss(t.id)}
            className="flex items-start gap-2.5 p-3 rounded-xl shadow-lg transition-all anim-float-in"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              animation: `slideInUp 0.25s ease ${i * 0.04}s both`,
              boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
            }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: color, color: "#fff" }}>
              {t.authorInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <MessageSquare size={11} style={{ color: "var(--text-muted)" }} />
                <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{t.authorName}</p>
              </div>
              <p className="text-xs line-clamp-2 break-words" style={{ color: "var(--text-muted)" }}>{t.body}</p>
            </div>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismiss(t.id); }}
              className="shrink-0 opacity-50 hover:opacity-100"
              style={{ color: "var(--text-muted)" }}>
              <X size={12} />
            </button>
          </Link>
        );
      })}
      <style jsx>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
