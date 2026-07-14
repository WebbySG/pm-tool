"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import { useStore } from "@/lib/store";
import { loadInvoices } from "@/lib/invoice-db";
import type { Invoice } from "@/lib/invoice-types";
import { computeDerivedStatus, computeBalanceDue } from "@/lib/invoice-types";
import { Receipt, FileText, ChevronRight, ChevronLeft, Loader2, TrendingUp, Wallet } from "lucide-react";

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

// Earnings are recognised on the day each payment was received (cash basis).
// Partial payments each count on their own date, so an invoice can contribute
// several earnings across different months. Legacy paid invoices with no payment
// rows fall back to a single earning at paidAt (or issue date).
function invoiceEarnings(inv: Invoice): { date: Date; amount: number }[] {
  if (inv.payments && inv.payments.length > 0) {
    return inv.payments
      .map((p) => ({ date: new Date(p.paidAt), amount: p.amount }))
      .filter((e) => !isNaN(e.date.getTime()));
  }
  if (inv.status === "paid") {
    const iso = inv.paidAt ?? inv.issueDate;
    const d = iso ? new Date(iso) : null;
    if (d && !isNaN(d.getTime())) return [{ date: d, amount: inv.total }];
  }
  return [];
}

export default function InvoicesPage() {
  const { projects } = useStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [docView, setDocView] = useState<"invoice" | "quote">("invoice");
  const [filter, setFilter] = useState<string>("all");
  const [earningsYear, setEarningsYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    loadInvoices().then((rows) => { setInvoices(rows); setLoading(false); })
      .catch((e) => { console.error("loadInvoices", e); setLoading(false); });
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

  // Flat list of recognised earnings (one per payment) — the basis for all
  // monthly/yearly aggregation below.
  const earnings = useMemo(() =>
    invoiceRows.flatMap((inv) => invoiceEarnings(inv)),
    [invoiceRows],
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const totals = useMemo(() => {
    // Outstanding = remaining balance across sent/overdue/partially-paid invoices (quotes excluded).
    const outstanding = enriched
      .filter((i) => i.docType === "invoice"
        && (i.derivedStatus === "sent" || i.derivedStatus === "overdue" || i.derivedStatus === "partial"))
      .reduce((s, i) => s + computeBalanceDue(i), 0);
    const paidThisMonth = earnings
      .filter((e) => e.date.getFullYear() === currentYear && e.date.getMonth() === currentMonth)
      .reduce((s, e) => s + e.amount, 0);
    const paidThisYear = earnings
      .filter((e) => e.date.getFullYear() === currentYear)
      .reduce((s, e) => s + e.amount, 0);
    return { outstanding, paidThisMonth, paidThisYear };
  }, [enriched, earnings, currentYear, currentMonth]);

  // Years that have any earnings (plus the current year) — for the chart navigator.
  const earningsYears = useMemo(() => {
    const set = new Set<number>([currentYear]);
    earnings.forEach((e) => set.add(e.date.getFullYear()));
    return Array.from(set).sort((a, b) => a - b);
  }, [earnings, currentYear]);
  const minYear = earningsYears[0];

  // Per-month totals for the selected year.
  const monthly = useMemo(() => {
    const buckets = Array<number>(12).fill(0);
    let count = 0;
    for (const e of earnings) {
      if (e.date.getFullYear() === earningsYear) {
        buckets[e.date.getMonth()] += e.amount;
        count++;
      }
    }
    const total = buckets.reduce((s, v) => s + v, 0);
    const max = Math.max(0, ...buckets);
    return { buckets, total, count, max };
  }, [earnings, earningsYear]);

  return (
    <AdminOnly>
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
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Outstanding" value={formatMoney(totals.outstanding, "SGD")} color="#38b6e8" icon={Receipt} />
          <SummaryCard label={`Paid in ${MONTHS[currentMonth]} ${currentYear}`} value={formatMoney(totals.paidThisMonth, "SGD")} color="#22c55e" icon={Wallet} />
          <SummaryCard label={`Paid in ${currentYear}`} value={formatMoney(totals.paidThisYear, "SGD")} color="#16a34a" icon={TrendingUp} />
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

        {/* Monthly earnings chart (paid invoices, by payment date) */}
        <div className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} style={{ color: "#22c55e" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Monthly earnings</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button onClick={() => setEarningsYear((y) => Math.max(minYear, y - 1))}
                  disabled={earningsYear <= minYear}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity disabled:opacity-30"
                  style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <ChevronLeft size={14} />
                </button>
                <span className="text-sm font-semibold tabular-nums px-1.5" style={{ color: "var(--text)" }}>{earningsYear}</span>
                <button onClick={() => setEarningsYear((y) => Math.min(currentYear, y + 1))}
                  disabled={earningsYear >= currentYear}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity disabled:opacity-30"
                  style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="text-right">
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {earningsYear} total · {monthly.count} paid
                </p>
                <p className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>
                  {formatMoney(monthly.total, "SGD")}
                </p>
              </div>
            </div>
          </div>

          {monthly.total === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No earnings recorded for {earningsYear}. Mark invoices as paid to track them here.
            </div>
          ) : (
            <div className="flex items-end gap-2" style={{ height: 168 }}>
              {monthly.buckets.map((value, i) => {
                const heightPct = monthly.max > 0 ? (value / monthly.max) * 100 : 0;
                const isCurrent = earningsYear === currentYear && i === currentMonth;
                return (
                  <div key={MONTHS[i]} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                    <span className="text-[10px] font-semibold leading-none" style={{ color: value > 0 ? "var(--text)" : "transparent" }}>
                      {value > 0 ? formatMoneyShort(value) : "·"}
                    </span>
                    <div className="w-full rounded-t-md relative" title={`${MONTHS[i]} ${earningsYear}: ${formatMoney(value, "SGD")}`}
                      style={{
                        height: `${heightPct}%`,
                        minHeight: value > 0 ? 4 : 0,
                        background: value > 0
                          ? (isCurrent ? "linear-gradient(180deg, #34d399, #16a34a)" : "linear-gradient(180deg, #4ade80, #22c55e)")
                          : "transparent",
                      }} />
                    <span className="text-[10px] leading-none" style={{ color: isCurrent ? "#16a34a" : "var(--text-muted)", fontWeight: isCurrent ? 700 : 400 }}>
                      {MONTHS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
    </AdminOnly>
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
