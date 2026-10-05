"use client";

import Link from "next/link";
import type { Invoice } from "@/lib/invoice-types";
import type { Expense } from "@/lib/expense-types";
import { formatMoney, categoryMeta } from "@/lib/expense-types";
import { invoiceEarnings } from "@/lib/profit";

/** Use the exact same payment/legacy rules as the summary and yearly chart. */
export function MonthTransactions({ invoices, expenses, month, label }: {
  invoices: Invoice[]; expenses: Expense[]; month: string; label: string;
}) {
  const payments = invoices.flatMap((invoice) => invoiceEarnings(invoice)
    .filter((event) => event.dateISO.startsWith(`${month}-`))
    .map((event, index) => ({ ...event, invoice, key: `${invoice.id}-${index}` })))
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  const costs = expenses.filter((expense) => expense.expenseDate.startsWith(`${month}-`))
    .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));

  return <section aria-label={`Transactions for ${label}`} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <div className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Earnings · {label}</h2>
      <p className="text-xs mt-1 mb-3" style={{ color: "var(--text-muted)" }}>Payments received in this month, including partial payments.</p>
      {payments.length === 0 ? <p className="text-sm" style={{ color: "var(--text-muted)" }}>No earnings recorded for {label}.</p> :
        <ul className="divide-y" style={{ borderColor: "var(--border)" }}>{payments.map((payment) =>
          <li key={payment.key} className="py-3">
            <Link href={`/invoices/${payment.invoice.id}`} className="flex justify-between gap-3 text-sm hover:opacity-80">
              <span style={{ color: "var(--text)" }}>{payment.invoice.invoiceNumber} · {payment.invoice.billToName}
                <span className="block text-xs mt-1" style={{ color: "var(--text-muted)" }}>{payment.dateISO}</span>
              </span>
              <span className="font-semibold whitespace-nowrap" style={{ color: "#22c55e" }}>{formatMoney(payment.amount)}</span>
            </Link>
          </li>)}</ul>}
    </div>
    <div className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Expenses · {label}</h2>
      <p className="text-xs mt-1 mb-3" style={{ color: "var(--text-muted)" }}>By receipt date, including GST. <Link href="/expenses" className="underline">Manage expenses</Link></p>
      {costs.length === 0 ? <p className="text-sm" style={{ color: "var(--text-muted)" }}>No expenses recorded for {label}.</p> :
        <ul className="divide-y" style={{ borderColor: "var(--border)" }}>{costs.map((expense) =>
          <li key={expense.id} className="py-3 flex justify-between gap-3 text-sm">
            <span style={{ color: "var(--text)" }}>{expense.vendor}
              <span className="block text-xs mt-1" style={{ color: "var(--text-muted)" }}>{expense.expenseDate} · {categoryMeta(expense.category).label}</span>
              {expense.description && <span className="block text-xs mt-1" style={{ color: "var(--text-muted)" }}>{expense.description}</span>}
            </span>
            <span className="font-semibold whitespace-nowrap" style={{ color: "#f59e0b" }}>{formatMoney(expense.amount)}</span>
          </li>)}</ul>}
    </div>
  </section>;
}
