"use client";
import { useState } from "react";
import { Plus, Trash2, FileText, Loader2, Check, X, Search } from "lucide-react";
import type { DiscountType, InvoiceTemplate } from "@/lib/invoice-types";
import { computeInvoiceTotals, appendTemplateLineItems, templateAlreadyAdded } from "@/lib/invoice-types";
import { loadInvoiceTemplates } from "@/lib/invoice-db";
import { errorMessage } from "@/lib/utils";

export type LineItemDraft = { description: string; qty: number; unitPrice: number };

interface Props {
  items: LineItemDraft[];
  onChange: (items: LineItemDraft[]) => void;
  currency?: string;
  /** When provided, the footer shows discount controls + a Subtotal/Discount/Total breakdown. */
  discountType?: DiscountType;
  discountValue?: number;
  onDiscountChange?: (type: DiscountType, value: number) => void;
  /** Shows "Add from template", which APPENDS a template's lines (e.g. SEO + SEM on one invoice). */
  allowTemplates?: boolean;
  /** Hide this template from the picker — the template form passes its own id. */
  excludeTemplateId?: string;
}

function formatMoney(amount: number, currency: string) {
  return `${currency === "SGD" ? "S$" : currency + " "}${amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LineItemsEditor({
  items, onChange, currency = "SGD",
  discountType, discountValue, onDiscountChange,
  allowTemplates = false, excludeTemplateId,
}: Props) {
  // Template picker — loaded on first open, not on mount, so the editor costs
  // nothing on pages where nobody reaches for it.
  const [tplOpen, setTplOpen] = useState(false);
  const [templates, setTemplates] = useState<InvoiceTemplate[] | null>(null);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplError, setTplError] = useState<string | null>(null);
  const [tplQuery, setTplQuery] = useState("");
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  function update(i: number, patch: Partial<LineItemDraft>) {
    onChange(items.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    setLastAdded(null);
    onChange([...items, { description: "", qty: 1, unitPrice: 0 }]);
  }

  async function loadTemplates() {
    setTplLoading(true); setTplError(null);
    try { setTemplates(await loadInvoiceTemplates()); }
    catch (e: unknown) { setTplError(errorMessage(e)); }
    finally { setTplLoading(false); }
  }
  function toggleTemplates() {
    if (tplOpen) { setTplOpen(false); return; }
    setTplOpen(true);
    setLastAdded(null);
    if (!templates && !tplLoading) void loadTemplates();
  }
  function addTemplate(tpl: InvoiceTemplate) {
    onChange(appendTemplateLineItems(items, tpl.lineItems));
    setLastAdded(`Added ${tpl.name} — ${tpl.lineItems.length} line${tpl.lineItems.length !== 1 ? "s" : ""}`);
    setTplOpen(false);
    setTplQuery("");
  }

  // Enter → new line auto-prefixed with a "  • " bullet (matches the template bullet style).
  // Shift+Enter → plain new line (for headings like "Professional Services" / blank spacers).
  // Enter on an empty bullet → drop the bullet and exit the list.
  const BULLET = "  • ";
  function handleDescKeyDown(i: number, e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    const el = e.currentTarget;
    const value = el.value;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? start;

    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const currentLine = value.slice(lineStart, start);
    const bulletMatch = currentLine.match(/^(\s*[•\-*]\s+)(.*)$/);

    e.preventDefault();

    // Empty bullet (no content) → remove the bullet prefix, ending the list.
    if (bulletMatch && start === end && bulletMatch[2].trim() === "") {
      const newValue = value.slice(0, lineStart) + value.slice(start);
      update(i, { description: newValue });
      const caret = lineStart;
      requestAnimationFrame(() => { try { el.selectionStart = el.selectionEnd = caret; } catch { /* node gone */ } });
      return;
    }

    // Continue an existing bullet with the same prefix; otherwise start a new bullet.
    const prefix = bulletMatch ? bulletMatch[1] : BULLET;
    const insert = "\n" + prefix;
    const newValue = value.slice(0, start) + insert + value.slice(end);
    update(i, { description: newValue });
    const caret = start + insert.length;
    requestAnimationFrame(() => { try { el.selectionStart = el.selectionEnd = caret; } catch { /* node gone */ } });
  }

  const showDiscount = !!onDiscountChange;
  const dType: DiscountType = discountType ?? "none";
  const dValue = discountValue ?? 0;
  const { subtotal, discountAmount, total } = computeInvoiceTotals({
    lineItems: items, discountType: dType, discountValue: dValue,
  });
  const moneyPrefix = currency === "SGD" ? "S$" : currency;

  const q = tplQuery.trim().toLowerCase();
  const pickable = (templates ?? [])
    .filter((t) => t.id !== excludeTemplateId)
    .filter((t) => !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));

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
            onKeyDown={(e) => handleDescKeyDown(i, e)}
            placeholder="Line description — Enter adds a • bullet · Shift+Enter for a plain line"
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

      {/* Template picker — rendered in flow, NOT as an absolute dropdown: this
          editor is overflow-hidden, which would clip a popup. */}
      {allowTemplates && tplOpen && (
        <div className="px-4 py-3 flex flex-col gap-2"
          style={{ background: "var(--bg-base)", borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Add a template&apos;s lines to this {showDiscount ? "document" : "template"}
            </span>
            <button type="button" onClick={() => setTplOpen(false)} title="Close"
              className="ml-auto flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              <X size={11} /> Close
            </button>
          </div>

          {tplLoading ? (
            <div className="flex items-center gap-2 text-sm py-3" style={{ color: "var(--text-muted)" }}>
              <Loader2 size={13} className="animate-spin" /> Loading templates…
            </div>
          ) : tplError ? (
            <div className="flex items-center gap-2 text-xs py-2" style={{ color: "#ef4444" }}>
              ⚠ Couldn&apos;t load templates — {tplError}
              <button type="button" onClick={() => void loadTemplates()} className="underline font-semibold">Retry</button>
            </div>
          ) : (
            <>
              {(templates?.length ?? 0) > 6 && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                  style={{ border: "1px solid var(--border)" }}>
                  <Search size={12} style={{ color: "var(--text-muted)" }} />
                  <input value={tplQuery} onChange={(e) => setTplQuery(e.target.value)} autoFocus
                    placeholder="Search templates…"
                    className="bg-transparent text-sm outline-none flex-1"
                    style={{ color: "var(--text)" }} />
                </div>
              )}
              {pickable.length === 0 ? (
                <p className="text-sm py-2" style={{ color: "var(--text-muted)" }}>
                  {q ? "No template matches that search." : "No other templates yet."}
                </p>
              ) : (
                <div className="flex flex-col max-h-72 overflow-y-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
                  {pickable.map((tpl) => {
                    const lines = tpl.lineItems.length;
                    const tplTotal = tpl.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0);
                    const single = lines === 1 && tpl.lineItems[0].qty !== 1
                      ? ` (${tpl.lineItems[0].qty} × ${formatMoney(tpl.lineItems[0].unitPrice, currency)})` : "";
                    const already = templateAlreadyAdded(items, tpl.lineItems);
                    return (
                      <div key={tpl.id} className="flex items-center gap-3 px-3 py-2"
                        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
                        <FileText size={13} style={{ color: "#a78bfa", flexShrink: 0 }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{tpl.name}</p>
                          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                            {lines} line{lines !== 1 ? "s" : ""} · {formatMoney(tplTotal, currency)}{single}
                            {already && <span style={{ color: "#22c55e" }}> · already added</span>}
                          </p>
                        </div>
                        <button type="button" onClick={() => addTemplate(tpl)} disabled={lines === 0}
                          title={lines === 0 ? "This template has no line items" : `Append ${tpl.name}'s lines`}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg shrink-0"
                          style={{
                            background: "var(--accent)20", color: "var(--accent)",
                            opacity: lines === 0 ? 0.4 : 1,
                          }}>
                          <Plus size={11} /> {already ? "Add again" : "Add"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 px-4 py-3" style={{ background: "var(--bg-surface)" }}>
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={add} type="button"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "var(--accent)20", color: "var(--accent)" }}>
              <Plus size={12} /> Add line item
            </button>
            {allowTemplates && (
              <button onClick={toggleTemplates} type="button"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{
                  background: tplOpen ? "#a78bfa25" : "transparent", color: "#a78bfa",
                  border: "1px solid #a78bfa60",
                }}>
                <FileText size={12} /> Add from template
              </button>
            )}
          </div>
          {lastAdded && (
            <p className="flex items-center gap-1 text-xs" style={{ color: "#22c55e" }}>
              <Check size={11} /> {lastAdded}
            </p>
          )}
        </div>

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
