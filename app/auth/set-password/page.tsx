"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { linkStaffAccount } from "@/app/actions/invite";
import { useRouter } from "next/navigation";
import { Zap, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }

    setLoading(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    // Safety net: ensure the invited staff_members row is linked + active even
    // if the auth callback's link call didn't run (idempotent server action).
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      await linkStaffAccount(session.access_token);
    }
    setDone(true);
    setTimeout(() => router.replace("/dashboard"), 1500);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg-base)" }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(var(--accent-rgb),0.12) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-sm relative anim-up">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 anim-float"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              boxShadow: "0 8px 28px rgba(var(--accent-rgb), 0.45)",
            }}
          >
            <Zap size={24} color="#fff" fill="#fff" />
          </div>
          <h1 className="text-2xl font-extrabold text-gradient tracking-tight">Set your password</h1>
          <p className="text-sm mt-1 text-center" style={{ color: "var(--text-muted)" }}>
            Welcome! Choose a password to complete your account setup.
          </p>
        </div>

        <div
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}
        >
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 size={40} style={{ color: "#22c55e" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                Password set! Redirecting…
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: "#ef444418", border: "1px solid #ef444440", color: "#f87171" }}
                >
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    New Password
                  </label>
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                  >
                    <Lock size={14} style={{ color: "var(--text-muted)" }} />
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      autoFocus
                      className="flex-1 bg-transparent text-sm outline-none"
                      style={{ color: "var(--text)" }}
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ color: "var(--text-muted)" }}>
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Confirm Password
                  </label>
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                  >
                    <Lock size={14} style={{ color: "var(--text-muted)" }} />
                    <input
                      type={showPw ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      required
                      className="flex-1 bg-transparent text-sm outline-none"
                      style={{ color: "var(--text)" }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    boxShadow: "0 4px 16px rgba(var(--accent-rgb), 0.35)",
                  }}
                >
                  {loading ? "Saving…" : "Set Password & Continue"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
