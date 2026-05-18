"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import { LineItemsEditor, type LineItemDraft } from "@/components/invoice-line-items-editor";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import {
  loadInvoices, loadInvoiceTemplates, loadInvoice, loadInvoiceTemplate, loadClientBilling,
  createInvoice,
} from "@/lib/invoice-db";
import type { Invoice, InvoiceTemplate } from "@/lib/invoice-types";
import { FileText, Receipt, Loader2, ArrowRight, Check } from "lucide-react";

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function NewInvoicePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user } = useAuth();
  const { clients } = useStore();

  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [pastInvoices, setPastInvoices] = useState<Invoice[]>([]);
  const [loadingPickers, setLoadingPickers] = useState(true);

  const [clientId, setClientId] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);

  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(addDays(todayISO(), 14));
  const [billToName, setBillToName] = useState("");
  const [billToEmail, setBillToEmail] = useState("");
  const [billToAddress, setBillToAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    Promise.all([loadInvoiceTemplates(), loadInvoices()])
      .then(([tpls, invs]) => { setTemplates(tpls); setPastInvoices(invs); setLoadingPickers(false); })
      .catch(() => setLoadingPickers(false));
  }, []);

  // Optional ?duplicate=invoiceId support
  useEffect(() => {
    const dup = sp.get("duplicate");
    if (!dup) return;
    loadInvoice(dup).then((inv) => {
      if (!inv) return;
      applyInvoiceAsSource(inv);
    });
  }, [sp]);

  // Auto-prefill bill-to when client is picked
  useEffect(() => {
    if (!clientId) return;
    loadClientBilling(clientId).then((c) => {
      if (!c) return;
      // Only fill blanks — don't overwrite manual edits
      setBillToName((prev) => prev || c.name);
      setBillToEmail((prev) => prev || c.email);
      setBillToAddress((prev) => prev || c.address);
    });
  }, [clientId]);

  async function applyTemplateAsSource(tpl: InvoiceTemplate) {
    const full = await loadInvoiceTemplate(tpl.id);
    if (!full) return;
    setTemplateId(full.id);
    setSourceLabel(`Template: ${full.name}`);
    setIssueDate(todayISO());
    setDueDate(addDays(todayISO(), full.defaultDueDays || 14));
    setNotes(full.defaultNotes);
    setPaymentInstructions(full.defaultPaymentInstructions);
    setLineItems(full.lineItems.map((li) => ({ description: li.description, qty: li.qty, unitPrice: li.unitPrice })));
    setShowForm(true);
  }

  function applyInvoiceAsSource(inv: Invoice) {
    setTemplateId(inv.templateId);
    setClientId(inv.clientId);
    setSourceLabel(`Duplicated from ${inv.invoiceNumber}`);
    setBillToName(inv.billToName);
    setBillToEmail(inv.billToEmail);
    setBillToAddress(inv.billToAddress);
    setNotes(inv.notes);
    setPaymentInstructions(inv.paymentInstructions);
    setIssueDate(todayISO());
    const dueDays = Math.max(1, Math.round((new Date(inv.dueDate).getTime() - new Date(inv.issueDate).getTime()) / 86400000));
    setDueDate(addDays(todayISO(), dueDays));
    setLineItems(inv.lineItems.map((li) => ({ description: li.description, qty: li.qty, unitPrice: li.unitPrice })));
    setShowForm(true);
  }

  function startBlank() {
    setSourceLabel("Blank invoice");
    setTemplateId(null);
    setShowForm(true);
  }

  async function handleSave() {
    if (!billToName.trim()) { setError("Bill-to name is required"); return; }
    if (!dueDate) { setError("Due date is required"); return; }
    setSaving(true); setError(null);
    try {
      const id = await createInvoice({
        clientId,
        templateId,
        issueDate,
        dueDate,
        billToName: billToName.trim(),
        billToEmail: billToEmail.trim(),
        billToAddress,
        notes,
        paymentInstructions,
        currency: "SGD",
        lineItems,
        createdBy: user?.id ?? null,
      });
      router.push(`/invoices/${id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  const recentInvoices = useMemo(() => pastInvoices.slice(0, 8), [pastInvoices]);

  return (
    <AdminOnly>
      <Topbar title="New Invoice" back={{ label: "Invoices", href: "/invoices" }} />
      <div className="p-6 flex flex-col gap-6 max-w-5xl">

        {!showForm && (
          <>
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Start from a template, duplicate a past invoice, or create a blank one.
              </p>
            </div>

            {loadingPickers ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-5">
                {/* Templates */}
                <Section title="Templates" icon={<FileText size={14} style={{ color: "#a78bfa" }} />}>
                  {templates.length === 0 ? (
                    <EmptyHint text="No templates yet." href="/invoices/templates/new" cta="Create one" />
                  ) : (
                    templates.map((tpl) => (
                      <SourceRow key={tpl.id} onClick={() => applyTemplateAsSource(tpl)}
                        title={tpl.name}
                        meta={`${tpl.lineItems.length} line${tpl.lineItems.length !== 1 ? "s" : ""} · due in ${tpl.defaultDueDays} days`}
                        color="#a78bfa" />
                    ))
                  )}
                </Section>

                {/* Past invoices */}
                <Section title="Recent Invoices" icon={<Receipt size={14} style={{ color: "#fbbf24" }} />}>
                  {recentInvoices.length === 0 ? (
                    <EmptyHint text="No past invoices yet." />
                  ) : (
                    recentInvoices.map((inv) => (
                      <SourceRow key={inv.id} onClick={() => applyInvoiceAsSource(inv)}
                        title={inv.invoiceNumber}
                        meta={`${inv.billToName} · S$${inv.total.toFixed(2)}`}
                        color="#fbbf24" />
                    ))
                  )}
                </Section>
              </div>
            )}

            <button onClick={startBlank}
              className="self-start px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "var(--bg-surface)", color: "var(--text)", border: "1px solid var(--border)" }}>
              Or start blank →
            </button>
          </>
        )}

        {showForm && (
          <div className="flex flex-col gap-5">
            {sourceLabel && (
              <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                style={{ background: "var(--accent)15", color: "var(--accent)", border: "1px solid var(--accent)30" }}>
                <Check size={12} /> {sourceLabel}
                <button onClick={() => setShowForm(false)} className="ml-auto underline">change source</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Client (optional)">
                <select value={clientId ?? ""} onChange={(e) => setClientId(e.target.value || null)}
                  className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                  style={{ color: "var(--text)", border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
                  <option value="">— No client linked —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Currency">
                <input value="SGD" disabled
                  className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                  style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }} />
              </Field>
            </div>

            <Field label="Bill to (name) *">
              <input value={billToName} onChange={(e) => setBillToName(e.target.value)}
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Bill to (email)">
                <input value={billToEmail} onChange={(e) => setBillToEmail(e.target.value)} type="email"
                  className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                  style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
              </Field>
              <Field label="Bill to (address)">
                <input value={billToAddress} onChange={(e) => setBillToAddress(e.target.value)}
                  placeholder="Optional"
                  className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                  style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Issue date">
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                  className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                  style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
              </Field>
              <Field label="Due date *">
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                  style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
              </Field>
            </div>

            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Line Items</p>
              <LineItemsEditor items={lineItems} onChange={setLineItems} />
            </div>

            <Field label="Notes (shown on invoice)">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full resize-y"
                style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
            </Field>

            <Field label="Payment instructions">
              <textarea value={paymentInstructions} onChange={(e) => setPaymentInstructions(e.target.value)} rows={4}
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full resize-y font-mono"
                style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
            </Field>

            {error && <p className="text-xs" style={{ color: "#ef4444" }}>⚠ {error}</p>}

            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", opacity: saving ? 0.7 : 1 }}>
                {saving && <Loader2 size={13} className="animate-spin" />}
                Create invoice as draft <ArrowRight size={13} />
              </button>
              <button onClick={() => router.back()} type="button"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminOnly>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{title}</span>
      </div>
      <div className="max-h-80 overflow-y-auto">{children}</div>
    </div>
  );
}

function SourceRow({ title, meta, color, onClick }: { title: string; meta: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:opacity-90 transition-opacity"
      style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</p>
        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{meta}</p>
      </div>
      <ArrowRight size={13} style={{ color: "var(--text-muted)" }} />
    </button>
  );
}

function EmptyHint({ text, href, cta }: { text: string; href?: string; cta?: string }) {
  return (
    <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
      {text}
      {href && cta && (
        <a href={href} className="ml-2 underline" style={{ color: "var(--accent)" }}>{cta}</a>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--text-muted)" }}>{label}</label>
      {children}
    </div>
  );
}
