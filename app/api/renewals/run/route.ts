import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendMail, isMailerConfigured, mailerFrom } from "@/lib/mailer";

// Node runtime — Nodemailer needs Node's net/tls. Secrets are server-env only.
// Triggered once a day by a VPS cron line (see scripts/renewals-cron.sh):
//   curl -fsS -X POST https://os.webby.sg/api/renewals/run -H "x-cron-secret: $RENEWALS_CRON_SECRET"
// Sends ONE digest email listing every active, unpaid renewal that's inside its
// lead window (or overdue) and hasn't been emailed yet today, then stamps
// last_emailed_on so each fires at most once per day until paid/marked done.
export const runtime = "nodejs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const CRON_SECRET = process.env.RENEWALS_CRON_SECRET ?? "";
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN || "https://os.webby.sg";
const NOTIFY = (process.env.RENEWALS_NOTIFY_EMAILS ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);

type Reminder = {
  id: string;
  title: string | null;
  client_name: string | null;
  project_id: string | null;
  service_type: string | null;
  amount: number | null;
  currency: string | null;
  next_due_date: string;
  lead_days: number | null;
  notes: string | null;
  created_by: string | null;
};

function todayUTC(): { date: Date; iso: string } {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return { date: d, iso: d.toISOString().slice(0, 10) };
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function money(amount: number | null, currency: string | null): string {
  if (amount == null) return "";
  const cur = currency || "SGD";
  const n = amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${cur === "SGD" ? "S$" : cur + " "}${n}`;
}

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-SG", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  });
}

function makeAdmin() {
  return createClient(URL, SERVICE, { auth: { persistSession: false } });
}

function authed(req: Request): boolean {
  if (!CRON_SECRET) return false;
  const hdr = req.headers.get("x-cron-secret")
    || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return hdr === CRON_SECRET;
}

async function resolveRecipients(
  admin: ReturnType<typeof makeAdmin>,
  reminders: Reminder[],
): Promise<string[]> {
  if (NOTIFY.length) return NOTIFY;
  // Fall back to the distinct creators' login emails.
  const ids = [...new Set(reminders.map((r) => r.created_by).filter(Boolean))] as string[];
  const emails = new Set<string>();
  for (const id of ids) {
    try {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data?.user?.email) emails.add(data.user.email);
    } catch { /* ignore unresolved creators */ }
  }
  if (emails.size === 0 && mailerFrom()) {
    // Last resort: send to the sending mailbox itself so nothing is silently dropped.
    const fromAddr = mailerFrom().match(/<([^>]+)>/)?.[1] || mailerFrom();
    if (fromAddr) emails.add(fromAddr);
  }
  return [...emails];
}

function buildEmail(reminders: Reminder[], todayIso: string): { subject: string; html: string; text: string } {
  const overdue = reminders.filter((r) => r.next_due_date < todayIso);
  const subject = `${reminders.length} renewal${reminders.length > 1 ? "s" : ""} need attention`
    + (overdue.length ? ` (${overdue.length} overdue)` : "");

  const rows = reminders
    .slice()
    .sort((a, b) => (a.next_due_date < b.next_due_date ? -1 : 1))
    .map((r) => {
      const isOverdue = r.next_due_date < todayIso;
      const svc = (r.service_type || "service").replace(/^\w/, (c) => c.toUpperCase());
      const amt = money(r.amount, r.currency);
      const due = fmtDate(r.next_due_date) + (isOverdue ? " — OVERDUE" : "");
      return { client: r.client_name || "—", svc, amt, due, isOverdue, notes: r.notes || "" };
    });

  const htmlRows = rows.map((r) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-weight:600;color:#111">${esc(r.client)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#444">${esc(r.svc)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#444">${esc(r.amt)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;color:${r.isOverdue ? "#dc2626" : "#444"};font-weight:${r.isOverdue ? 700 : 400}">${esc(r.due)}</td>
    </tr>${r.notes ? `<tr><td colspan="4" style="padding:0 12px 10px;border-bottom:1px solid #eee;color:#888;font-size:12px">${esc(r.notes)}</td></tr>` : ""}`).join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <div style="max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
        <div style="padding:18px 20px;background:linear-gradient(135deg,#6d28d9,#9333ea);color:#fff">
          <div style="font-size:13px;opacity:.85;letter-spacing:.04em;text-transform:uppercase">Webby SG · Renewals</div>
          <div style="font-size:18px;font-weight:700;margin-top:2px">${esc(subject)}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead><tr>
            <th align="left" style="padding:10px 12px;border-bottom:2px solid #eee;color:#888;font-size:12px;text-transform:uppercase">Client</th>
            <th align="left" style="padding:10px 12px;border-bottom:2px solid #eee;color:#888;font-size:12px;text-transform:uppercase">Service</th>
            <th align="left" style="padding:10px 12px;border-bottom:2px solid #eee;color:#888;font-size:12px;text-transform:uppercase">Amount</th>
            <th align="left" style="padding:10px 12px;border-bottom:2px solid #eee;color:#888;font-size:12px;text-transform:uppercase">Due</th>
          </tr></thead>
          <tbody>${htmlRows}</tbody>
        </table>
        <div style="padding:18px 20px">
          <a href="${APP_ORIGIN}/renewals" style="display:inline-block;background:#6d28d9;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;font-size:14px">Open Renewals</a>
        </div>
      </div>
      <div style="text-align:center;color:#9ca3af;font-size:12px;margin-top:14px">
        You're receiving this because a renewal is due. Mark it paid in the app to stop these reminders.
      </div>
    </div>
  </body></html>`;

  const text = `${subject}\n\n`
    + rows.map((r) => `• ${r.client} — ${r.svc}${r.amt ? " · " + r.amt : ""} · due ${r.due}${r.notes ? `\n   ${r.notes}` : ""}`).join("\n")
    + `\n\nOpen Renewals: ${APP_ORIGIN}/renewals`;

  return { subject, html, text };
}

export async function POST(req: Request) {
  try {
    if (!URL || !SERVICE) {
      return NextResponse.json({ ok: false, reason: "supabase-not-configured" });
    }
    if (!authed(req)) {
      return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
    }
    if (!isMailerConfigured()) {
      return NextResponse.json({ ok: false, reason: "smtp-not-configured" });
    }

    const dry = new globalThis.URL(req.url).searchParams.get("dry") === "1";
    const { iso: todayIso, date: today } = todayUTC();

    const admin = makeAdmin();

    // Active + unpaid reminders not yet emailed today.
    const { data, error } = await admin
      .from("pm_billing_reminders")
      .select("id,title,client_name,project_id,service_type,amount,currency,next_due_date,lead_days,notes,created_by")
      .eq("status", "active")
      .eq("paid", false)
      .or(`last_emailed_on.is.null,last_emailed_on.lt.${todayIso}`);
    if (error) throw error;

    // Keep only those inside their lead window (or already overdue).
    const due = (data as Reminder[] ?? []).filter((r) => {
      if (!r.next_due_date) return false;
      const dueDate = new Date(r.next_due_date + "T00:00:00Z");
      const threshold = new Date(today);
      threshold.setUTCDate(threshold.getUTCDate() + (r.lead_days ?? 0));
      return dueDate.getTime() <= threshold.getTime();
    });

    if (due.length === 0) return NextResponse.json({ ok: true, due: 0, sent: false });

    const recipients = await resolveRecipients(admin, due);
    if (recipients.length === 0) {
      return NextResponse.json({ ok: false, reason: "no-recipients", due: due.length });
    }

    if (dry) {
      return NextResponse.json({
        ok: true, dryRun: true, due: due.length, recipients,
        items: due.map((r) => ({ client: r.client_name, service: r.service_type, due: r.next_due_date })),
      });
    }

    const { subject, html, text } = buildEmail(due, todayIso);
    await sendMail({ to: recipients, subject, html, text });

    // Stamp so we don't re-email these today.
    await admin.from("pm_billing_reminders")
      .update({ last_emailed_on: todayIso })
      .in("id", due.map((r) => r.id));

    return NextResponse.json({ ok: true, due: due.length, sent: true, recipients });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: String(e) }, { status: 500 });
  }
}
