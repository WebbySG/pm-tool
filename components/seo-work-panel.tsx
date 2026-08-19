"use client";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/mock-data";
import { SEO_PHASES, SEO_SETUP_PARENT, type SeoPhase } from "@/lib/seo-setup";
import { listKeywords } from "@/lib/keyword-db";
import { priorityMeta, type Keyword } from "@/lib/keyword-types";
import { errorMessage, isHtml, sanitizeHtml } from "@/lib/utils";
import { Loader2, AlertCircle, ArrowRight, Search, Plus, Sprout } from "lucide-react";

// Same labels/colors as the tasks page and kanban — a status must never read
// differently depending on which screen you are on.
const STATUS_META: Record<string, { label: string; color: string }> = {
  todo: { label: "To Do", color: "#64748b" },
  in_progress: { label: "In Progress", color: "#3b82f6" },
  to_be_discussed: { label: "To Be Discussed", color: "#06b6d4" },
  pending_review: { label: "Pending Review", color: "#a855f7" },
  pending_client_approval: { label: "Pending Client Approval", color: "#ec4899" },
  pending_article_post: { label: "Pending Article Post", color: "#f97316" },
  revision_required: { label: "Revision Required", color: "#f59e0b" },
  done: { label: "Done", color: "#22c55e" },
  missed: { label: "Missed", color: "#ef4444" },
  rejected: { label: "Rejected", color: "#dc2626" },
};

function statusMeta(status: string) {
  return STATUS_META[status] ?? { label: status, color: "#4a7090" };
}

/** Date + time, per the app-wide timestamp rule. */
function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Markup/whitespace-insensitive compare, so "still the seeded prompt" is reliable. */
function sameText(a: string, b: string) {
  const strip = (x: string) => x.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return strip(a) === strip(b);
}

function StatusPill({ status }: { status: string }) {
  const m = statusMeta(status);
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
          style={{ background: m.color + "20", color: m.color }}>
      {m.label}
    </span>
  );
}

function RecordBody({ html }: { html: string }) {
  return isHtml(html)
    ? <div className="rich-content text-sm leading-relaxed" style={{ color: "#cce4ff" }}
           dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
    : <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: "#cce4ff" }}>{html}</p>;
}

interface Props {
  projectId: string;
  /** Project is labelled SEO or Web + SEO — the label that earns the work set. */
  isSeoProject: boolean;
  /** The project's top-level tasks; phases are found by seoPhase, never by title. */
  tasks: Task[];
  staff: { id: string; name: string }[];
  /** Admins alone create the work set — it puts tasks on everyone's board. */
  canCreate: boolean;
  onOpenTask: (task: Task) => void;
  onOpenKeywords: () => void;
}

/**
 * The SEO work RECORD: the standard phases in the order they happen, each
 * showing its task status, who has it, and what that person wrote — so the
 * admin can check the work and the next staff member can see what is done and
 * which keywords are targeted.
 *
 * It renders tasks; it owns no data of its own. The phases ARE pm_tasks rows
 * (matched on seo_phase), so anything done to them on the board, in the drawer
 * or through the review workflow shows up here.
 */
export function SeoWorkPanel({ projectId, isSeoProject, tasks, staff, canCreate, onOpenTask, onOpenKeywords }: Props) {
  const ensureSeoSetupTasks = useStore((s) => s.ensureSeoSetupTasks);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);

  // Phase tasks live anywhere in the tree (the three are children of the
  // parent) and are matched on seo_phase — never on title, which gets renamed.
  const byPhase = useMemo(() => {
    const m = new Map<string, Task>();
    const walk = (ts: Task[]) => {
      for (const t of ts) {
        if (t.seoPhase) m.set(t.seoPhase, t);
        walk(t.subtasks);
      }
    };
    walk(tasks);
    return m;
  }, [tasks]);

  const parentTask = byPhase.get(SEO_SETUP_PARENT.key) ?? null;
  const hasAny = byPhase.size > 0;

  // Keyword count/preview for the Keyword Research phase — the answer to "which
  // keywords are we targeting?" without leaving the tab.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await listKeywords(projectId);
        if (alive) setKeywords(rows);
      } catch {
        // Non-fatal: the phase row just shows no keyword preview.
      }
    })();
    return () => { alive = false; };
  }, [projectId]);

  const topKeywords = useMemo(() => {
    const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return [...keywords]
      .sort((a, b) =>
        (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3) ||
        (b.searchVolume ?? -1) - (a.searchVolume ?? -1))
      .slice(0, 6);
  }, [keywords]);

  const doneCount = SEO_PHASES.filter((p) => byPhase.get(p.key)?.status === "done").length;

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const made = await ensureSeoSetupTasks(projectId);
      if (!made) {
        setError("Nothing to create — this project already has its SEO tasks (they may be archived). Check the board or the Archive page.");
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  function staffName(id: string) {
    return staff.find((s) => s.id === id)?.name ?? "Unknown";
  }

  if (!hasAny) {
    return (
      <div className="flex flex-col gap-4">
        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm"
               style={{ background: "#ef444415", border: "1px solid #ef444440", color: "#ef4444" }}>
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="text-center py-14 flex flex-col items-center gap-3">
          <Sprout size={32} style={{ color: "#1c3248" }} />
          <p className="text-sm" style={{ color: "#4a7090" }}>
            {isSeoProject
              ? "This project doesn't have its SEO work set yet."
              : "Label this project SEO (or Web + SEO) to get the standard SEO work set."}
          </p>
          {isSeoProject && canCreate && (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{ background: "#22c55e", color: "#04210f" }}
            >
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Create SEO setup tasks
            </button>
          )}
          <p className="text-xs max-w-md" style={{ color: "#4a7090" }}>
            Keyword research, then technical SEO, then on-page fixes — one parent task with a
            subtask per phase. New SEO projects get these automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm"
             style={{ background: "#ef444415", border: "1px solid #ef444440", color: "#ef4444" }}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* What this tab is, and where the whole set stands */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "#cce4ff" }}>SEO work record</h3>
            <p className="text-xs mt-0.5 max-w-xl" style={{ color: "#4a7090" }}>
              Each phase is a real task on the board — what the person doing it writes in that
              task shows here, so the work can be checked and whoever picks it up next can see
              what has already been done.
            </p>
          </div>
          {parentTask && (
            <button
              onClick={() => onOpenTask(parentTask)}
              className="flex items-center gap-1.5 text-xs font-medium shrink-0 hover:opacity-80 transition-opacity"
              style={{ color: "#38b6e8" }}
            >
              Open {parentTask.title} <ArrowRight size={12} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full" style={{ background: "#1c3248" }}>
            <div className="h-full rounded-full transition-all"
                 style={{ width: `${(doneCount / SEO_PHASES.length) * 100}%`, background: "#22c55e" }} />
          </div>
          <span className="text-xs font-medium shrink-0" style={{ color: "#cce4ff" }}>
            {doneCount}/{SEO_PHASES.length} phases done
          </span>
        </div>
      </div>

      {SEO_PHASES.map((phase: SeoPhase, i) => {
        const task = byPhase.get(phase.key) ?? null;
        const written = !!task && !!task.description && !sameText(task.description, phase.description);
        return (
          <div key={phase.key} className="rounded-xl overflow-hidden" style={{ border: "1px solid #1c3248" }}>
            {/* Phase header — status, who has it, when it last moved */}
            <div className="flex items-start gap-3 px-4 py-3" style={{ background: "#0f1d2e" }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: phase.color + "20", color: phase.color }}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold" style={{ color: "#cce4ff" }}>
                    {task?.title ?? phase.title}
                  </h4>
                  {task ? <StatusPill status={task.status} /> : (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "#4a709020", color: "#4a7090" }}>Not on the board</span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "#4a7090" }}>
                  {task ? (
                    <>
                      {task.assigneeId ? staffName(task.assigneeId) : "Unassigned"}
                      {task.statusChangedAt && <> · {statusMeta(task.status).label.toLowerCase()} since {fmtWhen(task.statusChangedAt)}</>}
                    </>
                  ) : (
                    <>This phase was removed from the board — it can be put back.</>
                  )}
                </p>
              </div>
              {task ? (
                <button
                  onClick={() => onOpenTask(task)}
                  className="flex items-center gap-1.5 text-xs font-medium shrink-0 hover:opacity-80 transition-opacity"
                  style={{ color: "#38b6e8" }}
                >
                  Open task <ArrowRight size={12} />
                </button>
              ) : canCreate ? (
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex items-center gap-1.5 text-xs font-medium shrink-0 hover:opacity-80 transition-opacity disabled:opacity-50"
                  style={{ color: "#22c55e" }}
                >
                  {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add it back
                </button>
              ) : null}
            </div>

            {/* Keyword research answers "what are we targeting?" — show it here */}
            {phase.key === "keyword-research" && (
              <div className="px-4 py-3 flex flex-col gap-2" style={{ background: "#0e1e30", borderTop: "1px solid #1c3248" }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#cce4ff" }}>
                    <Search size={12} style={{ color: "#4a7090" }} />
                    {keywords.length === 0
                      ? "No keywords entered yet"
                      : `${keywords.length} keyword${keywords.length === 1 ? "" : "s"} targeted`}
                  </span>
                  <button
                    onClick={onOpenKeywords}
                    className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ color: "#38b6e8" }}
                  >
                    {keywords.length === 0 ? "Add them in Keywords" : "Open Keywords"} <ArrowRight size={12} />
                  </button>
                </div>
                {topKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {topKeywords.map((k) => {
                      const pm = priorityMeta(k.priority);
                      return (
                        <span key={k.id} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg"
                              style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#cce4ff" }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: pm.color }} />
                          {k.keyword}
                          {k.searchVolume !== null && (
                            <span style={{ color: "#4a7090" }}>{k.searchVolume.toLocaleString()}/mo</span>
                          )}
                        </span>
                      );
                    })}
                    {keywords.length > topKeywords.length && (
                      <span className="text-xs px-2 py-1" style={{ color: "#4a7090" }}>
                        +{keywords.length - topKeywords.length} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* The record itself: what the staff member wrote in the task */}
            <div className="px-4 py-3" style={{ background: "#0e1e30", borderTop: "1px solid #1c3248" }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1.5"
                 style={{ color: written ? phase.color : "#4a7090" }}>
                {written ? "Work recorded" : "What to do & record"}
              </p>
              <RecordBody html={task?.description || phase.description} />
              {!written && (
                <p className="text-xs mt-2" style={{ color: "#4a7090" }}>
                  Nothing written up yet — whoever does this phase replaces this with what they did.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
