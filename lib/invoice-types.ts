export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

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

export type Invoice = {
  id: string;
  invoiceNumber: string;
  clientId: string | null;
  templateId: string | null;
  status: InvoiceStatus;
  currency: string;
  issueDate: string;
  dueDate: string;
  billToName: string;
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
  | "marked_paid" | "marked_void" | "duplicated";

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

export function computeDerivedStatus(inv: Pick<Invoice, "status" | "dueDate">): InvoiceStatus | "overdue" {
  if (inv.status !== "sent") return inv.status;
  const due = new Date(inv.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today ? "overdue" : "sent";
}
