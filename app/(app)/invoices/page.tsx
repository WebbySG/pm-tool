"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import { useStore } from "@/lib/store";
import { loadInvoices } from "@/lib/invoice-db";
import type { Invoice } from "@/lib/invoice-types";
import { computeDerivedStatus } from "@/lib/invoice-types";
import { Receipt, FileText, ChevronRight, Loader2 } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue", void: "Void",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "#9ca3af", sent: "#38b6e8", paid: "#22c55e", overdue: "#ef4444", void: "#6b7280",
};

function formatMoney(amount: number, currency: string) {
  return `${currency === "SGD" ? "S$" : currency + " "}${amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InvoicesPage() {
  const { clients } = useStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "draft" | "sent" | "paid" | "overdue">("all");

  useEffect(() => {
    loadInvoices().then((rows) => { setInvoices(rows); setLoading(false); })
      .catch((e) => { console.error("loadInvoices", e); setLoading(false); });
  }, []);

  const enriched = useMemo(() =>
    invoices.map((inv) => ({ ...inv, derivedStatus: computeDerivedStatus(inv) })),
    [invoices],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return enriched;
    return enriched.filter((inv) => inv.derivedStatus === filter);
  }, [enriched, filter]);

  const counts = useMemo(() => {
    const c = { all: enriched.length, draft: 0, sent: 0, paid: 0, overdue: 0 };
    for (const inv of enriched) {
      if (inv.derivedStatus === "draft") c.draft++;
      else if (inv.derivedStatus === "sent") c.sent++;
      else if (inv.derivedStatus === "paid") c.paid++;
      else if (inv.derivedStatus === "overdue") c.overdue++;
    }
    return c;
  }, [enriched]);

  const totals = useMemo(() => {
    const outstanding = enriched.filter((i) => i.derivedStatus === "sent" || i.derivedStatus === "overdue")
      .reduce((s, i) => s + i.total, 0);
    const paidThisYear = enriched.filter((i) => i.status === "paid" && i.paidAt && new Date(i.paidAt).getFullYear() === new Date().getFullYear())
      .reduce((s, i) => s + i.total, 0);
    return { outstanding, paidThisYear };
  }, [enriched]);

  return (
    <AdminOnly>
      <Topbar title="Invoices" action={{ label: "New Invoice", href: "/invoices/new" }} />
      <div className="p-6 flex flex-col gap-6">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard label="Outstanding" value={formatMoney(totals.outstanding, "SGD")} color="#38b6e8" />
          <SummaryCard label={`Paid in ${new Date().getFullYear()}`} value={formatMoney(totals.paidThisYear, "SGD")} color="#22c55e" />
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

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "draft", "sent", "overdue", "paid"] as const).map((s) => {
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
                {s === "all" ? "All" : STATUS_LABEL[s]} · {counts[s]}
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
              {filter === "all" ? "No invoices yet. Create your first one." : `No ${filter} invoices.`}
            </p>
            {filter === "all" && (
              <Link href="/invoices/new" className="inline-block mt-3 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
                Create invoice
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {filtered.map((inv, i) => {
              const clientName = inv.clientId ? clients.find((c) => c.id === inv.clientId)?.name : null;
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
                      {inv.billToName}{clientName && clientName !== inv.billToName ? ` · ${clientName}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{formatMoney(inv.total, inv.currency)}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Due {new Date(inv.dueDate).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
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

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
        <Receipt size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
        <p className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>{value}</p>
      </div>
    </div>
  );
}
