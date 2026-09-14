/**
 * Monthly profit — revenue against expenses, side by side.
 *
 * Pure and dependency-free (types only, no react/supabase) so the page renders
 * it and a test harness can drive it. The earnings half used to live inline in
 * app/(app)/invoices/page.tsx; it is lifted here because two things now read it
 * and a second copy of "what counts as revenue" is exactly what drifts.
 *
 * ── The two bases are NOT the same, on purpose ────────────────────────────────
 * Revenue is CASH: recognised on the day each payment landed, so a partly-paid
 * invoice contributes to several months. Expenses are recognised on the date on
 * the RECEIPT, because that is the only date an expense has — there is no
 * "expense paid" ledger mirroring pm_invoice_payments. For a small agency that
 * settles bills as they arrive the two line up in practice, but the result is a
 * management figure, not a statutory P&L. The page says so on screen.
 *
 * ── Expenses count GROSS ──────────────────────────────────────────────────────
 * pm_expenses.amount is GST-INCLUSIVE and that whole figure is what left the
 * bank. Input GST is only reclaimable by a GST-registered business, and this one
 * does not charge output GST on its invoices (see the Invoice Module — "No
 * tax"), so GST paid on a purchase is part of the cost. `inputGst` is carried in
 * the totals so the assumption stays visible and can be revisited the day the
 * company registers.
 */

import type { Invoice } from "./invoice-types";
import type { Expense } from "./expense-types";
import { fyStartYearOf, fyMonthOrder, MONTH_LABELS } from "./expense-types";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * A dated amount. `dateISO` is a plain YYYY-MM-DD in the VIEWER's own calendar —
 * never a UTC instant — because every bucket below is a calendar month.
 */
export type MoneyEvent = { dateISO: string; amount: number };

/**
 * A Date to YYYY-MM-DD in LOCAL time.
 *
 * Deliberately not `toISOString().slice(0, 10)`, which converts to UTC first: a
 * payment banked at 07:00 on 1 September in Singapore is 23:00 on 31 August in
 * UTC, and would be filed under the wrong month. Money is banked in the owner's
 * calendar, not Greenwich's.
 */
export function localDateISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * The earnings a single invoice contributes.
 *
 * Cash basis: one event per payment row, so a partially-paid invoice can land in
 * several months. **The legacy branch is live, not theoretical** — 5 invoices
 * were marked paid before the payment ledger existed and hold no payment rows;
 * each counts once at paidAt, falling back to its issue date. Quotes never carry
 * payments, but the guard is kept local so the function is safe on any row.
 */
export function invoiceEarnings(inv: Invoice): MoneyEvent[] {
  if (inv.docType === "quote") return [];
  if (inv.payments && inv.payments.length > 0) {
    return inv.payments
      .map((p) => ({ date: new Date(p.paidAt), amount: p.amount }))
      .filter((e) => !isNaN(e.date.getTime()))
      .map((e) => ({ dateISO: localDateISO(e.date), amount: e.amount }));
  }
  if (inv.status === "paid") {
    const iso = inv.paidAt ?? inv.issueDate;
    const d = iso ? new Date(iso) : null;
    if (d && !isNaN(d.getTime())) return [{ dateISO: localDateISO(d), amount: inv.total }];
  }
  return [];
}

export function revenueEvents(invoices: Invoice[]): MoneyEvent[] {
  return invoices.flatMap(invoiceEarnings);
}

/**
 * Expense events. `expenseDate` is already a plain YYYY-MM-DD, so it is used
 * VERBATIM — pushing it through `new Date()` would parse it as UTC midnight and
 * shift 2026-08-01 back into July for any viewer west of Greenwich.
 */
export function expenseEvents(expenses: Expense[]): MoneyEvent[] {
  return expenses
    .filter((e) => /^\d{4}-\d{2}-\d{2}/.test(e.expenseDate))
    .map((e) => ({ dateISO: e.expenseDate.slice(0, 10), amount: e.amount }));
}

/** The input GST inside each expense, dated the same way. Display only. */
export function inputGstEvents(expenses: Expense[]): MoneyEvent[] {
  return expenses
    .filter((e) => /^\d{4}-\d{2}-\d{2}/.test(e.expenseDate) && e.gstAmount > 0)
    .map((e) => ({ dateISO: e.expenseDate.slice(0, 10), amount: e.gstAmount }));
}

export type ProfitMonth = {
  /** Calendar month index 0-11 (Jan = 0), regardless of where the FY starts. */
  monthIndex: number;
  label: string;
  /** The calendar year this month falls in — an FY can straddle two. */
  year: number;
  revenue: number;
  expenses: number;
  profit: number;
};

export type MonthlyProfit = {
  /** 12 months in FINANCIAL-year order, so a non-January FY reads left to right. */
  months: ProfitMonth[];
  totals: { revenue: number; expenses: number; profit: number; inputGst: number };
  /**
   * Tallest bar in the period. Revenue and expenses share ONE scale so the pair
   * is visually comparable — scaling them independently would draw a S$400 cost
   * as tall as S$12,000 of revenue. 0 when the year is empty.
   */
  maxBar: number;
  revenueCount: number;
  expenseCount: number;
};

/**
 * Bucket revenue and expenses into the 12 months of one financial year.
 *
 * `fyStartMonth` is 1-12 and comes from the same setting the Expenses page
 * stores, so the two pages can never disagree about which year a cost lands in.
 * A January start (the default) makes this an ordinary calendar year.
 */
export function monthlyProfit(args: {
  revenue: MoneyEvent[];
  expenses: MoneyEvent[];
  fyStartYear: number;
  fyStartMonth: number;
  inputGst?: MoneyEvent[];
}): MonthlyProfit {
  const { revenue, expenses, fyStartYear, fyStartMonth } = args;
  const rev = Array<number>(12).fill(0);
  const exp = Array<number>(12).fill(0);
  let revenueCount = 0;
  let expenseCount = 0;
  let inputGst = 0;

  const inPeriod = (e: MoneyEvent) => fyStartYearOf(e.dateISO, fyStartMonth) === fyStartYear;
  const monthOf = (e: MoneyEvent) => Number(e.dateISO.slice(5, 7)) - 1;

  for (const e of revenue) {
    if (!inPeriod(e)) continue;
    rev[monthOf(e)] += e.amount;
    revenueCount++;
  }
  for (const e of expenses) {
    if (!inPeriod(e)) continue;
    exp[monthOf(e)] += e.amount;
    expenseCount++;
  }
  for (const g of args.inputGst ?? []) {
    if (inPeriod(g)) inputGst += g.amount;
  }

  const sm = Math.min(12, Math.max(1, Math.round(fyStartMonth)));
  const months: ProfitMonth[] = fyMonthOrder(sm).map((m) => {
    const r = round2(rev[m]);
    const x = round2(exp[m]);
    return {
      monthIndex: m,
      label: MONTH_LABELS[m],
      // Months before the FY's start month belong to the following calendar year.
      year: m < sm - 1 ? fyStartYear + 1 : fyStartYear,
      revenue: r,
      expenses: x,
      profit: round2(r - x),
    };
  });

  const totalRevenue = round2(months.reduce((s, m) => s + m.revenue, 0));
  const totalExpenses = round2(months.reduce((s, m) => s + m.expenses, 0));
  return {
    months,
    totals: {
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: round2(totalRevenue - totalExpenses),
      inputGst: round2(inputGst),
    },
    maxBar: Math.max(0, ...months.map((m) => Math.max(m.revenue, m.expenses))),
    revenueCount,
    expenseCount,
  };
}

/**
 * Every financial year holding revenue or expenses, plus the current one — so
 * the year navigator can neither strand the user on an empty period nor hide a
 * year that has data.
 */
export function activeFinancialYears(
  eventLists: MoneyEvent[][],
  fyStartMonth: number,
  todayISO: string,
): number[] {
  const set = new Set<number>([fyStartYearOf(todayISO, fyStartMonth)]);
  for (const list of eventLists) {
    for (const e of list) set.add(fyStartYearOf(e.dateISO, fyStartMonth));
  }
  return Array.from(set).sort((a, b) => a - b);
}

/** Totals for a single calendar month — the "this month" summary cards. */
export function monthTotals(
  revenue: MoneyEvent[],
  expenses: MoneyEvent[],
  year: number,
  monthIndex: number,
): { revenue: number; expenses: number; profit: number } {
  const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const sum = (list: MoneyEvent[]) =>
    round2(list.reduce((s, e) => (e.dateISO.startsWith(key) ? s + e.amount : s), 0));
  const r = sum(revenue);
  const x = sum(expenses);
  return { revenue: r, expenses: x, profit: round2(r - x) };
}
