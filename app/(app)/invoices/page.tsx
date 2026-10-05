"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import { useStore } from "@/lib/store";
import { errorMessage } from "@/lib/utils";
import { MonthTransactions } from "@/components/month-transactions";
import { loadInvoices } from "@/lib/invoice-db";
import type { Invoice } from "@/lib/invoice-types";
import { computeDerivedStatus, computeBalanceDue } from "@/lib/invoice-types";
import { loadExpenses } from "@/lib/expense-db";
import type { Expense } from "@/lib/expense-types";
import { financialYear, fyStartYearOf } from "@/lib/expense-types";
import {
  revenueEvents, expenseEvents, inputGstEvents,
  monthlyProfit, activeFinancialYears, monthTotals, localDateISO,
} from "@/lib/profit";
import { useFyStartMonth } from "@/lib/use-fy-start-month";
import {
  Receipt, FileText, ChevronRight, ChevronLeft, Loader2, Wallet,
  CreditCard, Scale,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue", partial: "Partially paid", void: "Void",
  accepted: "Accepted", declined: "Declined", expired: "Expired", converted: "Converted",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "#9ca3af", sent: "#38b6e8", paid: "#22c55e", overdue: "#ef4444", partial: "#f59e0b", void: "#6b7280",
  accepted: "#22c55e", declined: "#ef4444", expired: "#f59e0b", converted: "#a78bfa",
};

// Filter pill sets differ by document type.
const INVOICE_FILTERS = ["all", "draft", "sent", "partial", "overdue", "paid"] as const;
const QUOTE_FILTERS = ["all", "draft", "sent", "accepted", "declined", "expired", "converted"] as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatMoney(amount: number, currency: string) {
  return `${currency === "SGD" ? "S$" : currency + " "}${amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Compact money for chart bar labels, e.g. S$2.4k / S$900
function formatMoneyShort(amount: number) {
  if (amount >= 1000) {
    const k = amount / 1000;
    return `S$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `S$${Math.round(amount)}`;
}

// A profit can be negative, and "S$-371.00" reads as a typo. Sign goes first.
function formatSigned(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${formatMoney(Math.abs(amount), "SGD")}`;
}

function formatSignedShort(amount: number) {
  return `${amount < 0 ? "-" : ""}${formatMoneyShort(Math.abs(amount))}`;
}

// invoiceEarnings moved to lib/profit.ts — the expenses side needed the same
// "what counts as revenue" rule, and a second copy is what drifts.

export default function InvoicesPage() {
  return <AdminOnly><InvoicesInner /></AdminOnly>;
}

function InvoicesInner() {
  const { projects } = useStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [docView, setDocView] = useState<"invoice" | "quote">("invoice");
  const [filter, setFilter] = useState<string>("all");
  // Null = "follow today". Selecting a month or a year pins it, so the
  // chart lands on the current financial year however the FY is configured.
  const [chartYear, setChartYear] = useState<number | null>(null);
  // Shared with the Expenses page, so a cost can never fall in one financial
  // year here and a different one there.
  const fyStartMonth = useFyStartMonth();

  useEffect(() => {
    loadInvoices().then((rows) => { setInvoices(rows); setLoading(false); })
      .catch((e) => { setInvoiceError(errorMessage(e)); setLoading(false); });
    loadExpenses().then(setExpenses)
      .catch((e) => setExpenseError(errorMessage(e)))
      .finally(() => setExpensesLoading(false));
  }, []);

  const enriched = useMemo(() =>
    invoices.map((inv) => ({ ...inv, derivedStatus: computeDerivedStatus(inv) })),
    [invoices],
  );

  // Rows for the active tab (Invoices vs Quotes).
  const viewRows = useMemo(() =>
    enriched.filter((inv) => inv.docType === docView),
    [enriched, docView],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return viewRows;
    return viewRows.filter((inv) => inv.derivedStatus === filter);
  }, [viewRows, filter]);

  const activeFilters = docView === "quote" ? QUOTE_FILTERS : INVOICE_FILTERS;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: viewRows.length };
    for (const f of activeFilters) if (f !== "all") c[f] = 0;
    for (const inv of viewRows) {
      if (c[inv.derivedStatus] !== undefined) c[inv.derivedStatus]++;
    }
    return c;
  }, [viewRows, activeFilters]);

  const quoteCount = useMemo(() => enriched.filter((i) => i.docType === "quote").length, [enriched]);
  const invoiceCount = useMemo(() => enriched.filter((i) => i.docType === "invoice").length, [enriched]);

  // Earnings / financial summary are invoice-only — quotes never contribute.
  const invoiceRows = useMemo(() => invoices.filter((i) => i.docType === "invoice"), [invoices]);

  // Dated money events — the basis for every figure below. Both sides go
  // through lib/profit.ts so revenue here means exactly what it means there.
  const revenue = useMemo(() => revenueEvents(invoiceRows), [invoiceRows]);
  const costs = useMemo(() => expenseEvents(expenses), [expenses]);
  const gst = useMemo(() => inputGstEvents(expenses), [expenses]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayISO = localDateISO(now);
  const monthKey = selectedMonth ?? todayISO.slice(0, 7);
  const selectedYear = Number(monthKey.slice(0, 4));
  const selectedMonthIndex = Number(monthKey.slice(5, 7)) - 1;
  const monthLabel = `${MONTHS[selectedMonthIndex]} ${selectedYear}`;
  const financialsReady = !loading && !expensesLoading && !invoiceError && !expenseError;

  function selectMonth(value: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return;
    setSelectedMonth(value);
    setChartYear(fyStartYearOf(`${value}-01`, fyStartMonth));
  }

  // Which financial year is on screen. Defaults to the one containing today.
  const currentFyStart = fyStartYearOf(todayISO, fyStartMonth);
  const activeYear = chartYear ?? currentFyStart;
  const fy = financialYear(activeYear, fyStartMonth);

  const outstanding = useMemo(() =>
    // Remaining balance across sent/overdue/partially-paid invoices (quotes excluded).
    enriched
      .filter((i) => i.docType === "invoice"
        && (i.derivedStatus === "sent" || i.derivedStatus === "overdue" || i.derivedStatus === "partial"))
      .reduce((s, i) => s + computeBalanceDue(i), 0),
    [enriched],
  );

  // Selected calendar month — independent of invoice issue dates and statuses.
  const thisMonth = useMemo(
    () => monthTotals(revenue, costs, selectedYear, selectedMonthIndex),
    [revenue, costs, selectedYear, selectedMonthIndex],
  );

  const chartYears = useMemo(
    () => activeFinancialYears([revenue, costs], fyStartMonth, todayISO),
    [revenue, costs, fyStartMonth, todayISO],
  );
  const minYear = chartYears[0];
  const maxYear = chartYears[chartYears.length - 1];

  const profit = useMemo(
    () => monthlyProfit({
      revenue, expenses: costs, inputGst: gst,
      fyStartYear: activeYear, fyStartMonth,
    }),
    [revenue, costs, gst, activeYear, fyStartMonth],
  );

  return (
    <>
      <Topbar title="Invoices"
        action={docView === "quote"
          ? { label: "New Quote", href: "/invoices/new?type=quote" }
          : { label: "New Invoice", href: "/invoices/new" }} />
      <div className="p-6 flex flex-col gap-6">

        {/* Invoices / Quotes toggle */}
        <div className="flex gap-1 p-1 rounded-xl self-start"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          {([["invoice", "Invoices", invoiceCount], ["quote", "Quotes", quoteCount]] as const).map(([val, label, count]) => {
            const active = docView === val;
            return (
              <button key={val}
                onClick={() => { setDocView(val); setFilter("all"); }}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-opacity"
                style={{
                  background: active ? "linear-gradient(135deg, var(--accent), var(--accent-2))" : "transparent",
                  color: active ? "#fff" : "var(--text-muted)",
                }}>
                {label} <span style={{ opacity: 0.75 }}>· {count}</span>
              </button>
            );
          })}
        </div>

        {/* Financial summary + earnings are invoice-only. */}
        {docView === "invoice" && (<>
        <div className="flex items-center gap-3 flex-wrap" style={{ color: "var(--text)" }}>
          <label htmlFor="financial-month" className="text-sm font-semibold">Earnings and expenses for</label>
          <input id="financial-month" type="month" value={monthKey}
            onChange={(e) => selectMonth(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }} />
          <button className="text-sm underline" onClick={() => selectMonth(todayISO.slice(0, 7))}>This month</button>
        </div>
        {(invoiceError || expenseError) && <p role="alert" className="text-sm text-red-500">
          {invoiceError ? `Could not load invoices: ${invoiceError}. ` : ""}
          {expenseError ? `Could not load expenses: ${expenseError}. ` : ""}
          Monthly totals are unavailable. <button className="underline" onClick={() => window.location.reload()}>Retry</button>
        </p>}
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <SummaryCard label="Outstanding · all dates" value={loading ? "Loading…" : invoiceError ? "Unavailable" : formatMoney(outstanding, "SGD")} color="#38b6e8" icon={Receipt} />
          <SummaryCard label={`Earnings · ${monthLabel}`} value={loading ? "Loading…" : invoiceError ? "Unavailable" : formatMoney(thisMonth.revenue, "SGD")} color="#22c55e" icon={Wallet} />
          <SummaryCard label={`Expenses · ${monthLabel}`} value={expensesLoading ? "Loading…" : expenseError ? "Unavailable" : formatMoney(thisMonth.expenses, "SGD")} color="#f59e0b" icon={CreditCard} />
          <SummaryCard
            label={`Profit · ${monthLabel}`}
            value={loading || expensesLoading ? "Loading…" : !financialsReady ? "Unavailable" : formatSigned(thisMonth.profit)}
            color={thisMonth.profit < 0 ? "#ef4444" : "#16a34a"}
            icon={Scale}
          />
          <Link href="/invoices/templates" className="rounded-xl p-4 flex items-center justify-between hover:opacity-90 transition-opacity"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#a78bfa20" }}>
                <FileText size={18} style={{ color: "#a78bfa" }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Manage templates</p>
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Reusable invoice templates</p>
              </div>
            </div>
            <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
          </Link>
        </div>

        {financialsReady && <MonthTransactions invoices={invoiceRows} expenses={expenses} month={monthKey} label={monthLabel} />}

        {/* Revenue against expenses, with each month's profit above the pair.
            Revenue is cash (payment dates); expenses are dated by their receipt.
            Both bars share ONE scale so the comparison is honest. */}
        {financialsReady ? <div className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-start justify-between mb-3 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Scale size={16} style={{ color: profit.totals.profit < 0 ? "#ef4444" : "#16a34a" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Revenue vs expenses</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button onClick={() => setChartYear(Math.max(minYear, activeYear - 1))}
                  disabled={activeYear <= minYear}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity disabled:opacity-30"
                  style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <ChevronLeft size={14} />
                </button>
                <span className="text-sm font-semibold tabular-nums px-1.5" style={{ color: "var(--text)" }}>{fy.label}</span>
                <button onClick={() => setChartYear(Math.min(maxYear, activeYear + 1))}
                  disabled={activeYear >= maxYear}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity disabled:opacity-30"
                  style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="text-right">
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {formatMoney(profit.totals.revenue, "SGD")} in · {formatMoney(profit.totals.expenses, "SGD")} out
                </p>
                <p className="text-lg font-bold tracking-tight"
                  style={{ color: profit.totals.profit < 0 ? "#ef4444" : "var(--text)" }}>
                  {formatSigned(profit.totals.profit)}
                  <span className="text-[11px] font-medium ml-1.5" style={{ color: "var(--text-muted)" }}>
                    profit
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* What the two bars actually mean. The bases differ, and a profit
              figure nobody can interpret is worse than no profit figure. */}
          <div className="flex items-center gap-4 flex-wrap mb-4 text-[11px]" style={{ color: "var(--text-muted)" }}>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#22c55e" }} />
              Revenue — when payment landed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#f59e0b" }} />
              Expenses — receipt date, GST included
            </span>
            <span>Profit shown above each month.</span>
            {profit.totals.inputGst > 0 && (
              <span>Includes {formatMoney(profit.totals.inputGst, "SGD")} GST paid.</span>
            )}
          </div>

          {profit.totals.revenue === 0 && profit.totals.expenses === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              Nothing recorded for {fy.label}. Mark invoices paid and record expenses to see profit here.
            </div>
          ) : (
            <div className="flex items-end gap-2" style={{ height: 190 }}>
              {profit.months.map((m) => {
                const isCurrent = m.year === currentYear && m.monthIndex === currentMonth;
                const hasData = m.revenue > 0 || m.expenses > 0;
                const revPct = profit.maxBar > 0 ? (m.revenue / profit.maxBar) * 100 : 0;
                const expPct = profit.maxBar > 0 ? (m.expenses / profit.maxBar) * 100 : 0;
                return (
                  <div key={`${m.year}-${m.monthIndex}`} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                    <span className="text-[10px] font-bold leading-none whitespace-nowrap"
                      style={{ color: !hasData ? "transparent" : m.profit < 0 ? "#ef4444" : "var(--text)" }}>
                      {hasData ? formatSignedShort(m.profit) : "\u00b7"}
                    </span>
                    <div className="w-full flex-1 flex items-end justify-center" style={{ gap: 3 }}>
                      <div className="flex-1 rounded-t-md"
                        title={`${m.label} ${m.year} revenue: ${formatMoney(m.revenue, "SGD")}`}
                        style={{
                          height: `${revPct}%`,
                          minHeight: m.revenue > 0 ? 4 : 0,
                          background: m.revenue > 0
                            ? (isCurrent ? "linear-gradient(180deg, #34d399, #16a34a)" : "linear-gradient(180deg, #4ade80, #22c55e)")
                            : "transparent",
                        }} />
                      <div className="flex-1 rounded-t-md"
                        title={`${m.label} ${m.year} expenses: ${formatMoney(m.expenses, "SGD")}`}
                        style={{
                          height: `${expPct}%`,
                          minHeight: m.expenses > 0 ? 4 : 0,
                          background: m.expenses > 0
                            ? (isCurrent ? "linear-gradient(180deg, #fbbf24, #d97706)" : "linear-gradient(180deg, #fcd34d, #f59e0b)")
                            : "transparent",
                        }} />
                    </div>
                    <span className="text-[10px] leading-none"
                      style={{ color: isCurrent ? "#16a34a" : "var(--text-muted)", fontWeight: isCurrent ? 700 : 400 }}>
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Month-by-month breakdown — the exact figures behind the bars, so
              "what did I keep after costs" is read, not estimated from a 10px
              label. Future months with nothing in them are left out. */}
          {(profit.totals.revenue !== 0 || profit.totals.expenses !== 0) && (
            <div className="mt-5 overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full text-sm tabular-nums" style={{ minWidth: 520 }}>
                <thead>
                  <tr style={{ background: "var(--bg-base)", color: "var(--text-muted)" }}>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide px-3 py-2">Month</th>
                    <th className="text-right text-[11px] font-semibold uppercase tracking-wide px-3 py-2">Revenue</th>
                    <th className="text-right text-[11px] font-semibold uppercase tracking-wide px-3 py-2">Expenses</th>
                    <th className="text-right text-[11px] font-semibold uppercase tracking-wide px-3 py-2">Profit</th>
                    <th className="text-right text-[11px] font-semibold uppercase tracking-wide px-3 py-2"
                      title="Profit as a share of revenue">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {profit.months
                    .filter((m) => m.revenue !== 0 || m.expenses !== 0
                      || m.year < currentYear || (m.year === currentYear && m.monthIndex <= currentMonth))
                    .map((m) => {
                      const isCurrent = m.year === currentYear && m.monthIndex === currentMonth;
                      const margin = m.revenue > 0 ? Math.round((m.profit / m.revenue) * 100) : null;
                      return (
                        <tr key={`row-${m.year}-${m.monthIndex}`} style={{ borderTop: "1px solid var(--border)" }}>
                          <td className="px-3 py-2" style={{ color: "var(--text)", fontWeight: isCurrent ? 700 : 400 }}>
                            <button className="underline" onClick={() => selectMonth(`${m.year}-${String(m.monthIndex + 1).padStart(2, "0")}`)}>{m.label} {m.year}</button>
                            {isCurrent && <span className="text-[11px] font-normal ml-1.5" style={{ color: "var(--text-muted)" }}>so far</span>}
                          </td>
                          <td className="px-3 py-2 text-right" style={{ color: m.revenue > 0 ? "var(--text)" : "var(--text-muted)" }}>
                            {formatMoney(m.revenue, "SGD")}
                          </td>
                          <td className="px-3 py-2 text-right" style={{ color: m.expenses > 0 ? "var(--text)" : "var(--text-muted)" }}>
                            {m.expenses > 0 ? `-${formatMoney(m.expenses, "SGD")}` : formatMoney(0, "SGD")}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold"
                            style={{ color: m.profit < 0 ? "#ef4444" : m.profit > 0 ? "#16a34a" : "var(--text-muted)" }}>
                            {formatSigned(m.profit)}
                          </td>
                          <td className="px-3 py-2 text-right"
                            style={{ color: margin === null ? "var(--text-muted)" : margin < 0 ? "#ef4444" : "var(--text-muted)" }}>
                            {margin === null ? "—" : `${margin}%`}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--border)", background: "var(--bg-base)" }}>
                    <td className="px-3 py-2 font-bold" style={{ color: "var(--text)" }}>{fy.label} total</td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: "var(--text)" }}>
                      {formatMoney(profit.totals.revenue, "SGD")}
                    </td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: "var(--text)" }}>
                      {profit.totals.expenses > 0 ? `-${formatMoney(profit.totals.expenses, "SGD")}` : formatMoney(0, "SGD")}
                    </td>
                    <td className="px-3 py-2 text-right font-bold"
                      style={{ color: profit.totals.profit < 0 ? "#ef4444" : "#16a34a" }}>
                      {formatSigned(profit.totals.profit)}
                    </td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: "var(--text-muted)" }}>
                      {profit.totals.revenue > 0
                        ? `${Math.round((profit.totals.profit / profit.totals.revenue) * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div> : (loading || expensesLoading) ? <p role="status" className="text-sm" style={{ color: "var(--text-muted)" }}>Loading financial summary…</p> : null}
        </>)}

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap">
          {activeFilters.map((s) => {
            const active = filter === s;
            const color = s === "all" ? "var(--accent)" : STATUS_COLOR[s];
            return (
              <button key={s} onClick={() => setFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity"
                style={{
                  background: active ? `${color}25` : "var(--bg-surface)",
                  color: active ? color : "var(--text-muted)",
                  border: `1px solid ${active ? color : "var(--border)"}`,
                }}>
                {s === "all" ? "All" : STATUS_LABEL[s]} · {counts[s] ?? 0}
              </button>
            );
          })}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={14} className="animate-spin" /> Loading invoices…
          </div>
        ) : invoiceError ? (
          <p role="alert" className="text-sm text-red-500">Could not load invoices: {invoiceError}. <button className="underline" onClick={() => window.location.reload()}>Retry</button></p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ background: "var(--bg-surface)", border: "1px dashed var(--border)" }}>
            <Receipt size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {filter === "all"
                ? `No ${docView === "quote" ? "quotes" : "invoices"} yet. Create your first one.`
                : `No ${STATUS_LABEL[filter]?.toLowerCase() ?? filter} ${docView === "quote" ? "quotes" : "invoices"}.`}
            </p>
            {filter === "all" && (
              <Link href={docView === "quote" ? "/invoices/new?type=quote" : "/invoices/new"}
                className="inline-block mt-3 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
                Create {docView === "quote" ? "quote" : "invoice"}
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {filtered.map((inv, i) => {
              const projectName = inv.projectId ? projects.find((p) => p.id === inv.projectId)?.name : null;
              const color = STATUS_COLOR[inv.derivedStatus];
              return (
                <Link key={inv.id} href={`/invoices/${inv.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-opacity hover:opacity-90"
                  style={{
                    background: "var(--bg-surface)",
                    borderBottom: i === filtered.length - 1 ? "none" : "1px solid var(--border)",
                  }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
                    <Receipt size={15} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono font-semibold" style={{ color: "var(--text)" }}>{inv.invoiceNumber}</p>
                      <span className="text-xs px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
                        style={{ background: `${color}25`, color }}>
                        {STATUS_LABEL[inv.derivedStatus]}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                      {inv.billToName}{projectName && projectName !== inv.billToName ? ` · ${projectName}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{formatMoney(inv.total, inv.currency)}</p>
                    {inv.derivedStatus === "partial" ? (
                      <p className="text-xs mt-0.5 font-semibold" style={{ color: "#f59e0b" }}>
                        {formatMoney(computeBalanceDue(inv), inv.currency)} due
                      </p>
                    ) : (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {inv.docType === "quote" ? "Valid until" : "Due"} {new Date(inv.dueDate).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function SummaryCard({ label, value, color, icon: Icon = Receipt }: {
  label: string; value: string; color: string;
  icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
        <p className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>{value}</p>
      </div>
    </div>
  );
}
