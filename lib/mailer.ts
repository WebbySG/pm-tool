// Shared outbound-email transport (Titan Email / SMTP).
//
// All credentials come from the server env ONLY — never the DB, never the client.
// Set these in the VPS `.env.local` (server-only, gitignored):
//   SMTP_HOST   (default smtp.titan.email)
//   SMTP_PORT   (default 465 — implicit SSL; use 587 for STARTTLS)
//   SMTP_USER   the full mailbox, e.g. leon@webby.sg
//   SMTP_PASS   that mailbox's password (or app password)
//   SMTP_FROM   display From, default `Webby SG <SMTP_USER>`
//
// Used by app/api/renewals/run (renewal reminder digest) and, later, invoice email.
import nodemailer from "nodemailer";

const HOST = process.env.SMTP_HOST || "smtp.titan.email";
const PORT = Number(process.env.SMTP_PORT || 465);
const USER = process.env.SMTP_USER || "";
const PASS = process.env.SMTP_PASS || "";
const FROM = process.env.SMTP_FROM || (USER ? `Webby SG <${USER}>` : "");

/** True only when SMTP credentials are present, so callers can no-op gracefully when unconfigured. */
export function isMailerConfigured(): boolean {
  return Boolean(USER && PASS);
}

export function mailerFrom(): string {
  return FROM;
}

let cached: nodemailer.Transporter | null = null;
function transport(): nodemailer.Transporter {
  if (!cached) {
    cached = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: PORT === 465, // SSL on 465; STARTTLS is auto-negotiated on 587
      auth: { user: USER, pass: PASS },
    });
  }
  return cached;
}

export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<void> {
  if (!isMailerConfigured()) throw new Error("SMTP not configured (set SMTP_USER / SMTP_PASS)");
  await transport().sendMail({
    from: FROM,
    to: Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    replyTo: opts.replyTo,
  });
}
