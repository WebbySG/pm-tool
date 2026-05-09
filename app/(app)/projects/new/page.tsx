"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { useStore } from "@/lib/store";
import { type Task } from "@/lib/mock-data";
import { X, Check, ChevronDown, ChevronUp, ListChecks, RotateCcw, Loader2 } from "lucide-react";
import { useDraft } from "@/lib/use-draft";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

interface LiveStaff {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_initials: string;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

let seedCounter = 1000;

export default function NewProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addProject, channels, templates, projects } = useStore();
  const [liveStaff, setLiveStaff] = useState<LiveStaff[]>([]);

  if (user && user.pmRole !== "admin") {
    router.replace("/projects");
    return null;
  }

  useEffect(() => {
    supabase
      .from("staff_members")
      .select("id, user_id, email, first_name, last_name, avatar_initials")
      .eq("status", "active")
      .then(({ data }) => setLiveStaff((data as LiveStaff[]) ?? []));
  }, []);

  const initialForm = {
    name: "",
    clientId: null as null,
    channelId: null as string | null,
    type: "webdev" as "webdev" | "seo" | "both",
    phase: "discovery" as const,
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    assignedStaff: [] as string[],
    selectedTemplateIds: [] as string[],
  };
  const [form, setForm, clearDraft, restored] = useDraft("new-project", initialForm);
  const selectedTemplateIds = form.selectedTemplateIds;
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  const matchingTemplates = form.type === "both"
    ? templates.filter((t) => t.type === "webdev" || t.type === "seo" || t.type === "any" || t.type === "both")
    : templates.filter((t) => t.type === form.type || t.type === "any");

  function toggleStaff(userId: string) {
    setForm((f) => ({
      ...f,
      assignedStaff: f.assignedStaff.includes(userId)
        ? f.assignedStaff.filter((id) => id !== userId)
        : [...f.assignedStaff, userId],
    }));
  }

  function toggleTemplate(tplId: string) {
    setForm((f) => ({
      ...f,
      selectedTemplateIds: f.selectedTemplateIds.includes(tplId)
        ? f.selectedTemplateIds.filter((id) => id !== tplId)
        : [...f.selectedTemplateIds, tplId],
    }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Project name is required."); return; }
    const duplicate = projects.some((p) => p.name.trim().toLowerCase() === form.name.trim().toLowerCase());
    if (duplicate) { setError(`A project named "${form.name.trim()}" already exists.`); return; }
    if (submitting) return;
    setSubmitting(true);
    setError("");

    const seedTasks: Task[] = selectedTemplateIds.flatMap((tplId) => {
      const tpl = templates.find((t) => t.id === tplId);
      if (!tpl) return [];
      return tpl.tasks.map((tt) => ({
        id: `t-seed-${++seedCounter}`,
        projectId: "",
        parentId: null,
        title: tt.title,
        description: tt.description,
        type: tt.type,
        status: "todo" as const,
        priority: tt.priority,
        assigneeId: form.assignedStaff[0] ?? "",
        dueDate: addDays(form.startDate, tt.daysFromStart),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: tt.tags,
        subtasks: [],
        attachments: [],
        recurring: tt.recurring,
        recurringDay: tt.recurringDay,
      }));
    });

    try {
      await addProject(form, seedTasks);
      clearDraft();
      router.push("/projects");
    } catch {
      setError("Failed to create project. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Topbar title="New Project" />
      <div className="p-6 max-w-xl">
        {restored && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-xs" style={{ background: "#38b6e815", border: "1px solid #38b6e840", color: "#9dd8f5" }}>
            <RotateCcw size={12} />
            Draft restored — your previous input has been saved.
            <button onClick={clearDraft} className="ml-auto hover:opacity-70" style={{ color: "#4a7090" }}>Discard</button>
          </div>
        )}
        <div className="rounded-xl p-6 flex flex-col gap-5" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "#4a7090" }}>PROJECT NAME *</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. TechStart Website Revamp"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
            />
          </div>

          {/* Channel */}
          {channels.length > 0 && (
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "#4a7090" }}>CHANNEL</label>
              <select
                value={form.channelId ?? ""}
                onChange={(e) => setForm({ ...form, channelId: e.target.value || null })}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
              >
                <option value="">— No channel —</option>
                {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Type */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "#4a7090" }}>TYPE</label>
            <div className="flex gap-2">
              {(["webdev", "seo", "both"] as const).map((t) => {
                const activeColor = t === "seo" ? "#22c55e" : t === "both" ? "#a855f7" : "#38b6e8";
                const label = t === "seo" ? "SEO" : t === "both" ? "Web + SEO" : "Web Dev";
                return (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, type: t, selectedTemplateIds: [] })}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: form.type === t ? activeColor + "20" : "#0e1e30",
                      border: `1px solid ${form.type === t ? activeColor : "#1c3248"}`,
                      color: form.type === t ? activeColor : "#4a7090",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task Templates */}
          {matchingTemplates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ListChecks size={14} style={{ color: "#38b6e8" }} />
                <label className="text-xs font-semibold" style={{ color: "#4a7090" }}>APPLY TASK TEMPLATES</label>
                {selectedTemplateIds.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#38b6e820", color: "#38b6e8" }}>
                    {selectedTemplateIds.reduce((sum, id) => sum + (templates.find((t) => t.id === id)?.tasks.length ?? 0), 0)} tasks will be created
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {matchingTemplates.map((tpl) => {
                  const selected = selectedTemplateIds.includes(tpl.id);
                  const expanded = expandedTemplateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      className="rounded-lg overflow-hidden"
                      style={{ border: `1px solid ${selected ? "#38b6e8" : "#1c3248"}`, background: selected ? "#38b6e815" : "#0e1e30" }}
                    >
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <button
                          onClick={() => toggleTemplate(tpl.id)}
                          className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                          style={{ borderColor: selected ? "#38b6e8" : "#1c3248", background: selected ? "#38b6e8" : "transparent" }}
                        >
                          {selected && <Check size={10} color="#fff" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: "#cce4ff" }}>{tpl.name}</p>
                          <p className="text-xs" style={{ color: "#4a7090" }}>{tpl.tasks.length} tasks · {tpl.description}</p>
                        </div>
                        <button
                          onClick={() => setExpandedTemplateId(expanded ? null : tpl.id)}
                          className="p-1 rounded hover:opacity-70"
                          style={{ color: "#4a7090" }}
                        >
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                      {expanded && (
                        <div style={{ borderTop: "1px solid #1c3248" }}>
                          {tpl.tasks.map((task, i) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 px-4 py-2"
                              style={{ borderBottom: i < tpl.tasks.length - 1 ? "1px solid #1c324840" : "none" }}
                            >
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: task.priority === "urgent" ? "#ef4444" : task.priority === "high" ? "#f59e0b" : task.priority === "medium" ? "#38b6e8" : "#22c55e" }} />
                              <p className="text-xs flex-1" style={{ color: "#cce4ff" }}>{task.title}</p>
                              <span className="text-xs" style={{ color: "#8b90a750" }}>Day {task.daysFromStart}{task.recurring ? ` · ${task.recurring}` : ""}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "#4a7090" }}>DESCRIPTION</label>
            <textarea
              placeholder="What is this project about?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "#4a7090" }}>START DATE</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "#4a7090" }}>DUE DATE *</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#cce4ff" }} />
            </div>
          </div>

          {/* Assign Staff */}
          <div>
            <label className="text-xs font-semibold block mb-2" style={{ color: "#4a7090" }}>ASSIGN STAFF</label>
            {liveStaff.length === 0 ? (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#4a7090", background: "#0e1e30", border: "1px solid #1c3248" }}>
                No active staff yet. Invite team members first.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {liveStaff.map((s) => {
                  const staffId = s.user_id ?? s.id;
                  const selected = form.assignedStaff.includes(staffId);
                  const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email;
                  const initials = s.avatar_initials || name.slice(0, 2).toUpperCase();
                  return (
                    <button key={s.id} onClick={() => toggleStaff(staffId)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors" style={{ background: selected ? "#38b6e815" : "#0e1e30", border: `1px solid ${selected ? "#38b6e8" : "#1c3248"}` }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "#38b6e8", color: "#fff" }}>{initials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "#cce4ff" }}>{name}</p>
                        <p className="text-xs truncate" style={{ color: "#4a7090" }}>{s.email}</p>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: selected ? "#38b6e8" : "#1c3248", background: selected ? "#38b6e8" : "transparent" }}>
                        {selected && <X size={10} color="#fff" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "#ef444420", color: "#ef4444" }}>{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "#38b6e8", color: "#fff" }}
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" />Creating…</> : <>Create Project{selectedTemplateIds.length > 0 ? ` + seed tasks` : ""}</>}
            </button>
            <button onClick={() => { clearDraft(); router.push("/projects"); }} className="px-5 py-2.5 rounded-lg text-sm font-medium" style={{ background: "#0e1e30", color: "#4a7090", border: "1px solid #1c3248" }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
