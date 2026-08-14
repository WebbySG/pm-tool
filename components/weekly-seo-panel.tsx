"use client";
import { useEffect, useMemo, useState } from "react";
import {
  dbGetWeeklySeoPlan, dbSaveWeeklySeoPlan, dbDeleteWeeklySeoPlan,
  dbReassignFutureWeeklySeoTasks, runWeeklySeoNow,
  type WeeklySeoPlan,
} from "@/lib/db";
import { mondayOfToday, upcomingWeekPlans, isoDate } from "@/lib/weekly-seo";
import { useStore } from "@/lib/store";
import { errorMessage } from "@/lib/utils";
import { Loader2, Play, Trash2, Check, CalendarDays, AlertCircle } from "lucide-react";

export interface WeeklySeoStaffOption { id: string; name: string }

interface Props {
  projectId: string;
  staff: WeeklySeoStaffOption[];
  /** Fired whenever the plan is created, changed or removed. */
  onChanged?: (plan: WeeklySeoPlan | null) => void;
  /** Weeks of preview to show (default 6). */
  previewWeeks?: number;
}

const INCLUDES = [
  { key: "includeArticles", label: "Articles (Mon / Wed / Fri)" },
  { key: "includeBacklinks", label: "Backlinks (Friday)" },
  { key: "includeGmb", label: "GMB Post (Friday)" },
] as const;

function fmtDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

export function WeeklySeoPanel({ projectId, staff, onChanged, previewWeeks = 6 }: Props) {
  const { refresh } = useStore();
  const [plan, setPlan] = useState<WeeklySeoPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const preview = useMemo(() => upcomingWeekPlans(mondayOfToday(), previewWeeks), [previewWeeks]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await dbGetWeeklySeoPlan(projectId);
        if (alive) { setPlan(p); setError(null); }
      } catch (e) {
        if (alive) setError(errorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [projectId]);

  function announce(plan: WeeklySeoPlan | null) {
    setPlan(plan);
    onChanged?.(plan);
  }

  async function save(patch: Parameters<typeof dbSaveWeeklySeoPlan>[1], successNote?: string) {
    setBusy(true); setError(null); setNotice(null);
    try {
      const saved = await dbSaveWeeklySeoPlan(projectId, patch);
      announce(saved);
      if (successNote) setNotice(successNote);
      return saved;
    } catch (e) {
      setError(errorMessage(e));
      return null;
    } finally {
      setBusy(false);
    }
  }

  // Enrolling generates straight away so a project added mid-week doesn't sit
  // empty until the next cron run.
  async function handleEnable() {
    const saved = await save({
      enabled: true,
      ...(plan ? {} : { includeArticles: true, includeBacklinks: true, includeGmb: true }),
    });
    if (saved) await handleGenerate(true);
  }

  async function handleDisable() {
    await save({ enabled: false }, "Paused. Existing tasks are left alone; nothing new will be generated.");
  }

  async function handleAssignee(value: string) {
    const assigneeId = value || null;
    const saved = await save({ assigneeId });
    if (!saved) return;
    // Upcoming tasks that nobody has touched yet follow the new assignee.
    try {
      const moved = await dbReassignFutureWeeklySeoTasks(projectId, assigneeId, isoDate(mondayOfToday()));
      if (moved > 0) { await refresh(); setNotice(`Reassigned ${moved} upcoming task${moved === 1 ? "" : "s"}.`); }
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleGenerate(silent = false) {
    setBusy(true); setError(null); if (!silent) setNotice(null);
    try {
      const res = await runWeeklySeoNow(projectId);
      const created = (res.results ?? []).reduce((n, r) => n + (r.created ?? 0), 0);
      const weeks = (res.weeks ?? []).map((w) => w.label).join(" + ");
      await refresh();
      setNotice(created > 0
        ? `Created ${created} task${created === 1 ? "" : "s"} for ${weeks}.`
        : `${weeks} already up to date — nothing to create.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true); setError(null); setNotice(null);
    try {
      await dbDeleteWeeklySeoPlan(projectId);
      announce(null);
      setConfirmRemove(false);
      setNotice("Removed from the weekly loop. Tasks already generated were kept.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const enrolled = !!plan;
  const active = !!plan?.enabled;

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm" style={{ color: "var(--text-muted)" }}>
        <Loader2 size={14} className="animate-spin" /> Loading weekly SEO settings…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm"
          style={{ background: "#ef444414", border: "1px solid #ef444455", color: "#fca5a5" }}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}
      {notice && !error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm"
          style={{ background: "#22c55e14", border: "1px solid #22c55e55", color: "#86efac" }}>
          <Check size={14} className="mt-0.5 shrink-0" />
          <span className="flex-1">{notice}</span>
        </div>
      )}

      {/* Enrolment */}
      <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays size={15} style={{ color: "var(--accent)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Weekly SEO loop</h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={active
                  ? { background: "#22c55e20", color: "#22c55e" }
                  : { background: "var(--bg-surface)", color: "var(--text-muted)" }}>
                {active ? "Active" : enrolled ? "Paused" : "Not enrolled"}
              </span>
            </div>
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Next week&apos;s task set is generated automatically at the start of every Friday.
              The current week is topped up daily, so a project added mid-week gets its tasks straight away.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {active ? (
              <button onClick={handleDisable} disabled={busy}
                className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 disabled:opacity-50"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                Pause
              </button>
            ) : (
              <button onClick={handleEnable} disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#04121d" }}>
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                {enrolled ? "Resume" : "Add to weekly loop"}
              </button>
            )}
          </div>
        </div>

        {enrolled && (
          <div className="grid gap-4 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)", gridTemplateColumns: "minmax(200px, 1fr) minmax(220px, 1fr)" }}>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                Auto-assign generated tasks to
              </label>
              <select
                value={plan?.assigneeId ?? ""}
                onChange={(e) => handleAssignee(e.target.value)}
                disabled={busy}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none disabled:opacity-50"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="">First assigned project member</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                Applies to new tasks, and moves upcoming ones nobody has started yet.
              </p>
            </div>

            <div>
              <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Generate each week</span>
              <div className="flex flex-col gap-1.5">
                {INCLUDES.map((inc) => {
                  const on = plan?.[inc.key] ?? false;
                  return (
                    <label key={inc.key} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text)" }}>
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={busy}
                        onChange={(e) => save({ [inc.key]: e.target.checked })}
                        className="w-4 h-4 rounded cursor-pointer"
                        style={{ accentColor: "var(--accent)" }}
                      />
                      {inc.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {enrolled && (
          <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <button onClick={() => handleGenerate()} disabled={busy || !active}
              title={active ? "Create any missing tasks for this week (and next week from Friday)" : "Resume the loop first"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 disabled:opacity-50"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Generate now
            </button>
            <div className="flex-1" />
            {confirmRemove ? (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Remove from the loop?</span>
                <button onClick={handleRemove} disabled={busy}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 disabled:opacity-50"
                  style={{ background: "#ef4444", color: "#fff" }}>Remove</button>
                <button onClick={() => setConfirmRemove(false)}
                  className="px-2.5 py-1.5 rounded-lg text-xs hover:opacity-80"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmRemove(true)} disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:opacity-80 disabled:opacity-50"
                style={{ background: "transparent", border: "1px solid #ef444455", color: "#fca5a5" }}>
                <Trash2 size={12} /> Remove
              </button>
            )}
          </div>
        )}
      </div>

      {/* What the next few weeks will produce */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
          <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Upcoming weeks
          </h4>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            A week is filed under the month its <strong>Friday</strong> falls in, and only generates the article
            days inside that month — so a week split across two months produces the new month&apos;s days only.
          </p>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {preview.map((w) => (
            <div key={w.mondayIso} className="px-4 py-2.5 flex items-start gap-3" style={{ borderTop: "1px solid var(--border)" }}>
              <div style={{ minWidth: 150 }}>
                <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{w.title}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  week of {fmtDay(w.mondayIso)}
                  {w.split && <span style={{ color: "#f59e0b" }}> · split month</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 flex-1">
                {plan?.includeArticles !== false && w.articles.map((a) => (
                  <span key={a.slot} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>
                    {a.title} · {fmtDay(a.dueIso)}
                  </span>
                ))}
                {plan?.includeBacklinks !== false && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>
                    Backlinks · {fmtDay(w.fridayIso)}
                  </span>
                )}
                {plan?.includeGmb !== false && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>
                    GMB Post · {fmtDay(w.fridayIso)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
