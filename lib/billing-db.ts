import { supabase } from "./supabase";

export type BillingFrequency = "yearly" | "semiannual" | "quarterly" | "monthly" | "one_time" | "custom";
export type BillingServiceType = "hosting" | "domain" | "seo" | "maintenance" | "other";
export type BillingStatus = "active" | "paused" | "done";

export type BillingReminder = {
  id: string;
  title: string;
  clientName: string;
  projectId: string | null;
  serviceType: BillingServiceType;
  amount: number | null;
  currency: string;
  frequency: BillingFrequency;
  intervalMonths: number | null;
  nextDueDate: string;   // YYYY-MM-DD
  leadDays: number;
  status: BillingStatus;
  notes: string;
  lastChasedAt: string | null;
  createdBy: string | null;
  createdAt: string;
};

type Row = Record<string, unknown>;
const num = (v: unknown): number | null => (v == null ? null : typeof v === "number" ? v : parseFloat(String(v)));

// Effective recurrence in months for a frequency (null = one-off).
export function frequencyToMonths(freq: BillingFrequency, custom?: number | null): number | null {
  switch (freq) {
    case "yearly": return 12;
    case "semiannual": return 6;
    case "quarterly": return 3;
    case "monthly": return 1;
    case "custom": return custom && custom > 0 ? Math.round(custom) : 1;
    case "one_time": return null;
  }
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function rowToReminder(r: Row): BillingReminder {
  return {
    id: r.id as string,
    title: (r.title as string) ?? "",
    clientName: (r.client_name as string) ?? "",
    projectId: (r.project_id as string | null) ?? null,
    serviceType: (r.service_type as BillingServiceType) ?? "other",
    amount: num(r.amount),
    currency: (r.currency as string) ?? "SGD",
    frequency: (r.frequency as BillingFrequency) ?? "yearly",
    intervalMonths: (r.interval_months as number | null) ?? null,
    nextDueDate: r.next_due_date as string,
    leadDays: (r.lead_days as number) ?? 14,
    status: (r.status as BillingStatus) ?? "active",
    notes: (r.notes as string) ?? "",
    lastChasedAt: (r.last_chased_at as string | null) ?? null,
    createdBy: (r.created_by as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

export async function loadBillingReminders(): Promise<BillingReminder[]> {
  const { data, error } = await supabase.from("pm_billing_reminders")
    .select("*").order("next_due_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowToReminder(r as Row));
}

export type BillingDraft = {
  title?: string;
  clientName: string;
  projectId: string | null;
  serviceType: BillingServiceType;
  amount: number | null;
  currency?: string;
  frequency: BillingFrequency;
  customMonths?: number | null;
  nextDueDate: string;
  leadDays: number;
  status?: BillingStatus;
  notes?: string;
  createdBy: string | null;
};

function draftToRow(d: BillingDraft): Row {
  const intervalMonths = frequencyToMonths(d.frequency, d.customMonths);
  const title = (d.title && d.title.trim())
    || `${d.serviceType.charAt(0).toUpperCase() + d.serviceType.slice(1)} — ${d.clientName || "client"}`;
  return {
    title,
    client_name: d.clientName,
    project_id: d.projectId,
    service_type: d.serviceType,
    amount: d.amount,
    currency: d.currency ?? "SGD",
    frequency: d.frequency,
    interval_months: intervalMonths,
    next_due_date: d.nextDueDate,
    lead_days: d.leadDays,
    status: d.status ?? "active",
    notes: d.notes ?? null,
  };
}

export async function createBillingReminder(d: BillingDraft): Promise<string> {
  const row = draftToRow(d);
  row.created_by = d.createdBy;
  const { data, error } = await supabase.from("pm_billing_reminders").insert(row).select("id").single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateBillingReminder(id: string, d: BillingDraft): Promise<void> {
  const row = draftToRow(d);
  row.updated_at = new Date().toISOString();
  row.last_notified_on = null; // let the next cycle notify again with fresh details
  const { error } = await supabase.from("pm_billing_reminders").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteBillingReminder(id: string): Promise<void> {
  const { error } = await supabase.from("pm_billing_reminders").delete().eq("id", id);
  if (error) throw error;
}

export async function setBillingStatus(id: string, status: BillingStatus): Promise<void> {
  const { error } = await supabase.from("pm_billing_reminders")
    .update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

/**
 * Mark a reminder as chased/paid: recurring ones roll forward to the next future
 * occurrence; one-offs are marked done. Resets the daily-notification guard.
 */
export async function markChased(r: BillingReminder): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  if (!r.intervalMonths) {
    await supabase.from("pm_billing_reminders")
      .update({ status: "done", last_chased_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", r.id);
    return;
  }
  let next = addMonths(r.nextDueDate, r.intervalMonths);
  let guard = 0;
  while (next <= today && guard < 120) { next = addMonths(next, r.intervalMonths); guard++; }
  const { error } = await supabase.from("pm_billing_reminders").update({
    next_due_date: next,
    last_chased_at: new Date().toISOString(),
    last_notified_on: null,
    updated_at: new Date().toISOString(),
  }).eq("id", r.id);
  if (error) throw error;
}
