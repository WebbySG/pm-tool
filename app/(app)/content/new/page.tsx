"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { Topbar } from "@/components/topbar";
import { useDraft } from "@/lib/use-draft";
import { uploadArticleImage } from "@/lib/supabase";
import { type PostType } from "@/lib/mock-data";
import { RotateCcw, Send, Save, ImagePlus, Loader2 } from "lucide-react";

const initialForm = {
  projectId: "",
  postType: "other" as PostType,
  title: "",
  content: "",
  targetKeyword: "",
  metaDescription: "",
};

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: "gmb",     label: "GMB Post" },
  { value: "website", label: "Website Post" },
  { value: "other",   label: "Other" },
];

export default function NewArticlePage() {
  const router = useRouter();
  const { projects, createArticle } = useStore();
  const { user } = useAuth();

  const [form, setForm, clearDraft, restored] = useDraft("new-article", initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = form.content.trim() ? form.content.trim().split(/\s+/).length : 0;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadArticleImage(file);
      const markdown = `![${file.name}](${url})`;
      const el = textareaRef.current;
      if (el) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newContent = form.content.slice(0, start) + markdown + form.content.slice(end);
        setForm({ ...form, content: newContent });
        setTimeout(() => {
          el.selectionStart = el.selectionEnd = start + markdown.length;
          el.focus();
        }, 0);
      } else {
        setForm({ ...form, content: form.content + "\n" + markdown });
      }
    } catch {
      setError("Image upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(status: "draft" | "pending_review") {
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.content.trim()) { setError("Article content is required."); return; }
    setSaving(true);
    setError("");
    try {
      const selectedProject = projects.find((p) => p.id === form.projectId);
      const id = await createArticle({
        projectId: form.projectId || null,
        clientId: selectedProject?.clientId ?? null,
        postType: form.postType,
        title: form.title.trim(),
        content: form.content,
        targetKeyword: form.targetKeyword.trim(),
        metaDescription: form.metaDescription.trim(),
        status,
        adminNotes: "",
        submittedById: user?.id ?? null,
        submittedByName: user?.name ?? "Staff",
        clientApproval: "pending",
        clientApprovedBy: null,
      });
      clearDraft();
      router.push(`/content/${id}`);
    } catch {
      setError("Failed to save article. Please try again.");
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title="New Article" />
      <div className="p-6 flex gap-6 max-w-5xl">
        {/* Editor */}
        <div className="flex-1 flex flex-col gap-4">
          {restored && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "#38b6e815", border: "1px solid #38b6e840", color: "#9dd8f5" }}>
              <RotateCcw size={12} /> Draft restored
              <button onClick={clearDraft} className="ml-auto hover:opacity-70" style={{ color: "var(--text-muted)" }}>Discard</button>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-muted)" }}>ARTICLE TITLE *</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. 10 SEO Tips for Singapore Businesses"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl text-base font-semibold outline-none"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>CONTENT * (Markdown supported)</label>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{wordCount.toLocaleString()} words</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                  title="Insert image"
                >
                  {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                  {uploading ? "Uploading…" : "Insert Image"}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>
            </div>
            <textarea
              ref={textareaRef}
              placeholder={`## Introduction\n\nWrite your article here. Use markdown:\n- **bold**, _italic_\n- ## Headings\n- - Bullet lists\n- ![alt text](image-url) for images`}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none font-mono leading-relaxed"
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                color: "var(--text)", minHeight: 480,
              }}
            />
          </div>

          {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "#ef444420", color: "#ef4444" }}>{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => handleSubmit("draft")}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <Save size={14} /> Save Draft
            </button>
            <button
              onClick={() => handleSubmit("pending_review")}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <Send size={14} /> {saving ? "Submitting…" : "Submit for Review"}
            </button>
            <button
              onClick={() => { clearDraft(); router.push("/content"); }}
              className="ml-auto px-4 py-2.5 rounded-xl text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-4">
          <div
            className="rounded-xl p-4 flex flex-col gap-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Article Details</p>

            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Project</label>
              <select
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="">— No project —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Post Type</label>
              <div className="flex flex-col gap-1.5">
                {POST_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, postType: value })}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all"
                    style={{
                      background: form.postType === value ? "var(--accent)20" : "var(--bg-surface)",
                      border: `1px solid ${form.postType === value ? "var(--accent)60" : "var(--border)"}`,
                      color: form.postType === value ? "var(--accent)" : "var(--text-muted)",
                    }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: form.postType === value ? "var(--accent)" : "var(--border)" }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Target Keyword</label>
              <input
                type="text"
                placeholder="e.g. seo singapore"
                value={form.targetKeyword}
                onChange={(e) => setForm({ ...form, targetKeyword: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>

            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Meta Description</label>
              <textarea
                placeholder="Brief summary for search engines (150–160 chars recommended)"
                value={form.metaDescription}
                onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                maxLength={320}
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              <p className="text-xs mt-1" style={{ color: form.metaDescription.length > 160 ? "#f59e0b" : "var(--text-muted)" }}>
                {form.metaDescription.length}/160
              </p>
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Markdown Guide</p>
            <div className="flex flex-col gap-1.5 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              <span><span style={{ color: "var(--accent)" }}># </span>Heading 1</span>
              <span><span style={{ color: "var(--accent)" }}>## </span>Heading 2</span>
              <span><span style={{ color: "var(--accent)" }}>**</span>bold<span style={{ color: "var(--accent)" }}>**</span></span>
              <span><span style={{ color: "var(--accent)" }}>_</span>italic<span style={{ color: "var(--accent)" }}>_</span></span>
              <span><span style={{ color: "var(--accent)" }}>- </span>bullet point</span>
              <span><span style={{ color: "var(--accent)" }}>---</span> divider</span>
              <span><span style={{ color: "var(--accent)" }}>![alt](url)</span> image</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
