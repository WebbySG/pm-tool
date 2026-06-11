"use client";
import { useEffect, useState, useTransition } from "react";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { inviteStaff, revokeStaff, setStaffPassword } from "@/app/actions/invite";
import { UserPlus, Mail, Clock, CheckCircle2, X, Send, Loader2, UserMinus, KeyRound, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

function priorityColor(p: number | string): string {
  const n = typeof p === "number" ? p : 5;
  if (n <= 2) return "#ef4444";
  if (n <= 4) return "#f59e0b";
  if (n <= 6) return "#818cf8";
  return "#22c55e";
}
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
      const { data: { session } } = await supabase.auth.getSession();
      const result = await inviteStaff({ name: name.trim(), email: email.trim(), callerToken: session?.access_token ?? "" });
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
  const { projects, refresh } = useStore();
  const allTasks = projects.flatMap((p) => p.tasks);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  async function loadStaff() {
    const { data } = await supabase
      .from("staff_members")
      .select("*")
      .order("created_at", { ascending: false });
    setStaff((data as StaffMember[]) ?? []);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([refresh(), loadStaff()]).finally(() => setLoading(false));
  }, []);

  function handleInviteSent() {
    loadStaff();
    setToast("Invite sent! Tip: don't open their invite link yourself — use the key button to set their password instead.");
    setTimeout(() => setToast(""), 7000);
  }

  async function handleRevoke(s: StaffMember) {
    const label = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email;
    if (!confirm(`Remove ${label} from the team? This will revoke their access immediately.`)) return;
    const { data: { session } } = await supabase.auth.getSession();
    const result = await revokeStaff({ staffId: s.id, userId: s.user_id, email: s.email, callerToken: session?.access_token ?? "" });
    if (result.success) {
      // Re-fetch from DB instead of trusting a local filter — verifies the row
      // actually went away rather than just hiding it client-side.
      await loadStaff();
      setToast(`${label} has been removed.`);
      setTimeout(() => setToast(""), 3000);
    } else {
      setToast(`Error: ${result.error}`);
      setTimeout(() => setToast(""), 6000);
    }
  }

  // Set/reset a staff member's password (admin-only feature; replaces the
  // need to ever open the invite email link from the admin's own browser).
  const [pwTarget, setPwTarget] = useState<StaffMember | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwShow, setPwShow] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");

  function openPwDialog(s: StaffMember) {
    setPwTarget(s);
    setPwValue("");
    setPwShow(false);
    setPwError("");
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwTarget) return;
    if (pwValue.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    setPwSaving(true);
    setPwError("");
    const { data: { session } } = await supabase.auth.getSession();
    const result = await setStaffPassword({ staffId: pwTarget.id, newPassword: pwValue, callerToken: session?.access_token ?? "" });
    setPwSaving(false);
    if (result.success) {
      const label = [pwTarget.first_name, pwTarget.last_name].filter(Boolean).join(" ") || pwTarget.email;
      setPwTarget(null);
      await loadStaff();
      setToast(`Password set for ${label} — they can log in with it right away.`);
      setTimeout(() => setToast(""), 5000);
    } else {
      setPwError(result.error ?? "Failed to set password.");
    }
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

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <div className="h-24 rounded-2xl animate-pulse" style={{ background: "var(--bg-card)" }} />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: "var(--bg-card)" }} />)}
        </div>
      </div>
    );
  }

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
                <button
                  onClick={() => openPwDialog(s)}
                  title="Set their password (activates the account — no email link needed)"
                  className="p-1.5 rounded-lg hover:opacity-70 transition-opacity shrink-0"
                  style={{ color: "var(--accent)" }}
                >
                  <KeyRound size={14} />
                </button>
                <button
                  onClick={() => handleRevoke(s)}
                  title="Revoke invite"
                  className="p-1.5 rounded-lg hover:opacity-70 transition-opacity shrink-0"
                  style={{ color: "#ef4444" }}
                >
                  <X size={14} />
                </button>
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
              const review = userTasks.filter((t) => t.status === "pending_review");
              const overdue = open.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());
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
                    {s.pm_role === "staff" && (
                      <>
                        <button
                          onClick={() => openPwDialog(s)}
                          title="Reset their password"
                          className="p-1.5 rounded-lg hover:opacity-70 transition-opacity shrink-0"
                          style={{ color: "var(--accent)" }}
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          onClick={() => handleRevoke(s)}
                          title="Remove staff member"
                          className="p-1.5 rounded-lg hover:opacity-70 transition-opacity shrink-0"
                          style={{ color: "#ef4444" }}
                        >
                          <UserMinus size={15} />
                        </button>
                      </>
                    )}
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
                        className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                        style={{ background: s.can_access_content ? "#10b981" : "var(--bg-surface)", border: "1px solid var(--border)" }}
                        title={s.can_access_content ? "Disable content access" : "Enable content access"}
                      >
                        <span
                          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform"
                          style={{
                            background: s.can_access_content ? "#fff" : "var(--text-muted)",
                            transform: s.can_access_content ? "translateX(1.25rem)" : "translateX(0)",
                          }}
                        />
                      </button>
                    </div>
                  )}

                  <div className="px-5 py-4">
                    <p className="text-xs font-bold mb-3 tracking-widest" style={{ color: "var(--text-muted)" }}>ACTIVE TASKS</p>
                    {open.slice(0, 4).map((task) => {
                      const project = projects.find((p) => p.id === task.projectId);
                      const isOverdue = !!task.dueDate && new Date(task.dueDate) < new Date();
                      return (
                        <Link
                          key={task.id}
                          href={`/projects/${task.projectId}`}
                          className="flex items-center gap-3 mb-2 rounded-lg px-2 py-1.5 -mx-2 hover:opacity-80 transition-opacity"
                          style={{ background: "transparent" }}
                        >
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: priorityColor(task.priority) }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate" style={{ color: "var(--text)" }}>{task.title}</p>
                            {project && <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{project.name}</p>}
                          </div>
                          <span className="text-xs shrink-0" style={{ color: isOverdue ? "#f87171" : "var(--text-muted)" }}>
                            {task.dueDate
                              ? new Date(task.dueDate).toLocaleDateString("en-SG", { day: "numeric", month: "short" })
                              : "No date"}
                          </span>
                        </Link>
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

      {/* Set password dialog */}
      {pwTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => !pwSaving && setPwTarget(null)}
        >
          <form
            onSubmit={handleSetPassword}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-4 anim-up"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}
          >
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                Set password for {[pwTarget.first_name, pwTarget.last_name].filter(Boolean).join(" ") || pwTarget.email}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                They can sign in at os.webby.sg with their email and this password immediately — no email link needed.
              </p>
            </div>

            {pwError && (
              <div
                className="px-3 py-2.5 rounded-xl text-sm"
                style={{ background: "#ef444418", border: "1px solid #ef444440", color: "#f87171" }}
              >
                {pwError}
              </div>
            )}

            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
              <KeyRound size={14} style={{ color: "var(--text-muted)" }} />
              <input
                type={pwShow ? "text" : "password"}
                value={pwValue}
                onChange={(e) => setPwValue(e.target.value)}
                placeholder="Min. 8 characters"
                required
                autoFocus
                autoComplete="off"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--text)" }}
              />
              <button type="button" onClick={() => setPwShow(!pwShow)} style={{ color: "var(--text-muted)" }}>
                {pwShow ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={pwSaving}
                onClick={() => setPwTarget(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pwSaving}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
              >
                {pwSaving ? <><Loader2 size={13} className="animate-spin" />Saving…</> : "Set Password"}
              </button>
            </div>
          </form>
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
