"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import { WeeklySeoPanel, type WeeklySeoStaffOption } from "@/components/weekly-seo-panel";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { errorMessage, projectPath } from "@/lib/utils";
import {
  dbListWeeklySeoPlans, dbSaveWeeklySeoPlan, dbWeeklySeoTaskCounts, runWeeklySeoNow,
  type WeeklySeoPlan,
} from "@/lib/db";
import { addDays, mondayOfToday, planWeek } from "@/lib/weekly-seo";
import {
  CalendarDays, ChevronDown, ChevronRight, Loader2, Play, Plus, AlertCircle, Check, ExternalLink,
} from "lucide-react";

interface StaffRow {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
}

export default function WeeklySeoPage() {
  return (
    <AdminOnly>
      <Topbar title="Weekly SEO" />
      <WeeklySeoInner />
    </AdminOnly>
  );
}

function WeeklySeoInner() {
  const { projects } = useStore();
  const [plans, setPlans] = useState<WeeklySeoPlan[]>([]);
  const [counts, setCounts] = useState<Record<string, Record<string, number>>>({});
  const [staff, setStaff] = useState<WeeklySeoStaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState("");

  const thisWeek = useMemo(() => planWeek(mondayOfToday()), []);
  const nextWeek = useMemo(() => planWeek(addDays(mondayOfToday(), 7)), []);

  const load = useCallback(() => Promise.all([
    dbListWeeklySeoPlans(),
    dbWeeklySeoTaskCounts([thisWeek.mondayIso, nextWeek.mondayIso]),
  ]), [thisWeek.mondayIso, nextWeek.mondayIso]);

  const reload = useCallback(async () => {
    try {
      const [p, c] = await load();
      setPlans(p);
      setCounts(c);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [load]);

  // Initial fetch. Kept separate from reload() so a response that lands after
  // unmount (or after the week rolled over) can't write into a dead component.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, c] = await load();
        if (!alive) return;
        setPlans(p);
        setCounts(c);
        setError(null);
      } catch (e) {
        if (alive) setError(errorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [load]);

  useEffect(() => {
    supabase.from("staff_members")
      .select("id,user_id,email,first_name,last_name,status")
      .eq("status", "active")
      .then(({ data }) => {
        setStaff(((data as StaffRow[]) ?? []).map((s) => ({
          id: s.user_id ?? s.id,
          name: [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email,
        })));
      });
  }, []);

  const planByProject = useMemo(() => new Map(plans.map((p) => [p.projectId, p])), [plans]);
  const enrolled = useMemo(
    () => projects.filter((p) => planByProject.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [projects, planByProject],
  );
  const available = useMemo(
    () => projects.filter((p) => !planByProject.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [projects, planByProject],
  );
  const staffName = useCallback(
    (id: string | null) => (id ? staff.find((s) => s.id === id)?.name ?? "Unknown user" : null),
    [staff],
  );

  async function handleRunAll() {
    setRunning(true); setError(null); setNotice(null);
    try {
      const res = await runWeeklySeoNow();
      const created = (res.results ?? []).reduce((n, r) => n + (r.created ?? 0), 0);
      const failed = res.failed ?? 0;
      const weeks = (res.weeks ?? []).map((w) => w.label).join(" + ");
      await reload();
      setNotice(
        `${weeks}: created ${created} task${created === 1 ? "" : "s"} across ${res.plans ?? 0} project${res.plans === 1 ? "" : "s"}`
        + (failed ? ` · ${failed} project${failed === 1 ? "" : "s"} failed` : "."),
      );
      if (failed) {
        setError((res.results ?? []).filter((r) => r.error).map((r) => `${r.project}: ${r.error}`).join(" · "));
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRunning(false);
    }
  }

  async function handleAdd(projectId: string) {
    if (!projectId) return;
    setAdding(""); setError(null); setNotice(null);
    try {
      await dbSaveWeeklySeoPlan(projectId, {
        enabled: true, includeArticles: true, includeBacklinks: true, includeGmb: true,
      });
      await runWeeklySeoNow(projectId);
      await reload();
      setExpanded(projectId);
      setNotice(`${projects.find((p) => p.id === projectId)?.name ?? "Project"} added to the weekly loop.`);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
      {/* Explainer + global actions */}
      <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} style={{ color: "var(--accent)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Projects in the weekly loop</h2>
            </div>
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Every enrolled project gets its SEO task set generated automatically:
              a <strong style={{ color: "var(--text)" }}>{thisWeek.title}</strong>-style parent with its
              Monday / Wednesday / Friday article subtasks, plus Backlinks and a GMB Post due Friday.
              <br />
              Next week&apos;s set is created at the <strong style={{ color: "var(--text)" }}>start of every Friday</strong>;
              the current week is topped up daily. Unfinished work is never moved — it stays under its own
              week and runs overdue.
            </p>
          </div>
          <button onClick={handleRunAll} disabled={running || enrolled.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 hover:opacity-80 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#04121d" }}>
            {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Generate now
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>This week:</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--bg-surface)", color: "var(--text)" }}>
            {thisWeek.title}
          </span>
          <span className="text-xs ml-3" style={{ color: "var(--text-muted)" }}>Next week:</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--bg-surface)", color: "var(--text)" }}>
            {nextWeek.title}
          </span>
          {(thisWeek.split || nextWeek.split) && (
            <span className="text-xs" style={{ color: "#f59e0b" }}>
              · a split-month week only generates the new month&apos;s days
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm"
          style={{ background: "#ef444414", border: "1px solid #ef444455", color: "#fca5a5" }}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" /><span className="flex-1">{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm"
          style={{ background: "#22c55e14", border: "1px solid #22c55e55", color: "#86efac" }}>
          <Check size={14} className="mt-0.5 shrink-0" /><span className="flex-1">{notice}</span>
        </div>
      )}

      {/* Add a project */}
      <div className="flex items-center gap-2">
        <Plus size={14} style={{ color: "var(--text-muted)" }} />
        <select
          value={adding}
          onChange={(e) => handleAdd(e.target.value)}
          disabled={available.length === 0}
          className="px-3 py-2 rounded-lg text-sm outline-none disabled:opacity-50"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 280 }}
        >
          <option value="">
            {available.length === 0 ? "Every project is already enrolled" : "Add a project to the weekly loop…"}
          </option>
          {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Enrolled list */}
      {loading ? (
        <div className="flex items-center gap-2 p-6 text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : enrolled.length === 0 ? (
        <div className="rounded-xl p-8 text-center text-sm"
          style={{ background: "var(--bg-card)", border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
          No projects in the weekly loop yet. Pick one above to start generating its weekly SEO tasks.
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {enrolled.map((project, i) => {
            const plan = planByProject.get(project.id)!;
            const open = expanded === project.id;
            const thisCount = counts[project.id]?.[thisWeek.mondayIso] ?? 0;
            const nextCount = counts[project.id]?.[nextWeek.mondayIso] ?? 0;
            const includes = [
              plan.includeArticles && "Articles",
              plan.includeBacklinks && "Backlinks",
              plan.includeGmb && "GMB",
            ].filter(Boolean) as string[];
            return (
              <div key={project.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => setExpanded(open ? null : project.id)}
                    className="flex items-center gap-2 flex-1 text-left hover:opacity-80">
                    {open ? <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
                      : <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />}
                    <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{project.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={plan.enabled
                        ? { background: "#22c55e20", color: "#22c55e" }
                        : { background: "var(--bg-surface)", color: "var(--text-muted)" }}>
                      {plan.enabled ? "Active" : "Paused"}
                    </span>
                  </button>

                  <span className="text-xs hidden md:block" style={{ color: "var(--text-muted)", minWidth: 140 }}>
                    {staffName(plan.assigneeId) ?? "First project member"}
                  </span>
                  <span className="text-xs hidden lg:block" style={{ color: "var(--text-muted)", minWidth: 150 }}>
                    {includes.length ? includes.join(" · ") : "Nothing enabled"}
                  </span>
                  <span className="text-xs" style={{ minWidth: 130, color: thisCount ? "var(--text-muted)" : "#f59e0b" }}>
                    {thisCount ? `${thisCount} this week` : "Nothing this week"}
                    {nextCount > 0 && <span style={{ color: "var(--text-muted)" }}> · {nextCount} next</span>}
                  </span>
                  <Link href={projectPath(project)} title="Open project"
                    className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                    <ExternalLink size={13} />
                  </Link>
                </div>
                {open && (
                  <div className="px-4 pb-4" style={{ background: "var(--bg-surface)" }}>
                    <div className="pt-4">
                      {/* key: remount on a different project so its plan reloads cleanly */}
                      <WeeklySeoPanel key={project.id} projectId={project.id} staff={staff} onChanged={reload} previewWeeks={6} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
