import { supabase } from "./supabase";
import type {
  Invoice, InvoiceLineItem, InvoiceTemplate, InvoiceTemplateLineItem,
  InvoiceStatus, InvoiceLog, InvoiceLogEvent, DiscountType,
} from "./invoice-types";
import { computeInvoiceTotals } from "./invoice-types";

type Row = Record<string, unknown>;

const num = (v: unknown): number => (v == null ? 0 : typeof v === "number" ? v : parseFloat(String(v)));

function rowToLineItem(r: Row): InvoiceLineItem {
  return {
    id: r.id as string,
    invoiceId: r.invoice_id as string,
    description: (r.description as string) ?? "",
    qty: num(r.qty),
    unitPrice: num(r.unit_price),
    lineTotal: num(r.line_total),
    sortOrder: (r.sort_order as number) ?? 0,
  };
}

function rowToInvoice(r: Row, items: InvoiceLineItem[] = []): Invoice {
  return {
    id: r.id as string,
    invoiceNumber: r.invoice_number as string,
    clientId: (r.client_id as string | null) ?? null,
    projectId: (r.project_id as string | null) ?? null,
    templateId: (r.template_id as string | null) ?? null,
    status: r.status as InvoiceStatus,
    currency: (r.currency as string) ?? "SGD",
    issueDate: r.issue_date as string,
    dueDate: r.due_date as string,
    billToName: (r.bill_to_name as string) ?? "",
    billToEmail: (r.bill_to_email as string) ?? "",
    billToAddress: (r.bill_to_address as string) ?? "",
    notes: (r.notes as string) ?? "",
    paymentInstructions: (r.payment_instructions as string) ?? "",
    subtotal: num(r.subtotal),
    discountType: ((r.discount_type as DiscountType) ?? "none"),
    discountValue: num(r.discount_value),
    total: num(r.total),
    reminderCadenceDays: (r.reminder_cadence_days as number[]) ?? [],
    lastReminderSentAt: (r.last_reminder_sent_at as string | null) ?? null,
    sentAt: (r.sent_at as string | null) ?? null,
    sentToEmail: (r.sent_to_email as string | null) ?? null,
    pdfPath: (r.pdf_path as string | null) ?? null,
    paidAt: (r.paid_at as string | null) ?? null,
    paidBy: (r.paid_by as string | null) ?? null,
    paidNote: (r.paid_note as string | null) ?? null,
    createdBy: (r.created_by as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    lineItems: items,
  };
}

function rowToTemplateLineItem(r: Row): InvoiceTemplateLineItem {
  return {
    id: r.id as string,
    templateId: r.template_id as string,
    description: (r.description as string) ?? "",
    qty: num(r.qty),
    unitPrice: num(r.unit_price),
    sortOrder: (r.sort_order as number) ?? 0,
  };
}

function rowToTemplate(r: Row, items: InvoiceTemplateLineItem[] = []): InvoiceTemplate {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? "",
    defaultNotes: (r.default_notes as string) ?? "",
    defaultPaymentInstructions: (r.default_payment_instructions as string) ?? "",
    defaultDueDays: (r.default_due_days as number) ?? 14,
    createdBy: (r.created_by as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    lineItems: items,
  };
}

// ─── Numbering ────────────────────────────────────────────────────────────────

export async function nextInvoiceNumber(): Promise<string> {
  const { data, error } = await supabase.rpc("next_invoice_number");
  if (error) throw error;
  return data as string;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function loadInvoices(): Promise<Invoice[]> {
  const [{ data: invRows, error: invErr }, { data: lineRows, error: lineErr }] = await Promise.all([
    supabase.from("pm_invoices").select("*").order("created_at", { ascending: false }),
    supabase.from("pm_invoice_line_items").select("*").order("sort_order"),
  ]);
  if (invErr) throw invErr;
  if (lineErr) throw lineErr;
  const itemsByInvoice = new Map<string, InvoiceLineItem[]>();
  for (const r of lineRows ?? []) {
    const li = rowToLineItem(r as Row);
    const arr = itemsByInvoice.get(li.invoiceId) ?? [];
    arr.push(li);
    itemsByInvoice.set(li.invoiceId, arr);
  }
  return (invRows ?? []).map((r) => rowToInvoice(r as Row, itemsByInvoice.get((r as Row).id as string) ?? []));
}

export async function loadInvoice(id: string): Promise<Invoice | null> {
  const [{ data: invRow, error: invErr }, { data: lineRows, error: lineErr }] = await Promise.all([
    supabase.from("pm_invoices").select("*").eq("id", id).maybeSingle(),
    supabase.from("pm_invoice_line_items").select("*").eq("invoice_id", id).order("sort_order"),
  ]);
  if (invErr) throw invErr;
  if (lineErr) throw lineErr;
  if (!invRow) return null;
  const items = (lineRows ?? []).map((r) => rowToLineItem(r as Row));
  return rowToInvoice(invRow as Row, items);
}

export type InvoiceDraft = {
  clientId: string | null;
  projectId: string | null;
  templateId: string | null;
  issueDate: string;
  dueDate: string;
  billToName: string;
  billToEmail: string;
  billToAddress: string;
  notes: string;
  paymentInstructions: string;
  currency?: string;
  reminderCadenceDays?: number[];
  discountType?: DiscountType;
  discountValue?: number;
  lineItems: Array<{ description: string; qty: number; unitPrice: number; sortOrder?: number }>;
  createdBy: string | null;
};

export async function createInvoice(draft: InvoiceDraft): Promise<string> {
  const invoiceNumber = await nextInvoiceNumber();
  const discountType = draft.discountType ?? "none";
  const discountValue = draft.discountValue ?? 0;
  const { subtotal, total } = computeInvoiceTotals({
    lineItems: draft.lineItems, discountType, discountValue,
  });
  const { data, error } = await supabase.from("pm_invoices").insert({
    invoice_number: invoiceNumber,
    client_id: draft.clientId,
    project_id: draft.projectId,
    template_id: draft.templateId,
    status: "draft",
    currency: draft.currency ?? "SGD",
    issue_date: draft.issueDate,
    due_date: draft.dueDate,
    bill_to_name: draft.billToName,
    bill_to_email: draft.billToEmail || null,
    bill_to_address: draft.billToAddress || null,
    notes: draft.notes || null,
    payment_instructions: draft.paymentInstructions || null,
    subtotal,
    discount_type: discountType,
    discount_value: discountValue,
    total,
    reminder_cadence_days: draft.reminderCadenceDays ?? [],
    created_by: draft.createdBy,
  }).select("id").single();
  if (error) throw error;
  const invoiceId = (data as { id: string }).id;
  if (draft.lineItems.length > 0) {
    const { error: liErr } = await supabase.from("pm_invoice_line_items").insert(
      draft.lineItems.map((li, i) => ({
        invoice_id: invoiceId,
        description: li.description,
        qty: li.qty,
        unit_price: li.unitPrice,
        sort_order: li.sortOrder ?? i,
      })),
    );
    if (liErr) throw liErr;
  }
  await logInvoiceEvent(invoiceId, "created", `Invoice ${invoiceNumber} created`, draft.createdBy);
  return invoiceId;
}

export async function updateInvoice(
  id: string,
  patch: Partial<Omit<InvoiceDraft, "lineItems" | "createdBy">> & { lineItems?: InvoiceDraft["lineItems"] },
  actor: string | null,
): Promise<void> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.clientId !== undefined) updates.client_id = patch.clientId;
  if (patch.projectId !== undefined) updates.project_id = patch.projectId;
  if (patch.templateId !== undefined) updates.template_id = patch.templateId;
  if (patch.issueDate !== undefined) updates.issue_date = patch.issueDate;
  if (patch.dueDate !== undefined) updates.due_date = patch.dueDate;
  if (patch.billToName !== undefined) updates.bill_to_name = patch.billToName;
  if (patch.billToEmail !== undefined) updates.bill_to_email = patch.billToEmail || null;
  if (patch.billToAddress !== undefined) updates.bill_to_address = patch.billToAddress || null;
  if (patch.notes !== undefined) updates.notes = patch.notes || null;
  if (patch.paymentInstructions !== undefined) updates.payment_instructions = patch.paymentInstructions || null;
  if (patch.currency !== undefined) updates.currency = patch.currency;
  if (patch.reminderCadenceDays !== undefined) updates.reminder_cadence_days = patch.reminderCadenceDays;
  if (patch.discountType !== undefined) updates.discount_type = patch.discountType;
  if (patch.discountValue !== undefined) updates.discount_value = patch.discountValue;

  // Recompute stored subtotal/total whenever line items OR the discount change.
  // Any field not in the patch is read back from the current row so totals stay correct.
  const needTotals =
    patch.lineItems !== undefined || patch.discountType !== undefined || patch.discountValue !== undefined;
  if (needTotals) {
    let lineItems = patch.lineItems;
    let discountType = patch.discountType;
    let discountValue = patch.discountValue;
    if (lineItems === undefined || discountType === undefined || discountValue === undefined) {
      const current = await loadInvoice(id);
      if (lineItems === undefined) lineItems = (current?.lineItems ?? []).map((li) => ({ description: li.description, qty: li.qty, unitPrice: li.unitPrice }));
      if (discountType === undefined) discountType = current?.discountType ?? "none";
      if (discountValue === undefined) discountValue = current?.discountValue ?? 0;
    }
    const { subtotal, total } = computeInvoiceTotals({ lineItems, discountType, discountValue });
    updates.subtotal = subtotal;
    updates.total = total;
  }

  const { error } = await supabase.from("pm_invoices").update(updates).eq("id", id);
  if (error) throw error;

  if (patch.lineItems) {
    await supabase.from("pm_invoice_line_items").delete().eq("invoice_id", id);
    if (patch.lineItems.length > 0) {
      const { error: liErr } = await supabase.from("pm_invoice_line_items").insert(
        patch.lineItems.map((li, i) => ({
          invoice_id: id,
          description: li.description,
          qty: li.qty,
          unit_price: li.unitPrice,
          sort_order: li.sortOrder ?? i,
        })),
      );
      if (liErr) throw liErr;
    }
  }

  await logInvoiceEvent(id, "updated", "Invoice updated", actor);
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from("pm_invoices").delete().eq("id", id);
  if (error) throw error;
}

export async function markInvoicePaid(id: string, actor: string | null, note: string): Promise<void> {
  const { error } = await supabase.from("pm_invoices").update({
    status: "paid",
    paid_at: new Date().toISOString(),
    paid_by: actor,
    paid_note: note || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw error;
  await logInvoiceEvent(id, "marked_paid", note || "Marked paid", actor);
}

export async function markInvoiceUnpaid(id: string, actor: string | null): Promise<void> {
  // Returns to 'sent' if it was previously sent, otherwise 'draft'
  const { data, error } = await supabase.from("pm_invoices").select("sent_at").eq("id", id).single();
  if (error) throw error;
  const back: InvoiceStatus = (data as { sent_at: string | null }).sent_at ? "sent" : "draft";
  const { error: upErr } = await supabase.from("pm_invoices").update({
    status: back, paid_at: null, paid_by: null, paid_note: null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (upErr) throw upErr;
  await logInvoiceEvent(id, "updated", "Payment reverted", actor);
}

export async function duplicateInvoice(sourceId: string, opts: {
  issueDate: string;
  dueDate: string;
  actor: string | null;
}): Promise<string> {
  const src = await loadInvoice(sourceId);
  if (!src) throw new Error("Source invoice not found");
  const newId = await createInvoice({
    clientId: src.clientId,
    projectId: src.projectId,
    templateId: src.templateId,
    issueDate: opts.issueDate,
    dueDate: opts.dueDate,
    billToName: src.billToName,
    billToEmail: src.billToEmail,
    billToAddress: src.billToAddress,
    notes: src.notes,
    paymentInstructions: src.paymentInstructions,
    currency: src.currency,
    reminderCadenceDays: src.reminderCadenceDays,
    discountType: src.discountType,
    discountValue: src.discountValue,
    lineItems: src.lineItems.map((li, i) => ({
      description: li.description, qty: li.qty, unitPrice: li.unitPrice, sortOrder: i,
    })),
    createdBy: opts.actor,
  });
  await logInvoiceEvent(newId, "duplicated", `Duplicated from ${src.invoiceNumber}`, opts.actor);
  return newId;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function loadInvoiceTemplates(): Promise<InvoiceTemplate[]> {
  const [{ data: tplRows, error: tErr }, { data: liRows, error: liErr }] = await Promise.all([
    supabase.from("pm_invoice_templates").select("*").order("name"),
    supabase.from("pm_invoice_template_line_items").select("*").order("sort_order"),
  ]);
  if (tErr) throw tErr;
  if (liErr) throw liErr;
  const itemsByTpl = new Map<string, InvoiceTemplateLineItem[]>();
  for (const r of liRows ?? []) {
    const li = rowToTemplateLineItem(r as Row);
    const arr = itemsByTpl.get(li.templateId) ?? [];
    arr.push(li);
    itemsByTpl.set(li.templateId, arr);
  }
  return (tplRows ?? []).map((r) => rowToTemplate(r as Row, itemsByTpl.get((r as Row).id as string) ?? []));
}

export async function loadInvoiceTemplate(id: string): Promise<InvoiceTemplate | null> {
  const [{ data: tplRow, error: tErr }, { data: liRows, error: liErr }] = await Promise.all([
    supabase.from("pm_invoice_templates").select("*").eq("id", id).maybeSingle(),
    supabase.from("pm_invoice_template_line_items").select("*").eq("template_id", id).order("sort_order"),
  ]);
  if (tErr) throw tErr;
  if (liErr) throw liErr;
  if (!tplRow) return null;
  return rowToTemplate(tplRow as Row, (liRows ?? []).map((r) => rowToTemplateLineItem(r as Row)));
}

export type TemplateDraft = {
  name: string;
  description: string;
  defaultNotes: string;
  defaultPaymentInstructions: string;
  defaultDueDays: number;
  lineItems: Array<{ description: string; qty: number; unitPrice: number; sortOrder?: number }>;
  createdBy: string | null;
};

export async function createInvoiceTemplate(draft: TemplateDraft): Promise<string> {
  const { data, error } = await supabase.from("pm_invoice_templates").insert({
    name: draft.name,
    description: draft.description || null,
    default_notes: draft.defaultNotes || null,
    default_payment_instructions: draft.defaultPaymentInstructions || null,
    default_due_days: draft.defaultDueDays,
    created_by: draft.createdBy,
  }).select("id").single();
  if (error) throw error;
  const tplId = (data as { id: string }).id;
  if (draft.lineItems.length > 0) {
    const { error: liErr } = await supabase.from("pm_invoice_template_line_items").insert(
      draft.lineItems.map((li, i) => ({
        template_id: tplId,
        description: li.description,
        qty: li.qty,
        unit_price: li.unitPrice,
        sort_order: li.sortOrder ?? i,
      })),
    );
    if (liErr) throw liErr;
  }
  return tplId;
}

export async function updateInvoiceTemplate(id: string, draft: TemplateDraft): Promise<void> {
  const { error } = await supabase.from("pm_invoice_templates").update({
    name: draft.name,
    description: draft.description || null,
    default_notes: draft.defaultNotes || null,
    default_payment_instructions: draft.defaultPaymentInstructions || null,
    default_due_days: draft.defaultDueDays,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw error;
  await supabase.from("pm_invoice_template_line_items").delete().eq("template_id", id);
  if (draft.lineItems.length > 0) {
    const { error: liErr } = await supabase.from("pm_invoice_template_line_items").insert(
      draft.lineItems.map((li, i) => ({
        template_id: id,
        description: li.description,
        qty: li.qty,
        unit_price: li.unitPrice,
        sort_order: li.sortOrder ?? i,
      })),
    );
    if (liErr) throw liErr;
  }
}

export async function deleteInvoiceTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("pm_invoice_templates").delete().eq("id", id);
  if (error) throw error;
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function logInvoiceEvent(
  invoiceId: string,
  event: InvoiceLogEvent,
  detail: string,
  actor: string | null,
): Promise<void> {
  const { error } = await supabase.from("pm_invoice_logs").insert({
    invoice_id: invoiceId,
    event,
    detail,
    actor,
  });
  if (error) console.error("logInvoiceEvent", error);
}

export async function loadInvoiceLogs(invoiceId: string): Promise<InvoiceLog[]> {
  const { data, error } = await supabase.from("pm_invoice_logs")
    .select("*").eq("invoice_id", invoiceId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: (r as Row).id as string,
    invoiceId: (r as Row).invoice_id as string,
    event: (r as Row).event as InvoiceLogEvent,
    detail: ((r as Row).detail as string) ?? "",
    actor: ((r as Row).actor as string | null) ?? null,
    createdAt: (r as Row).created_at as string,
  }));
}

// ─── Client billing helpers ───────────────────────────────────────────────────

export async function updateClientBilling(
  clientId: string,
  patch: { billingEmail?: string; billingAddress?: string },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (patch.billingEmail !== undefined) updates.billing_email = patch.billingEmail || null;
  if (patch.billingAddress !== undefined) updates.billing_address = patch.billingAddress || null;
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from("pm_clients").update(updates).eq("id", clientId);
  if (error) throw error;
}

export async function loadClientBilling(clientId: string): Promise<{ name: string; email: string; address: string } | null> {
  const { data, error } = await supabase.from("pm_clients")
    .select("name, billing_email, billing_address").eq("id", clientId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as Row;
  return {
    name: (r.name as string) ?? "",
    email: (r.billing_email as string) ?? "",
    address: (r.billing_address as string) ?? "",
  };
}
