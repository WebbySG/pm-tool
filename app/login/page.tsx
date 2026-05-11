"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

const REMEMBER_KEY = "webbyops_remembered_email";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slowWarning, setSlowWarning] = useState(false);
  const router = useRouter();

  // Restore remembered email on mount
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) { setEmail(saved); setRemember(true); }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSlowWarning(false);
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, email.trim());
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
    // After 12s show "taking longer than usual" but keep trying
    const slowTimer = setTimeout(() => setSlowWarning(true), 12000);
    // Hard give-up after 90s
    const giveUp = setTimeout(() => {
      setLoading(false);
      setSlowWarning(false);
      setError("Could not reach the server. Check your connection and try again.");
    }, 90000);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    clearTimeout(slowTimer);
    clearTimeout(giveUp);
    setSlowWarning(false);
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message);
      setLoading(false);
    } else {
      router.replace("/dashboard");
      // Fallback if navigation stalls
      setTimeout(() => setLoading(false), 8000);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(var(--accent-rgb),0.12) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-sm relative anim-up">
        {/* Logo */}
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
          <h1 className="text-2xl font-extrabold text-gradient tracking-tight">WebbyOps</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Sign in to your workspace
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}
        >
          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
              style={{ background: "#ef444418", border: "1px solid #ef444440", color: "#f87171" }}
            >
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Email
              </label>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <Mail size={14} style={{ color: "var(--text-muted)" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@agency.com"
                  required
                  autoFocus
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "var(--text)" }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Password
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
                  placeholder="••••••••"
                  required
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "var(--text)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setRemember(!remember)}
                className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors"
                style={{
                  background: remember ? "var(--accent)" : "transparent",
                  border: `1.5px solid ${remember ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                {remember && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Remember my email</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                boxShadow: "0 4px 16px rgba(var(--accent-rgb), 0.35)",
              }}
            >
              {loading ? <><Loader2 size={15} className="animate-spin" />Signing in…</> : "Sign In"}
            </button>
            {slowWarning && (
              <p className="text-xs text-center mt-1" style={{ color: "var(--text-muted)" }}>
                Taking longer than usual — please wait…
              </p>
            )}
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          No account? Ask your admin to send you an invite.
        </p>
      </div>
    </div>
  );
}
