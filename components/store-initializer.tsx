"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export function StoreInitializer() {
  const init = useStore((s) => s.init);
  useEffect(() => { init(); }, [init]);
  return null;
}
