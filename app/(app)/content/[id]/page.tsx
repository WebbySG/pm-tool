"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { Topbar } from "@/components/topbar";
import * as db from "@/lib/db";
import { type Article, type ArticleComment } from "@/lib/mock-data";
import {
  CheckCircle2, XCircle, Clock, Send, Copy, Check, MessageSquare,
  ArrowLeft, ExternalLink, RefreshCw, Pencil, Save, X,
} from "lucide-react";
import { renderMarkdown } from "@/lib/markdown";

const STATUS_META = {
  draft:             { label: "Draft",           color: "#4a7090" },
  pending_review:    { label: "Pending Review",  color: "#f59e0b" },
  changes_requested: { label: "Changes Needed",  color: "#ef4444" },
  approved:          { label: "Approved",        color: "#22c55e" },
  published:         { label: "Published",       color: "#38b6e8" },
};

const CLIENT_STATUS = {
  pending:           { label: "Awaiting Client", color: "#4a7090" },
  approved:          { label: "Client Approved", color: "#22c55e" },
  changes_requested: { label: "Client Feedback", color: "#f59e0b" },
};

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { articles, projects, updateArticleStatus } = useStore();
  const { user } = useAuth();
  const isAdmin = user?.pmRole === "admin";

  const [article, setArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const art = await db.dbGetArticle(id);
    if (!art) { router.replace("/content"); return; }
    setArticle(art);
    setAdminNotes(art.adminNotes ?? "");
    const cmts = await db.dbGetArticleComments(id);
    setComments(cmts);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sync from store when status changes elsewhere
  useEffect(() => {
    const storeArt = articles.find((a) => a.id === id);
    if (storeArt && article && storeArt.status !== article.status) {
      setArticle(storeArt);
    }
  }, [articles, id, article]);

  async function handleStatusChange(status: Article["status"]) {
    if (!article) return;
    setSaving(true);
    await updateArticleStatus(id, status, adminNotes);
    setArticle((a) => a ? { ...a, status, adminNotes } : a);
    setSaving(false);
    setEditingNotes(false);
  }

  async function handleSaveNotes() {
    if (!article) return;
    setSaving(true);
    await db.dbUpdateArticle(id, { admin_notes: adminNotes });
    setArticle((a) => a ? { ...a, adminNotes } : a);
    setSaving(false);
    setEditingNotes(false);
  }

  async function handleResolve(commentId: string) {
    await db.dbResolveComment(commentId);
    setComments((c) => c.map((cm) => cm.id === commentId ? { ...cm, resolved: true } : cm));
  }

  function copyShareLink() {
    if (!article) return;
    const url = `${window.location.origin}/review/${article.reviewToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || !article) {
    return (
      <>
        <Topbar title="Article" />
        <div className="flex items-center justify-center h-64">
          <RefreshCw size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      </>
    );
  }

  const project = projects.find((p) => p.id === article.projectId);
  const statusMeta = STATUS_META[article.status];
  const clientMeta = CLIENT_STATUS[article.clientApproval];
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/review/${article.reviewToken}`;
  const unresolvedComments = comments.filter((c) => !c.resolved);
  const paragraphs = article.content.split(/\n\n+/).filter(Boolean);

  return (
    <>
      <Topbar title="Article Review" />
      <div className="p-6 flex gap-6 max-w-6xl">

        {/* Main article */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/content")} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate" style={{ color: "var(--text)" }}>{article.title}</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {project?.name ?? "No project"}{article.targetKeyword ? ` · ${article.targetKeyword}` : ""} · {article.wordCount.toLocaleString()} words · by {article.submittedByName}
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: statusMeta.color + "20", color: statusMeta.color }}>
              {statusMeta.label}
            </span>
          </div>

          {/* Rendered article */}
          <div
            className="rounded-xl p-8 flex flex-col gap-1"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            {paragraphs.map((para, i) => {
              const paraComments = comments.filter((c) => c.paragraphIndex === i && !c.resolved);
              return (
                <div key={i} className="group relative">
                  <div
                    className="prose-custom rounded-lg px-2 py-1 transition-colors"
                    style={{ background: paraComments.length > 0 ? "#f59e0b0d" : "transparent" }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(para) }}
                  />
                  {paraComments.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5 pl-4" style={{ borderLeft: "2px solid #f59e0b40" }}>
                      {paraComments.map((cm) => (
                        <div key={cm.id} className="flex items-start gap-2">
                          <MessageSquare size={12} className="mt-0.5 shrink-0" style={{ color: "#f59e0b" }} />
                          <div className="flex-1">
                            <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{cm.commenterName}: </span>
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{cm.body}</span>
                          </div>
                          {isAdmin && (
                            <button onClick={() => handleResolve(cm.id)} className="text-xs hover:opacity-70 shrink-0" style={{ color: "#22c55e" }}>
                              Resolve
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Review panel */}
        <div className="w-72 shrink-0 flex flex-col gap-4">

          {/* Share link */}
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Client Share Link</p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs flex-1 truncate font-mono" style={{ color: "var(--text-muted)" }}>
                /review/{article.reviewToken.slice(0, 8)}…
              </p>
              <a href={shareUrl} target="_blank" rel="noreferrer" className="hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                <ExternalLink size={13} />
              </a>
            </div>
            <button
              onClick={copyShareLink}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: copied ? "#22c55e20" : "var(--accent)", color: copied ? "#22c55e" : "#fff", border: copied ? "1px solid #22c55e40" : "none" }}
            >
              {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
            </button>
          </div>

          {/* Client feedback */}
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Client Response</p>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: clientMeta.color + "20", color: clientMeta.color }}>
                {clientMeta.label}
              </span>
            </div>
            {article.clientApprovedBy && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Approved by <span style={{ color: "var(--text)" }}>{article.clientApprovedBy}</span>
              </p>
            )}
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <MessageSquare size={12} />
              {unresolvedComments.length} unresolved comment{unresolvedComments.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Review Actions</p>

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>Notes to Staff</label>
                  {!editingNotes
                    ? <button onClick={() => setEditingNotes(true)} style={{ color: "var(--accent)" }}><Pencil size={12} /></button>
                    : <button onClick={() => setEditingNotes(false)} style={{ color: "var(--text-muted)" }}><X size={12} /></button>
                  }
                </div>
                {editingNotes ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      autoFocus
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      placeholder="Feedback for the writer…"
                      className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                    <button onClick={handleSaveNotes} disabled={saving} className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg" style={{ background: "#22c55e20", color: "#22c55e" }}>
                      <Save size={11} /> Save notes
                    </button>
                  </div>
                ) : (
                  <p className="text-xs rounded-lg px-3 py-2" style={{ background: "var(--bg-surface)", color: adminNotes ? "var(--text)" : "var(--text-muted)", minHeight: 40 }}>
                    {adminNotes || "No notes yet…"}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                {article.status !== "approved" && article.status !== "published" && (
                  <button
                    onClick={() => handleStatusChange("approved")}
                    disabled={saving}
                    className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all hover:brightness-110"
                    style={{ background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e50" }}
                  >
                    <CheckCircle2 size={20} strokeWidth={2} />
                    Approve
                  </button>
                )}
                {article.status !== "changes_requested" && (
                  <button
                    onClick={() => handleStatusChange("changes_requested")}
                    disabled={saving}
                    className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all hover:brightness-110"
                    style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444450" }}
                  >
                    <XCircle size={20} strokeWidth={2} />
                    Request Changes
                  </button>
                )}
                {article.status === "approved" && (
                  <button
                    onClick={() => handleStatusChange("published")}
                    disabled={saving}
                    className="flex items-center gap-2 w-full py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ background: "#38b6e820", color: "#38b6e8", border: "1px solid #38b6e840" }}
                  >
                    <Send size={15} /> Mark as Published
                  </button>
                )}
                {(article.status === "draft" || article.status === "changes_requested") && (
                  <button
                    onClick={() => handleStatusChange("pending_review")}
                    disabled={saving}
                    className="flex items-center gap-2 w-full py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ background: "#f59e0b20", color: "#f59e0b", border: "1px solid #f59e0b40" }}
                  >
                    <Clock size={15} /> Set Pending Review
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Comments list (all) */}
          {comments.length > 0 && (
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>All Comments ({comments.length})</p>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {comments.map((cm) => (
                  <div key={cm.id} className="flex flex-col gap-0.5 p-2 rounded-lg" style={{ background: cm.resolved ? "var(--bg-surface)" : "#f59e0b0d", opacity: cm.resolved ? 0.5 : 1 }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{cm.commenterName}</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>¶{cm.paragraphIndex + 1}</span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{cm.body}</p>
                    {cm.resolved && <span className="text-xs" style={{ color: "#22c55e" }}>✓ Resolved</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
