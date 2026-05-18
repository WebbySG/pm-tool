"use client";
import { Plus, Trash2 } from "lucide-react";

export type LineItemDraft = { description: string; qty: number; unitPrice: number };

interface Props {
  items: LineItemDraft[];
  onChange: (items: LineItemDraft[]) => void;
  currency?: string;
}

function formatMoney(amount: number, currency: string) {
  return `${currency === "SGD" ? "S$" : currency + " "}${amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LineItemsEditor({ items, onChange, currency = "SGD" }: Props) {
  function update(i: number, patch: Partial<LineItemDraft>) {
    onChange(items.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, { description: "", qty: 1, unitPrice: 0 }]);
  }

  const subtotal = items.reduce((s, li) => s + li.qty * li.unitPrice, 0);

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
        <div key={i} className="grid grid-cols-[1fr_90px_120px_120px_36px] gap-2 px-4 py-2 items-center"
          style={{ background: "var(--bg-base)", borderBottom: "1px solid var(--border)" }}>
          <input
            value={li.description}
            onChange={(e) => update(i, { description: e.target.value })}
            placeholder="Line description"
            className="bg-transparent text-sm outline-none px-2 py-1.5 rounded"
            style={{ color: "var(--text)", border: "1px solid var(--border)" }}
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
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--bg-surface)" }}>
        <button onClick={add} type="button"
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
          style={{ background: "var(--accent)20", color: "var(--accent)" }}>
          <Plus size={12} /> Add line item
        </button>
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>
          Total <span className="font-bold ml-2" style={{ color: "var(--text)" }}>{formatMoney(subtotal, currency)}</span>
        </div>
      </div>
    </div>
  );
}
