// Synthesized notification chime — no audio asset required. Uses the Web Audio API
// to play a short, soft two-note bell. Works offline and adds nothing to the bundle.
//
// Browsers block audio until the user has interacted with the page; we lazily create
// (and resume) the AudioContext on first play, by which point the user has navigated
// into the app, so playback is allowed.

const MUTE_KEY = "chat-sound-muted";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isChatSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setChatSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

// Play one bell note at the given frequency, starting at `at` seconds, for `dur` seconds.
function note(ac: AudioContext, freq: number, at: number, dur: number, peak: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  // Quick attack, smooth exponential decay — a soft "ding" rather than a beep.
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/**
 * Play the notification chime, unless the user has muted it.
 * Safe to call from realtime handlers — silently no-ops if audio is unavailable.
 */
export function playNotificationSound(): void {
  if (isChatSoundMuted()) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    const t = ac.currentTime + 0.01;
    note(ac, 880, t, 0.18, 0.16);        // A5
    note(ac, 1320, t + 0.09, 0.22, 0.12); // E6 — pleasant ascending two-note bell
  } catch {
    /* ignore playback errors */
  }
}
