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

export async function uploadAttachment(file: File, taskId: string): Promise<{ url: string; name: string; size: string; type: AttachmentType }> {
  const ext = file.name.split(".").pop() ?? "";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${taskId}/${Date.now()}_${safeName}`;
  const contentType = file.type || "application/octet-stream";
  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file, { contentType });
  if (error) throw error;
  const { data } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(path);
  const size = file.size > 1_048_576
    ? `${(file.size / 1_048_576).toFixed(1)} MB`
    : `${Math.round(file.size / 1024)} KB`;
  const type = inferType(file.type, ext);
  return { url: data.publicUrl, name: file.name, size, type };
}

type AttachmentType = "image" | "video" | "document" | "link";

function inferType(mime: string, ext: string): AttachmentType {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (["pdf", "doc", "docx"].includes(ext)) return "document";
  return "document";
}
