"use client";
import { useEffect } from "react";
import { primeAudioUnlock } from "@/lib/notification-sound";

// Registers the service worker (required for installability + Web Push) and primes
// the audio unlock so the notification chime can play after the user interacts.
// Safe no-op on browsers without service worker support.
export function PwaRegister() {
  useEffect(() => {
    primeAudioUnlock();
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => { /* ignore registration errors */ });
  }, []);
  return null;
}
