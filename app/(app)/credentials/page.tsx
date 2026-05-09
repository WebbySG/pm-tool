"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/topbar";
import { type Credential } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Copy, Check, Shield, Lock, Trash2, LogIn, CheckCircle2 } from "lucide-react";
import { AdminOnly } from "@/components/admin-guard";

interface LiveStaff {
  id: string; user_id: string | null; email: string;
  first_name: string | null; last_name: string | null; avatar_initials: string;
}
function staffAuthId(s: LiveStaff) { return s.user_id ?? s.id; }
function staffName(s: LiveStaff) { return [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email; }
function staffInitials(s: LiveStaff) { return s.avatar_initials || staffName(s).slice(0, 2).toUpperCase(); }

function CredentialRow({ cred, isLast, liveStaff }: { cred: Credential; isLast: boolean; liveStaff: LiveStaff[] }) {
  const { updateCredentialAccess, deleteCredential } = useStore();
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<"user" | "pass" | null>(null);
  const [loginToast, setLoginToast] = useState(false);
  const [showAccessMenu, setShowAccessMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allowedUsers = liveStaff.filter((s) => cred.allowedStaff.includes(staffAuthId(s)));

  function copyToClipboard(text: string, field: "user" | "pass") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function handleLogin() {
    if (cred.url) window.open(cred.url, "_blank", "noopener,noreferrer");
    navigator.clipboard.writeText(cred.password).then(() => {
      setLoginToast(true);
      setTimeout(() => setLoginToast(false), 3500);
    });
  }

  function toggleAccess(userId: string) {
    const updated = cred.allowedStaff.includes(userId)
      ? cred.allowedStaff.filter((id: string) => id !== userId)
      : [...cred.allowedStaff, userId];
    updateCredentialAccess(cred.id, updated);
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); return; }
    deleteCredential(cred.id);
  }

  return (
    <div
      className="px-5 py-4 flex items-center gap-4 group"
      style={{ background: "#0f1d2e", borderBottom: isLast ? "none" : "1px solid #1c3248" }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#1c3248" }}>
        <Lock size={14} style={{ color: "#4a7090" }} />
      </div>

      {/* Label + URL + notes */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "#cce4ff" }}>{cred.label}</p>
        {cred.url && (
          <p className="text-xs truncate mt-0.5" style={{ color: "#4a7090" }}>
            {cred.url.replace(/^https?:\/\//, "")}
          </p>
        )}
        {cred.notes && <p className="text-xs mt-0.5 truncate" style={{ color: "#8b90a750" }}>{cred.notes}</p>}
      </div>

      {/* Username */}
      <div className="shrink-0">
        <p className="text-xs mb-0.5" style={{ color: "#4a7090" }}>Username</p>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-mono" style={{ color: "#cce4ff" }}>{cred.username}</p>
          <button
            onClick={() => copyToClipboard(cred.username, "user")}
            className="p-1 rounded hover:opacity-70 transition-opacity"
            style={{ color: copied === "user" ? "#22c55e" : "#4a7090" }}
            title="Copy username"
          >
            {copied === "user" ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="shrink-0">
        <p className="text-xs mb-0.5" style={{ color: "#4a7090" }}>Password</p>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-mono" style={{ color: "#cce4ff" }}>
            {showPassword ? cred.password : "••••••••"}
          </p>
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="p-1 rounded hover:opacity-70 transition-opacity"
            style={{ color: "#4a7090" }}
            title={showPassword ? "Hide" : "Show"}
          >
            {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
          <button
            onClick={() => copyToClipboard(cred.password, "pass")}
            className="p-1 rounded hover:opacity-70 transition-opacity"
            style={{ color: copied === "pass" ? "#22c55e" : "#4a7090" }}
            title="Copy password"
          >
            {copied === "pass" ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* One-click login */}
      {cred.url && (
        <div className="relative shrink-0">
          <button
            onClick={handleLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: "#38b6e820", color: "#38b6e8", border: "1px solid #38b6e840" }}
            title="Open login page and copy password"
          >
            <LogIn size={12} /> Login
          </button>
          {loginToast && (
            <div
              className="absolute right-0 top-full mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap z-20"
              style={{ background: "#22c55e", color: "#fff", boxShadow: "0 4px 12px rgba(34,197,94,0.4)" }}
            >
              <CheckCircle2 size={11} /> Opened · password copied
            </div>
          )}
        </div>
      )}

      {/* Access control */}
      <div className="relative flex items-center gap-2 shrink-0">
        <span className="text-xs" style={{ color: "#4a7090" }}>Access:</span>
        {allowedUsers.length === 0 ? (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#ef444420", color: "#ef4444" }}>Admin only</span>
        ) : (
          <div className="flex -space-x-2">
            {allowedUsers.map((s) => (
              <div key={s.id} title={staffName(s)} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2" style={{ background: "#38b6e8", color: "#fff", borderColor: "#0f1d2e" }}>
                {staffInitials(s)}
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowAccessMenu(!showAccessMenu)}
          className="text-xs px-2 py-0.5 rounded-lg hover:opacity-80 transition-opacity"
          style={{ background: "#1c3248", color: "#4a7090" }}
        >
          Manage
        </button>

        {showAccessMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowAccessMenu(false)} />
            <div className="absolute right-0 top-full mt-1 rounded-lg z-20 shadow-lg overflow-hidden" style={{ background: "#0e1e30", border: "1px solid #1c3248", minWidth: "200px" }}>
              <p className="text-xs font-semibold px-3 pt-2.5 pb-1" style={{ color: "#4a7090" }}>STAFF ACCESS</p>
              {liveStaff.map((s) => {
                const id = staffAuthId(s);
                const hasAccess = cred.allowedStaff.includes(id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleAccess(id)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:opacity-80"
                    style={{ color: "#cce4ff" }}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#38b6e8", color: "#fff" }}>
                      {staffInitials(s)}
                    </div>
                    <span className="flex-1 text-left text-xs">{staffName(s)}</span>
                    <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0" style={{ borderColor: hasAccess ? "#22c55e" : "#1c3248", background: hasAccess ? "#22c55e" : "transparent" }}>
                      {hasAccess && <Check size={10} color="#fff" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleDelete}
        className="p-1.5 rounded-lg hover:opacity-70 transition-opacity shrink-0"
        style={{ color: confirmDelete ? "#ef4444" : "#8b90a750" }}
        title={confirmDelete ? "Click again to confirm" : "Delete"}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export default function CredentialsPage() {
  const { credentials } = useStore();
  const [liveStaff, setLiveStaff] = useState<LiveStaff[]>([]);

  useEffect(() => {
    supabase.from("staff_members").select("id,user_id,email,first_name,last_name,avatar_initials")
      .eq("status", "active")
      .then(({ data }) => setLiveStaff((data as LiveStaff[]) ?? []));
  }, []);

  // Group by free-text client name (ungrouped if blank)
  const clientNames = Array.from(new Set(credentials.map((c) => c.client || ""))).sort();
  const grouped = clientNames.map((name) => ({
    name,
    creds: credentials.filter((c) => (c.client || "") === name),
  }));

  return (
    <AdminOnly>
      <Topbar title="Credentials Vault" action={{ label: "Add Credential", href: "/credentials/new" }} />
      <div className="p-6 flex flex-col gap-6">

        {/* Security notice */}
        <div className="rounded-xl p-4 flex gap-3 items-center" style={{ background: "#0f1d2e", border: "1px solid #22c55e30" }}>
          <Shield size={18} style={{ color: "#22c55e" }} />
          <p className="text-sm" style={{ color: "#4a7090" }}>
            All credentials are encrypted. Access is logged and controlled by Admin.
            <span className="ml-1 font-medium" style={{ color: "#cce4ff" }}>Staff can only view credentials you have granted access to.</span>
          </p>
        </div>

        {credentials.length === 0 && (
          <p className="text-sm" style={{ color: "#4a7090" }}>No credentials stored yet.</p>
        )}

        {grouped.map(({ name, creds }) => (
          <div key={name || "__ungrouped__"}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#38b6e820", color: "#38b6e8" }}>
                {name ? name[0].toUpperCase() : "?"}
              </div>
              <h2 className="font-semibold text-sm" style={{ color: "#cce4ff" }}>{name || "No client"}</h2>
              <span className="text-xs ml-1" style={{ color: "#4a7090" }}>· {creds.length} credential{creds.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1c3248" }}>
              {creds.map((cred, i) => (
                <CredentialRow key={cred.id} cred={cred} isLast={i === creds.length - 1} liveStaff={liveStaff} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </AdminOnly>
  );
}
