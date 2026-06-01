"use client";
import { Plus, Trash2 } from "lucide-react";
import type { DiscountType } from "@/lib/invoice-types";
import { computeInvoiceTotals } from "@/lib/invoice-types";

export type LineItemDraft = { description: string; qty: number; unitPrice: number };

interface Props {
  items: LineItemDraft[];
  onChange: (items: LineItemDraft[]) => void;
  currency?: string;
  /** When provided, the footer shows discount controls + a Subtotal/Discount/Total breakdown. */
  discountType?: DiscountType;
  discountValue?: number;
  onDiscountChange?: (type: DiscountType, value: number) => void;
}

function formatMoney(amount: number, currency: string) {
  return `${currency === "SGD" ? "S$" : currency + " "}${amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LineItemsEditor({
  items, onChange, currency = "SGD",
  discountType, discountValue, onDiscountChange,
}: Props) {
  function update(i: number, patch: Partial<LineItemDraft>) {
    onChange(items.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, { description: "", qty: 1, unitPrice: 0 }]);
  }

  const showDiscount = !!onDiscountChange;
  const dType: DiscountType = discountType ?? "none";
  const dValue = discountValue ?? 0;
  const { subtotal, discountAmount, total } = computeInvoiceTotals({
    lineItems: items, discountType: dType, discountValue: dValue,
  });
  const moneyPrefix = currency === "SGD" ? "S$" : currency;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="grid grid-cols-[1fr_90px_120px_120px_36px] gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
        style={{ background: "var(--bg-surface)", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
        <div>Description</div>
        <div className="text-right">Qty</div>
        <div className="text-right">Unit Price</div>
        <div className="text-right">Line Total</div>
        <div />
      </div>
      {items.length === 0 && (
        <div className="px-4 py-6 text-center text-sm" style={{ color: "var(--text-muted)", background: "var(--bg-base)" }}>
          No line items yet.
        </div>
      )}
      {items.map((li, i) => (
        <div key={i} className="grid grid-cols-[1fr_90px_120px_120px_36px] gap-2 px-4 py-2 items-start"
          style={{ background: "var(--bg-base)", borderBottom: "1px solid var(--border)" }}>
          <textarea
            value={li.description}
            onChange={(e) => update(i, { description: e.target.value })}
            placeholder="Line description — supports multiple lines and bullets (• or -)"
            rows={Math.max(2, li.description.split("\n").length)}
            className="bg-transparent text-sm outline-none px-2 py-1.5 rounded resize-y font-mono"
            style={{ color: "var(--text)", border: "1px solid var(--border)", minHeight: 60 }}
          />
          <input
            type="number" step="0.01" min="0"
            value={li.qty}
            onChange={(e) => update(i, { qty: parseFloat(e.target.value) || 0 })}
            className="bg-transparent text-sm outline-none px-2 py-1.5 rounded text-right"
            style={{ color: "var(--text)", border: "1px solid var(--border)" }}
          />
          <input
            type="number" step="0.01" min="0"
            value={li.unitPrice}
            onChange={(e) => update(i, { unitPrice: parseFloat(e.target.value) || 0 })}
            className="bg-transparent text-sm outline-none px-2 py-1.5 rounded text-right"
            style={{ color: "var(--text)", border: "1px solid var(--border)" }}
          />
          <div className="text-sm text-right font-mono" style={{ color: "var(--text)" }}>
            {formatMoney(li.qty * li.unitPrice, currency)}
          </div>
          <button
            onClick={() => remove(i)} type="button"
            className="p-1.5 rounded hover:opacity-70 transition-opacity"
            style={{ color: "#ef4444" }} title="Remove line">
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <div className="flex items-start justify-between gap-4 px-4 py-3" style={{ background: "var(--bg-surface)" }}>
        <button onClick={add} type="button"
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
          style={{ background: "var(--accent)20", color: "var(--accent)" }}>
          <Plus size={12} /> Add line item
        </button>

        {showDiscount ? (
          <div className="w-72 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm" style={{ color: "var(--text-muted)" }}>
              <span>Subtotal</span>
              <span className="font-mono" style={{ color: "var(--text)" }}>{formatMoney(subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>Discount</span>
                <select value={dType}
                  onChange={(e) => {
                    const t = e.target.value as DiscountType;
                    onDiscountChange!(t, t === "none" ? 0 : dValue);
                  }}
                  className="bg-transparent text-xs outline-none px-1.5 py-1 rounded"
                  style={{ color: "var(--text)", border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
                  <option value="none">None</option>
                  <option value="percent">%</option>
                  <option value="fixed">{moneyPrefix}</option>
                </select>
                {dType !== "none" && (
                  <input type="number" step="0.01" min="0" value={dValue}
                    onChange={(e) => onDiscountChange!(dType, parseFloat(e.target.value) || 0)}
                    className="w-20 bg-transparent text-sm outline-none px-2 py-1 rounded text-right"
                    style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
                )}
              </div>
              <span className="font-mono text-sm" style={{ color: discountAmount > 0 ? "#ef4444" : "var(--text-muted)" }}>
                {discountAmount > 0 ? "−" : ""}{formatMoney(discountAmount, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1.5 mt-0.5 text-sm"
              style={{ borderTop: "1px solid var(--border)" }}>
              <span className="font-semibold" style={{ color: "var(--text)" }}>Total</span>
              {/* Editable total — typing a total back-calculates the discount as a fixed amount */}
              <div className="flex items-center gap-1">
                <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>{moneyPrefix}</span>
                <input
                  type="number" step="0.01" min="0"
                  value={total}
                  onChange={(e) => {
                    const entered = parseFloat(e.target.value);
                    if (isNaN(entered)) return;
                    // Clamp the desired total to [0, subtotal]; the gap becomes a fixed discount.
                    const clamped = Math.max(0, Math.min(entered, subtotal));
                    const newDiscount = Math.round((subtotal - clamped) * 100) / 100;
                    if (newDiscount <= 0) onDiscountChange!("none", 0);
                    else onDiscountChange!("fixed", newDiscount);
                  }}
                  className="w-28 bg-transparent text-sm outline-none px-2 py-1 rounded text-right font-bold font-mono"
                  style={{ color: "var(--text)", border: "1px solid var(--border)" }}
                  title="Edit the total — the discount is recalculated automatically" />
              </div>
            </div>
            <p className="text-xs text-right" style={{ color: "var(--text-muted)" }}>
              Editing the total sets the discount automatically.
            </p>
          </div>
        ) : (
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            Total <span className="font-bold ml-2" style={{ color: "var(--text)" }}>{formatMoney(total, currency)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
