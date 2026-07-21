"use client";
import { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/utils";
import {
  loadBillingReminders, createBillingReminder, updateBillingReminder, deleteBillingReminder,
  setBillingStatus, setBillingPaid, markChased,
  type BillingReminder, type BillingFrequency, type BillingServiceType, type BillingDraft,
} from "@/lib/billing-db";
import {
  CalendarClock, Plus, ChevronLeft, ChevronRight, Check, Pencil, Trash2,
  Pause, Play, X, Loader2, RotateCw,
} from "lucide-react";

const SERVICE_META: Record<BillingServiceType, { label: string; color: string }> = {
  hosting:     { label: "Hosting",     color: "#60a5fa" },
  domain:      { label: "Domain",      color: "#a78bfa" },
  seo:         { label: "SEO",         color: "#22c55e" },
  maintenance: { label: "Maintenance", color: "#f59e0b" },
  other:       { label: "Other",       color: "#94a3b8" },
};
const SERVICE_TYPES = Object.keys(SERVICE_META) as BillingServiceType[];

const FREQ_LABEL: Record<BillingFrequency, string> = {
  yearly: "Yearly", semiannual: "Every 6 months", quarterly: "Every 3 months",
  monthly: "Monthly", one_time: "One-time", custom: "Custom…",
};
const FREQS = Object.keys(FREQ_LABEL) as BillingFrequency[];

function pad(n: number) { return String(n).padStart(2, "0"); }
function todayISO() { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; }
function parseISO(iso: string) { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); }
function fmtDate(iso: string) { return parseISO(iso).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" }); }
function money(amt: number | null, cur: string) {
  if (amt == null) return "";
  return `${cur === "SGD" ? "S$" : cur + " "}${amt.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function dueInfo(iso: string): { text: string; color: string } {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const diff = Math.round((parseISO(iso).getTime() - t.getTime()) / 86400000);
  if (diff < 0) return { text: `Overdue ${-diff}d`, color: "#ef4444" };
  if (diff === 0) return { text: "Due today", color: "#ef4444" };
  if (diff === 1) return { text: "Due tomorrow", color: "#f59e0b" };
  if (diff <= 14) return { text: `Due in ${diff}d`, color: "#f59e0b" };
  return { text: `Due in ${diff}d`, color: "var(--text-muted)" };
}

export default function RenewalsPage() {
  return (
    <AdminOnly>
      <Topbar title="Renewals & Payment Reminders" />
      <RenewalsInner />
    </AdminOnly>
  );
}

function RenewalsInner() {
  const { projects } = useStore();
  const { user } = useAuth();
  const [items, setItems] = useState<BillingReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BillingReminder | null>(null);
  const [showForm, setShowForm] = useState(false);
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() }); // m: 0-indexed

  async function reload() {
    setLoading(true);
    try { setItems(await loadBillingReminders()); } finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.name ?? null;

  // Active/paused (not done), soonest first — the chase list.
  const upcoming = useMemo(
    () => items.filter((r) => r.status !== "done").sort((a, b) => (a.nextDueDate < b.nextDueDate ? -1 : 1)),
    [items],
  );

  // Map of dateStr -> reminders due that day, for the calendar grid.
  const byDate = useMemo(() => {
    const m = new Map<string, BillingReminder[]>();
    for (const r of items) {
      if (r.status === "done") continue;
      const arr = m.get(r.nextDueDate) ?? [];
      arr.push(r); m.set(r.nextDueDate, arr);
    }
    return m;
  }, [items]);

  // Build calendar cells
  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out: (string | null)[] = [];
    for (let i = 0; i < startWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(`${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}`);
    return out;
  }, [cursor]);

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString("en-SG", { month: "long", year: "numeric" });
  const todayStr = todayISO();

  async function handleChased(r: BillingReminder) { await markChased(r); reload(); }
  async function handleTogglePaid(r: BillingReminder) { await setBillingPaid(r.id, !r.paid); reload(); }
  async function handleDelete(id: string) { await deleteBillingReminder(id); reload(); }
  async function handleToggleStatus(r: BillingReminder) {
    await setBillingStatus(r.id, r.status === "paused" ? "active" : "paused"); reload();
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Track hosting, domain & SEO renewals and get reminded to chase clients for payment.
        </p>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
          <Plus size={15} /> Add renewal
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Calendar */}
        <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setCursor((c) => { const d = new Date(c.y, c.m - 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; })}
              className="w-7 h-7 rounded flex items-center justify-center hover:opacity-70" style={{ color: "var(--text-muted)" }}>
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{monthLabel}</p>
            <button onClick={() => setCursor((c) => { const d = new Date(c.y, c.m + 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; })}
              className="w-7 h-7 rounded flex items-center justify-center hover:opacity-70" style={{ color: "var(--text-muted)" }}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: "var(--text-muted)" }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((iso, i) => {
              if (!iso) return <div key={`b${i}`} />;
              const day = Number(iso.slice(-2));
              const dueHere = byDate.get(iso) ?? [];
              const isToday = iso === todayStr;
              return (
                <div key={iso} className="rounded-lg p-1 min-h-16 flex flex-col gap-0.5"
                  style={{ background: "var(--bg-base)", border: `1px solid ${isToday ? "var(--accent)" : "var(--border)"}` }}>
                  <span className="text-xs" style={{ color: isToday ? "var(--accent)" : "var(--text-muted)", fontWeight: isToday ? 700 : 400 }}>{day}</span>
                  {dueHere.slice(0, 3).map((r) => {
                    const c = SERVICE_META[r.serviceType].color;
                    return (
                      <button key={r.id} onClick={() => { setEditing(r); setShowForm(true); }}
                        className="text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate hover:opacity-80"
                        style={{ background: `${c}25`, color: c, opacity: r.paid ? 0.55 : 1 }}
                        title={`${r.clientName} — ${SERVICE_META[r.serviceType].label}${r.paid ? " (paid)" : ""}`}>
                        {r.paid ? "✓ " : ""}{r.clientName || SERVICE_META[r.serviceType].label}
                      </button>
                    );
                  })}
                  {dueHere.length > 3 && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>+{dueHere.length - 3}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming list */}
        <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>Upcoming & overdue</p>
          {loading ? (
            <div className="flex items-center gap-2 text-sm py-6" style={{ color: "var(--text-muted)" }}>
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>No renewals yet. Click “Add renewal”.</p>
          ) : (
            upcoming.map((r) => {
              const meta = SERVICE_META[r.serviceType];
              const di = dueInfo(r.nextDueDate);
              const pName = projectName(r.projectId);
              return (
                <div key={r.id} className="rounded-lg p-3 group" style={{ background: "var(--bg-base)", border: "1px solid var(--border)", opacity: r.status === "paused" ? 0.6 : 1 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: `${meta.color}25`, color: meta.color }}>{meta.label}</span>
                    <span className="text-sm font-semibold truncate flex-1" style={{ color: "var(--text)" }}>{r.clientName || "—"}</span>
                    <span className="text-xs font-semibold shrink-0"
                      style={{ color: r.status === "paused" ? "var(--text-muted)" : r.paid ? "#22c55e" : di.color }}>
                      {r.status === "paused" ? "Paused" : r.paid ? "Paid ✓" : di.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>{fmtDate(r.nextDueDate)}</span>
                    {r.amount != null && <span>· {money(r.amount, r.currency)}</span>}
                    <span>· {FREQ_LABEL[r.frequency]}</span>
                    {pName && <span className="truncate">· {pName}</span>}
                  </div>
                  {r.notes && <p className="text-xs mt-1 break-words" style={{ color: "var(--text-muted)" }}>{r.notes}</p>}
                  <div className="flex items-center gap-1 mt-2">
                    <button onClick={() => handleTogglePaid(r)}
                      title={r.paid ? "Marked paid for this period — click to undo" : "Mark this period as paid (stops reminders)"}
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                      style={r.paid ? { background: "#22c55e", color: "#fff" } : { background: "#22c55e25", color: "#22c55e" }}>
                      <Check size={11} /> {r.paid ? "Paid" : "Mark paid"}
                    </button>
                    <button onClick={() => handleChased(r)}
                      title={r.intervalMonths ? "Roll forward to the next renewal period" : "Mark this one-off as done"}
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                      style={{ background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                      {r.intervalMonths ? <><RotateCw size={11} /> Next renewal</> : <><Check size={11} /> Mark done</>}
                    </button>
                    <button onClick={() => handleToggleStatus(r)} title={r.status === "paused" ? "Resume" : "Pause"}
                      className="w-7 h-7 rounded flex items-center justify-center opacity-0 group-hover:opacity-100" style={{ color: "var(--text-muted)" }}>
                      {r.status === "paused" ? <Play size={12} /> : <Pause size={12} />}
                    </button>
                    <button onClick={() => { setEditing(r); setShowForm(true); }} title="Edit"
                      className="w-7 h-7 rounded flex items-center justify-center opacity-0 group-hover:opacity-100" style={{ color: "var(--text-muted)" }}>
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => handleDelete(r.id)} title="Delete"
                      className="w-7 h-7 rounded flex items-center justify-center opacity-0 group-hover:opacity-100" style={{ color: "#ef4444" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showForm && (
        <ReminderForm
          initial={editing}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          createdBy={user?.id ?? null}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); reload(); }}
        />
      )}
    </div>
  );
}

function ReminderForm({
  initial, projects, createdBy, onClose, onSaved,
}: {
  initial: BillingReminder | null;
  projects: { id: string; name: string }[];
  createdBy: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [projectId, setProjectId] = useState<string | null>(initial?.projectId ?? null);
  const [serviceType, setServiceType] = useState<BillingServiceType>(initial?.serviceType ?? "hosting");
  const [amount, setAmount] = useState<string>(initial?.amount != null ? String(initial.amount) : "");
  const [frequency, setFrequency] = useState<BillingFrequency>(initial?.frequency ?? "yearly");
  const [customMonths, setCustomMonths] = useState<string>(initial?.intervalMonths ? String(initial.intervalMonths) : "2");
  const [nextDueDate, setNextDueDate] = useState(initial?.nextDueDate ?? todayISO());
  const [leadDays, setLeadDays] = useState<string>(String(initial?.leadDays ?? 14));
  const [paid, setPaid] = useState<boolean>(initial?.paid ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!clientName.trim()) { setError("Client name is required"); return; }
    if (!nextDueDate) { setError("Next due date is required"); return; }
    setSaving(true); setError(null);
    const draft: BillingDraft = {
      clientName: clientName.trim(),
      projectId,
      serviceType,
      amount: amount.trim() ? parseFloat(amount) : null,
      frequency,
      customMonths: frequency === "custom" ? parseInt(customMonths) || 1 : null,
      nextDueDate,
      leadDays: parseInt(leadDays) || 0,
      paid,
      notes: notes.trim(),
      createdBy,
    };
    try {
      if (initial) await updateBillingReminder(initial.id, draft);
      else await createBillingReminder(draft);
      onSaved();
    } catch (e: unknown) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  const field = "bg-transparent text-sm outline-none px-3 py-2 rounded-lg w-full";
  const fieldStyle = { color: "var(--text)", border: "1px solid var(--border)", background: "var(--bg-base)" } as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "#00000070" }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 flex flex-col gap-3"
        style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <CalendarClock size={16} style={{ color: "var(--accent)" }} />
          <p className="text-base font-semibold flex-1" style={{ color: "var(--text)" }}>{initial ? "Edit renewal" : "Add renewal"}</p>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>

        <Lbl t="Client *">
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Acme Pte Ltd" className={field} style={fieldStyle} />
        </Lbl>

        <div className="grid grid-cols-2 gap-3">
          <Lbl t="Service">
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value as BillingServiceType)} className={field} style={fieldStyle}>
              {SERVICE_TYPES.map((s) => <option key={s} value={s}>{SERVICE_META[s].label}</option>)}
            </select>
          </Lbl>
          <Lbl t="Project (optional)">
            <select value={projectId ?? ""} onChange={(e) => setProjectId(e.target.value || null)} className={field} style={fieldStyle}>
              <option value="">— None —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Lbl>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Lbl t="Amount (optional)">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" min="0" placeholder="S$" className={field} style={fieldStyle} />
          </Lbl>
          <Lbl t="Frequency">
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as BillingFrequency)} className={field} style={fieldStyle}>
              {FREQS.map((f) => <option key={f} value={f}>{FREQ_LABEL[f]}</option>)}
            </select>
          </Lbl>
        </div>

        {frequency === "custom" && (
          <Lbl t="Repeat every (months)">
            <input value={customMonths} onChange={(e) => setCustomMonths(e.target.value)} type="number" min="1" className={field} style={fieldStyle} />
          </Lbl>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Lbl t="Next due date *">
            <input value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} type="date" className={field} style={fieldStyle} />
          </Lbl>
          <Lbl t="Remind days before">
            <input value={leadDays} onChange={(e) => setLeadDays(e.target.value)} type="number" min="0" className={field} style={fieldStyle} />
          </Lbl>
        </div>

        <label className="flex items-start gap-2 cursor-pointer select-none rounded-lg px-3 py-2"
          style={{ border: "1px solid var(--border)", background: "var(--bg-base)" }}>
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)}
            className="mt-0.5 w-4 h-4" style={{ accentColor: "var(--accent)" }} />
          <span className="flex flex-col">
            <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>Already paid for this period</span>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Leave unchecked if payment is still due — you’ll be reminded to chase it. Tick it once the client has paid for this date.
            </span>
          </span>
        </label>

        <Lbl t="Notes (optional)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. invoice via Stripe; remind on WhatsApp"
            className={`${field} resize-y`} style={fieldStyle} />
        </Lbl>

        {error && <p className="text-xs" style={{ color: "#ef4444" }}>⚠ {error}</p>}

        <div className="flex justify-end gap-2 mt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", opacity: saving ? 0.6 : 1 }}>
            {saving && <Loader2 size={13} className="animate-spin" />} {initial ? "Save" : "Add renewal"}
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
