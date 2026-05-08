"use client";
import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { USERS, type Credential } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { Eye, EyeOff, Copy, Check, Plus, Shield, Lock, Trash2, ExternalLink } from "lucide-react";
import { AdminOnly } from "@/components/admin-guard";

function CredentialRow({ cred, isLast }: { cred: Credential; isLast: boolean }) {
  const { updateCredentialAccess, deleteCredential } = useStore();
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<"user" | "pass" | null>(null);
  const [showAccessMenu, setShowAccessMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allowedUsers = USERS.filter((u) => cred.allowedStaff.includes(u.id));
  const staffUsers = USERS.filter((u) => u.role === "staff");

  function copyToClipboard(text: string, field: "user" | "pass") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function toggleAccess(userId: string) {
    const updated = cred.allowedStaff.includes(userId)
      ? cred.allowedStaff.filter((id: string) => id !== userId)
      : [...cred.allowedStaff, userId];
    updateCredentialAccess(cred.id, updated);
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    deleteCredential(cred.id);
  }

  return (
    <div
      className="px-5 py-4 flex items-center gap-4"
      style={{ background: "#0f1d2e", borderBottom: isLast ? "none" : "1px solid #1c3248" }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#1c3248" }}>
        <Lock size={14} style={{ color: "#4a7090" }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "#cce4ff" }}>{cred.label}</p>
        <a
          href={cred.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs flex items-center gap-1 hover:opacity-70 transition-opacity"
          style={{ color: "#38b6e8" }}
        >
          <ExternalLink size={10} /> {cred.url.replace(/^https?:\/\//, "")}
        </a>
        {cred.notes && <p className="text-xs mt-0.5" style={{ color: "#8b90a750" }}>{cred.notes}</p>}
      </div>

      <div className="flex items-center gap-6">
        <div>
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

        <div>
          <p className="text-xs mb-0.5" style={{ color: "#4a7090" }}>Password</p>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-mono" style={{ color: "#cce4ff" }}>
              {showPassword ? cred.password : "••••••••••"}
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
      </div>

      {/* Access control */}
      <div className="relative flex items-center gap-2">
        <span className="text-xs" style={{ color: "#4a7090" }}>Access:</span>
        {allowedUsers.length === 0 ? (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#ef444420", color: "#ef4444" }}>Admin only</span>
        ) : (
          <div className="flex -space-x-2">
            {allowedUsers.map((u) => (
              <div key={u.id} title={u.name} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2" style={{ background: "#38b6e8", color: "#fff", borderColor: "#0f1d2e" }}>
                {u.avatar}
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
            <div className="absolute right-0 top-full mt-1 rounded-lg z-20 shadow-lg overflow-hidden" style={{ background: "#0e1e30", border: "1px solid #1c3248", minWidth: "180px" }}>
              <p className="text-xs font-semibold px-3 pt-2.5 pb-1" style={{ color: "#4a7090" }}>STAFF ACCESS</p>
              {staffUsers.map((u) => {
                const hasAccess = cred.allowedStaff.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleAccess(u.id)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:opacity-80"
                    style={{ color: "#cce4ff" }}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#38b6e8", color: "#fff" }}>
                      {u.avatar}
                    </div>
                    <span className="flex-1 text-left">{u.name}</span>
                    <div className="w-4 h-4 rounded border flex items-center justify-center" style={{ borderColor: hasAccess ? "#22c55e" : "#1c3248", background: hasAccess ? "#22c55e" : "transparent" }}>
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
        className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
        style={{ color: confirmDelete ? "#ef4444" : "#8b90a750" }}
        title={confirmDelete ? "Click again to confirm" : "Delete"}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export default function CredentialsPage() {
  const { credentials, clients } = useStore();

  const grouped = clients.map((client) => ({
    client,
    creds: credentials.filter((c) => c.clientId === client.id),
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

        {grouped.map(({ client, creds }) => (
          <div key={client.id}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "#38b6e820", color: "#38b6e8" }}>
                {client.name[0]}
              </div>
              <h2 className="font-semibold text-sm" style={{ color: "#cce4ff" }}>{client.name}</h2>
              <span className="text-xs" style={{ color: "#4a7090" }}>· {client.website}</span>
              <a
                href={`/credentials/new?clientId=${client.id}`}
                className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:opacity-80"
                style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#4a7090" }}
              >
                <Plus size={12} /> Add credential
              </a>
            </div>

            {creds.length === 0 ? (
              <p className="text-sm px-2" style={{ color: "#4a7090" }}>No credentials stored yet.</p>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1c3248" }}>
                {creds.map((cred, i) => (
                  <CredentialRow key={cred.id} cred={cred} isLast={i === creds.length - 1} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminOnly>
  );
}
