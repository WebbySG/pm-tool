"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import { LineItemsEditor, type LineItemDraft } from "@/components/invoice-line-items-editor";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  loadInvoice, updateInvoice, deleteInvoice, markInvoicePaid, markInvoiceUnpaid,
  duplicateInvoice, logInvoiceEvent, loadInvoiceLogs,
} from "@/lib/invoice-db";
import type { Invoice, InvoiceLog, DiscountType } from "@/lib/invoice-types";
import { computeDerivedStatus, computeInvoiceTotals } from "@/lib/invoice-types";
import {
  Loader2, Save, Trash2, Copy, CheckCircle2, RotateCcw, Send, Mail,
} from "lucide-react";
import { InvoicePdfActions } from "@/components/invoice-pdf-actions";

const STATUS_COLOR: Record<string, string> = {
  draft: "#9ca3af", sent: "#38b6e8", paid: "#22c55e", overdue: "#ef4444", void: "#6b7280",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue", void: "Void",
};

function formatMoney(amount: number, currency: string) {
  return `${currency === "SGD" ? "S$" : currency + " "}${amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();
  const { clients } = useStore();

  const [inv, setInv] = useState<Invoice | null>(null);
  const [logs, setLogs] = useState<InvoiceLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Editable fields (mirror loaded invoice)
  const [clientId, setClientId] = useState<string | null>(null);
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [billToName, setBillToName] = useState("");
  const [billToEmail, setBillToEmail] = useState("");
  const [billToAddress, setBillToAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [discountValue, setDiscountValue] = useState(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payNote, setPayNote] = useState("");

  useEffect(() => { reload(); }, [id]);

  async function reload() {
    setLoading(true);
    try {
      const [i, l] = await Promise.all([loadInvoice(id), loadInvoiceLogs(id)]);
      if (i) hydrate(i);
      setLogs(l);
    } finally { setLoading(false); }
  }

  function hydrate(i: Invoice) {
    setInv(i);
    setClientId(i.clientId);
    setIssueDate(i.issueDate);
    setDueDate(i.dueDate);
    setBillToName(i.billToName);
    setBillToEmail(i.billToEmail);
    setBillToAddress(i.billToAddress);
    setNotes(i.notes);
    setPaymentInstructions(i.paymentInstructions);
    setLineItems(i.lineItems.map((li) => ({ description: li.description, qty: li.qty, unitPrice: li.unitPrice })));
    setDiscountType(i.discountType);
    setDiscountValue(i.discountValue);
    setDirty(false);
    setError(null);
  }

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true); };
  }

  async function handleSave() {
    if (!inv) return;
    setSaving(true); setError(null);
    try {
      await updateInvoice(inv.id, {
        clientId, issueDate, dueDate,
        billToName: billToName.trim(),
        billToEmail: billToEmail.trim(),
        billToAddress,
        notes, paymentInstructions,
        discountType, discountValue,
        lineItems,
      }, user?.id ?? null);
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!inv) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    await deleteInvoice(inv.id);
    router.push("/invoices");
  }

  async function handleDuplicate() {
    if (!inv) return;
    router.push(`/invoices/new?duplicate=${inv.id}`);
  }

  async function handleMarkSent() {
    if (!inv) return;
    // Phase 1: just flips status. Phase 3 will actually email.
    const { error: e } = await supabase.from("pm_invoices").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_to_email: billToEmail || null,
      updated_at: new Date().toISOString(),
    }).eq("id", inv.id);
    if (e) { setError(e.message); return; }
    await logInvoiceEvent(inv.id, "sent", "Marked as sent (no email)", user?.id ?? null);
    await reload();
  }

  async function handleConfirmPaid() {
    if (!inv) return;
    await markInvoicePaid(inv.id, user?.id ?? null, payNote);
    setShowPayDialog(false);
    setPayNote("");
    await reload();
  }

  async function handleMarkUnpaid() {
    if (!inv) return;
    await markInvoiceUnpaid(inv.id, user?.id ?? null);
    await reload();
  }

  const derivedStatus = useMemo(() =>
    inv ? computeDerivedStatus(inv) : "draft",
    [inv],
  );

  const totals = useMemo(
    () => computeInvoiceTotals({ lineItems, discountType, discountValue }),
    [lineItems, discountType, discountValue],
  );

  if (loading) {
    return (
      <AdminOnly>
        <Topbar title="Invoice" back={{ label: "Invoices", href: "/invoices" }} />
        <div className="p-6 flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      </AdminOnly>
    );
  }
  if (!inv) {
    return (
      <AdminOnly>
        <Topbar title="Invoice" back={{ label: "Invoices", href: "/invoices" }} />
        <div className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>Invoice not found.</div>
      </AdminOnly>
    );
  }

  const color = STATUS_COLOR[derivedStatus];

  return (
    <AdminOnly>
      <Topbar title={inv.invoiceNumber} back={{ label: "Invoices", href: "/invoices" }} />
      <div className="p-6 flex flex-col gap-6 max-w-5xl">

        {/* Header with status + actions */}
        <div className="rounded-xl p-4 flex flex-wrap items-center gap-3"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <span className="text-xs px-2 py-1 rounded font-semibold uppercase tracking-wide"
            style={{ background: `${color}25`, color }}>
            {STATUS_LABEL[derivedStatus]}
          </span>
          {inv.paidAt && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Paid on {formatDate(inv.paidAt)}{inv.paidNote && ` · ${inv.paidNote}`}
            </span>
          )}
          {inv.sentAt && !inv.paidAt && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Sent {formatDate(inv.sentAt)}{inv.sentToEmail ? ` to ${inv.sentToEmail}` : ""}
            </span>
          )}

          <div className="flex-1" />

          {/* Action buttons */}
          {inv.status === "draft" && (
            <button onClick={handleMarkSent}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "#38b6e820", color: "#38b6e8" }}>
              <Send size={12} /> Mark as sent
            </button>
          )}
          {(inv.status === "sent") && (
            <button onClick={() => setShowPayDialog(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "#22c55e20", color: "#22c55e" }}>
              <CheckCircle2 size={12} /> Mark as paid
            </button>
          )}
          {inv.status === "paid" && (
            <button onClick={handleMarkUnpaid}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "var(--bg-base)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              <RotateCcw size={12} /> Mark unpaid
            </button>
          )}
          <button onClick={handleDuplicate}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: "var(--bg-base)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            <Copy size={12} /> Duplicate
          </button>
          <button onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{
              background: confirmDelete ? "#ef444425" : "var(--bg-base)",
              color: "#ef4444",
              border: `1px solid ${confirmDelete ? "#ef4444" : "var(--border)"}`,
            }}>
            <Trash2 size={12} /> {confirmDelete ? "Click again to confirm" : "Delete"}
          </button>
        </div>

        {/* PDF actions + Phase 3 placeholder */}
        <div className="rounded-xl p-3 flex items-center gap-3 flex-wrap"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <InvoicePdfActions invoice={inv} />
          <div className="w-px h-5" style={{ background: "var(--border)" }} />
          <div className="flex items-center gap-1.5 text-xs opacity-60" style={{ color: "var(--text-muted)" }}>
            <Mail size={12} /> Email to client — coming in Phase 3
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Client">
              <select value={clientId ?? ""} onChange={(e) => markDirty(setClientId)(e.target.value || null)}
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                style={{ color: "var(--text)", border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
                <option value="">— No client linked —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Currency">
              <input value={inv.currency} disabled
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }} />
            </Field>
          </div>

          <Field label="Bill to (name)">
            <input value={billToName} onChange={(e) => markDirty(setBillToName)(e.target.value)}
              className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
              style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Bill to (email)">
              <input value={billToEmail} onChange={(e) => markDirty(setBillToEmail)(e.target.value)} type="email"
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
            </Field>
            <Field label="Bill to (address)">
              <input value={billToAddress} onChange={(e) => markDirty(setBillToAddress)(e.target.value)}
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Issue date">
              <input type="date" value={issueDate} onChange={(e) => markDirty(setIssueDate)(e.target.value)}
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
            </Field>
            <Field label="Due date">
              <input type="date" value={dueDate} onChange={(e) => markDirty(setDueDate)(e.target.value)}
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
            </Field>
          </div>

          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Line Items</p>
            <LineItemsEditor items={lineItems} onChange={markDirty(setLineItems)} currency={inv.currency}
              discountType={discountType} discountValue={discountValue}
              onDiscountChange={(t, v) => { markDirty(setDiscountType)(t); setDiscountValue(v); setDirty(true); }} />
          </div>

          <Field label="Notes">
            <textarea value={notes} onChange={(e) => markDirty(setNotes)(e.target.value)} rows={2}
              className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full resize-y"
              style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
          </Field>

          <Field label="Payment instructions">
            <textarea value={paymentInstructions} onChange={(e) => markDirty(setPaymentInstructions)(e.target.value)} rows={4}
              className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full resize-y font-mono"
              style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
          </Field>

          {error && <p className="text-xs" style={{ color: "#ef4444" }}>⚠ {error}</p>}

          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={!dirty || saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{
                background: dirty ? "linear-gradient(135deg, var(--accent), var(--accent-2))" : "var(--bg-surface)",
                color: dirty ? "#fff" : "var(--text-muted)",
                border: dirty ? "none" : "1px solid var(--border)",
                opacity: saving ? 0.7 : 1,
              }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {dirty ? "Save changes" : "Saved"}
            </button>
            <div className="text-sm ml-auto" style={{ color: "var(--text-muted)" }}>
              {discountType !== "none" && totals.discountAmount > 0 && (
                <span className="mr-3">After discount</span>
              )}
              Total <span className="font-bold ml-2" style={{ color: "var(--text)" }}>{formatMoney(totals.total, inv.currency)}</span>
            </div>
          </div>
        </div>

        {/* Activity log */}
        <div>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Activity</p>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {logs.length === 0 ? (
              <div className="px-4 py-4 text-sm" style={{ color: "var(--text-muted)", background: "var(--bg-surface)" }}>
                No activity yet.
              </div>
            ) : logs.map((log, i) => (
              <div key={log.id} className="px-4 py-2.5 flex items-center gap-3"
                style={{
                  background: "var(--bg-surface)",
                  borderBottom: i === logs.length - 1 ? "none" : "1px solid var(--border)",
                }}>
                <span className="text-xs font-mono uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: "var(--bg-base)", color: "var(--text-muted)" }}>{log.event}</span>
                <span className="text-sm flex-1" style={{ color: "var(--text)" }}>{log.detail}</span>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {new Date(log.createdAt).toLocaleString("en-SG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mark paid dialog */}
      {showPayDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "#000000b0" }}
          onClick={() => setShowPayDialog(false)}>
          <div className="rounded-2xl p-6 w-full max-w-md flex flex-col gap-4"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="font-semibold text-base" style={{ color: "var(--text)" }}>Mark invoice as paid</h3>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {inv.invoiceNumber} · {formatMoney(inv.total, inv.currency)}
              </p>
            </div>
            <Field label="Payment reference (optional)">
              <input value={payNote} onChange={(e) => setPayNote(e.target.value)}
                placeholder="e.g. DBS transfer ref #ABC123"
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
            </Field>
            <div className="flex gap-2">
              <button onClick={handleConfirmPaid}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: "#22c55e" }}>
                Confirm paid
              </button>
              <button onClick={() => setShowPayDialog(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminOnly>
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
