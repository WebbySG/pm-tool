"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import { ExpenseForm } from "@/components/expense-form";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/utils";
import { loadExpenses, setExpensesSubmitted } from "@/lib/expense-db";
import {
  type Expense, type DerivedExpenseStatus,
  EXPENSE_CATEGORIES, CATEGORY_META, categoryMeta, paymentLabel,
  STATUS_META, computeExpenseStatus, summarise, netAmount,
  formatMoney, formatMoneyShort, expensesToCSV,
  financialYear, fyStartYearOf, fyMonthOrder, retainUntilYear, MONTH_LABELS,
} from "@/lib/expense-types";
import {
  Receipt, ReceiptText, Plus, Loader2, Download, ChevronLeft, ChevronRight,
  TriangleAlert, Wallet, Coins, Search, Check, Paperclip, ExternalLink,
} from "lucide-react";

const FY_MONTH_KEY = "expenses-fy-start-month";
const STATUS_FILTERS: (DerivedExpenseStatus | "all")[] = ["all", "missing_receipt", "recorded", "submitted"];

interface StaffLite { id: string; user_id: string | null; first_name: string | null; last_name: string | null; email: string }
function authId(s: StaffLite) { return s.user_id ?? s.id; }
function staffLabel(s: StaffLite) { return [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email; }

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ExpensesPage() {
  return (
    <AdminOnly>
      <Topbar title="Expenses" />
      <ExpensesInner />
    </AdminOnly>
  );
}

function ExpensesInner() {
  const { projects } = useStore();
  const [rows, setRows] = useState<Expense[]>([]);
  const [staff, setStaff] = useState<StaffLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [status, setStatus] = useState<DerivedExpenseStatus | "all">("all");

  // Financial year. The start month decides which FY a cost lands in, so it's a
  // user choice (plenty of SG companies close 31 Mar / 30 Jun, not 31 Dec) and is
  // read from localStorage in an effect to avoid an SSR hydration mismatch.
  const [fyStartMonth, setFyStartMonth] = useState(1);
  const [fyYear, setFyYear] = useState<number | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = Number(localStorage.getItem(FY_MONTH_KEY));
    if (saved >= 1 && saved <= 12) setFyStartMonth(saved);
  }, []);

  async function reload() {
    setLoading(true); setLoadError(null);
    try {
      setRows(await loadExpenses());
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    supabase.from("staff_members").select("id,user_id,first_name,last_name,email")
      .eq("status", "active")
      .then(({ data }) => setStaff((data as StaffLite[]) ?? []));
  }, []);

  const projectName = useCallback(
    (id: string | null) => (id ? projects.find((p) => p.id === id)?.name ?? null : null),
    [projects],
  );
  const personName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of staff) m.set(authId(s), staffLabel(s));
    return (id: string | null) => (id ? m.get(id) ?? "Former staff" : "");
  }, [staff]);

  // ── Financial year selection ───────────────────────────────────────────────
  const currentFyStart = fyStartYearOf(new Date().toISOString().slice(0, 10), fyStartMonth);
  const fyYears = useMemo(() => {
    const set = new Set<number>([currentFyStart]);
    for (const e of rows) set.add(fyStartYearOf(e.expenseDate, fyStartMonth));
    return Array.from(set).sort((a, b) => a - b);
  }, [rows, fyStartMonth, currentFyStart]);

  // Clamp the selected FY whenever the start month changes the year boundaries.
  const activeFyStart = fyYear ?? currentFyStart;
  const fy = financialYear(activeFyStart, fyStartMonth);
  const minFy = fyYears[0] ?? currentFyStart;
  const maxFy = Math.max(currentFyStart, fyYears[fyYears.length - 1] ?? currentFyStart);

  // Everything in the selected FY, before the filter bar — the summary cards and
  // charts describe the whole year, not the narrowed view.
  const fyRows = useMemo(
    () => rows.filter((e) => e.expenseDate >= fy.startISO && e.expenseDate <= fy.endISO),
    [rows, fy.startISO, fy.endISO],
  );

  const fyTotals = useMemo(() => summarise(fyRows), [fyRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fyRows.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (projectFilter !== "all") {
        if (projectFilter === "none" ? e.projectId !== null : e.projectId !== projectFilter) return false;
      }
      if (status !== "all" && computeExpenseStatus(e) !== status) return false;
      if (q) {
        const hay = [e.vendor, e.description, e.notes, categoryMeta(e.category).label, projectName(e.projectId) ?? ""]
          .join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [fyRows, category, projectFilter, status, search, projectName]);

  const filteredTotals = useMemo(() => summarise(filtered), [filtered]);
  const isFiltered = category !== "all" || projectFilter !== "all" || status !== "all" || search.trim() !== "";

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: fyRows.length, missing_receipt: 0, recorded: 0, submitted: 0 };
    for (const e of fyRows) c[computeExpenseStatus(e)]++;
    return c;
  }, [fyRows]);

  // ── Charts ─────────────────────────────────────────────────────────────────
  const monthOrder = useMemo(() => fyMonthOrder(fyStartMonth), [fyStartMonth]);

  const monthly = useMemo(() => {
    const buckets = Array<number>(12).fill(0);
    for (const e of fyRows) {
      const monthIdx = Number(e.expenseDate.slice(5, 7)) - 1;
      const pos = monthOrder.indexOf(monthIdx);
      if (pos >= 0) buckets[pos] += e.amount;
    }
    return { buckets, max: Math.max(0, ...buckets) };
  }, [fyRows, monthOrder]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of fyRows) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    const list = Array.from(m.entries()).map(([key, total]) => ({ key, total }))
      .sort((a, b) => b.total - a.total);
    return { list, max: Math.max(0, ...list.map((x) => x.total)) };
  }, [fyRows]);

  // ── Actions ────────────────────────────────────────────────────────────────
  function handleExport() {
    const csv = expensesToCSV(filtered, { projectName, personName });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${fy.label.replace(/\//g, "-")}${isFiltered ? "-filtered" : ""}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const unsubmittedInView = filtered.filter((e) => e.status !== "submitted");

  async function handleMarkSubmitted() {
    setActionError(null); setSubmitting(true);
    try {
      await setExpensesSubmitted(unsubmittedInView.map((e) => e.id), true, `Submitted ${fy.label}`);
      setConfirmSubmit(false);
      await reload();
    } catch (e: unknown) {
      setActionError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6">

      {/* ── Header: FY navigator + actions ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setFyYear(Math.max(minFy, activeFyStart - 1))}
            disabled={activeFyStart <= minFy}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
            style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            <ChevronLeft size={15} />
          </button>
          <div className="px-2 text-center">
            <p className="text-sm font-bold tabular-nums" style={{ color: "var(--text)" }}>{fy.label}</p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {fmtDate(fy.startISO)} – {fmtDate(fy.endISO)}
            </p>
          </div>
          <button onClick={() => setFyYear(Math.min(maxFy, activeFyStart + 1))}
            disabled={activeFyStart >= maxFy}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
            style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            <ChevronRight size={15} />
          </button>
        </div>

        <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
          FY starts
          <select value={fyStartMonth}
            onChange={(e) => {
              const m = Number(e.target.value);
              setFyStartMonth(m);
              setFyYear(null); // re-anchor on the current FY under the new boundary
              localStorage.setItem(FY_MONTH_KEY, String(m));
            }}
            className="bg-transparent text-xs outline-none px-2 py-1.5 rounded-lg"
            style={{ color: "var(--text)", border: "1px solid var(--border)", background: "var(--bg-base)" }}>
            {MONTH_LABELS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </label>

        <div className="flex-1" />

        <button onClick={handleExport} disabled={filtered.length === 0}
          title="Download the rows below as a CSV for your accountant (includes links to every receipt)"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--bg-surface)" }}>
          <Download size={14} /> Export CSV
        </button>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
          <Plus size={15} /> Record expense
        </button>
      </div>

      {loadError && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#ef444415", border: "1px solid #ef444440", color: "#ef4444" }}>
          ⚠ Could not load expenses — {loadError}
        </div>
      )}
      {actionError && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#ef444415", border: "1px solid #ef444440", color: "#ef4444" }}>
          ⚠ {actionError}
        </div>
      )}

      {/* ── Summary cards (whole FY) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label={`Total spend ${fy.label}`} value={formatMoney(fyTotals.total)}
          sub={`${fyTotals.count} expense${fyTotals.count === 1 ? "" : "s"}`} color="#38b6e8" icon={Receipt} />
        <SummaryCard label="Deductible" value={formatMoney(fyTotals.deductible)}
          sub={fyTotals.nonDeductible > 0 ? `${formatMoney(fyTotals.nonDeductible)} not claimable` : "All claimable"}
          color="#22c55e" icon={Wallet} />
        <SummaryCard label="GST input tax" value={formatMoney(fyTotals.gst)}
          sub={fyTotals.gst > 0 ? `Net of GST ${formatMoney(fyTotals.net)}` : "None recorded"}
          color="#a78bfa" icon={Coins} />
        <SummaryCard label="Missing receipts" value={String(fyTotals.missingReceipts)}
          sub={fyTotals.missingReceipts > 0 ? "IRAS needs the source document" : "Every expense has one"}
          color={fyTotals.missingReceipts > 0 ? "#ef4444" : "#22c55e"} icon={TriangleAlert} />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <div className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Spend by month</h2>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Keep records until {retainUntilYear(activeFyStart)} (5 years after the YA)
            </p>
          </div>
          {fyTotals.total === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No expenses recorded for {fy.label} yet.
            </div>
          ) : (
            <div className="flex items-end gap-2" style={{ height: 160 }}>
              {monthly.buckets.map((value, pos) => {
                const monthIdx = monthOrder[pos];
                const heightPct = monthly.max > 0 ? (value / monthly.max) * 100 : 0;
                return (
                  <div key={pos} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                    <span className="text-[10px] font-semibold leading-none"
                      style={{ color: value > 0 ? "var(--text)" : "transparent" }}>
                      {value > 0 ? formatMoneyShort(value) : "·"}
                    </span>
                    <div className="w-full rounded-t-md" title={`${MONTH_LABELS[monthIdx]}: ${formatMoney(value)}`}
                      style={{
                        height: `${heightPct}%`,
                        minHeight: value > 0 ? 4 : 0,
                        background: value > 0 ? "linear-gradient(180deg, #60a5fa, #2563eb)" : "transparent",
                      }} />
                    <span className="text-[10px] leading-none" style={{ color: "var(--text-muted)" }}>
                      {MONTH_LABELS[monthIdx]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl p-5 flex flex-col gap-2.5"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>By category</h2>
          {byCategory.list.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>Nothing yet.</p>
          ) : byCategory.list.map(({ key, total }) => {
            const m = categoryMeta(key);
            const pct = byCategory.max > 0 ? (total / byCategory.max) * 100 : 0;
            return (
              <button key={key} onClick={() => setCategory(category === key ? "all" : key)}
                className="text-left flex flex-col gap-1 rounded-lg px-2 py-1.5 transition-opacity hover:opacity-80"
                style={{ background: category === key ? `${m.color}18` : "transparent" }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs flex-1 truncate" style={{ color: "var(--text)" }}>{m.label}</span>
                  <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: "var(--text)" }}>
                    {formatMoney(total)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-base)" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: m.color, borderRadius: 999 }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
          <Search size={13} style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor, notes…"
            className="bg-transparent text-sm outline-none w-44" style={{ color: "var(--text)" }} />
        </div>

        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg"
          style={{ color: "var(--text)", border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
          <option value="all">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
        </select>

        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
          className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg"
          style={{ color: "var(--text)", border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
          <option value="all">All projects</option>
          <option value="none">No project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {STATUS_FILTERS.map((s) => {
          const active = status === s;
          const color = s === "all" ? "var(--accent)" : STATUS_META[s].color;
          return (
            <button key={s} onClick={() => setStatus(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: active ? `${color}25` : "var(--bg-surface)",
                color: active ? color : "var(--text-muted)",
                border: `1px solid ${active ? color : "var(--border)"}`,
              }}>
              {s === "all" ? "All" : STATUS_META[s].label} · {statusCounts[s] ?? 0}
            </button>
          );
        })}

        <div className="flex-1" />

        {unsubmittedInView.length > 0 && (
          confirmSubmit ? (
            <button onClick={handleMarkSubmitted} disabled={submitting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ background: "#22c55e" }}>
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Confirm — mark {unsubmittedInView.length} submitted
            </button>
          ) : (
            <button onClick={() => setConfirmSubmit(true)}
              title="Flag the rows below as handed to the accountant / filed"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ border: "1px solid #22c55e40", color: "#22c55e" }}>
              <Check size={12} /> Mark {unsubmittedInView.length} submitted
            </button>
          )
        )}
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={14} className="animate-spin" /> Loading expenses…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: "var(--bg-surface)", border: "1px dashed var(--border)" }}>
          <ReceiptText size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {fyRows.length === 0
              ? `No expenses recorded for ${fy.label}. Snap a receipt and record your first one.`
              : "No expenses match these filters."}
          </p>
          {fyRows.length === 0 && (
            <button onClick={() => { setEditing(null); setShowForm(true); }}
              className="mt-3 px-4 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
              Record expense
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {filtered.map((e, i) => {
              const st = computeExpenseStatus(e);
              const sm = STATUS_META[st];
              const cm = categoryMeta(e.category);
              const pName = projectName(e.projectId);
              return (
                <div key={e.id} onClick={() => { setEditing(e); setShowForm(true); }}
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer transition-opacity hover:opacity-90"
                  style={{
                    background: "var(--bg-surface)",
                    borderBottom: i === filtered.length - 1 ? "none" : "1px solid var(--border)",
                  }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${cm.color}20` }}>
                    <Receipt size={15} style={{ color: cm.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{e.vendor}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                        style={{ background: `${cm.color}25`, color: cm.color }}>{cm.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
                        style={{ background: `${sm.color}25`, color: sm.color }}>{sm.label}</span>
                      {!e.deductible && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: "#64748b25", color: "#94a3b8" }}>Not deductible</span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                      {fmtDate(e.expenseDate)}
                      {e.description ? ` · ${e.description}` : ""}
                      {pName ? ` · ${pName}` : ""}
                      {` · ${paymentLabel(e.paymentMethod)}`}
                    </p>
                  </div>

                  {e.receipts.length > 0 ? (
                    <a href={e.receipts[0].url} target="_blank" rel="noopener noreferrer"
                      onClick={(ev) => ev.stopPropagation()}
                      title={`${e.receipts.length} receipt${e.receipts.length === 1 ? "" : "s"} — open the first`}
                      className="flex items-center gap-1 shrink-0 text-xs px-2 py-1 rounded-lg"
                      style={{ color: "#34d399", border: "1px solid #34d39940" }}>
                      <Paperclip size={11} />{e.receipts.length}<ExternalLink size={10} />
                    </a>
                  ) : (
                    <span className="flex items-center gap-1 shrink-0 text-xs px-2 py-1 rounded-lg"
                      title="No receipt attached — click the row to add one"
                      style={{ color: "#ef4444", border: "1px solid #ef444440" }}>
                      <TriangleAlert size={11} /> 0
                    </span>
                  )}

                  <div className="text-right shrink-0 w-28">
                    <p className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                      {formatMoney(e.amount, e.currency)}
                    </p>
                    {e.gstAmount > 0 && (
                      <p className="text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                        GST {formatMoney(e.gstAmount, e.currency)} · net {formatMoney(netAmount(e), e.currency)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer total for exactly what's on screen — this is the figure the
              Export CSV button writes out, so they must agree. */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 rounded-xl text-sm"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <span style={{ color: "var(--text-muted)" }}>
              {isFiltered ? "Filtered" : fy.label} total
              <strong className="ml-2 tabular-nums" style={{ color: "var(--text)" }}>
                {formatMoney(filteredTotals.total)}
              </strong>
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              Deductible <strong className="tabular-nums" style={{ color: "#22c55e" }}>{formatMoney(filteredTotals.deductible)}</strong>
            </span>
            {filteredTotals.gst > 0 && (
              <span style={{ color: "var(--text-muted)" }}>
                GST <strong className="tabular-nums" style={{ color: "#a78bfa" }}>{formatMoney(filteredTotals.gst)}</strong>
              </span>
            )}
            {filteredTotals.missingReceipts > 0 && (
              <span style={{ color: "#ef4444" }}>
                {filteredTotals.missingReceipts} missing receipt{filteredTotals.missingReceipts === 1 ? "" : "s"}
              </span>
            )}
            <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
              {filteredTotals.count} row{filteredTotals.count === 1 ? "" : "s"}
            </span>
          </div>
        </>
      )}

      {showForm && (
        <ExpenseForm
          initial={editing}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          onClose={() => { setShowForm(false); setEditing(null); setConfirmSubmit(false); reload(); }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub?: string; color: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{label}</p>
        <p className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>{value}</p>
        {sub && <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{sub}</p>}
      </div>
    </div>
  );
}
