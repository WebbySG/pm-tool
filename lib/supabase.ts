import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key, {
  auth: {
    // Keep users signed in across tab closes and browser restarts.
    // supabase-js persists the session to localStorage (which survives a tab
    // close — unlike sessionStorage) under "sb-<project-ref>-auth-token", and
    // silently refreshes the access token via the long-lived refresh token.
    // These are the library defaults; set explicitly so the intent is clear and
    // can't be lost to a future default change. We deliberately do NOT set
    // storageKey — overriding it would invalidate every existing saved session.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Storage helpers
export const ATTACHMENTS_BUCKET = "pm-attachments";
export const ARTICLE_IMAGES_BUCKET = "pm-article-images";

export async function uploadArticleImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `articles/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(ARTICLE_IMAGES_BUCKET).upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from(ARTICLE_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export type UploadedFile = { url: string; name: string; size: string; type: AttachmentType };

// Shared upload core. `prefix` is the folder inside the bucket — task uploads use
// the bare task id (historical layout), project files use `projects/<project id>`,
// chat uses `chat/<conversation id>` (see lib/chat-db.ts).
async function uploadToBucket(file: File, prefix: string): Promise<UploadedFile> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${prefix}/${Date.now()}_${safeName}`;
  const contentType = file.type || "application/octet-stream";
  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file, { contentType });
  if (error) throw error;
  const { data } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(path);
  const size = file.size > 1_048_576
    ? `${(file.size / 1_048_576).toFixed(1)} MB`
    : `${Math.round(file.size / 1024)} KB`;
  return { url: data.publicUrl, name: file.name, size, type: inferType(file.type) };
}

export async function uploadAttachment(file: File, taskId: string): Promise<UploadedFile> {
  return uploadToBucket(file, taskId);
}

// Project Files tab. Files live alongside task attachments in the same public
// bucket; the pm_project_media row created by dbAddProjectMedia is what actually
// makes them visible to everyone (and survive a refresh).
export async function uploadProjectFile(file: File, projectId: string): Promise<UploadedFile> {
  return uploadToBucket(file, `projects/${projectId}`);
}

type AttachmentType = "image" | "video" | "document" | "link";

// Everything that isn't an image or video is a "document" — including the
// spreadsheets/archives now allowed by FILE_ACCEPT.
function inferType(mime: string): AttachmentType {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

// Convert a `data:` URI (e.g. an image pasted from a web page or Word, which the
// browser hands over as base64 HTML rather than a clipboard file) into a real
// File so it can be uploaded to storage instead of being inlined into the row.
// Returns null for anything that isn't a parseable data: image.
export function dataUrlToFile(dataUrl: string, name = "pasted-image"): File | null {
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) return null;
  const [, mime, isBase64, payload] = match;
  if (!mime.startsWith("image/")) return null;
  try {
    const bin = isBase64 ? atob(payload) : decodeURIComponent(payload);
    // Build a plain ArrayBuffer (a valid BlobPart) rather than handing a typed
    // array straight to File — keeps TS happy about SharedArrayBuffer.
    const buf = new ArrayBuffer(bin.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i) & 0xff;
    const ext = mime.split("/")[1]?.split("+")[0] || "png";
    return new File([buf], `${name}.${ext}`, { type: mime });
  } catch {
    return null;
  }
}
