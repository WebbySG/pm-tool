"use client";
// ─── The task sheet ──────────────────────────────────────────────────────────
// A client's tasks as a flat, sortable, editable grid — the spreadsheet view of
// the board. Mounted twice: the project "Sheet" tab (one client, every task)
// and the global /articles page (every client, article rows only), so the two
// can never drift apart.
//
// Every cell writes straight through the store, which patches optimistically
// and rethrows on failure — so each row surfaces its own error rather than
// looking saved until the next refresh quietly reverts it.
//
// Marking articles is done HERE, in bulk: filter the sheet down to what you
// mean (search "monday", or pick a week) and tick them in one action. That is
// the whole point of the Article column — the sheet never guesses from titles.

import { Fragment, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  BUCKET_META, PRIORITY_LABEL, SHEET_STATUSES, articleRows, priorityColor,
  sheetToCSV, sortSheetRows, statusColor, statusLabel, summarise,
  type SheetRow, type SortKey,
} from "@/lib/task-sheet";
import type { TaskStatus } from "@/lib/mock-data";
import { errorMessage } from "@/lib/utils";
import {
  AlertTriangle, ArrowUpDown, ArrowUpRight, Check, Download, ExternalLink,
  FileText, Link2, Loader2, Plus, Search,
} from "lucide-react";

interface Props {
  rows: SheetRow[];
  staff: { id: string; name: string }[];
  /** The global sheet shows a Client column; a project's own tab does not. */
  showClient: boolean;
  /** Locks the sheet to article rows and hides the toggle. */
  articlesOnly?: boolean;
  /** Whether this person may change a given row from the sheet. */
  canEdit: (row: SheetRow) => boolean;
  /** Only an admin marks what counts as an article. */
  isAdmin: boolean;
  onOpen: (row: SheetRow) => void;
  onAdd?: () => void;
  /** Stem of the exported filename, e.g. "cemimax-tasks". */
  exportName: string;
  /** Named on the "posted the article" notification. */
  currentUserName: string;
}

/** Today in Asia/Singapore — the calendar the agency actually works to. */
function todayInSingapore(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
}

function fmtStamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/**
 * Module-level, not defined inside the sheet: a component created during render
 * is remounted every render, and this repo's lint rules reject it outright.
 */
function Th({ label, k, sortKey, desc, onSort, width, align = "left" }: {
  label: string;
  k?: SortKey;
  sortKey: SortKey;
  desc: boolean;
  onSort: (k: SortKey) => void;
  width?: number;
  align?: "left" | "center";
}) {
  const active = k !== undefined && sortKey === k;
  return (
    <th
      onClick={k ? () => onSort(k) : undefined}
      className={`px-3 py-2 text-xs font-semibold whitespace-nowrap select-none ${k ? "cursor-pointer" : ""}`}
      style={{ color: active ? "#38b6e8" : "#4a7090", width, textAlign: align }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {k && <ArrowUpDown size={10} style={{ opacity: active ? 1 : 0.45 }} />}
        {active && <span style={{ fontSize: 9 }}>{desc ? "▼" : "▲"}</span>}
      </span>
    </th>
  );
}

function Tile({ label, value, color, hint }: {
  label: string; value: number; color: string; hint?: string;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 px-4 py-3 rounded-xl min-w-[112px]"
      style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}
      title={hint}
    >
      <span className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</span>
      <span className="text-xs" style={{ color: "#4a7090" }}>{label}</span>
    </div>
  );
}

export function TaskSheet({
  rows, staff, showClient, articlesOnly = false, canEdit, isAdmin,
  onOpen, onAdd, exportName, currentUserName,
}: Props) {
  const {
    updateTaskStatus, updateTaskTitle, updateTaskDueDate, updateTaskPriority,
    updateTaskAssignee, setTaskIsArticle, setTasksIsArticle, markArticlePosted,
  } = useStore();

  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterWeek, setFilterWeek] = useState("all");
  const [onlyArticles, setOnlyArticles] = useState(false);
  const [hideDone, setHideDone] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDesc, setSortDesc] = useState(true);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [urlDraft, setUrlDraft] = useState<{ id: string; value: string } | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);

  const today = useMemo(() => todayInSingapore(), []);

  const staffName = useMemo(() => {
    const m = new Map(staff.map((s) => [s.id, s.name]));
    return (id: string) => m.get(id) ?? "Unknown";
  }, [staff]);

  // The article view drops weekly parents (they group articles rather than
  // being one); the all-tasks view keeps everything.
  const base = useMemo(
    () => (articlesOnly ? articleRows(rows) : rows),
    [rows, articlesOnly],
  );

  // Options come from ALL rows, not the filtered set, so picking a value never
  // empties the list you picked it from.
  const weekOptions = useMemo(() => {
    const m = new Map<string, { label: string; count: number }>();
    for (const r of base) {
      const cur = m.get(r.weekKey);
      if (cur) cur.count++;
      else m.set(r.weekKey, { label: r.weekLabel, count: 1 });
    }
    return Array.from(m.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => (a.key === "" ? 1 : b.key === "" ? -1 : a.key < b.key ? 1 : -1));
  }, [base]);

  const clientOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of base) m.set(r.projectId, r.projectName);
    return Array.from(m.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [base]);

  const assigneeOptions = useMemo(() => {
    const ids = new Set(base.map((r) => r.assigneeId).filter(Boolean));
    return staff.filter((s) => ids.has(s.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [base, staff]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = base.filter((r) => {
      if (filterClient !== "all" && r.projectId !== filterClient) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterWeek !== "all" && r.weekKey !== filterWeek) return false;
      if (filterAssignee !== "all") {
        if (filterAssignee === "none" ? r.assigneeId !== "" : r.assigneeId !== filterAssignee) return false;
      }
      if (!articlesOnly && onlyArticles && !r.isArticle) return false;
      if (hideDone && (r.bucket === "done" || r.bucket === "closed")) return false;
      if (q) {
        const hay = `${r.title} ${r.parentTitle} ${r.projectName} ${r.articleUrl ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return sortSheetRows(filtered, sortKey, sortDesc, staffName);
  }, [
    base, search, filterClient, filterStatus, filterWeek, filterAssignee,
    onlyArticles, hideDone, articlesOnly, sortKey, sortDesc, staffName,
  ]);

  // The tiles describe what is SHOWN — on a sheet you can sort and filter, the
  // useful number is the one for the slice you're looking at.
  const stats = useMemo(() => summarise(visible, today), [visible, today]);

  const isFiltered =
    search.trim() !== "" || filterClient !== "all" || filterStatus !== "all" ||
    filterWeek !== "all" || filterAssignee !== "all" || onlyArticles || hideDone;

  const untickedShown = useMemo(
    () => visible.filter((r) => !r.isArticle).map((r) => r.id),
    [visible],
  );
  const tickedShown = useMemo(
    () => visible.filter((r) => r.isArticle).map((r) => r.id),
    [visible],
  );

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDesc((d) => !d);
    else { setSortKey(k); setSortDesc(k === "dueDate" || k === "week" || k === "updated"); }
  }

  function handleExport() {
    const csv = sheetToCSV(visible, staffName, { includeClient: showClient });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName}${isFiltered ? "-filtered" : ""}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function run(row: SheetRow, fn: () => Promise<void>) {
    setBusyId(row.id);
    setRowError(null);
    try {
      await fn();
    } catch (e) {
      setRowError({ id: row.id, message: errorMessage(e) });
    } finally {
      setBusyId(null);
    }
  }

  async function bulkMark(ids: string[], value: boolean) {
    setBulkBusy(true);
    setBulkError(null);
    setBulkNotice(null);
    try {
      await setTasksIsArticle(ids, value);
      setBulkNotice(`${ids.length} task${ids.length !== 1 ? "s" : ""} ${value ? "marked as articles" : "unmarked"}.`);
    } catch (e) {
      setBulkError(errorMessage(e));
    } finally {
      setBulkBusy(false);
    }
  }

  // Week · Due · Group · Task · Status · Priority · Assignee · Live URL ·
  // Updated · the open arrow — plus Client and Article when those are shown.
  const colCount = (showClient ? 1 : 0) + (isAdmin ? 1 : 0) + 10;


  return (
    <div className="flex flex-col gap-4">
      {/* Summary — of what's shown, since the sheet is a filtering surface */}
      <div className="flex gap-2.5 flex-wrap">
        <Tile label={isFiltered ? "Shown" : "Tasks"} value={stats.total} color="#cce4ff" />
        <Tile
          label="Outstanding"
          value={stats.outstanding}
          color={stats.outstanding > 0 ? "#f59e0b" : "#4a7090"}
          hint="Still needs someone to act — rejected and missed are finished business."
        />
        <Tile label={BUCKET_META.needs_you.label} value={stats.needsYou} color={BUCKET_META.needs_you.color} />
        <Tile
          label={BUCKET_META.waiting.label}
          value={stats.waiting}
          color={BUCKET_META.waiting.color}
          hint="Waiting on the client, or on the live article link being recorded."
        />
        <Tile label={BUCKET_META.done.label} value={stats.done} color={BUCKET_META.done.color} />
        {!articlesOnly && (
          <Tile label="Articles" value={stats.articles} color="#38b6e8" hint="Rows ticked in the Article column." />
        )}
        {stats.overdue > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: "#ef444415", border: "1px solid #ef444440" }}>
            <AlertTriangle size={16} style={{ color: "#ef4444" }} />
            <div className="flex flex-col">
              <span className="text-2xl font-bold tabular-nums" style={{ color: "#ef4444" }}>{stats.overdue}</span>
              <span className="text-xs" style={{ color: "#ef4444" }}>Overdue</span>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#4a7090" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={articlesOnly ? "Search articles…" : "Search tasks…"}
            className="pl-8 pr-3 py-2 rounded-lg text-sm outline-none w-48"
            style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#cce4ff" }}
          />
        </div>

        {showClient && (
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#cce4ff" }}
          >
            <option value="all">All clients ({clientOptions.length})</option>
            {clientOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        <select
          value={filterWeek}
          onChange={(e) => setFilterWeek(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#cce4ff" }}
        >
          <option value="all">All weeks</option>
          {weekOptions.map((w) => (
            <option key={w.key || "none"} value={w.key}>{w.label} ({w.count})</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#cce4ff" }}
        >
          <option value="all">All statuses</option>
          {SHEET_STATUSES.map((s) => {
            const n = base.filter((r) => r.status === s).length;
            if (n === 0) return null;
            return <option key={s} value={s}>{statusLabel(s)} ({n})</option>;
          })}
        </select>

        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#cce4ff" }}
        >
          <option value="all">Anyone</option>
          <option value="none">Unassigned</option>
          {assigneeOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {!articlesOnly && (
          <button
            onClick={() => setOnlyArticles((v) => !v)}
            className="px-3 py-2 rounded-lg text-sm font-medium"
            style={{
              background: onlyArticles ? "#38b6e820" : "#0f1d2e",
              border: `1px solid ${onlyArticles ? "#38b6e860" : "#1c3248"}`,
              color: onlyArticles ? "#38b6e8" : "#4a7090",
            }}
          >
            Articles only
          </button>
        )}

        <button
          onClick={() => setHideDone((v) => !v)}
          className="px-3 py-2 rounded-lg text-sm font-medium"
          style={{
            background: hideDone ? "#f59e0b20" : "#0f1d2e",
            border: `1px solid ${hideDone ? "#f59e0b60" : "#1c3248"}`,
            color: hideDone ? "#f59e0b" : "#4a7090",
          }}
        >
          Hide finished
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={visible.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-40"
            style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#cce4ff" }}
            title="Download exactly the rows shown, in the order shown"
          >
            <Download size={13} /> Export CSV
          </button>
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80"
              style={{ background: "#38b6e8", color: "#fff" }}
            >
              <Plus size={13} /> Add article
            </button>
          )}
        </div>
      </div>

      {/* Bulk article marking — the fast way to label a week's worth at once */}
      {isAdmin && !articlesOnly && visible.length > 0 && (
        <div
          className="flex items-center gap-3 flex-wrap px-3 py-2 rounded-lg"
          style={{ background: "#0e1e30", border: "1px solid #1c3248" }}
        >
          <span className="text-xs" style={{ color: "#4a7090" }}>
            Marking articles — filter to what you mean, then tick the lot:
          </span>
          <button
            onClick={() => bulkMark(untickedShown, true)}
            disabled={bulkBusy || untickedShown.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium disabled:opacity-40"
            style={{ background: "#38b6e820", border: "1px solid #38b6e860", color: "#38b6e8" }}
          >
            {bulkBusy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Mark {untickedShown.length} shown as articles
          </button>
          <button
            onClick={() => bulkMark(tickedShown, false)}
            disabled={bulkBusy || tickedShown.length === 0}
            className="px-2.5 py-1 rounded-lg text-xs font-medium disabled:opacity-40"
            style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#4a7090" }}
          >
            Unmark {tickedShown.length} shown
          </button>
          {bulkNotice && <span className="text-xs" style={{ color: "#22c55e" }}>{bulkNotice}</span>}
          {bulkError && <span className="text-xs" style={{ color: "#ef4444" }}>Not saved — {bulkError}</span>}
        </div>
      )}

      {/* Sheet */}
      {base.length === 0 ? (
        <div className="text-center py-14 flex flex-col items-center gap-3">
          <FileText size={32} style={{ color: "#1c3248" }} />
          <p className="text-sm" style={{ color: "#4a7090" }}>
            {articlesOnly ? "No articles marked yet." : "No tasks on this project yet."}
          </p>
          {articlesOnly && (
            <p className="text-xs max-w-md" style={{ color: "#4a7090" }}>
              Tick the <strong>Article</strong> column on a project&apos;s Sheet tab to make a task
              count here. Weekly SEO articles are marked automatically when they are generated.
            </p>
          )}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-14">
          <p className="text-sm" style={{ color: "#4a7090" }}>Nothing matches these filters.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-x-auto" style={{ border: "1px solid #1c3248" }}>
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: showClient ? 1180 : 1040 }}>
            <thead>
              <tr style={{ background: "#0e1e30", borderBottom: "1px solid #1c3248" }}>
                {showClient && <Th label="Client" k="projectName" sortKey={sortKey} desc={sortDesc} onSort={toggleSort} />}
                <Th label="Week" k="week" sortKey={sortKey} desc={sortDesc} onSort={toggleSort} width={130} />
                <Th label="Due" k="dueDate" sortKey={sortKey} desc={sortDesc} onSort={toggleSort} width={128} />
                <Th label="Group" k="parentTitle" sortKey={sortKey} desc={sortDesc} onSort={toggleSort} width={150} />
                <Th label="Task" k="title" sortKey={sortKey} desc={sortDesc} onSort={toggleSort} />
                <Th label="Status" k="status" sortKey={sortKey} desc={sortDesc} onSort={toggleSort} width={170} />
                <Th label="Priority" k="priority" sortKey={sortKey} desc={sortDesc} onSort={toggleSort} width={110} />
                <Th label="Assignee" k="assignee" sortKey={sortKey} desc={sortDesc} onSort={toggleSort} width={140} />
                {isAdmin && <Th label="Article" sortKey={sortKey} desc={sortDesc} onSort={toggleSort} width={62} align="center" />}
                <Th label="Live URL" sortKey={sortKey} desc={sortDesc} onSort={toggleSort} width={180} />
                <Th label="Updated" k="updated" sortKey={sortKey} desc={sortDesc} onSort={toggleSort} width={150} />
                <th style={{ width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const editable = canEdit(r);
                const overdue = r.dueDate !== "" && r.dueDate < today &&
                  r.bucket !== "done" && r.bucket !== "closed";
                const draft = urlDraft?.id === r.id ? urlDraft.value : "";
                return (
                  <Fragment key={r.id}>
                    <tr className="group" style={{ background: "#0f1d2e", borderBottom: "1px solid #16283c" }}>
                      {showClient && (
                        <td className="px-3 py-1.5 text-sm max-w-[150px] truncate" style={{ color: "#cce4ff" }} title={r.projectName}>
                          {r.projectName}
                        </td>
                      )}

                      <td className="px-3 py-1.5 text-xs whitespace-nowrap" style={{ color: "#8fb3d0" }}>
                        {r.weekLabel}
                      </td>

                      <td className="px-3 py-1.5">
                        {editable ? (
                          <input
                            type="date"
                            defaultValue={r.task.dueDate || ""}
                            key={`d-${r.id}-${r.task.dueDate}`}
                            disabled={busyId === r.id}
                            onChange={(e) => run(r, () => updateTaskDueDate(r.projectId, r.id, e.target.value))}
                            className="px-1.5 py-1 rounded text-xs outline-none w-[108px]"
                            style={{
                              background: "#0a1520",
                              border: `1px solid ${overdue ? "#ef444460" : "#1c3248"}`,
                              color: overdue ? "#ef4444" : "#cce4ff",
                            }}
                          />
                        ) : (
                          <span className="text-xs" style={{ color: overdue ? "#ef4444" : "#8fb3d0" }}>
                            {fmtDate(r.dueDate) || "—"}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-1.5 text-xs max-w-[150px] truncate" style={{ color: "#4a7090" }} title={r.parentTitle}>
                        {r.parentTitle || "—"}
                      </td>

                      <td className="px-3 py-1.5">
                        {editable ? (
                          <input
                            defaultValue={r.title}
                            key={`t-${r.id}-${r.title}`}
                            disabled={busyId === r.id}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v === "" || v === r.title) { e.target.value = r.title; return; }
                              run(r, () => updateTaskTitle(r.projectId, r.id, v));
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                            className="w-full px-1.5 py-1 rounded text-sm outline-none focus:bg-[#0a1520]"
                            style={{ background: "transparent", border: "1px solid transparent", color: "#cce4ff" }}
                          />
                        ) : (
                          <span className="text-sm" style={{ color: "#cce4ff" }}>{r.title}</span>
                        )}
                      </td>

                      <td className="px-3 py-1.5">
                        {editable ? (
                          <select
                            value={r.status}
                            disabled={busyId === r.id}
                            onChange={(e) => run(r, () => updateTaskStatus(r.projectId, r.id, e.target.value as TaskStatus))}
                            className="px-2 py-1 rounded-full text-xs font-medium outline-none cursor-pointer max-w-[160px]"
                            style={{ background: statusColor(r.status) + "20", color: statusColor(r.status), border: "none" }}
                          >
                            {SHEET_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: statusColor(r.status) + "20", color: statusColor(r.status) }}>
                            {statusLabel(r.status)}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-1.5">
                        {editable ? (
                          <select
                            value={r.priority}
                            disabled={busyId === r.id}
                            onChange={(e) => run(r, () => updateTaskPriority(r.projectId, r.id, Number(e.target.value) as 1 | 2 | 3 | 4 | 5))}
                            className="px-2 py-1 rounded-full text-xs font-medium outline-none cursor-pointer"
                            style={{ background: priorityColor(r.priority) + "20", color: priorityColor(r.priority), border: "none" }}
                          >
                            {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs font-medium" style={{ color: priorityColor(r.priority) }}>P{r.priority}</span>
                        )}
                      </td>

                      <td className="px-3 py-1.5">
                        {editable ? (
                          <select
                            value={r.assigneeId}
                            disabled={busyId === r.id}
                            onChange={(e) => run(r, () => updateTaskAssignee(r.projectId, r.id, e.target.value))}
                            className="px-1.5 py-1 rounded text-xs outline-none cursor-pointer w-[124px]"
                            style={{ background: "#0a1520", border: "1px solid #1c3248", color: r.assigneeId ? "#cce4ff" : "#4a7090" }}
                          >
                            <option value="">Unassigned</option>
                            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs" style={{ color: r.assigneeId ? "#8fb3d0" : "#4a7090" }}>
                            {r.assigneeId ? staffName(r.assigneeId) : "Unassigned"}
                          </span>
                        )}
                      </td>

                      {isAdmin && (
                        <td className="px-3 py-1.5 text-center">
                          <button
                            onClick={() => run(r, () => setTaskIsArticle(r.projectId, r.id, !r.isArticle))}
                            disabled={busyId === r.id}
                            className="w-4 h-4 rounded inline-flex items-center justify-center border"
                            style={{
                              borderColor: r.isArticle ? "#38b6e8" : "#4a7090",
                              background: r.isArticle ? "#38b6e8" : "transparent",
                            }}
                            title={r.isArticleGroup
                              ? "This task groups articles — its children are the article rows"
                              : r.isArticle ? "Counted as an article" : "Mark as an article"}
                          >
                            {r.isArticle && <Check size={11} color="#fff" />}
                          </button>
                        </td>
                      )}

                      <td className="px-3 py-1.5">
                        {r.articleUrl ? (
                          <a
                            href={r.articleUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs hover:underline max-w-[170px]"
                            style={{ color: "#38b6e8" }}
                            title={r.articleUrl}
                          >
                            <Link2 size={11} className="shrink-0" />
                            <span className="truncate">{r.articleUrl.replace(/^https?:\/\//i, "")}</span>
                            <ExternalLink size={10} className="shrink-0" />
                          </a>
                        ) : r.status === "pending_article_post" && editable ? (
                          // The one action worth doing without opening the drawer:
                          // an approved article is finished the moment its live
                          // link is recorded.
                          <span className="flex items-center gap-1">
                            <input
                              value={draft}
                              onChange={(e) => setUrlDraft({ id: r.id, value: e.target.value })}
                              placeholder="Live URL…"
                              className="px-1.5 py-1 rounded text-xs outline-none w-24"
                              style={{ background: "#0a1520", border: "1px solid #1c3248", color: "#cce4ff" }}
                            />
                            <button
                              disabled={busyId === r.id || draft.trim() === ""}
                              onClick={() => run(r, async () => {
                                await markArticlePosted(r.projectId, r.id, r.title, currentUserName, draft.trim());
                                setUrlDraft(null);
                              })}
                              className="px-2 py-1 rounded text-xs font-medium disabled:opacity-40"
                              style={{ background: "#f97316", color: "#fff" }}
                            >
                              {busyId === r.id ? <Loader2 size={11} className="animate-spin" /> : "Post"}
                            </button>
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "#4a7090" }}>—</span>
                        )}
                      </td>

                      <td className="px-3 py-1.5 text-xs whitespace-nowrap" style={{ color: "#4a7090" }}>
                        {fmtStamp(r.statusChangedAt)}
                      </td>

                      <td className="px-2 py-1.5 text-right">
                        <button
                          onClick={() => onOpen(r)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: "#38b6e8" }}
                          title="Open the full task"
                        >
                          <ArrowUpRight size={14} />
                        </button>
                      </td>
                    </tr>

                    {rowError?.id === r.id && (
                      <tr style={{ background: "#0f1d2e" }}>
                        <td colSpan={colCount} className="px-3 pb-2">
                          <span className="text-xs" style={{ color: "#ef4444" }}>
                            Not saved — {rowError.message}
                          </span>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
