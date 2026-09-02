"use client";
// Creates a task that is already marked as an article, so it lands on the
// Articles sheet without anyone having to remember the flag afterwards. Shared
// by the global /articles page (which must ask which client) and a project's
// own Articles tab (which already knows).

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useDiscardGuard } from "@/components/discard-guard";
import { errorMessage } from "@/lib/utils";
import { Loader2, X } from "lucide-react";

interface Props {
  /** Fixed on a project's own tab; chosen in the dialog when null. */
  projectId: string | null;
  projects: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  /** Pre-selects an assignee (the project's weekly SEO writer, say). */
  defaultAssigneeId?: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddArticleDialog({
  projectId, projects, staff, defaultAssigneeId = "", onClose, onCreated,
}: Props) {
  const { addTask } = useStore();
  const [title, setTitle] = useState("");
  const [project, setProject] = useState(projectId ?? "");
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId);
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = title.trim() !== "" || dueDate !== "" ||
    (projectId === null && project !== "") ||
    assigneeId !== defaultAssigneeId;

  const { requestClose, guard } = useDiscardGuard({ dirty, busy: saving, onClose });

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name)),
    [projects],
  );

  const canSave = title.trim() !== "" && project !== "" && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await addTask(project, {
        title: title.trim(),
        // type 'seo' and priority 5 match what the weekly generator creates, so
        // a hand-added article behaves like a generated one everywhere else.
        type: "seo",
        priority: 5,
        assigneeId,
        // Empty string, not omitted: addTask defaults an ABSENT dueDate to
        // TODAY, which would show a brand-new article as due the moment it is
        // created (the same trap the SEO phase tasks hit).
        dueDate,
        isArticle: true,
        // Admin approval then parks it in pending_article_post until the live
        // link is recorded — the existing Article-Post Workflow.
        requiresArticlePost: true,
      });
      onCreated();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <>
      {guard}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(4,12,22,0.72)" }}
        onClick={requestClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl p-5 flex flex-col gap-4"
          style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold" style={{ color: "#cce4ff" }}>Add article</h3>
            <button onClick={requestClose} className="p-1 rounded hover:opacity-70" style={{ color: "#4a7090" }}>
              <X size={16} />
            </button>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium" style={{ color: "#4a7090" }}>Article title</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Monday article — halal catering guide"
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#0a1520", border: "1px solid #1c3248", color: "#cce4ff" }}
            />
          </label>

          {projectId === null && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: "#4a7090" }}>Client</span>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "#0a1520", border: "1px solid #1c3248", color: "#cce4ff" }}
              >
                <option value="">Choose a client…</option>
                {sortedProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}

          <div className="flex gap-3">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-xs font-medium" style={{ color: "#4a7090" }}>Assignee</span>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "#0a1520", border: "1px solid #1c3248", color: "#cce4ff" }}
              >
                <option value="">Unassigned</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-xs font-medium" style={{ color: "#4a7090" }}>Due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "#0a1520", border: "1px solid #1c3248", color: "#cce4ff" }}
              />
            </label>
          </div>

          {error && (
            <p className="text-xs" style={{ color: "#ef4444" }}>Not created — {error}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={requestClose}
              className="px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80"
              style={{ background: "#0a1520", border: "1px solid #1c3248", color: "#8fb3d0" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
              style={{ background: "#38b6e8", color: "#fff" }}
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Add article
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
