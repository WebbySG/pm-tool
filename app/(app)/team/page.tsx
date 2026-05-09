"use client";
import { useEffect, useState, useTransition } from "react";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { inviteStaff } from "@/app/actions/invite";
import { UserPlus, Mail, Clock, CheckCircle2, X, Send, Loader2 } from "lucide-react";

const priorityColor: Record<string, string> = {
  urgent: "#ef4444", high: "#f59e0b", medium: "#818cf8", low: "#22c55e",
};
const AVATAR_COLORS = ["#818cf8", "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#22d3ee"];

interface StaffMember {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_initials: string;
  pm_role: "admin" | "staff";
  status: string;
  created_at: string;
  can_access_content: boolean;
}

function InviteForm({ onSent }: { onSent: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setError("");
    startTransition(async () => {
      const result = await inviteStaff({ name: name.trim(), email: email.trim() });
      if (result.success) {
        setName("");
        setEmail("");
        onSent();
      } else {
        setError(result.error ?? "Failed to send invite");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          <UserPlus size={15} color="#fff" />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Invite Staff Member</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>They'll receive a confirmation email to set up their account</p>
        </div>
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "#ef444418", color: "#f87171", border: "1px solid #ef444430" }}>
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          required
          className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          required
          className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0 transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", boxShadow: "0 4px 14px rgba(var(--accent-rgb),0.3)" }}
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {isPending ? "Sending…" : "Send Invite"}
        </button>
      </div>
    </form>
  );
}

function TeamContent() {
  const { projects } = useStore();
  const allTasks = projects.flatMap((p) => p.tasks);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [toast, setToast] = useState("");

  async function loadStaff() {
    const { data } = await supabase
      .from("staff_members")
      .select("*")
      .order("created_at", { ascending: false });
    setStaff((data as StaffMember[]) ?? []);
  }

  useEffect(() => { loadStaff(); }, []);

  function handleInviteSent() {
    loadStaff();
    setToast("Invite sent! They'll receive an email shortly.");
    setTimeout(() => setToast(""), 4000);
  }

  async function toggleContentAccess(s: StaffMember) {
    const next = !s.can_access_content;
    await supabase.from("staff_members").update({ can_access_content: next }).eq("id", s.id);
    setStaff((prev) => prev.map((m) => m.id === s.id ? { ...m, can_access_content: next } : m));
    setToast(`Content access ${next ? "enabled" : "disabled"} for ${[s.first_name, s.last_name].filter(Boolean).join(" ") || s.email}`);
    setTimeout(() => setToast(""), 3000);
  }

  const active = staff.filter((s) => s.status === "active");
  const pending = staff.filter((s) => s.status === "invited");

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium anim-up"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "#fff", boxShadow: "0 8px 24px rgba(var(--accent-rgb),0.4)" }}
        >
          <CheckCircle2 size={16} />
          {toast}
        </div>
      )}

      <InviteForm onSent={handleInviteSent} />

      {/* Pending invites */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Pending Invites
          </p>
          <div className="flex flex-col gap-2">
            {pending.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-4 px-4 py-3 rounded-xl"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "var(--bg-surface)", border: "1px dashed var(--border)", color: "var(--text-muted)" }}
                >
                  {s.avatar_initials || <Mail size={13} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                    {[s.first_name, s.last_name].filter(Boolean).join(" ") || s.email}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{s.email}</p>
                </div>
                <span
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: "#f59e0b20", color: "#fbbf24" }}
                >
                  <Clock size={11} /> Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active staff */}
      {active.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Active Staff
          </p>
          <div className="grid grid-cols-2 gap-4">
            {active.map((s, si) => {
              const avatarColor = AVATAR_COLORS[si % AVATAR_COLORS.length];
              const userTasks = allTasks.filter((t) => t.assigneeId === (s.user_id ?? s.id));
              const open = userTasks.filter((t) => t.status !== "done");
              const inProgress = userTasks.filter((t) => t.status === "in_progress");
              const review = userTasks.filter((t) => t.status === "review");
              const overdue = open.filter((t) => new Date(t.dueDate) < new Date());
              const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email;

              return (
                <div
                  key={s.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                      style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}99)`, color: "#fff", boxShadow: `0 0 12px ${avatarColor}50` }}
                    >
                      {s.avatar_initials || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate" style={{ color: "var(--text)" }}>{name}</p>
                      <p className="text-sm truncate" style={{ color: "var(--text-muted)" }}>{s.email}</p>
                    </div>
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 capitalize"
                      style={{ background: `${avatarColor}20`, color: avatarColor }}
                    >
                      {s.pm_role}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 divide-x" style={{ borderBottom: "1px solid var(--border)", borderColor: "var(--border)" }}>
                    {[
                      { value: inProgress.length, label: "In Progress", color: "#60a5fa" },
                      { value: review.length,     label: "In Review",   color: "#fbbf24" },
                      { value: overdue.length,    label: "Overdue",     color: overdue.length > 0 ? "#f87171" : "#34d399" },
                    ].map(({ value, label, color }) => (
                      <div key={label} className="px-4 py-3 text-center">
                        <p className="text-xl font-black" style={{ color }}>{value}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  {s.pm_role === "staff" && (
                    <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>Content Access</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Can view &amp; manage content section</p>
                      </div>
                      <button
                        onClick={() => toggleContentAccess(s)}
                        className="relative w-10 h-5 rounded-full transition-colors shrink-0"
                        style={{ background: s.can_access_content ? "#10b981" : "var(--bg-surface)", border: "1px solid var(--border)" }}
                        title={s.can_access_content ? "Disable content access" : "Enable content access"}
                      >
                        <span
                          className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                          style={{
                            background: s.can_access_content ? "#fff" : "var(--text-muted)",
                            transform: s.can_access_content ? "translateX(1.35rem)" : "translateX(0.1rem)",
                          }}
                        />
                      </button>
                    </div>
                  )}

                  <div className="px-5 py-4">
                    <p className="text-xs font-bold mb-3 tracking-widest" style={{ color: "var(--text-muted)" }}>ACTIVE TASKS</p>
                    {open.slice(0, 4).map((task) => {
                      const project = projects.find((p) => p.id === task.projectId);
                      return (
                        <div key={task.id} className="flex items-center gap-3 mb-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: priorityColor[task.priority] }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate" style={{ color: "var(--text)" }}>{task.title}</p>
                            {project && <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{project.name}</p>}
                          </div>
                          <span className="text-xs shrink-0" style={{ color: new Date(task.dueDate) < new Date() ? "#f87171" : "var(--text-muted)" }}>
                            {new Date(task.dueDate).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      );
                    })}
                    {open.length === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>No active tasks</p>}
                    {open.length > 4 && <p className="text-xs mt-1" style={{ color: "var(--accent)" }}>+{open.length - 4} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {active.length === 0 && pending.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No team members yet. Send your first invite above.</p>
        </div>
      )}
    </div>
  );
}

export default function TeamPage() {
  return (
    <>
      <Topbar title="Team" />
      <AdminOnly>
        <TeamContent />
      </AdminOnly>
    </>
  );
}
