"use client";
import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { useStore } from "@/lib/store";
import { Building2, Globe, Plus, Trash2, Pencil, Check, X, FolderKanban } from "lucide-react";
import { AdminOnly } from "@/components/admin-guard";
import Link from "next/link";
import { type Client } from "@/lib/mock-data";

const INDUSTRIES = ["Tech", "F&B", "Real Estate", "Retail", "Finance", "Healthcare", "Education", "Media", "Other"];

function ClientCard({ client }: { client: Client }) {
  const { projects, deleteClient, updateClient } = useStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: client.name, website: client.website, industry: client.industry });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const clientProjects = projects.filter((p) => p.clientId === client.id);

  function save() {
    if (!form.name.trim()) return;
    updateClient(client.id, form);
    setEditing(false);
  }

  function cancel() {
    setForm({ name: client.name, website: client.website, industry: client.industry });
    setEditing(false);
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
      <div className="flex items-start gap-4 px-5 py-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0" style={{ background: "#38b6e820", color: "#38b6e8" }}>
          {client.name[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
                className="w-full px-2.5 py-1.5 rounded-lg text-sm outline-none font-semibold"
                style={{ background: "#0e1e30", border: "1px solid #38b6e8", color: "#cce4ff" }}
                placeholder="Client name"
              />
              <div className="flex gap-2">
                <input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="flex-1 px-2.5 py-1.5 rounded-lg text-sm outline-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                  placeholder="website.com"
                />
                <select
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="px-2.5 py-1.5 rounded-lg text-sm outline-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                >
                  {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={save} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "#22c55e20", color: "#22c55e" }}>
                  <Check size={12} /> Save
                </button>
                <button onClick={cancel} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{ background: "#1c3248", color: "#4a7090" }}>
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="font-semibold text-sm" style={{ color: "#cce4ff" }}>{client.name}</p>
              <div className="flex items-center gap-3 mt-0.5">
                {client.website && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "#4a7090" }}>
                    <Globe size={10} /> {client.website}
                  </span>
                )}
                {client.industry && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#1c3248", color: "#4a7090" }}>
                    {client.industry}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
              style={{ color: "#4a7090" }}
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => { if (!confirmDelete) { setConfirmDelete(true); return; } deleteClient(client.id); }}
              className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
              style={{ color: confirmDelete ? "#ef4444" : "#8b90a750" }}
              title={confirmDelete ? "Click again to confirm delete" : "Delete client"}
              onBlur={() => setConfirmDelete(false)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {clientProjects.length > 0 && (
        <div className="px-5 pb-3" style={{ borderTop: "1px solid #1c3248" }}>
          <p className="text-xs font-semibold mt-3 mb-2" style={{ color: "#4a7090" }}>PROJECTS</p>
          <div className="flex flex-col gap-1.5">
            {clientProjects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity"
                style={{ color: "#cce4ff" }}
              >
                <FolderKanban size={13} style={{ color: "#38b6e8" }} />
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  const { clients, addClient } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", website: "", industry: "Tech" });
  const [error, setError] = useState("");

  function handleAdd() {
    if (!form.name.trim()) { setError("Client name is required."); return; }
    addClient(form);
    setForm({ name: "", website: "", industry: "Tech" });
    setShowForm(false);
    setError("");
  }

  return (
    <AdminOnly>
      <Topbar title="Clients" />
      <div className="p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: "#4a7090" }}>{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "#38b6e8" }}
          >
            <Plus size={14} /> New Client
          </button>
        </div>

        {/* Inline new-client form */}
        {showForm && (
          <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: "#0f1d2e", border: "1px solid #38b6e840" }}>
            <p className="text-sm font-semibold" style={{ color: "#cce4ff" }}>New Client</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3 sm:col-span-1">
                <label className="text-xs font-semibold block mb-1" style={{ color: "#4a7090" }}>NAME *</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="Acme Corp"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#4a7090" }}>WEBSITE</label>
                <input
                  type="text"
                  placeholder="acme.com"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#4a7090" }}>INDUSTRY</label>
                <select
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
                >
                  {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleAdd} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#38b6e8", color: "#fff" }}>
                Add Client
              </button>
              <button onClick={() => { setShowForm(false); setError(""); }} className="px-4 py-2 rounded-lg text-sm" style={{ background: "#0e1e30", color: "#4a7090", border: "1px solid #1c3248" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {clients.length === 0 && !showForm && (
          <div className="rounded-xl px-5 py-16 text-center" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
            <Building2 size={32} className="mx-auto mb-3" style={{ color: "#1c3248" }} />
            <p className="text-sm font-medium" style={{ color: "#cce4ff" }}>No clients yet</p>
            <p className="text-xs mt-1 mb-4" style={{ color: "#4a7090" }}>Add your first client to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "#38b6e8", color: "#fff" }}
            >
              Add Client
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      </div>
    </AdminOnly>
  );
}
