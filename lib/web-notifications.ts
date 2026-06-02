// OS/browser desktop notifications via the Web Notifications API.
//
// Scope: this fires native notifications while the app is open in a tab (even when
// that tab is backgrounded/unfocused). It does NOT deliver pushes when the browser
// is fully closed — that needs Web Push (service worker + VAPID + a server endpoint),
// which is a separate, heavier feature. In-app toasts + the chime still cover the
// foreground case; this adds OS-level alerts when the user is looking elsewhere.

export type WebNotificationPermission = "granted" | "denied" | "default" | "unsupported";

const ICON = "/webby-sg-logo.png";

export function isWebNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): WebNotificationPermission {
  if (!isWebNotificationSupported()) return "unsupported";
  return Notification.permission as WebNotificationPermission;
}

export async function requestNotificationPermission(): Promise<WebNotificationPermission> {
  if (!isWebNotificationSupported()) return "unsupported";
  try {
    return (await Notification.requestPermission()) as WebNotificationPermission;
  } catch {
    return getNotificationPermission();
  }
}

/**
 * Show a native notification — only when permission is granted AND the tab is not
 * currently focused (so we don't double up with the in-app toast the user can see).
 * Clicking focuses the window and navigates to `url`.
 */
export function showWebNotification(opts: { title: string; body?: string; url?: string; tag?: string }): void {
  if (!isWebNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  // Only interrupt with an OS notification when the user isn't looking at the app.
  if (typeof document !== "undefined" && document.visibilityState === "visible") return;
  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      icon: ICON,
      tag: opts.tag,
    });
    n.onclick = () => {
      try { window.focus(); } catch { /* ignore */ }
      if (opts.url) window.location.href = opts.url;
      n.close();
    };
  } catch {
    /* ignore — some browsers throw if constructed without a service worker */
  }
}
