import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Runs on the Node runtime (web-push needs Node crypto). All secrets come from the
// server env — nothing sensitive is stored in the database or shipped to the client.
export const runtime = "nodejs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:webdwebbysg@gmail.com";

type Payload = { title: string; body: string; url: string; tag?: string };

function preview(body: string | null, attachmentName: string | null): string {
  const b = (body ?? "").replace(/\[task:[0-9a-fA-F-]{36}\]/g, "🔗 task").trim();
  if (b) return b.slice(0, 140);
  if (attachmentName) return `📎 ${attachmentName}`;
  return "Sent a message";
}

export async function POST(req: Request) {
  try {
    if (!URL || !SERVICE || !VAPID_PUBLIC || !VAPID_PRIVATE) {
      // Not configured (e.g. missing prod env) — no-op rather than erroring the client.
      return NextResponse.json({ ok: false, reason: "push-not-configured" });
    }

    const { token, kind, id } = await req.json();
    if (!token || !kind || !id) return NextResponse.json({ ok: false, reason: "bad-request" }, { status: 400 });

    // Verify the caller is a logged-in user.
    const anon = createClient(URL, ANON);
    const { data: auth } = await anon.auth.getUser(token);
    const caller = auth?.user;
    if (!caller) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

    let recipientIds: string[] = [];
    let payload: Payload;

    if (kind === "chat") {
      const { data: msg } = await admin.from("pm_chat_messages")
        .select("id,conversation_id,author_id,body,attachment_name").eq("id", id).maybeSingle();
      if (!msg) return NextResponse.json({ ok: true, sent: 0 });
      if (msg.author_id !== caller.id) return NextResponse.json({ ok: false, reason: "not-author" }, { status: 403 });

      const { data: members } = await admin.from("pm_chat_members")
        .select("user_id").eq("conversation_id", msg.conversation_id);
      recipientIds = (members ?? [])
        .map((m) => m.user_id as string)
        .filter((uid) => uid && uid !== msg.author_id);

      const { data: author } = await admin.from("staff_members")
        .select("first_name,last_name,email").eq("user_id", msg.author_id).maybeSingle();
      const name = author
        ? ([author.first_name, author.last_name].filter(Boolean).join(" ") || author.email)
        : "New message";
      payload = {
        title: name,
        body: preview(msg.body, msg.attachment_name),
        url: `/chat?c=${msg.conversation_id}&m=${msg.id}`,
        tag: `chat-${msg.conversation_id}`,
      };
    } else if (kind === "notification") {
      const { data: n } = await admin.from("pm_notifications").select("*").eq("id", id).maybeSingle();
      if (!n) return NextResponse.json({ ok: true, sent: 0 });
      // Chat toasts already cover mentions; only push targeted, non-mention notifications.
      if (n.type === "mention" || !n.user_id) return NextResponse.json({ ok: true, sent: 0 });
      recipientIds = [n.user_id as string];
      payload = {
        title: (n.title as string) || "Notification",
        body: (n.body as string) || "",
        url: (n.link as string) || "/notifications",
        tag: `notif-${n.id}`,
      };
    } else {
      return NextResponse.json({ ok: false, reason: "unknown-kind" }, { status: 400 });
    }

    if (recipientIds.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    const { data: subs } = await admin.from("pm_push_subscriptions")
      .select("endpoint,p256dh,auth").in("user_id", recipientIds);

    const body = JSON.stringify(payload);
    let sent = 0;
    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
          body,
        );
        sent++;
      } catch (e: unknown) {
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          // Subscription is dead — clean it up.
          await admin.from("pm_push_subscriptions").delete().eq("endpoint", s.endpoint as string);
        }
      }
    }));

    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: String(e) }, { status: 500 });
  }
}
