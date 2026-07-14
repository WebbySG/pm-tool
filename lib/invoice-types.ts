export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

/** Quotes reuse the pm_invoices table (doc_type='quote') but have their own lifecycle. */
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

/** The stored `status` column value — union of both document lifecycles. */
export type DocStatus = InvoiceStatus | QuoteStatus;

/** A pm_invoices row is either a real invoice or a quotation. */
export type DocType = "invoice" | "quote";

export type DiscountType = "none" | "percent" | "fixed";

export type InvoiceLineItem = {
  id: string;
  invoiceId: string;
  description: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
};

/** A single recorded payment against an invoice (supports partial payments). */
export type InvoicePayment = {
  id: string;
  invoiceId: string;
  amount: number;
  paidAt: string;
  reference: string;
  recordedBy: string | null;
  createdAt: string;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  clientId: string | null;
  projectId: string | null;
  templateId: string | null;
  docType: DocType;
  /** For a quote: the invoice it was converted into (null until converted). */
  convertedToInvoiceId: string | null;
  /** For an invoice created from a quote: the source quote's id. */
  convertedFromQuoteId: string | null;
  status: DocStatus;
  currency: string;
  issueDate: string;
  dueDate: string;
  billToName: string;
  billToAttention: string;
  billToEmail: string;
  billToAddress: string;
  notes: string;
  paymentInstructions: string;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  total: number;
  reminderCadenceDays: number[];
  lastReminderSentAt: string | null;
  sentAt: string | null;
  sentToEmail: string | null;
  pdfPath: string | null;
  paidAt: string | null;
  paidBy: string | null;
  paidNote: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems: InvoiceLineItem[];
  payments: InvoicePayment[];
};

export type InvoiceTemplateLineItem = {
  id: string;
  templateId: string;
  description: string;
  qty: number;
  unitPrice: number;
  sortOrder: number;
};

export type InvoiceTemplate = {
  id: string;
  name: string;
  description: string;
  defaultNotes: string;
  defaultPaymentInstructions: string;
  defaultDueDays: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems: InvoiceTemplateLineItem[];
};

export type InvoiceLogEvent =
  | "created" | "updated" | "sent" | "reminder_sent"
  | "marked_paid" | "marked_void" | "duplicated"
  | "payment_recorded" | "payment_removed"
  | "converted" | "accepted" | "declined";

export type InvoiceLog = {
  id: string;
  invoiceId: string;
  event: InvoiceLogEvent;
  detail: string;
  actor: string | null;
  createdAt: string;
};

/**
 * Single source of truth for invoice money math. Used by the DB layer, the
 * line-items editor, the detail page and the PDF so they never drift.
 * - percent: discountValue is a percentage of subtotal (e.g. 10 → 10%)
 * - fixed:   discountValue is an absolute amount in the invoice currency
 * The discount is clamped to [0, subtotal] so total can never go negative.
 */
export function computeInvoiceTotals(args: {
  lineItems: Array<{ qty: number; unitPrice: number }>;
  discountType?: DiscountType;
  discountValue?: number;
}): { subtotal: number; discountAmount: number; total: number } {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const subtotal = args.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0);
  const type = args.discountType ?? "none";
  const value = args.discountValue ?? 0;
  let discountAmount = 0;
  if (type === "percent") discountAmount = subtotal * (value / 100);
  else if (type === "fixed") discountAmount = value;
  discountAmount = Math.max(0, Math.min(discountAmount, subtotal));
  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    total: round2(subtotal - discountAmount),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Total received across all recorded payments. */
export function computeAmountPaid(payments: Array<{ amount: number }>): number {
  return round2(payments.reduce((s, p) => s + (p.amount || 0), 0));
}

/** Outstanding balance = invoice total − amount paid (never below 0). */
export function computeBalanceDue(
  inv: { total: number; payments?: Array<{ amount: number }> },
): number {
  const balance = round2(inv.total - computeAmountPaid(inv.payments ?? []));
  return balance < 0 ? 0 : balance;
}

export type DerivedStatus = DocStatus | "overdue" | "partial" | "converted";

/**
 * Display status, never stored as-is for the derived values.
 * Quotes (doc_type='quote') have their own lifecycle — no payments / overdue:
 * - converted (has a linked invoice) → "converted" (takes priority)
 * - sent past its "valid until" date → "expired"
 * - otherwise → draft / sent / accepted / declined / expired as stored
 * Invoices:
 * - draft / paid / void → returned as-is
 * - sent with a partial payment recorded → "partial"
 * - sent past its due date → "overdue"
 * - otherwise → "sent"
 * "partial" takes priority over "overdue" so a part-paid invoice reads as part-paid.
 */
export function computeDerivedStatus(
  inv: Pick<Invoice, "status" | "dueDate" | "total" | "docType" | "convertedToInvoiceId">
    & { payments?: Array<{ amount: number }> },
): DerivedStatus {
  if (inv.docType === "quote") {
    if (inv.convertedToInvoiceId) return "converted";
    if (inv.status === "sent") {
      const due = new Date(inv.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (due < today) return "expired"; // past its "valid until" date
    }
    return inv.status;
  }
  if (inv.status !== "sent") return inv.status;
  const paid = computeAmountPaid(inv.payments ?? []);
  if (paid > 0 && round2(inv.total - paid) > 0) return "partial";
  const due = new Date(inv.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today ? "overdue" : "sent";
}
