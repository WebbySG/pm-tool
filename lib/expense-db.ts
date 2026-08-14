import { supabase } from "./supabase";
import type {
  Expense, ExpenseReceipt, ExpenseCategory, ExpenseStatus, PaymentMethod,
} from "./expense-types";

// Every helper here THROWS on a Supabase error — never `return null` or
// log-and-continue. The pages patch their local state optimistically, so a
// swallowed write error is indistinguishable from success until a reload wipes
// it (Known Recurring Mistake #13 in CLAUDE.md — it cost months of lost task
// descriptions and attachments). Callers catch and render errorMessage(e).

type Row = Record<string, unknown>;
const num = (v: unknown): number => (v == null ? 0 : typeof v === "number" ? v : parseFloat(String(v)));

function rowToReceipt(r: Row): ExpenseReceipt {
  return {
    id: r.id as string,
    expenseId: r.expense_id as string,
    name: (r.name as string) ?? "",
    url: (r.url as string) ?? "",
    type: ((r.type as ExpenseReceipt["type"]) ?? "document"),
    size: (r.size as string) ?? "",
    uploadedBy: (r.uploaded_by as string | null) ?? null,
    uploadedAt: r.uploaded_at as string,
  };
}

function rowToExpense(r: Row, receipts: ExpenseReceipt[] = []): Expense {
  return {
    id: r.id as string,
    expenseDate: r.expense_date as string,
    vendor: (r.vendor as string) ?? "",
    category: ((r.category as ExpenseCategory) ?? "other"),
    paymentMethod: ((r.payment_method as PaymentMethod) ?? "other"),
    description: (r.description as string) ?? "",
    amount: num(r.amount),
    gstAmount: num(r.gst_amount),
    currency: (r.currency as string) ?? "SGD",
    projectId: (r.project_id as string | null) ?? null,
    deductible: (r.deductible as boolean) ?? true,
    status: ((r.status as ExpenseStatus) ?? "recorded"),
    submittedAt: (r.submitted_at as string | null) ?? null,
    submittedNote: (r.submitted_note as string) ?? "",
    notes: (r.notes as string) ?? "",
    createdBy: (r.created_by as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    receipts,
  };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Load every expense with its receipts. Two flat queries joined in memory (the
 * loadInvoices pattern) rather than a nested select — the row counts here are
 * small and it keeps the mapping explicit.
 */
export async function loadExpenses(): Promise<Expense[]> {
  const [{ data: expRows, error: expErr }, { data: recRows, error: recErr }] = await Promise.all([
    supabase.from("pm_expenses").select("*").order("expense_date", { ascending: false }),
    supabase.from("pm_expense_receipts").select("*").order("uploaded_at"),
  ]);
  if (expErr) throw expErr;
  if (recErr) throw recErr;

  const byExpense = new Map<string, ExpenseReceipt[]>();
  for (const r of recRows ?? []) {
    const rec = rowToReceipt(r as Row);
    const arr = byExpense.get(rec.expenseId) ?? [];
    arr.push(rec);
    byExpense.set(rec.expenseId, arr);
  }
  return (expRows ?? []).map((r) =>
    rowToExpense(r as Row, byExpense.get((r as Row).id as string) ?? []));
}

export async function loadExpense(id: string): Promise<Expense | null> {
  const [{ data: expRow, error: expErr }, { data: recRows, error: recErr }] = await Promise.all([
    supabase.from("pm_expenses").select("*").eq("id", id).maybeSingle(),
    supabase.from("pm_expense_receipts").select("*").eq("expense_id", id).order("uploaded_at"),
  ]);
  if (expErr) throw expErr;
  if (recErr) throw recErr;
  if (!expRow) return null;
  return rowToExpense(expRow as Row, (recRows ?? []).map((r) => rowToReceipt(r as Row)));
}

// ─── Write ────────────────────────────────────────────────────────────────────

export type ExpenseDraft = {
  expenseDate: string;
  vendor: string;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  description?: string;
  amount: number;
  gstAmount?: number;
  currency?: string;
  projectId: string | null;
  deductible?: boolean;
  notes?: string;
  createdBy?: string | null;
};

function draftToRow(d: ExpenseDraft): Row {
  return {
    expense_date: d.expenseDate,
    vendor: d.vendor.trim(),
    category: d.category,
    payment_method: d.paymentMethod,
    description: d.description?.trim() || null,
    amount: d.amount,
    gst_amount: d.gstAmount ?? 0,
    currency: d.currency ?? "SGD",
    project_id: d.projectId,
    deductible: d.deductible ?? true,
    notes: d.notes?.trim() || null,
  };
}

export async function createExpense(d: ExpenseDraft): Promise<string> {
  const row = draftToRow(d);
  row.created_by = d.createdBy ?? null;
  const { data, error } = await supabase.from("pm_expenses").insert(row).select("id").single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateExpense(id: string, d: ExpenseDraft): Promise<void> {
  const row = draftToRow(d);
  row.updated_at = new Date().toISOString();
  const { error } = await supabase.from("pm_expenses").update(row).eq("id", id);
  if (error) throw error;
}

/**
 * Deletes the expense row; receipt ROWS cascade via the FK.
 * The storage OBJECTS are deliberately left in the bucket — same as every other
 * attachment path in this app (there is no storage GC). For an accounting record
 * that is the safer failure mode: an orphaned file costs a few KB, whereas
 * deleting the only copy of a receipt IRAS may ask for is unrecoverable.
 */
export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from("pm_expenses").delete().eq("id", id);
  if (error) throw error;
}

/** Mark expenses as handed to the accountant / included in a filing (or undo). */
export async function setExpensesSubmitted(
  ids: string[], submitted: boolean, note?: string,
): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from("pm_expenses").update({
    status: submitted ? "submitted" : "recorded",
    submitted_at: submitted ? new Date().toISOString() : null,
    submitted_note: submitted ? (note?.trim() || null) : null,
    updated_at: new Date().toISOString(),
  }).in("id", ids);
  if (error) throw error;
}

// ─── Receipts ─────────────────────────────────────────────────────────────────

/**
 * Record an already-uploaded receipt file against an expense. Upload to storage
 * first (uploadExpenseReceipt in lib/supabase.ts) — this only writes the row that
 * makes the file visible and durable. Returns the row so the UI can show it
 * without a full reload.
 */
export async function addExpenseReceipt(
  expenseId: string,
  file: { url: string; name: string; size: string; type: string },
  uploadedBy: string | null,
): Promise<ExpenseReceipt> {
  const { data, error } = await supabase.from("pm_expense_receipts").insert({
    expense_id: expenseId,
    name: file.name,
    url: file.url,
    type: file.type === "image" ? "image" : "document",
    size: file.size,
    uploaded_by: uploadedBy,
  }).select("*").single();
  if (error) throw error;
  return rowToReceipt(data as Row);
}

export async function deleteExpenseReceipt(id: string): Promise<void> {
  const { error } = await supabase.from("pm_expense_receipts").delete().eq("id", id);
  if (error) throw error;
}
