"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Check, RotateCcw } from "lucide-react";
import { Suspense } from "react";
import { useDraft } from "@/lib/use-draft";

interface LiveStaff {
  id: string; user_id: string | null; email: string;
  first_name: string | null; last_name: string | null; avatar_initials: string;
}
function staffAuthId(s: LiveStaff) { return s.user_id ?? s.id; }
function staffName(s: LiveStaff) { return [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email; }
function staffInitials(s: LiveStaff) { return s.avatar_initials || staffName(s).slice(0, 2).toUpperCase(); }

function NewCredentialForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addCredential, clients } = useStore();

  const initialForm = {
    clientId: searchParams.get("clientId") ?? clients[0]?.id ?? "",
    label: "",
    url: "",
    username: "",
    password: "",
    notes: "",
    allowedStaff: [] as string[],
  };
  // password is omitted from the draft for security
  const [form, setForm, clearDraft, restored] = useDraft("new-credential", initialForm, { omit: ["password"] });
  const [error, setError] = useState("");

  const [liveStaff, setLiveStaff] = useState<LiveStaff[]>([]);

  useEffect(() => {
    supabase.from("staff_members").select("id,user_id,email,first_name,last_name,avatar_initials")
      .eq("status", "active")
      .then(({ data }) => setLiveStaff((data as LiveStaff[]) ?? []));
  }, []);

  const staffUsers = liveStaff;

  function toggleStaff(authId: string) {
    setForm((f) => ({
      ...f,
      allowedStaff: f.allowedStaff.includes(authId)
        ? f.allowedStaff.filter((id) => id !== authId)
        : [...f.allowedStaff, authId],
    }));
  }

  function handleSubmit() {
    if (!form.label.trim()) { setError("Label is required."); return; }
    if (!form.username.trim()) { setError("Username is required."); return; }
    if (!form.password.trim()) { setError("Password is required."); return; }
    addCredential(form);
    clearDraft();
    router.push("/credentials");
  }

  return (
    <div className="p-6 max-w-xl">
      {restored && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-xs" style={{ background: "#38b6e815", border: "1px solid #38b6e840", color: "#9dd8f5" }}>
          <RotateCcw size={12} />
          Draft restored — your previous input has been saved. (Password not saved for security.)
          <button onClick={clearDraft} className="ml-auto hover:opacity-70" style={{ color: "#4a7090" }}>Discard</button>
        </div>
      )}
      <div className="rounded-xl p-6 flex flex-col gap-5" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>

        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: "#4a7090" }}>CLIENT</label>
          <select
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.website}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: "#4a7090" }}>LABEL *</label>
          <input
            autoFocus
            type="text"
            placeholder="e.g. WordPress Admin, Google Analytics"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
          />
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: "#4a7090" }}>URL</label>
          <input
            type="url"
            placeholder="https://example.com/admin"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "#4a7090" }}>USERNAME *</label>
            <input
              type="text"
              placeholder="username or email"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "#4a7090" }}>PASSWORD *</label>
            <input
              type="text"
              placeholder="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: "#4a7090" }}>NOTES</label>
          <textarea
            placeholder="Any notes about this credential..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
            style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
          />
        </div>

        <div>
          <label className="text-xs font-semibold block mb-2" style={{ color: "#4a7090" }}>STAFF ACCESS</label>
          <div className="flex flex-col gap-2">
            {staffUsers.map((s) => {
              const authId = staffAuthId(s);
              const selected = form.allowedStaff.includes(authId);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleStaff(authId)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                  style={{
                    background: selected ? "#38b6e815" : "#0e1e30",
                    border: `1px solid ${selected ? "#38b6e8" : "#1c3248"}`,
                  }}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#38b6e8", color: "#fff" }}>
                    {staffInitials(s)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: "#cce4ff" }}>{staffName(s)}</p>
                    <p className="text-xs" style={{ color: "#4a7090" }}>{s.email}</p>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: selected ? "#38b6e8" : "#1c3248", background: selected ? "#38b6e8" : "transparent" }}
                  >
                    {selected && <Check size={10} color="#fff" />}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: "#8b90a750" }}>Leave empty for admin-only access.</p>
        </div>

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "#ef444420", color: "#ef4444" }}>{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: "#38b6e8", color: "#fff" }}
          >
            Save Credential
          </button>
          <button
            onClick={() => { clearDraft(); router.push("/credentials"); }}
            className="px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: "#0e1e30", color: "#4a7090", border: "1px solid #1c3248" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewCredentialPage() {
  return (
    <>
      <Topbar title="Add Credential" />
      <Suspense>
        <NewCredentialForm />
      </Suspense>
    </>
  );
}
