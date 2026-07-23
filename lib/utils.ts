import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract a human-readable message from anything thrown.
 *
 * Supabase / PostgREST errors are PLAIN OBJECTS ({ message, details, hint, code })
 * — they are NOT `Error` instances, so the common
 * `e instanceof Error ? e.message : String(e)` pattern falls through to
 * `String(e)` → "[object Object]", hiding the real cause. Route user-facing
 * error displays through this helper instead.
 */
/**
 * URL for a project page — prefers the human-readable slug ("/projects/asc-racking")
 * and falls back to the UUID. The /projects/[id] route resolves both.
 */
export function projectPath(p: { id: string; slug?: string | null }): string {
  return `/projects/${p.slug || p.id}`;
}

export function errorMessage(e: unknown): string {
  if (e == null) return "Unknown error";
  if (typeof e === "string") return e;
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "object") {
    const o = e as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof o.message === "string" && o.message) parts.push(o.message);
    // Supabase surfaces useful context in details/hint — append when present.
    if (typeof o.details === "string" && o.details && o.details !== o.message) parts.push(o.details);
    if (typeof o.hint === "string" && o.hint) parts.push(`(hint: ${o.hint})`);
    if (parts.length) return parts.join(" — ");
    try {
      const j = JSON.stringify(e);
      if (j && j !== "{}") return j;
    } catch {
      /* fall through */
    }
  }
  return String(e);
}
