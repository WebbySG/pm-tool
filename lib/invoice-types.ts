export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

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

export function computeDerivedStatus(inv: Pick<Invoice, "status" | "dueDate">): InvoiceStatus | "overdue" {
  if (inv.status !== "sent") return inv.status;
  const due = new Date(inv.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today ? "overdue" : "sent";
}
