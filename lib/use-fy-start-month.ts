"use client";
import { useSyncExternalStore } from "react";

/**
 * The financial-year start month (1 = January), shared by the Expenses page and
 * the profit chart on the Invoices page.
 *
 * It is a user choice because plenty of SG companies close 31 Mar or 30 Jun
 * rather than 31 Dec, and the boundary decides which year a cost is filed in.
 * Both pages MUST read the same value or the same expense would land in one
 * financial year on one screen and a different one on the other.
 *
 * ── Why useSyncExternalStore and not useState + useEffect ─────────────────────
 * localStorage is client-only, so reading it during render breaks SSR
 * hydration; reading it in an effect and calling setState trips this repo's
 * `react-hooks/set-state-in-effect` rule (and costs a second render). This is
 * exactly the case useSyncExternalStore exists for: a server snapshot of 1
 * (January, the default) matches what the server renders, and the client
 * snapshot takes over on hydration.
 *
 * The subscription covers BOTH directions of change: the native `storage`
 * event, which fires only in OTHER tabs, and a same-tab custom event dispatched
 * by setFyStartMonth — without the latter, changing the setting on the Expenses
 * page would not update a profit chart already mounted in the same tab.
 */

export const FY_MONTH_KEY = "expenses-fy-start-month";
const FY_MONTH_EVENT = "pm:fy-start-month";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(FY_MONTH_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(FY_MONTH_EVENT, onChange);
  };
}

// Returns a primitive, so React's snapshot equality check is satisfied without
// any caching. A malformed or absent value falls back to January.
function getSnapshot(): number {
  try {
    const n = Number(localStorage.getItem(FY_MONTH_KEY));
    return n >= 1 && n <= 12 ? Math.round(n) : 1;
  } catch {
    // Private mode / blocked site data — the default is still correct.
    return 1;
  }
}

function getServerSnapshot(): number {
  return 1;
}

export function useFyStartMonth(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Persist the setting and tell every mounted reader, this tab included. */
export function setFyStartMonth(month: number): void {
  const m = Math.min(12, Math.max(1, Math.round(month)));
  try {
    localStorage.setItem(FY_MONTH_KEY, String(m));
  } catch {
    // Nothing to do — the UI still reflects the choice for this session.
  }
  window.dispatchEvent(new Event(FY_MONTH_EVENT));
}
