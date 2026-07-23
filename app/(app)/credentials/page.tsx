"use client";
import { useState, useEffect, useRef } from "react";
import { Topbar } from "@/components/topbar";
import { type Credential } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Copy, Check, Shield, Lock, Trash2, LogIn, CheckCircle2, Pencil, X, Loader2, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/utils";

interface LiveStaff {
  id: string; user_id: string | null; email: string;
  first_name: string | null; last_name: string | null; avatar_initials: string;
}
function staffAuthId(s: LiveStaff) { return s.user_id ?? s.id; }
function staffName(s: LiveStaff) { return [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email; }
function staffInitials(s: LiveStaff) { return s.avatar_initials || staffName(s).slice(0, 2).toUpperCase(); }

function CredentialRow({ cred, isLast, liveStaff, isAdmin }: { cred: Credential; isLast: boolean; liveStaff: LiveStaff[]; isAdmin: boolean }) {
  const { updateCredential, updateCredentialAccess, deleteCredential } = useStore();
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<"user" | "pass" | null>(null);
  const [loginToast, setLoginToast] = useState(false);
  const [showAccessMenu, setShowAccessMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const manageBtnRef = useRef<HTMLButtonElement>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ client: "", label: "", url: "", username: "", password: "", notes: "" });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const allowedUsers = liveStaff.filter((s) => cred.allowedStaff.includes(staffAuthId(s)));

  // The access menu is rendered with position:fixed (anchored to the Manage
  // button) so it escapes the card's `overflow-hidden` clipping — otherwise the
  // dropdown gets cut off below the card and can't be clicked. Flip upward when
  // there isn't enough room below (e.g. last row of a long vault).
  function toggleAccessMenu() {
    if (showAccessMenu) { setShowAccessMenu(false); return; }
    const r = manageBtnRef.current?.getBoundingClientRect();
    if (r) {
      const right = Math.max(8, window.innerWidth - r.right);
      const estH = Math.min(window.innerHeight * 0.6, 36 + Math.max(1, liveStaff.length) * 44);
      const openUp = r.bottom + 6 + estH > window.innerHeight - 8 && r.top - 6 - estH > 8;
      setMenuPos(openUp
        ? { bottom: window.innerHeight - r.top + 6, right }
        : { top: r.bottom + 6, right });
    }
    setShowAccessMenu(true);
  }

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

  function openEdit() {
    setEditForm({
      client: cred.client, label: cred.label, url: cred.url,
      username: cred.username, password: cred.password, notes: cred.notes,
    });
    setEditError("");
    setShowEdit(true);
  }

  async function handleSaveEdit() {
    if (!editForm.label.trim()) { setEditError("Label is required."); return; }
    if (!editForm.username.trim()) { setEditError("Username is required."); return; }
    if (!editForm.password.trim()) { setEditError("Password is required."); return; }
    if (savingEdit) return;
    setSavingEdit(true);
    setEditError("");
    try {
      await updateCredential(cred.id, {
        client: editForm.client.trim(),
        label: editForm.label.trim(),
        url: editForm.url.trim(),
        username: editForm.username.trim(),
        password: editForm.password,
        notes: editForm.notes,
      });
      setShowEdit(false);
    } catch (e) {
      setEditError(errorMessage(e));
    } finally {
      setSavingEdit(false);
    }
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
            className="p-1.5 rounded-md hover:opacity-80 transition-opacity"
            style={{
              color: copied === "user" ? "#22c55e" : "#9fb6cf",
              background: "#0e1e30",
              border: `1px solid ${copied === "user" ? "#22c55e40" : "#2a4a6a"}`,
            }}
            title="Copy username"
          >
            {copied === "user" ? <Check size={13} /> : <Copy size={13} />}
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
            className="p-1.5 rounded-md hover:opacity-80 transition-opacity"
            style={{ color: "#9fb6cf", background: "#0e1e30", border: "1px solid #2a4a6a" }}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button
            onClick={() => copyToClipboard(cred.password, "pass")}
            className="p-1.5 rounded-md hover:opacity-80 transition-opacity"
            style={{
              color: copied === "pass" ? "#22c55e" : "#9fb6cf",
              background: "#0e1e30",
              border: `1px solid ${copied === "pass" ? "#22c55e40" : "#2a4a6a"}`,
            }}
            title="Copy password"
          >
            {copied === "pass" ? <Check size={13} /> : <Copy size={13} />}
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

      {/* Access control — admin only */}
      {isAdmin && (
        <div className="flex items-center gap-2 shrink-0">
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
            ref={manageBtnRef}
            onClick={toggleAccessMenu}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: "#1c3248", color: "#cce4ff", border: "1px solid #2a4a6a" }}
            title="Choose which staff can see this credential"
          >
            <Users size={12} /> Manage
          </button>

          {showAccessMenu && menuPos && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAccessMenu(false)} />
              <div
                className="fixed rounded-lg z-50 shadow-lg"
                style={{ top: menuPos.top, bottom: menuPos.bottom, right: menuPos.right, background: "#0e1e30", border: "1px solid #1c3248", minWidth: "220px", maxHeight: "60vh", overflowY: "auto" }}
              >
                <p className="text-xs font-semibold px-3 pt-2.5 pb-1" style={{ color: "#4a7090" }}>STAFF ACCESS</p>
                {liveStaff.length === 0 && (
                  <p className="text-xs px-3 pb-2.5" style={{ color: "#4a7090" }}>No active staff to assign.</p>
                )}
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
      )}

      {isAdmin && (
        <button
          onClick={openEdit}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:opacity-80 transition-opacity shrink-0"
          style={{ background: "#0e1e30", color: "#9fb6cf", border: "1px solid #2a4a6a" }}
          title="Edit this credential's details"
        >
          <Pencil size={12} /> Edit
        </button>
      )}

      {isAdmin && (
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:opacity-90 transition-all shrink-0"
          style={confirmDelete
            ? { background: "#ef4444", color: "#fff", border: "1px solid #ef4444" }
            : { background: "#ef444412", color: "#ef4444", border: "1px solid #ef444435" }}
          title={confirmDelete ? "Click again to permanently delete" : "Delete this credential"}
        >
          <Trash2 size={12} /> {confirmDelete ? "Confirm?" : "Delete"}
        </button>
      )}

      {/* Edit Credential Modal */}
      {showEdit && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "#00000070" }} onClick={() => !savingEdit && setShowEdit(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="rounded-xl w-full max-w-lg flex flex-col gap-4 p-6 max-h-[85vh] overflow-y-auto" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: "#cce4ff" }}>Edit Credential</h3>
                <button onClick={() => setShowEdit(false)} style={{ color: "#4a7090" }}><X size={16} /></button>
              </div>

              {/* Client */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "#4a7090" }}>Client</label>
                <input
                  type="text"
                  placeholder="e.g. Cemimax Asia, Stone Emperor"
                  value={editForm.client}
                  onChange={(e) => setEditForm({ ...editForm, client: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                />
              </div>

              {/* Label */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "#4a7090" }}>Label *</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. WordPress Admin, Google Analytics"
                  value={editForm.label}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                />
              </div>

              {/* URL / Link */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "#4a7090" }}>Login URL / Link</label>
                <input
                  type="text"
                  placeholder="https://example.com/admin"
                  value={editForm.url}
                  onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                />
              </div>

              {/* Username + Password */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs" style={{ color: "#4a7090" }}>Username / Email *</label>
                  <input
                    type="text"
                    placeholder="username or email"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs" style={{ color: "#4a7090" }}>Password *</label>
                  <input
                    type="text"
                    placeholder="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "#4a7090" }}>Notes</label>
                <textarea
                  placeholder="Any notes about this credential..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                />
              </div>

              {editError && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "#ef444420", color: "#ef4444" }}>{editError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: "#38b6e8", color: "#fff" }}
                >
                  {savingEdit ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save Changes</>}
                </button>
                <button
                  onClick={() => setShowEdit(false)}
                  disabled={savingEdit}
                  className="px-4 py-2.5 rounded-lg text-sm disabled:opacity-60"
                  style={{ background: "#0e1e30", color: "#4a7090", border: "1px solid #1c3248" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CredentialsPage() {
  const { credentials } = useStore();
  const { user } = useAuth();
  const isAdmin = user?.pmRole === "admin";
  const [liveStaff, setLiveStaff] = useState<LiveStaff[]>([]);

  useEffect(() => {
    // Only admins need the staff list (for the per-credential access menu).
    if (!user?.id || !isAdmin) return;
    supabase.from("staff_members").select("id,user_id,email,first_name,last_name,avatar_initials")
      .eq("status", "active")
      .then(({ data }) => setLiveStaff((data as LiveStaff[]) ?? []));
  }, [user?.id, isAdmin]);

  // Staff only see credentials explicitly granted to them. DB-level RLS already
  // enforces this (pm_credentials_select), but we filter client-side too as a
  // safeguard against any stale data already in the persisted store.
  const visibleCreds = isAdmin
    ? credentials
    : credentials.filter((c) => !!user?.id && c.allowedStaff.includes(user.id));

  // Group by free-text client name (ungrouped if blank)
  const clientNames = Array.from(new Set(visibleCreds.map((c) => c.client || ""))).sort();
  const grouped = clientNames.map((name) => ({
    name,
    creds: visibleCreds.filter((c) => (c.client || "") === name),
  }));

  return (
    <>
      <Topbar
        title="Credentials Vault"
        action={isAdmin ? { label: "Add Credential", href: "/credentials/new" } : undefined}
      />
      <div className="p-6 flex flex-col gap-6">

        {/* Security notice */}
        <div className="rounded-xl p-4 flex gap-3 items-center" style={{ background: "#0f1d2e", border: "1px solid #22c55e30" }}>
          <Shield size={18} style={{ color: "#22c55e" }} />
          {isAdmin ? (
            <p className="text-sm" style={{ color: "#4a7090" }}>
              All credentials are encrypted. Access is logged and controlled by Admin.
              <span className="ml-1 font-medium" style={{ color: "#cce4ff" }}>Staff can only view credentials you have granted access to.</span>
            </p>
          ) : (
            <p className="text-sm" style={{ color: "#4a7090" }}>
              These are the credentials an admin has shared with you.
              <span className="ml-1 font-medium" style={{ color: "#cce4ff" }}>Keep them confidential — access is logged.</span>
            </p>
          )}
        </div>

        {visibleCreds.length === 0 && (
          <p className="text-sm" style={{ color: "#4a7090" }}>
            {isAdmin
              ? "No credentials stored yet."
              : "No credentials have been shared with you yet. Ask an admin to grant you access."}
          </p>
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
                <CredentialRow key={cred.id} cred={cred} isLast={i === creds.length - 1} liveStaff={liveStaff} isAdmin={isAdmin} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
