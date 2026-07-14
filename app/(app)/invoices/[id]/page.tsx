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
  addInvoicePayment, deleteInvoicePayment,
  duplicateInvoice, logInvoiceEvent, loadInvoiceLogs,
  setQuoteStatus, convertQuoteToInvoice,
} from "@/lib/invoice-db";
import type { Invoice, InvoiceLog, DiscountType, QuoteStatus } from "@/lib/invoice-types";
import {
  computeDerivedStatus, computeInvoiceTotals, computeAmountPaid, computeBalanceDue,
} from "@/lib/invoice-types";
import {
  Loader2, Save, Trash2, Copy, CheckCircle2, RotateCcw, Send, Mail, Wallet, Plus,
  ArrowRightLeft, Check, X, ExternalLink,
} from "lucide-react";
import { InvoicePdfActions } from "@/components/invoice-pdf-actions";

const STATUS_COLOR: Record<string, string> = {
  draft: "#9ca3af", sent: "#38b6e8", paid: "#22c55e", overdue: "#ef4444", partial: "#f59e0b", void: "#6b7280",
  accepted: "#22c55e", declined: "#ef4444", expired: "#f59e0b", converted: "#a78bfa",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue", partial: "Partially paid", void: "Void",
  accepted: "Accepted", declined: "Declined", expired: "Expired", converted: "Converted",
};

function todayISO() {
  // Local YYYY-MM-DD for the date input default.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
  const { projects } = useStore();

  const [inv, setInv] = useState<Invoice | null>(null);
  const [logs, setLogs] = useState<InvoiceLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Editable fields (mirror loaded invoice)
  const [projectId, setProjectId] = useState<string | null>(null);
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [billToName, setBillToName] = useState("");
  const [billToAttention, setBillToAttention] = useState("");
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
  const [confirmUnpaid, setConfirmUnpaid] = useState(false);

  // Quote↔invoice link (for the converted banner) + convert dialog
  const [linkedDoc, setLinkedDoc] = useState<{ id: string; number: string; label: string } | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertIssueDate, setConvertIssueDate] = useState(todayISO());
  const [convertDueDate, setConvertDueDate] = useState("");
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  // Record-payment dialog
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayISO());
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [savingPay, setSavingPay] = useState(false);

  useEffect(() => { reload(); }, [id]);

  async function reload() {
    setLoading(true);
    try {
      const [i, l] = await Promise.all([loadInvoice(id), loadInvoiceLogs(id)]);
      if (i) {
        hydrate(i);
        // Resolve the linked document (quote → invoice, or invoice ← quote) for the banner.
        const linkId = i.convertedToInvoiceId ?? i.convertedFromQuoteId;
        if (linkId) {
          const linked = await loadInvoice(linkId);
          setLinkedDoc(linked ? {
            id: linked.id,
            number: linked.invoiceNumber,
            label: i.convertedToInvoiceId ? "Converted to invoice" : "Created from quote",
          } : null);
        } else {
          setLinkedDoc(null);
        }
      }
      setLogs(l);
    } finally { setLoading(false); }
  }

  function hydrate(i: Invoice) {
    setInv(i);
    setProjectId(i.projectId);
    setIssueDate(i.issueDate);
    setDueDate(i.dueDate);
    setBillToName(i.billToName);
    setBillToAttention(i.billToAttention);
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
        projectId, issueDate, dueDate,
        billToName: billToName.trim(),
        billToAttention: billToAttention.trim(),
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
    await logInvoiceEvent(
      inv.id, "sent",
      inv.docType === "quote" ? "Quote sent to client" : "Marked as sent (no email)",
      user?.id ?? null,
    );
    await reload();
  }

  async function handleQuoteStatus(status: QuoteStatus) {
    if (!inv) return;
    await setQuoteStatus(inv.id, status, user?.id ?? null);
    await reload();
  }

  function openConvertDialog() {
    if (!inv) return;
    setConvertIssueDate(todayISO());
    setConvertDueDate(addDaysISO(todayISO(), 14));
    setConvertError(null);
    setShowConvertDialog(true);
  }

  async function handleConfirmConvert() {
    if (!inv) return;
    if (!convertDueDate) { setConvertError("Choose a due date for the invoice."); return; }
    setConverting(true); setConvertError(null);
    try {
      const newId = await convertQuoteToInvoice(inv.id, {
        issueDate: convertIssueDate,
        dueDate: convertDueDate,
        actor: user?.id ?? null,
      });
      router.push(`/invoices/${newId}`);
    } catch (e: unknown) {
      setConvertError(e instanceof Error ? e.message : String(e));
      setConverting(false);
    }
  }

  const amountPaid = useMemo(() => (inv ? computeAmountPaid(inv.payments) : 0), [inv]);
  const balanceDue = useMemo(() => (inv ? computeBalanceDue(inv) : 0), [inv]);

  function openPayDialog() {
    if (!inv) return;
    // Default the amount to the remaining balance so one confirm = full payment.
    setPayAmount(balanceDue > 0 ? String(balanceDue) : "");
    setPayDate(todayISO());
    setPayNote("");
    setPayError(null);
    setShowPayDialog(true);
  }

  async function handleRecordPayment() {
    if (!inv) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) { setPayError("Enter an amount greater than 0."); return; }
    if (amount > balanceDue + 0.004) {
      setPayError(`Amount exceeds the balance due (${formatMoney(balanceDue, inv.currency)}).`);
      return;
    }
    if (!payDate) { setPayError("Choose a payment date."); return; }
    setSavingPay(true); setPayError(null);
    try {
      await addInvoicePayment(inv.id, {
        amount,
        // Store at noon local to avoid the date shifting across timezones.
        paidAt: new Date(`${payDate}T12:00:00`).toISOString(),
        reference: payNote,
        recordedBy: user?.id ?? null,
      });
      setShowPayDialog(false);
      await reload();
    } catch (e: unknown) {
      setPayError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingPay(false);
    }
  }

  async function handleDeletePayment(paymentId: string) {
    if (!inv) return;
    await deleteInvoicePayment(paymentId, inv.id, user?.id ?? null);
    await reload();
  }

  async function handleMarkFullyPaid() {
    if (!inv) return;
    await markInvoicePaid(inv.id, user?.id ?? null, "");
    await reload();
  }

  async function handleMarkUnpaid() {
    if (!inv) return;
    if (!confirmUnpaid) {
      setConfirmUnpaid(true);
      setTimeout(() => setConfirmUnpaid(false), 3000);
      return;
    }
    setConfirmUnpaid(false);
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
  const isQuote = inv.docType === "quote";

  return (
    <AdminOnly>
      <Topbar title={inv.invoiceNumber} back={{ label: "Invoices", href: "/invoices" }} />
      <div className="p-6 flex flex-col gap-6 max-w-5xl">

        {/* Linked document banner (quote ↔ invoice) */}
        {linkedDoc && (
          <button onClick={() => router.push(`/invoices/${linkedDoc.id}`)}
            className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl text-left"
            style={{ background: "#a78bfa15", color: "var(--text)", border: "1px solid #a78bfa40" }}>
            <ArrowRightLeft size={15} style={{ color: "#a78bfa" }} />
            <span>{linkedDoc.label} <span className="font-mono font-semibold">{linkedDoc.number}</span></span>
            <ExternalLink size={13} className="ml-auto" style={{ color: "#a78bfa" }} />
          </button>
        )}

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
          {derivedStatus === "partial" && (
            <span className="text-xs font-semibold" style={{ color: "#f59e0b" }}>
              {formatMoney(amountPaid, inv.currency)} paid · {formatMoney(balanceDue, inv.currency)} balance
            </span>
          )}
          {inv.sentAt && !inv.paidAt && derivedStatus !== "partial" && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Sent {formatDate(inv.sentAt)}{inv.sentToEmail ? ` to ${inv.sentToEmail}` : ""}
            </span>
          )}

          <div className="flex-1" />

          {/* Action buttons */}
          {isQuote ? (
            <>
              {inv.status === "draft" && (
                <button onClick={handleMarkSent}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: "#38b6e820", color: "#38b6e8" }}>
                  <Send size={12} /> Mark as sent
                </button>
              )}
              {(inv.status === "sent" || inv.status === "declined" || inv.status === "expired") && (
                <button onClick={() => handleQuoteStatus("accepted")}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: "#22c55e20", color: "#22c55e" }}>
                  <Check size={12} /> Mark accepted
                </button>
              )}
              {inv.status === "sent" && (
                <button onClick={() => handleQuoteStatus("declined")}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: "var(--bg-base)", color: "#ef4444", border: "1px solid var(--border)" }}>
                  <X size={12} /> Mark declined
                </button>
              )}
              {!inv.convertedToInvoiceId && inv.status !== "declined" && (
                <button onClick={openConvertDialog}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                  style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
                  <ArrowRightLeft size={12} /> Convert to invoice
                </button>
              )}
              {inv.convertedToInvoiceId && (
                <button onClick={() => router.push(`/invoices/${inv.convertedToInvoiceId}`)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: "#a78bfa20", color: "#a78bfa" }}>
                  <ExternalLink size={12} /> Open invoice
                </button>
              )}
            </>
          ) : (
            <>
              {inv.status === "draft" && (
                <button onClick={handleMarkSent}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: "#38b6e820", color: "#38b6e8" }}>
                  <Send size={12} /> Mark as sent
                </button>
              )}
              {inv.status === "sent" && (
                <button onClick={openPayDialog}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: "#22c55e20", color: "#22c55e" }}>
                  <Wallet size={12} /> Record payment
                </button>
              )}
              {inv.status === "paid" && (
                <button onClick={handleMarkUnpaid}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{
                    background: confirmUnpaid ? "#ef444425" : "var(--bg-base)",
                    color: confirmUnpaid ? "#ef4444" : "var(--text-muted)",
                    border: `1px solid ${confirmUnpaid ? "#ef4444" : "var(--border)"}`,
                  }}>
                  <RotateCcw size={12} /> {confirmUnpaid ? "Clear all payments?" : "Mark unpaid"}
                </button>
              )}
            </>
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

        {/* Payments — partial-payment ledger (invoices only; quotes aren't paid) */}
        {!isQuote && (inv.status !== "draft" || inv.payments.length > 0) && (
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <Wallet size={15} style={{ color: "#22c55e" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Payments</span>
              </div>
              {inv.status === "sent" && balanceDue > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={handleMarkFullyPaid}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: "var(--bg-base)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                    <CheckCircle2 size={12} /> Mark fully paid
                  </button>
                  <button onClick={openPayDialog}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: "#22c55e20", color: "#22c55e" }}>
                    <Plus size={12} /> Record payment
                  </button>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 px-4 py-3" style={{ borderBottom: inv.payments.length > 0 ? "1px solid var(--border)" : "none" }}>
              <SummaryStat label="Invoice total" value={formatMoney(inv.total, inv.currency)} color="var(--text)" />
              <SummaryStat label="Amount paid" value={formatMoney(amountPaid, inv.currency)} color="#22c55e" />
              <SummaryStat label="Balance due" value={formatMoney(balanceDue, inv.currency)} color={balanceDue > 0 ? "#f59e0b" : "#22c55e"} />
            </div>

            {/* Payment rows */}
            {inv.payments.length === 0 ? (
              <div className="px-4 py-4 text-sm" style={{ color: "var(--text-muted)" }}>
                No payments recorded yet.
              </div>
            ) : (
              inv.payments.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5"
                  style={{ borderBottom: i === inv.payments.length - 1 ? "none" : "1px solid var(--border)" }}>
                  <CheckCircle2 size={14} style={{ color: "#22c55e" }} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      {formatMoney(p.amount, inv.currency)}
                    </span>
                    <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                      {formatDate(p.paidAt)}{p.reference ? ` · ${p.reference}` : ""}
                    </span>
                  </div>
                  <button onClick={() => handleDeletePayment(p.id)} title="Remove payment"
                    className="p-1.5 rounded hover:opacity-70 transition-opacity" style={{ color: "#ef4444" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Form */}
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Project">
              <select value={projectId ?? ""} onChange={(e) => markDirty(setProjectId)(e.target.value || null)}
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                style={{ color: "var(--text)", border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
                <option value="">— No project linked —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Currency">
              <input value={inv.currency} disabled
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }} />
            </Field>
          </div>

          <Field label="Bill to — Company name">
            <input value={billToName} onChange={(e) => markDirty(setBillToName)(e.target.value)}
              placeholder="e.g. Footprints Student Care Pte Ltd"
              className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
              style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
          </Field>

          <Field label="Client name (below company)">
            <input value={billToAttention} onChange={(e) => markDirty(setBillToAttention)(e.target.value)}
              placeholder="e.g. Karyn Wang — optional"
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
            <Field label={isQuote ? "Valid until" : "Due date"}>
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

      {/* Record payment dialog */}
      {showPayDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "#000000b0" }}
          onClick={() => setShowPayDialog(false)}>
          <div className="rounded-2xl p-6 w-full max-w-md flex flex-col gap-4"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="font-semibold text-base" style={{ color: "var(--text)" }}>Record payment</h3>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {inv.invoiceNumber} · Balance due <span className="font-semibold" style={{ color: "#f59e0b" }}>{formatMoney(balanceDue, inv.currency)}</span>
              </p>
            </div>
            <Field label={`Amount (${inv.currency === "SGD" ? "S$" : inv.currency})`}>
              <div className="flex items-center gap-2">
                <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                  type="number" step="0.01" min="0" autoFocus
                  placeholder="0.00"
                  className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg flex-1"
                  style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
                <button type="button" onClick={() => setPayAmount(String(balanceDue))}
                  className="text-xs font-semibold px-3 py-2 rounded-lg shrink-0"
                  style={{ background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  Full balance
                </button>
              </div>
            </Field>
            <Field label="Payment date">
              <input value={payDate} onChange={(e) => setPayDate(e.target.value)} type="date"
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
            </Field>
            <Field label="Payment reference (optional)">
              <input value={payNote} onChange={(e) => setPayNote(e.target.value)}
                placeholder="e.g. DBS transfer ref #ABC123 · 1st instalment"
                className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
            </Field>
            {payError && <p className="text-xs" style={{ color: "#ef4444" }}>⚠ {payError}</p>}
            <div className="flex gap-2">
              <button onClick={handleRecordPayment} disabled={savingPay}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: "#22c55e", opacity: savingPay ? 0.7 : 1 }}>
                {savingPay ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Record payment
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

      {/* Convert quote → invoice dialog */}
      {showConvertDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "#000000b0" }}
          onClick={() => setShowConvertDialog(false)}>
          <div className="rounded-2xl p-6 w-full max-w-md flex flex-col gap-4"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="font-semibold text-base" style={{ color: "var(--text)" }}>Convert to invoice</h3>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Creates a new draft invoice from <span className="font-mono">{inv.invoiceNumber}</span>. The quote is kept and marked accepted.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Invoice issue date">
                <input value={convertIssueDate} onChange={(e) => setConvertIssueDate(e.target.value)} type="date"
                  className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                  style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
              </Field>
              <Field label="Invoice due date">
                <input value={convertDueDate} onChange={(e) => setConvertDueDate(e.target.value)} type="date"
                  className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
                  style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
              </Field>
            </div>
            {convertError && <p className="text-xs" style={{ color: "#ef4444" }}>⚠ {convertError}</p>}
            <div className="flex gap-2">
              <button onClick={handleConfirmConvert} disabled={converting}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", opacity: converting ? 0.7 : 1 }}>
                {converting ? <Loader2 size={13} className="animate-spin" /> : <ArrowRightLeft size={13} />}
                Create invoice
              </button>
              <button onClick={() => setShowConvertDialog(false)}
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

function SummaryStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-base font-bold tracking-tight" style={{ color }}>{value}</p>
    </div>
  );
}
