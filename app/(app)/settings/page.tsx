"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/topbar";
import { USERS } from "@/lib/mock-data";
import { UserPlus, Trash2, Shield, Bell, Key, Bot, Check, Palette } from "lucide-react";
import { THEMES, type ThemeName, getStoredTheme, applyTheme } from "@/lib/theme";

// ── Compact theme card ────────────────────────────────────────────────────────
function ThemeCard({
  name,
  active,
  onSelect,
}: {
  name: ThemeName;
  active: boolean;
  onSelect: () => void;
}) {
  const t = THEMES[name];
  const p = t.preview;

  return (
    <button
      onClick={onSelect}
      className={`relative flex flex-col rounded-2xl overflow-hidden text-left transition-all hover:-translate-y-0.5 ${active ? "anim-theme-pop" : ""}`}
      style={{
        border: active ? `2px solid ${p.accent}` : "2px solid var(--border)",
        boxShadow: active ? `0 0 20px ${p.accent}40, 0 4px 16px rgba(0,0,0,0.3)` : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {/* Mini UI preview */}
      <div className="flex h-24 overflow-hidden" style={{ background: p.bg }}>
        {/* Fake sidebar */}
        <div className="w-10 h-full flex flex-col gap-1 p-1.5" style={{ background: p.sidebar }}>
          <div className="w-5 h-5 rounded-md mx-auto mb-1" style={{ background: p.accent }} />
          {[0.7, 1, 0.5, 0.8, 0.6].map((op, i) => (
            <div key={i} className="h-1.5 rounded-full" style={{ background: p.accent, opacity: op, width: `${50 + i * 8}%` }} />
          ))}
        </div>
        {/* Fake content */}
        <div className="flex-1 p-2 flex flex-col gap-1.5">
          {/* topbar */}
          <div className="h-4 rounded" style={{ background: p.sidebar }} />
          {/* stat cards */}
          <div className="grid grid-cols-2 gap-1 flex-1">
            {[p.accent, p.accent2, p.accent, p.accent2].map((c, i) => (
              <div
                key={i}
                className="rounded-md flex items-end p-1"
                style={{ background: p.card, border: `1px solid ${c}30` }}
              >
                <div className="w-1.5 rounded-full mr-0.5" style={{ background: c, height: `${30 + i * 15}%` }} />
                <div className="w-1 rounded-full" style={{ background: c, opacity: 0.4, height: `${20 + i * 10}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Label row */}
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border)" }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{t.label}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{t.description}</p>
        </div>
        {active && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: p.accent }}
          >
            <Check size={12} color="#fff" strokeWidth={3} />
          </div>
        )}
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTheme, setActiveTheme] = useState<ThemeName>("dark");

  useEffect(() => {
    setActiveTheme(getStoredTheme());
  }, []);

  function handleTheme(name: ThemeName) {
    setActiveTheme(name);
    applyTheme(name);
  }

  return (
    <>
      <Topbar title="Settings" />
      <div className="p-6 max-w-2xl flex flex-col gap-6">

        {/* ── Appearance ── */}
        <section
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div
            className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
            >
              <Palette size={15} color="#fff" />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color: "var(--text)" }}>Appearance</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Choose a theme that suits your vibe</p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            {(Object.keys(THEMES) as ThemeName[]).map((name) => (
              <ThemeCard
                key={name}
                name={name}
                active={activeTheme === name}
                onSelect={() => handleTheme(name)}
              />
            ))}
          </div>
        </section>

        {/* ── Team Members ── */}
        <section
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div>
              <h2 className="font-bold text-sm" style={{ color: "var(--text)" }}>Team Members</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Manage who has access to the system</p>
            </div>
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
            >
              <UserPlus size={14} /> Invite
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {USERS.map((user) => (
              <div key={user.id} className="flex items-center gap-4 px-5 py-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "#fff" }}
                >
                  {user.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{user.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{user.email}</p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: user.role === "admin" ? "#ef444420" : "rgba(var(--accent-rgb),0.12)",
                    color: user.role === "admin" ? "#ef4444" : "var(--accent)",
                  }}
                >
                  {user.role}
                </span>
                {user.role !== "admin" && (
                  <button className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: "var(--text-muted)" }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── AI Settings ── */}
        <section
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="font-bold text-sm" style={{ color: "var(--text)" }}>AI Follow-up Settings</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Configure when AI sends daily digests</p>
          </div>
          <div className="px-5 py-4 flex flex-col gap-4">
            {[
              { label: "Daily digest time", desc: "When AI sends the morning summary", value: "08:00 AM" },
              { label: "Overdue escalation", desc: "Alert after task is overdue by", value: "2 days" },
              { label: "No-activity alert", desc: "Flag tasks with no update after", value: "3 days" },
            ].map(({ label, desc, value }) => (
              <div key={label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{label}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
                </div>
                <button
                  className="px-3 py-1.5 rounded-xl text-sm font-medium"
                  style={{ background: "var(--bg-surface)", color: "var(--text)", border: "1px solid var(--border)" }}
                >
                  {value}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Security ── */}
        <section
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="font-bold text-sm" style={{ color: "var(--text)" }}>Security</h2>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            {[
              { icon: Key,    label: "Change password",            desc: "Update your account password" },
              { icon: Shield, label: "Two-factor authentication",  desc: "Add an extra layer of security" },
              { icon: Bell,   label: "Audit log",                  desc: "See all credential access history" },
            ].map(({ icon: Icon, label, desc }) => (
              <button
                key={label}
                className="flex items-center gap-3 w-full text-left rounded-xl px-3 py-2.5 hover:opacity-80 transition-opacity"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <Icon size={16} style={{ color: "var(--accent)" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{label}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

      </div>
    </>
  );
}
