"use client";
import { useEffect } from "react";

// Registers the service worker (required for installability + Web Push).
// Safe no-op on browsers without service worker support.
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => { /* ignore registration errors */ });
  }, []);
  return null;
}
