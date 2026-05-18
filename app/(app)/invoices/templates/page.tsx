"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import { FileText, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { loadInvoiceTemplates, deleteInvoiceTemplate } from "@/lib/invoice-db";
import type { InvoiceTemplate } from "@/lib/invoice-types";

function formatMoney(amount: number) {
  return `S$${amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InvoiceTemplatesPage() {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => { reload(); }, []);

  async function reload() {
    setLoading(true);
    try { setTemplates(await loadInvoiceTemplates()); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete((c) => (c === id ? null : c)), 3000);
      return;
    }
    await deleteInvoiceTemplate(id);
    setConfirmDelete(null);
    await reload();
  }

  return (
    <AdminOnly>
      <Topbar title="Invoice Templates" back={{ label: "Invoices", href: "/invoices" }}
        action={{ label: "New Template", href: "/invoices/templates/new" }} />
      <div className="p-6 flex flex-col gap-6">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Templates are reusable starting points for new invoices — line items, due days, and payment instructions
          all pre-fill when you create an invoice from a template.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={14} className="animate-spin" /> Loading templates…
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={{ background: "var(--bg-surface)", border: "1px dashed var(--border)" }}>
            <FileText size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>No templates yet.</p>
            <Link href="/invoices/templates/new" className="inline-block px-4 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
              Create first template
            </Link>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {templates.map((tpl, i) => {
              const subtotal = tpl.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0);
              return (
                <div key={tpl.id} className="flex items-center gap-4 px-5 py-4"
                  style={{
                    background: "var(--bg-surface)",
                    borderBottom: i === templates.length - 1 ? "none" : "1px solid var(--border)",
                  }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "#a78bfa20" }}>
                    <FileText size={15} style={{ color: "#a78bfa" }} />
                  </div>
                  <Link href={`/invoices/templates/${tpl.id}`} className="flex-1 min-w-0 hover:opacity-90 transition-opacity">
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{tpl.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {tpl.lineItems.length} line{tpl.lineItems.length !== 1 ? "s" : ""} · default total {formatMoney(subtotal)} · due in {tpl.defaultDueDays} days
                    </p>
                    {tpl.description && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{tpl.description}</p>
                    )}
                  </Link>
                  <button onClick={() => handleDelete(tpl.id)} title={confirmDelete === tpl.id ? "Click again to confirm" : "Delete template"}
                    className="p-1.5 rounded hover:opacity-70 transition-opacity"
                    style={{ color: confirmDelete === tpl.id ? "#ef4444" : "var(--text-muted)" }}>
                    <Trash2 size={14} />
                  </button>
                  <Link href={`/invoices/templates/${tpl.id}`} className="p-1" style={{ color: "var(--text-muted)" }}>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminOnly>
  );
}
