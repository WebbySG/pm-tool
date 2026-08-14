// Business expense types + all pure expense math (GST, financial years, CSV).
//
// Dependency-free on purpose (no supabase/next/react imports) so the DB layer,
// the list page, the form and the CSV export all share one source of truth and
// can't drift — same reasoning as lib/weekly-seo.ts and computeInvoiceTotals.

export type ExpenseCategory =
  | "software" | "hosting_domains" | "advertising" | "subcontractors"
  | "staff_costs" | "office_rent" | "utilities" | "telecom"
  | "travel" | "meals_entertainment" | "professional_fees" | "equipment"
  | "bank_charges" | "insurance" | "training" | "govt_fees" | "other";

export type PaymentMethod =
  | "bank_transfer" | "paynow" | "credit_card" | "debit_card"
  | "giro" | "cash" | "cheque" | "other";

/** Stored status. "missing_receipt" is DERIVED, never stored — see computeExpenseStatus. */
export type ExpenseStatus = "recorded" | "submitted";
export type DerivedExpenseStatus = ExpenseStatus | "missing_receipt";

export type ExpenseReceipt = {
  id: string;
  expenseId: string;
  name: string;
  url: string;
  type: "image" | "document" | "video";
  size: string;
  uploadedBy: string | null;
  uploadedAt: string;
};

export type Expense = {
  id: string;
  expenseDate: string;      // YYYY-MM-DD — the date on the receipt
  vendor: string;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  description: string;
  amount: number;           // total paid, INCLUSIVE of GST
  gstAmount: number;        // the GST portion inside `amount` (input tax)
  currency: string;
  projectId: string | null;
  deductible: boolean;
  status: ExpenseStatus;
  submittedAt: string | null;
  submittedNote: string;
  notes: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  receipts: ExpenseReceipt[];
};

// ─── Category metadata ────────────────────────────────────────────────────────
// `taxNote` is a REMINDER shown in the form, not tax advice — the treatments
// below are the ones that most often get claimed wrongly by a small SG company.
// Confirm anything unusual with the accountant (the form says so too).

type CategoryMeta = { label: string; color: string; taxNote?: string };

export const CATEGORY_META: Record<ExpenseCategory, CategoryMeta> = {
  software:           { label: "Software & subscriptions", color: "#818cf8" },
  hosting_domains:    { label: "Hosting & domains",        color: "#60a5fa" },
  advertising:        { label: "Advertising & marketing",  color: "#f472b6" },
  subcontractors:     { label: "Subcontractors",           color: "#a78bfa",
    taxNote: "Keep the contractor's invoice. Payments to non-residents for services performed in Singapore may need withholding tax." },
  staff_costs:        { label: "Staff costs & CPF",        color: "#22d3ee",
    taxNote: "Employer CPF on ordinary/additional wages is deductible; voluntary contributions above the statutory limits are not." },
  office_rent:        { label: "Office rent",              color: "#fbbf24" },
  utilities:          { label: "Utilities",                color: "#f59e0b" },
  telecom:            { label: "Phone & internet",         color: "#38bdf8",
    taxNote: "Only the business-use portion of a personal line is deductible — note the split on the receipt." },
  travel:             { label: "Travel & transport",       color: "#34d399",
    taxNote: "Running costs of a private (S-plate) car are NOT deductible, even for business trips. Taxi, ride-hailing, public transport and Q-plate/commercial vehicles are fine." },
  meals_entertainment:{ label: "Meals & entertainment",    color: "#fb923c",
    taxNote: "Business entertainment is deductible — write WHO was entertained and WHY on the receipt. Purely personal meals are not." },
  professional_fees:  { label: "Professional fees",        color: "#c084fc",
    taxNote: "Accounting, audit, corporate secretarial and legal fees on revenue matters are deductible. Legal costs of acquiring an asset are capital." },
  equipment:          { label: "Equipment & hardware",     color: "#94a3b8",
    taxNote: "Capital items (laptops, monitors, furniture) normally claim CAPITAL ALLOWANCES under s19/19A rather than a straight deduction. Record it here and flag it to your accountant." },
  bank_charges:       { label: "Bank & payment fees",      color: "#2dd4bf" },
  insurance:          { label: "Insurance",                color: "#4ade80" },
  training:           { label: "Training & courses",       color: "#10b981",
    taxNote: "Training that maintains or updates existing trade skills is deductible; courses qualifying staff for a brand-new trade may not be." },
  govt_fees:          { label: "Government & statutory fees", color: "#64748b",
    taxNote: "ACRA filing fees and licences are deductible. FINES AND PENALTIES (late filing, composition fines) are NOT." },
  other:              { label: "Other",                    color: "#9ca3af" },
};

export const EXPENSE_CATEGORIES = Object.keys(CATEGORY_META) as ExpenseCategory[];

/**
 * Category metadata with a safe fallback. The DB column is unconstrained text
 * (so the vocabulary can grow without a live migration), which means an unknown
 * value must never crash a page — it renders as the raw key styled like "Other".
 */
export function categoryMeta(c: string): CategoryMeta {
  return CATEGORY_META[c as ExpenseCategory] ?? { label: c || "Other", color: "#9ca3af" };
}

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: "Bank transfer",
  paynow: "PayNow",
  credit_card: "Credit card",
  debit_card: "Debit card",
  giro: "GIRO",
  cash: "Cash",
  cheque: "Cheque",
  other: "Other",
};

export const PAYMENT_METHODS = Object.keys(PAYMENT_LABEL) as PaymentMethod[];

export function paymentLabel(m: string): string {
  return PAYMENT_LABEL[m as PaymentMethod] ?? (m || "Other");
}

// ─── Money ────────────────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Singapore GST rate, 9% since 1 Jan 2024. */
export const GST_RATE = 9;

/**
 * The GST hidden inside a GST-INCLUSIVE total, i.e. total × 9/109.
 * SG tax invoices usually show the gross figure, so this is the direction you
 * actually need when keying a receipt in.
 */
export function gstFromInclusive(total: number, rate: number = GST_RATE): number {
  if (!(total > 0)) return 0;
  return round2(total * (rate / (100 + rate)));
}

/** Cost excluding GST — what lands in the P&L when the input tax is reclaimed. */
export function netAmount(e: Pick<Expense, "amount" | "gstAmount">): number {
  return round2(e.amount - e.gstAmount);
}

export function formatMoney(amount: number, currency = "SGD"): string {
  const prefix = currency === "SGD" ? "S$" : `${currency} `;
  return `${prefix}${amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Compact form for chart bar labels, e.g. S$2.4k / S$900. */
export function formatMoneyShort(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000;
    return `S$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `S$${Math.round(amount)}`;
}

// ─── Status ───────────────────────────────────────────────────────────────────

/**
 * Display status. "missing_receipt" is computed from the attachments rather than
 * stored, so it can never disagree with reality: an expense with no source
 * document is the one thing IRAS will not accept, so it outranks "recorded".
 * A submitted expense keeps its own status even if the receipt is missing (it's
 * already gone to the accountant — chase it there, not here).
 */
export function computeExpenseStatus(
  e: Pick<Expense, "status"> & { receipts?: Array<unknown> },
): DerivedExpenseStatus {
  if (e.status === "submitted") return "submitted";
  return (e.receipts?.length ?? 0) === 0 ? "missing_receipt" : "recorded";
}

export const STATUS_META: Record<DerivedExpenseStatus, { label: string; color: string }> = {
  missing_receipt: { label: "No receipt", color: "#ef4444" },
  recorded:        { label: "Recorded",   color: "#38b6e8" },
  submitted:       { label: "Submitted",  color: "#22c55e" },
};

// ─── Financial years ──────────────────────────────────────────────────────────

/**
 * A company's basis period doesn't have to be the calendar year — plenty of SG
 * companies close 31 Mar or 30 Jun. `startMonth` is 1-12 (1 = January = calendar
 * year) and is chosen by the user on the Expenses page, because getting it wrong
 * would silently put costs in the wrong year of the export.
 */
export type FinancialYear = {
  /** The year the FY STARTS in — the stable key for grouping/sorting. */
  startYear: number;
  label: string;   // "2026" for a Jan start, "FY2025/26" otherwise
  startISO: string;
  endISO: string;  // inclusive
};

function pad(n: number): string { return String(n).padStart(2, "0"); }

export function financialYear(startYear: number, startMonth: number): FinancialYear {
  const sm = Math.min(12, Math.max(1, Math.round(startMonth)));
  const startISO = `${startYear}-${pad(sm)}-01`;
  // Day 0 of the month after the 12-month span = the last day of the FY.
  const endDate = new Date(Date.UTC(startYear + 1, sm - 1, 0));
  const endISO = endDate.toISOString().slice(0, 10);
  const label = sm === 1
    ? String(startYear)
    : `FY${startYear}/${pad((startYear + 1) % 100)}`;
  return { startYear, label, startISO, endISO };
}

/** Which FY (identified by its start year) an expense date falls into. */
export function fyStartYearOf(dateISO: string, startMonth: number): number {
  const [y, m] = dateISO.split("-").map(Number);
  const sm = Math.min(12, Math.max(1, Math.round(startMonth)));
  return m >= sm ? y : y - 1;
}

/**
 * IRAS requires source documents to be kept for 5 years from the end of the
 * relevant Year of Assessment. The YA follows the basis period, so a cost in the
 * FY starting 2026 is assessed in YA2027 and must be retained through 2032.
 */
export function retainUntilYear(fyStartYear: number): number {
  return fyStartYear + 6;
}

/** Month index (0-11) → the position it occupies in an FY starting `startMonth`. */
export function fyMonthOrder(startMonth: number): number[] {
  const sm = Math.min(12, Math.max(1, Math.round(startMonth))) - 1;
  return Array.from({ length: 12 }, (_, i) => (sm + i) % 12);
}

export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ─── CSV export ───────────────────────────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  // Quote whenever the value could break the row, and double any inner quote.
  // A leading = / + / - / @ is prefixed with a quote-safe apostrophe so Excel
  // doesn't evaluate a vendor name like "-Acme" as a formula.
  const needsGuard = /^[=+\-@]/.test(s);
  const body = needsGuard ? `'${s}` : s;
  return /[",\n\r]/.test(body) ? `"${body.replace(/"/g, '""')}"` : body;
}

/**
 * Build the accountant-facing CSV. Column order follows how a bookkeeper reads a
 * ledger (date → who → what → how much → evidence). Receipt URLs are included as
 * a space-separated list so the file is self-sufficient: whoever opens it can
 * click straight through to the source document without access to this tool.
 */
export function expensesToCSV(
  rows: Expense[],
  opts: { projectName?: (id: string | null) => string | null; personName?: (id: string | null) => string | null } = {},
): string {
  const header = [
    "Date", "Vendor", "Category", "Description", "Project",
    "Currency", "Total (incl GST)", "GST", "Net (excl GST)",
    "Deductible", "Payment method", "Status", "Receipts", "Receipt links",
    "Notes", "Recorded by", "Recorded at",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const e of rows) {
    lines.push([
      e.expenseDate,
      e.vendor,
      categoryMeta(e.category).label,
      e.description,
      opts.projectName?.(e.projectId) ?? "",
      e.currency,
      e.amount.toFixed(2),
      e.gstAmount.toFixed(2),
      netAmount(e).toFixed(2),
      e.deductible ? "Yes" : "No",
      paymentLabel(e.paymentMethod),
      STATUS_META[computeExpenseStatus(e)].label,
      e.receipts.length,
      e.receipts.map((r) => r.url).join(" "),
      e.notes,
      opts.personName?.(e.createdBy) ?? "",
      e.createdAt,
    ].map(csvCell).join(","));
  }
  // CRLF + a UTF-8 BOM is what Excel on Windows needs to open this cleanly with
  // the S$ signs and any non-ASCII vendor names intact.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Totals for a set of expenses — the summary cards and the FY footer share this. */
export function summarise(rows: Expense[]): {
  total: number; gst: number; net: number; deductible: number;
  nonDeductible: number; missingReceipts: number; unsubmitted: number; count: number;
} {
  let total = 0, gst = 0, deductible = 0, nonDeductible = 0, missingReceipts = 0, unsubmitted = 0;
  for (const e of rows) {
    total += e.amount;
    gst += e.gstAmount;
    if (e.deductible) deductible += e.amount; else nonDeductible += e.amount;
    if (computeExpenseStatus(e) === "missing_receipt") missingReceipts++;
    if (e.status !== "submitted") unsubmitted++;
  }
  return {
    total: round2(total), gst: round2(gst), net: round2(total - gst),
    deductible: round2(deductible), nonDeductible: round2(nonDeductible),
    missingReceipts, unsubmitted, count: rows.length,
  };
}
