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

/**
 * `accept` for every file picker in the app (task attachments, comments, the
 * description editor, chat, project Files).
 *
 * Keep this permissive. The old list omitted spreadsheets, presentations and
 * archives, so an SEO staffer clicking the paperclip to attach a .xlsx keyword
 * sheet found it greyed out in the OS dialog and reported "I can't upload".
 * Note `accept` only filters the picker — drag-and-drop and paste bypass it
 * entirely, which is why some .xlsx files got in anyway.
 */
export const FILE_ACCEPT = [
  "image/*", "video/*", "audio/*", "text/*",
  ".pdf", ".doc", ".docx", ".rtf", ".txt", ".text", ".log", ".md",
  ".xls", ".xlsx", ".xlsm", ".csv", ".ods",
  ".ppt", ".pptx", ".odp", ".odt",
  ".zip", ".rar", ".7z",
  ".json", ".xml", ".svg", ".psd", ".ai", ".fig", ".sketch",
].join(",");

/**
 * Supabase Storage rejects uploads above the project's global file-size limit
 * (50 MB by default — none of the buckets set their own `file_size_limit`).
 * Check against this BEFORE uploading so the user gets a message naming the file
 * and its size rather than an opaque storage error.
 */
export const MAX_UPLOAD_MB = 50;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
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

// ─── Stored rich text ────────────────────────────────────────────────────────
// Task descriptions (and anything else written in the RichEditor) are stored as
// HTML. These two live here, not in a component, because more than one surface
// renders that stored text — the task drawer and the SEO Work record — and a
// second copy of the sanitiser is exactly the kind of thing that drifts.

// Strip dangerous HTML before rendering/storing (no script/style/event handlers/js: URLs).
// Internal staff-only content, but defensive sanitisation is still good practice.
export function sanitizeHtml(html: string): string {
  if (typeof document === "undefined") return html;
  const tmpl = document.createElement("template");
  tmpl.innerHTML = html;
  tmpl.content.querySelectorAll("script,style,iframe,object,embed").forEach((n) => n.remove());
  tmpl.content.querySelectorAll<HTMLElement>("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      else if ((name === "href" || name === "src") && value.trim().startsWith("javascript:")) el.removeAttribute(attr.name);
    });
  });
  return tmpl.innerHTML;
}

// Detect whether stored description is HTML or legacy plain text. Legacy plain-text
// descriptions (pre-rich-text) should still render with line breaks preserved.
export function isHtml(s: string): boolean {
  return /<\/?(p|div|br|strong|em|b|i|u|h\d|ul|ol|li|a|span|img)\b/i.test(s);
}
