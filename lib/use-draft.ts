"use client";
import { useState, useEffect, useRef } from "react";

/**
 * Persists form state to localStorage as a draft.
 * Restores the draft after mount (safe for SSR — initial render always uses `initial`).
 * Call `clearDraft()` on successful submit to wipe the stored draft and reset the form.
 *
 * Returns [state, setState, clearDraft, restored]
 * `restored` is true briefly after mount when a non-empty draft was found.
 */
export function useDraft<T extends Record<string, unknown>>(
  key: string,
  initial: T,
  options?: { omit?: (keyof T)[] }
): [T, React.Dispatch<React.SetStateAction<T>>, () => void, boolean] {
  const storageKey = `draft:${key}`;
  const omit = options?.omit ?? [];

  const [state, setStateRaw] = useState<T>(initial);
  const [restored, setRestored] = useState(false);
  const skipSave = useRef(true); // prevent saving on the first setState from draft restore

  // Restore draft after mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<T>;

      // Only restore if at least one non-omitted field differs from initial
      const hasContent = Object.entries(parsed).some(([k, v]) => {
        if (omit.includes(k as keyof T)) return false;
        const init = initial[k as keyof T];
        if (Array.isArray(init)) return Array.isArray(v) && (v as unknown[]).length > 0;
        return v !== init && v !== "" && v !== null;
      });
      if (!hasContent) return;

      skipSave.current = true;
      setStateRaw((prev) => ({ ...prev, ...parsed }));
      setRestored(true);
    } catch { /* storage unavailable or corrupt */ }
  // Run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const setState: React.Dispatch<React.SetStateAction<T>> = (action) => {
    setStateRaw((prev) => {
      const next = typeof action === "function" ? (action as (p: T) => T)(prev) : action;

      if (skipSave.current) {
        // This setState came from the draft restore — don't overwrite storage, just apply it
        skipSave.current = false;
        return next;
      }

      // Persist to localStorage (omitting sensitive fields)
      try {
        const toSave = omit.length
          ? Object.fromEntries(Object.entries(next).filter(([k]) => !omit.includes(k as keyof T)))
          : next;
        localStorage.setItem(storageKey, JSON.stringify(toSave));
      } catch { /* storage full */ }

      // User has started editing — hide the restored banner
      setRestored(false);

      return next;
    });
  };

  function clearDraft() {
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    setRestored(false);
    skipSave.current = true;
    setStateRaw(initial);
  }

  return [state, setState, clearDraft, restored];
}
