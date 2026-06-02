import { supabase } from "./supabase";

// Web Push client helpers. Subscribes the browser to push and stores the
// subscription server-side (pm_push_subscriptions) so the send-push edge function
// can deliver notifications even when the app/tab is closed.

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Ask the server to deliver a Web Push for a just-created chat message or
 * notification. Fire-and-forget; failures are ignored (in-app realtime still works).
 */
export async function notifyPush(kind: "chat" | "notification", id: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, kind, id }),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

/**
 * Ensure the current browser is subscribed to Web Push for this user, and persist
 * the subscription. Call after notification permission is granted. Idempotent.
 * Returns true if a subscription is active and stored.
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported() || !VAPID_PUBLIC) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
      });
    }
    const json = sub.toJSON();
    if (!json.keys?.p256dh || !json.keys?.auth) return false;
    const { error } = await supabase.from("pm_push_subscriptions").upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    }, { onConflict: "endpoint" });
    return !error;
  } catch {
    return false;
  }
}
