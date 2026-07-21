"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LineItemsEditor, type LineItemDraft } from "@/components/invoice-line-items-editor";
import { createInvoiceTemplate, updateInvoiceTemplate } from "@/lib/invoice-db";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { InvoiceTemplate } from "@/lib/invoice-types";

interface Props {
  existing?: InvoiceTemplate;
}

export function InvoiceTemplateForm({ existing }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [defaultDueDays, setDefaultDueDays] = useState(existing?.defaultDueDays ?? 14);
  const [defaultNotes, setDefaultNotes] = useState(existing?.defaultNotes ?? "");
  const [defaultPaymentInstructions, setDefaultPaymentInstructions] = useState(existing?.defaultPaymentInstructions ?? "");
  const [items, setItems] = useState<LineItemDraft[]>(
    existing?.lineItems.map((li) => ({ description: li.description, qty: li.qty, unitPrice: li.unitPrice })) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) { setError("Template name is required"); return; }
    setSaving(true); setError(null);
    try {
      const draft = {
        name: name.trim(),
        description,
        defaultNotes,
        defaultPaymentInstructions,
        defaultDueDays,
        lineItems: items,
        createdBy: user?.id ?? null,
      };
      if (existing) {
        await updateInvoiceTemplate(existing.id, draft);
      } else {
        await createInvoiceTemplate(draft);
      }
      router.push("/invoices/templates");
    } catch (e: unknown) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <Field label="Template name *">
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Monthly SEO Retainer"
          className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
          style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
      </Field>

      <Field label="Internal description">
        <input value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional — only you see this"
          className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full"
          style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
      </Field>

      <Field label="Default due days (after issue date)">
        <input type="number" min="0" value={defaultDueDays}
          onChange={(e) => setDefaultDueDays(parseInt(e.target.value, 10) || 0)}
          className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-32"
          style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
      </Field>

      <div>
        <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Line Items</p>
        <LineItemsEditor items={items} onChange={setItems} />
      </div>

      <Field label="Default notes (shown on invoice)">
        <textarea value={defaultNotes} onChange={(e) => setDefaultNotes(e.target.value)}
          rows={3} placeholder="e.g. Thank you for your business."
          className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full resize-y"
          style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
      </Field>

      <Field label="Default payment instructions">
        <textarea value={defaultPaymentInstructions} onChange={(e) => setDefaultPaymentInstructions(e.target.value)}
          rows={4} placeholder={`e.g.\nBank transfer to:\nDBS Current 012-345-6789\nWebby SG Pte Ltd`}
          className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full resize-y font-mono"
          style={{ color: "var(--text)", border: "1px solid var(--border)" }} />
      </Field>

      {error && <p className="text-xs" style={{ color: "#ef4444" }}>⚠ {error}</p>}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", opacity: saving ? 0.7 : 1 }}>
          {saving && <Loader2 size={13} className="animate-spin" />}
          {existing ? "Save changes" : "Create template"}
        </button>
        <button onClick={() => router.back()} type="button"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "var(--text-muted)" }}>{label}</label>
      {children}
    </div>
  );
}
