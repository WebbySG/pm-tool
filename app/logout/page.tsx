"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function LogoutPage() {
  useEffect(() => {
    async function nuke() {
      // Sign out from Supabase (invalidates the server-side session)
      await supabase.auth.signOut();
      // Clear all Supabase localStorage tokens for this project
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-"))
        .forEach((k) => localStorage.removeItem(k));
      // Clear the Zustand store cache
      sessionStorage.removeItem("pm-store-v2");
      // Hard redirect to login (not router.push — forces full reload)
      window.location.href = "/login";
    }
    nuke();
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
