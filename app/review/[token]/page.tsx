"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { renderMarkdown } from "@/lib/markdown";
import { type Article, type ArticleComment } from "@/lib/mock-data";
import {
  CheckCircle2, MessageSquare, Download, Zap, Clock, X,
  ThumbsUp, AlertCircle, Send,
} from "lucide-react";

type ClientApproval = "pending" | "approved" | "changes_requested";

const APPROVAL_META: Record<ClientApproval, { label: string; color: string; icon: React.ReactNode }> = {
  pending:           { label: "Awaiting your approval", color: "#f59e0b", icon: <Clock size={14} /> },
  approved:          { label: "You approved this article", color: "#22c55e", icon: <CheckCircle2 size={14} /> },
  changes_requested: { label: "You requested changes", color: "#ef4444", icon: <AlertCircle size={14} /> },
};

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();

  const [article, setArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Comment UI state
  const [activeParaIdx, setActiveParaIdx] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commenterName, setCommenterName] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("reviewer_name") ?? "" : ""
  );
  const [submittingComment, setSubmittingComment] = useState(false);

  // Approval state
  const [showApprovePanel, setShowApprovePanel] = useState(false);
  const [approveName, setApproveName] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("reviewer_name") ?? "" : ""
  );
  const [approveNote, setApproveNote] = useState("");
  const [approving, setApproving] = useState(false);

  const commentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("pm_articles")
        .select("*")
        .eq("review_token", token)
        .maybeSingle();

      if (!data) { setNotFound(true); setLoading(false); return; }

      setArticle({
        id: data.id,
        projectId: data.project_id ?? null,
        clientId: data.client_id ?? null,
        postType: data.post_type ?? "other",
        title: data.title,
        content: data.content,
        wordCount: data.word_count ?? 0,
        targetKeyword: data.target_keyword ?? "",
        metaDescription: data.meta_description ?? "",
        status: data.status,
        adminNotes: data.admin_notes ?? "",
        reviewToken: data.review_token,
        submittedById: data.submitted_by_id ?? null,
        submittedByName: data.submitted_by_name ?? "",
        clientApproval: data.client_approval ?? "pending",
        clientApprovedBy: data.client_approved_by ?? null,
        linkedTaskId: data.linked_task_id ?? null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });

      const { data: cmts } = await supabase
        .from("pm_article_comments")
        .select("*")
        .eq("article_id", data.id)
        .order("created_at", { ascending: true });

      setComments((cmts ?? []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        articleId: c.article_id as string,
        paragraphIndex: c.paragraph_index as number,
        commenterName: c.commenter_name as string,
        body: c.body as string,
        resolved: (c.resolved as boolean) ?? false,
        createdAt: c.created_at as string,
      })));

      setLoading(false);
    }
    load();
  }, [token]);

  async function submitComment() {
    if (!article || !commentText.trim() || !commenterName.trim() || activeParaIdx === null) return;
    setSubmittingComment(true);
    localStorage.setItem("reviewer_name", commenterName);

    const { data } = await supabase.from("pm_article_comments").insert({
      article_id: article.id,
      paragraph_index: activeParaIdx,
      commenter_name: commenterName.trim(),
      body: commentText.trim(),
      resolved: false,
    }).select().single();

    if (data) {
      setComments((c) => [...c, {
        id: data.id, articleId: data.article_id, paragraphIndex: data.paragraph_index,
        commenterName: data.commenter_name, body: data.body,
        resolved: data.resolved, createdAt: data.created_at,
      }]);
    }
    setCommentText("");
    setActiveParaIdx(null);
    setSubmittingComment(false);
  }

  async function submitApproval(decision: "approved" | "changes_requested") {
    if (!article || !approveName.trim()) return;
    setApproving(true);
    localStorage.setItem("reviewer_name", approveName);

    await supabase.from("pm_articles").update({
      client_approval: decision,
      client_approved_by: approveName.trim(),
    }).eq("review_token", token);

    setArticle((a) => a ? { ...a, clientApproval: decision, clientApprovedBy: approveName.trim() } : a);
    if (approveNote.trim() && article) {
      const paragraphs = article.content.split(/\n\n+/).filter(Boolean);
      const { data } = await supabase.from("pm_article_comments").insert({
        article_id: article.id,
        paragraph_index: paragraphs.length,
        commenter_name: approveName.trim(),
        body: `[${decision === "approved" ? "APPROVED" : "CHANGES REQUESTED"}] ${approveNote.trim()}`,
        resolved: false,
      }).select().single();
      if (data) {
        setComments((c) => [...c, {
          id: data.id, articleId: data.article_id, paragraphIndex: data.paragraph_index,
          commenterName: data.commenter_name, body: data.body, resolved: data.resolved, createdAt: data.created_at,
        }]);
      }
    }
    setApproving(false);
    setShowApprovePanel(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#070d18" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center anim-float"
          style={{ background: "linear-gradient(135deg, #38b6e8, #ff6b47)" }}>
          <Zap size={18} color="#fff" fill="#fff" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: "#070d18" }}>
        <p className="text-lg font-bold" style={{ color: "#cce4ff" }}>Article not found</p>
        <p className="text-sm" style={{ color: "#4a7090" }}>This review link may have expired or is invalid.</p>
      </div>
    );
  }

  if (!article) return null;

  const approvalMeta = APPROVAL_META[article.clientApproval];
  const paragraphs = article.content.split(/\n\n+/).filter(Boolean);
  const unresolved = comments.filter((c) => !c.resolved);
  const date = new Date(article.createdAt).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .prose-custom h1 { color: #1a1a1a !important; }
          .prose-custom h2 { color: #1a1a1a !important; }
          .prose-custom h3 { color: #1a1a1a !important; }
          .prose-custom p  { color: #1a1a1a !important; }
          .prose-custom li { color: #1a1a1a !important; }
          .prose-custom strong { color: #1a1a1a !important; }
          .article-container { background: #fff !important; border: none !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="min-h-screen" style={{ background: "#070d18" }}>
        {/* Header */}
        <div className="no-print sticky top-0 z-30 px-6 py-4 flex items-center gap-4 backdrop-blur-sm"
          style={{ background: "#0c0e1890", borderBottom: "1px solid #1c2030" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #38b6e8, #ff6b47)" }}>
            <Zap size={14} color="#fff" fill="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate" style={{ color: "#cce4ff" }}>{article.title}</p>
            <p className="text-xs" style={{ color: "#4a7090" }}>{date} · {article.wordCount.toLocaleString()} words</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-medium"
              style={{ background: approvalMeta.color + "20", color: approvalMeta.color, border: `1px solid ${approvalMeta.color}30` }}>
              {approvalMeta.icon} {approvalMeta.label}
            </span>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "#0f1d2e", border: "1px solid #1c2030", color: "#4a7090" }}
            >
              <Download size={13} /> PDF
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Article title */}
          <h1 className="text-3xl font-extrabold mb-1 leading-tight" style={{ color: "#cce4ff" }}>
            {article.title}
          </h1>
          {article.targetKeyword && (
            <p className="text-sm mb-8" style={{ color: "#4a7090" }}>
              Target keyword: <span style={{ color: "#38b6e8" }}>{article.targetKeyword}</span>
            </p>
          )}

          {/* Paragraphs with inline commenting */}
          <div className="article-container rounded-2xl p-8 flex flex-col gap-1"
            style={{ background: "#0f1d2e", border: "1px solid #1c2030" }}>
            {paragraphs.map((para, i) => {
              const paraComments = comments.filter((c) => c.paragraphIndex === i && !c.resolved);
              const isActive = activeParaIdx === i;

              return (
                <div key={i} className="group relative">
                  {/* Paragraph */}
                  <div
                    className={`prose-custom rounded-lg px-3 py-1 transition-all cursor-pointer relative`}
                    style={{
                      background: isActive ? "#38b6e815" : paraComments.length > 0 ? "#f59e0b08" : "transparent",
                      outline: isActive ? "1px solid #38b6e840" : "none",
                    }}
                    onClick={() => {
                      setActiveParaIdx(isActive ? null : i);
                      setTimeout(() => commentRef.current?.focus(), 50);
                    }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(para) }}
                  />

                  {/* Comment button on hover */}
                  {!isActive && (
                    <button
                      className="no-print absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                      style={{ background: "#1c2030", color: "#4a7090", border: "1px solid #1c3248" }}
                      onClick={(e) => { e.stopPropagation(); setActiveParaIdx(i); setTimeout(() => commentRef.current?.focus(), 50); }}
                    >
                      <MessageSquare size={11} /> Comment
                    </button>
                  )}

                  {/* Existing para comments */}
                  {paraComments.length > 0 && (
                    <div className="mt-2 mb-1 flex flex-col gap-1.5 pl-4" style={{ borderLeft: "2px solid #f59e0b50" }}>
                      {paraComments.map((cm) => (
                        <div key={cm.id} className="flex items-start gap-2">
                          <MessageSquare size={11} className="mt-0.5 shrink-0" style={{ color: "#f59e0b" }} />
                          <p className="text-xs leading-relaxed" style={{ color: "#4a7090" }}>
                            <span style={{ color: "#cce4ff", fontWeight: 600 }}>{cm.commenterName}: </span>
                            {cm.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline comment box */}
                  {isActive && (
                    <div className="no-print mt-2 mb-3 rounded-xl p-3 flex flex-col gap-2"
                      style={{ background: "#12151f", border: "1px solid #38b6e830" }}>
                      <input
                        type="text"
                        placeholder="Your name"
                        value={commenterName}
                        onChange={(e) => setCommenterName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg text-sm outline-none"
                        style={{ background: "#0f1d2e", border: "1px solid #1c2030", color: "#cce4ff" }}
                      />
                      <textarea
                        ref={commentRef}
                        placeholder="Leave a comment on this paragraph…"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                        style={{ background: "#0f1d2e", border: "1px solid #1c2030", color: "#cce4ff" }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={submitComment}
                          disabled={!commentText.trim() || !commenterName.trim() || submittingComment}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                          style={{ background: "#38b6e8", color: "#fff" }}
                        >
                          <Send size={11} /> {submittingComment ? "Posting…" : "Post Comment"}
                        </button>
                        <button onClick={() => { setActiveParaIdx(null); setCommentText(""); }}
                          className="px-3 py-1.5 rounded-lg text-xs" style={{ color: "#4a7090" }}>
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Approval section */}
          <div className="no-print mt-8">
            {article.clientApproval === "pending" ? (
              !showApprovePanel ? (
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowApprovePanel(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
                    style={{ background: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e40" }}
                  >
                    <ThumbsUp size={16} /> Approve Article
                  </button>
                  <button
                    onClick={() => setShowApprovePanel(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
                    style={{ background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440" }}
                  >
                    <AlertCircle size={16} /> Request Changes
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl p-6 flex flex-col gap-4"
                  style={{ background: "#0f1d2e", border: "1px solid #1c2030" }}>
                  <h3 className="font-semibold text-base" style={{ color: "#cce4ff" }}>Your response</h3>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: "#4a7090" }}>Your name *</label>
                    <input
                      type="text"
                      placeholder="e.g. John from Acme Co."
                      value={approveName}
                      onChange={(e) => setApproveName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "#12151f", border: "1px solid #1c2030", color: "#cce4ff" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: "#4a7090" }}>Overall note (optional)</label>
                    <textarea
                      placeholder="Any general feedback on the article…"
                      value={approveNote}
                      onChange={(e) => setApproveNote(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                      style={{ background: "#12151f", border: "1px solid #1c2030", color: "#cce4ff" }}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => submitApproval("approved")}
                      disabled={!approveName.trim() || approving}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                      style={{ background: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e40" }}
                    >
                      <CheckCircle2 size={16} /> {approving ? "Submitting…" : "Approve"}
                    </button>
                    <button
                      onClick={() => submitApproval("changes_requested")}
                      disabled={!approveName.trim() || approving}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                      style={{ background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440" }}
                    >
                      <AlertCircle size={16} /> {approving ? "Submitting…" : "Request Changes"}
                    </button>
                    <button onClick={() => setShowApprovePanel(false)} className="px-4 rounded-xl" style={{ color: "#4a7090" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center gap-3 py-6 rounded-2xl"
                style={{ background: approvalMeta.color + "10", border: `1px solid ${approvalMeta.color}30` }}>
                <span style={{ color: approvalMeta.color }}>{approvalMeta.icon}</span>
                <p className="text-sm font-medium" style={{ color: approvalMeta.color }}>
                  {article.clientApproval === "approved"
                    ? `Approved by ${article.clientApprovedBy}`
                    : `Changes requested by ${article.clientApprovedBy}`}
                </p>
              </div>
            )}
          </div>

          {/* Comment count */}
          {unresolved.length > 0 && (
            <div className="no-print mt-6 flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{ background: "#f59e0b10", border: "1px solid #f59e0b30", color: "#f59e0b" }}>
              <MessageSquare size={15} />
              {unresolved.length} paragraph comment{unresolved.length !== 1 ? "s" : ""} left on this article
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 flex items-center justify-center gap-2" style={{ color: "#4a7090" }}>
            <div className="w-5 h-5 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #38b6e8, #ff6b47)" }}>
              <Zap size={10} color="#fff" fill="#fff" />
            </div>
            <p className="text-xs">Powered by WebbyOps</p>
          </div>
        </div>
      </div>
    </>
  );
}
