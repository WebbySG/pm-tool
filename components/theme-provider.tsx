"use client";
import { useEffect } from "react";
import { getStoredTheme, applyTheme } from "@/lib/theme";

// Syncs localStorage → CSS vars on first render (handles page refresh).
export function ThemeProvider() {
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);
  return null;
}
