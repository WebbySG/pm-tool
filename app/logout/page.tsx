"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function LogoutPage() {
  useEffect(() => {
    // Clear everything synchronously first so the redirect is instant
    // and never gets blocked by a hanging signOut() lock.
    Object.keys(localStorage)
      .filter((k) => k.startsWith("sb-"))
      .forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();

    // Fire-and-forget server-side invalidation (don't await — can deadlock)
    supabase.auth.signOut().catch(() => {});

    // Hard redirect — full page reload resets all in-memory Supabase state
    window.location.replace("/login");
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-base)" }}
    >
      <p style={{ color: "var(--text-muted)" }}>Signing out…</p>
    </div>
  );
}
