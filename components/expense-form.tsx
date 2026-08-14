"use client";
import { useRef, useState } from "react";
import {
  Receipt, X, Loader2, Upload, Trash2, ExternalLink, Image as ImageIcon,
  FileText, Info, Check,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { errorMessage, FILE_ACCEPT, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, formatBytes } from "@/lib/utils";
import { uploadExpenseReceipt } from "@/lib/supabase";
import {
  createExpense, updateExpense, deleteExpense, addExpenseReceipt, deleteExpenseReceipt,
  setExpensesSubmitted, type ExpenseDraft,
} from "@/lib/expense-db";
import {
  type Expense, type ExpenseCategory, type ExpenseReceipt, type PaymentMethod,
  EXPENSE_CATEGORIES, CATEGORY_META, categoryMeta,
  PAYMENT_METHODS, PAYMENT_LABEL,
  GST_RATE, gstFromInclusive, formatMoney,
} from "@/lib/expense-types";

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-SG", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function ExpenseForm({
  initial, projects, onClose,
}: {
  initial: Expense | null;
  projects: { id: string; name: string }[];
  /** Always reloads the list in the parent — a partial save must never leave stale rows on screen. */
  onClose: () => void;
}) {
  const { user } = useAuth();

  // Once an expense exists (either we're editing, or Save just created it),
  // receipts upload immediately. Before that they're staged in memory.
  const [expenseId, setExpenseId] = useState<string | null>(initial?.id ?? null);
  const [receipts, setReceipts] = useState<ExpenseReceipt[]>(initial?.receipts ?? []);
  const [staged, setStaged] = useState<File[]>([]);

  const [expenseDate, setExpenseDate] = useState(initial?.expenseDate ?? todayISO());
  const [vendor, setVendor] = useState(initial?.vendor ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(initial?.category ?? "software");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial?.paymentMethod ?? "bank_transfer");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [gst, setGst] = useState(initial ? String(initial.gstAmount) : "");
  const [projectId, setProjectId] = useState<string | null>(initial?.projectId ?? null);
  const [deductible, setDeductible] = useState(initial?.deductible ?? true);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitted, setSubmitted] = useState(initial?.status === "submitted");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const amountNum = parseFloat(amount) || 0;
  const gstNum = parseFloat(gst) || 0;
  const net = Math.round((amountNum - gstNum) * 100) / 100;
  const meta = categoryMeta(category);

  // ── Receipt handling ───────────────────────────────────────────────────────
  // Per-file so one oversized/failed file never aborts the whole batch, and the
  // message names the offending file (the fix from the 2026-08-09 upload bugs).
  async function acceptFiles(files: File[]) {
    if (files.length === 0) return;
    setUploadError(null);
    const tooBig = files.filter((f) => f.size > MAX_UPLOAD_BYTES);
    const ok = files.filter((f) => f.size <= MAX_UPLOAD_BYTES);
    if (tooBig.length > 0) {
      setUploadError(
        tooBig.map((f) => `“${f.name}” is ${formatBytes(f.size)} — over the ${MAX_UPLOAD_MB} MB limit`).join("; "),
      );
    }
    if (ok.length === 0) return;

    // No expense row yet → stage them; they upload right after Save creates one.
    if (!expenseId) {
      setStaged((s) => [...s, ...ok]);
      return;
    }
    setUploading(true);
    const failed: string[] = [];
    for (const f of ok) {
      try {
        const up = await uploadExpenseReceipt(f, expenseId);
        const row = await addExpenseReceipt(expenseId, up, user?.id ?? null);
        setReceipts((r) => [...r, row]);
      } catch (e: unknown) {
        failed.push(`“${f.name}”: ${errorMessage(e)}`);
      }
    }
    setUploading(false);
    if (failed.length > 0) setUploadError(`Receipt not saved — ${failed.join("; ")}`);
  }

  async function removeReceipt(r: ExpenseReceipt) {
    setUploadError(null);
    const prev = receipts;
    setReceipts((rs) => rs.filter((x) => x.id !== r.id)); // optimistic
    try {
      await deleteExpenseReceipt(r.id);
    } catch (e: unknown) {
      setReceipts(prev); // restore — the row is still there
      setUploadError(`Could not remove “${r.name}” — ${errorMessage(e)}`);
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function save() {
    if (!vendor.trim()) { setError("Who was paid? Enter the vendor or supplier name."); return; }
    if (!expenseDate) { setError("The date on the receipt is required."); return; }
    if (!(amountNum > 0)) { setError("Enter the amount paid."); return; }
    if (gstNum > amountNum) { setError("The GST portion can't be more than the total paid."); return; }

    setSaving(true); setError(null);
    const draft: ExpenseDraft = {
      expenseDate,
      vendor: vendor.trim(),
      category,
      paymentMethod,
      description,
      amount: Math.round(amountNum * 100) / 100,
      gstAmount: Math.round(gstNum * 100) / 100,
      projectId,
      deductible,
      notes,
      createdBy: user?.id ?? null,
    };

    try {
      let id = expenseId;
      if (id) {
        await updateExpense(id, draft);
      } else {
        id = await createExpense(draft);
        setExpenseId(id); // from here on, receipts upload immediately
      }

      // Submission state is a separate column set — only touch it when it changed.
      if (submitted !== (initial?.status === "submitted")) {
        await setExpensesSubmitted([id], submitted);
      }

      // Upload anything staged before the row existed.
      if (staged.length > 0) {
        const failed: string[] = [];
        const survived: File[] = [];
        for (const f of staged) {
          try {
            const up = await uploadExpenseReceipt(f, id);
            const row = await addExpenseReceipt(id, up, user?.id ?? null);
            setReceipts((r) => [...r, row]);
          } catch (e: unknown) {
            failed.push(`“${f.name}”: ${errorMessage(e)}`);
            survived.push(f);
          }
        }
        setStaged(survived);
        if (failed.length > 0) {
          // The expense IS saved — say so, and keep the dialog open so the user
          // can retry the receipt rather than silently losing their only copy.
          setError(
            `Expense saved, but ${failed.length} receipt${failed.length === 1 ? "" : "s"} failed to upload — `
            + `${failed.join("; ")}. Try the upload again below; don't close this until the receipt is listed.`,
          );
          setSaving(false);
          return;
        }
      }
      onClose();
    } catch (e: unknown) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!expenseId) { onClose(); return; }
    setSaving(true); setError(null);
    try {
      await deleteExpense(expenseId);
      onClose();
    } catch (e: unknown) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  // Closing with files still staged would bin the only copy of a receipt the
  // user thinks they've attached — the same silent-loss trap as the task-drawer
  // comment draft (CLAUDE.md #12). Make them confirm, and never let a stray
  // backdrop click do it.
  const hasUnsaved = staged.length > 0;
  function requestClose(fromBackdrop: boolean) {
    if (saving || uploading) return;
    if (hasUnsaved) {
      if (fromBackdrop) return; // a stray backdrop click must never discard receipts
      if (!confirm(
        `${staged.length} receipt${staged.length === 1 ? "" : "s"} not uploaded yet.`
        + " Close and discard them? Save the expense instead to keep them.",
      )) return;
    }
    onClose();
  }

  const field = "bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full";
  const fieldStyle = { color: "var(--text)", border: "1px solid var(--border)", background: "var(--bg-base)" } as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "#00000070" }}
      onClick={() => requestClose(true)}>
      <div className="rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 flex flex-col gap-3"
        style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center gap-2">
          <Receipt size={16} style={{ color: "var(--accent)" }} />
          <p className="text-base font-semibold flex-1" style={{ color: "var(--text)" }}>
            {initial ? "Edit expense" : "Record expense"}
          </p>
          <button onClick={() => requestClose(false)} disabled={saving || uploading} style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Lbl t="Date on receipt *">
            <input value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} type="date"
              className={field} style={fieldStyle} />
          </Lbl>
          <Lbl t="Paid to (vendor) *">
            <input value={vendor} onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Google Cloud, Vistaprint" className={field} style={fieldStyle} />
          </Lbl>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Lbl t="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className={field} style={fieldStyle}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_META[c].label}</option>
              ))}
            </select>
          </Lbl>
          <Lbl t="Paid by">
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className={field} style={fieldStyle}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_LABEL[m]}</option>)}
            </select>
          </Lbl>
        </div>

        {/* Category-specific IRAS reminder — guidance, not advice. */}
        {meta.taxNote && (
          <div className="flex gap-2 rounded-lg px-3 py-2 text-[11px] leading-snug"
            style={{ background: `${meta.color}14`, border: `1px solid ${meta.color}40`, color: "var(--text)" }}>
            <Info size={13} style={{ color: meta.color, flexShrink: 0, marginTop: 1 }} />
            <span>{meta.taxNote}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Lbl t="Amount paid (SGD, incl. GST) *">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" min="0"
              placeholder="0.00" className={field} style={fieldStyle} />
          </Lbl>
          <Lbl t="GST portion (input tax)">
            <div className="flex gap-2">
              <input value={gst} onChange={(e) => setGst(e.target.value)} type="number" step="0.01" min="0"
                placeholder="0.00" className={field} style={fieldStyle} />
              <button type="button" onClick={() => setGst(String(gstFromInclusive(amountNum)))}
                disabled={!(amountNum > 0)}
                title={`Extract ${GST_RATE}% GST from the total (total × ${GST_RATE}/${100 + GST_RATE})`}
                className="px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap disabled:opacity-40"
                style={{ border: "1px solid var(--border)", color: "var(--accent)", background: "var(--bg-surface)" }}>
                {GST_RATE}%
              </button>
            </div>
          </Lbl>
        </div>

        <p className="text-[11px] -mt-1 leading-snug" style={{ color: "var(--text-muted)" }}>
          Net of GST: <strong style={{ color: "var(--text)" }}>{formatMoney(net)}</strong>.
          {" "}Only fill GST if you are GST-registered and the receipt is a valid tax invoice — otherwise leave it 0
          and the whole amount is the cost. For a foreign-currency receipt, enter the SGD amount your bank actually
          charged (that reconciles to your statement) and note the original amount below.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Lbl t="Project (optional)">
            <select value={projectId ?? ""} onChange={(e) => setProjectId(e.target.value || null)}
              className={field} style={fieldStyle}>
              <option value="">— None —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Lbl>
          <Lbl t="What was it for?">
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Meta ads — Cemimax July" className={field} style={fieldStyle} />
          </Lbl>
        </div>

        <label className="flex items-start gap-2 cursor-pointer select-none rounded-lg px-3 py-2"
          style={{ border: "1px solid var(--border)", background: "var(--bg-base)" }}>
          <input type="checkbox" checked={deductible} onChange={(e) => setDeductible(e.target.checked)}
            className="mt-0.5 w-4 h-4" style={{ accentColor: "var(--accent)" }} />
          <span className="flex flex-col">
            <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
              Tax-deductible business expense
            </span>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Untick for costs that stay in the books but can&apos;t be claimed — private-car running costs,
              fines and penalties, or the personal share of a mixed expense.
            </span>
          </span>
        </label>

        <Lbl t="Notes (optional)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="e.g. USD 49.00 @ 1.35; annual plan; card ending 4412"
            className={`${field} resize-y`} style={fieldStyle} />
        </Lbl>

        {/* ── Receipts ── */}
        <div className="flex flex-col gap-2 rounded-lg p-3"
          style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide flex-1" style={{ color: "var(--text-muted)" }}>
              Receipts / tax invoices
            </p>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Keep for 5 years — IRAS can ask for these
            </span>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragging(false);
              acceptFiles(Array.from(e.dataTransfer.files ?? []));
            }}
            onClick={() => fileRef.current?.click()}
            className="rounded-lg px-3 py-4 flex items-center justify-center gap-2 cursor-pointer text-xs"
            style={{
              border: `1px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
              background: dragging ? "rgba(var(--accent-rgb), 0.08)" : "var(--bg-base)",
              color: "var(--text-muted)",
            }}>
            {uploading
              ? <><Loader2 size={13} className="animate-spin" /> Uploading…</>
              : <><Upload size={13} /> Drop a photo or PDF of the receipt, or click to choose</>}
          </div>
          <input ref={fileRef} type="file" multiple accept={FILE_ACCEPT} className="hidden"
            onChange={(e) => { acceptFiles(Array.from(e.target.files ?? [])); if (fileRef.current) fileRef.current.value = ""; }} />

          {uploadError && (
            <p className="text-[11px] leading-snug" style={{ color: "#ef4444" }}>⚠ {uploadError}</p>
          )}

          {/* Staged (not yet uploaded — no expense row exists yet) */}
          {staged.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg px-2.5 py-2"
              style={{ background: "var(--bg-base)", border: "1px dashed var(--border)" }}>
              <FileText size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <span className="text-xs flex-1 truncate" style={{ color: "var(--text)" }}>{f.name}</span>
              <span className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>
                {formatBytes(f.size)} · uploads on save
              </span>
              <button onClick={() => setStaged((s) => s.filter((_, ix) => ix !== i))}
                className="shrink-0" style={{ color: "#ef4444" }} title="Remove">
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {receipts.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg px-2.5 py-2"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
              {r.type === "image"
                ? <ImageIcon size={13} style={{ color: "#34d399", flexShrink: 0 }} />
                : <FileText size={13} style={{ color: "#60a5fa", flexShrink: 0 }} />}
              <span className="text-xs flex-1 truncate" style={{ color: "var(--text)" }}>{r.name}</span>
              <span className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>
                {r.size}{r.uploadedAt ? ` · ${fmtDateTime(r.uploadedAt)}` : ""}
              </span>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="shrink-0"
                style={{ color: "var(--text-muted)" }} title="Open">
                <ExternalLink size={13} />
              </a>
              <button onClick={() => removeReceipt(r)} className="shrink-0" style={{ color: "#ef4444" }} title="Delete">
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {receipts.length === 0 && staged.length === 0 && (
            <p className="text-[11px]" style={{ color: "#f59e0b" }}>
              ⚠ No receipt attached yet — this expense will be flagged &ldquo;No receipt&rdquo; until one is added.
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none rounded-lg px-3 py-2"
          style={{ border: "1px solid var(--border)", background: "var(--bg-base)" }}>
          <input type="checkbox" checked={submitted} onChange={(e) => setSubmitted(e.target.checked)}
            className="w-4 h-4" style={{ accentColor: "#22c55e" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
            Already submitted to the accountant / IRAS
          </span>
        </label>

        {error && <p className="text-xs leading-snug" style={{ color: "#ef4444" }}>⚠ {error}</p>}

        <div className="flex items-center gap-2 mt-1">
          {initial && (
            confirmDelete ? (
              <button onClick={handleDelete} disabled={saving}
                className="px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ background: "#ef4444", color: "#fff" }}>
                Confirm delete
              </button>
            ) : (
              <button onClick={() => setConfirmDelete(true)} disabled={saving}
                className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                style={{ color: "#ef4444", border: "1px solid #ef444440" }}>
                <Trash2 size={12} /> Delete
              </button>
            )
          )}
          <div className="flex-1" />
          <button onClick={() => requestClose(false)} disabled={saving || uploading}
            className="px-4 py-2 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving || uploading}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              opacity: saving || uploading ? 0.6 : 1,
            }}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {initial ? "Save changes" : "Record expense"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Lbl({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{t}</span>
      {children}
    </label>
  );
}
