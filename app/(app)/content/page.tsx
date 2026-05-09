"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { Topbar } from "@/components/topbar";
import { type Article, type ArticleStatus, type PostType } from "@/lib/mock-data";
import {
  Plus, FileEdit, Clock, CheckCircle2, XCircle, Send,
  ChevronRight, Search, Trash2, Globe, MapPin, FolderOpen,
} from "lucide-react";

const STATUS_META: Record<ArticleStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft:             { label: "Draft",          color: "#4a7090", icon: <FileEdit size={11} /> },
  pending_review:    { label: "Pending Review", color: "#f59e0b", icon: <Clock size={11} /> },
  changes_requested: { label: "Changes Needed", color: "#ef4444", icon: <XCircle size={11} /> },
  approved:          { label: "Approved",       color: "#22c55e", icon: <CheckCircle2 size={11} /> },
  published:         { label: "Published",      color: "#38b6e8", icon: <Send size={11} /> },
};

const POST_TYPE_META: Record<PostType, { label: string; color: string; icon: React.ReactNode }> = {
  gmb:     { label: "GMB Post",     color: "#f59e0b", icon: <MapPin size={11} /> },
  website: { label: "Website Post", color: "#38b6e8", icon: <Globe size={11} /> },
  other:   { label: "Other",        color: "#4a7090", icon: <FileEdit size={11} /> },
};

function ArticleRow({ article, onOpen, onDelete, isAdmin }: {
  article: Article;
  onOpen: () => void;
  onDelete: () => void;
  isAdmin: boolean;
}) {
  const status = STATUS_META[article.status];
  const postType = POST_TYPE_META[article.postType ?? "other"];
  const date = new Date(article.updatedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short" });

  return (
    <div
      onClick={onOpen}
      className="group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:opacity-90 rounded-lg"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      {/* Post type badge */}
      <span
        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
        style={{ background: postType.color + "20", color: postType.color }}
      >
        {postType.icon} {postType.label}
      </span>

      {/* Title + keyword */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{article.title}</p>
        {article.targetKeyword && (
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{article.targetKeyword}</p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs hidden sm:block" style={{ color: "var(--text-muted)" }}>{article.wordCount.toLocaleString()} words</span>
        <span className="text-xs hidden md:block" style={{ color: "var(--text-muted)" }}>{date}</span>
        <span
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
          style={{ background: status.color + "20", color: status.color }}
        >
          {status.icon} {status.label}
        </span>
        {isAdmin && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-70"
            style={{ color: "#ef4444" }}
          >
            <Trash2 size={13} />
          </button>
        )}
        <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)" }} />
      </div>
    </div>
  );
}

function ProjectGroup({ projectName, articles, onOpen, onDelete, isAdmin }: {
  projectName: string;
  articles: Article[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const gmb = articles.filter((a) => a.postType === "gmb");
  const website = articles.filter((a) => a.postType === "website");
  const other = articles.filter((a) => !a.postType || a.postType === "other");

  const renderGroup = (items: Article[], label: string, color: string, icon: React.ReactNode) => {
    if (items.length === 0) return null;
    return (
      <div className="flex flex-col gap-1.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-1" style={{ color }}>
          {icon} {label}
        </p>
        {items.map((a) => (
          <ArticleRow
            key={a.id}
            article={a}
            onOpen={() => onOpen(a.id)}
            onDelete={() => onDelete(a.id)}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      {/* Project header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-90"
        style={{ background: "var(--bg-card)" }}
      >
        <FolderOpen size={15} style={{ color: "var(--accent)" }} />
        <span className="flex-1 font-semibold text-sm" style={{ color: "var(--text)" }}>{projectName}</span>
        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>
          {articles.length} article{articles.length !== 1 ? "s" : ""}
        </span>
        <ChevronRight
          size={14}
          style={{ color: "var(--text-muted)", transform: collapsed ? "rotate(0deg)" : "rotate(90deg)", transition: "transform 0.15s" }}
        />
      </button>

      {/* Articles */}
      {!collapsed && (
        <div className="flex flex-col gap-4 p-4" style={{ background: "var(--bg-base)" }}>
          {renderGroup(gmb, "GMB Post", "#f59e0b", <MapPin size={11} />)}
          {renderGroup(website, "Website Post", "#38b6e8", <Globe size={11} />)}
          {renderGroup(other, "Other", "#4a7090", <FileEdit size={11} />)}
        </div>
      )}
    </div>
  );
}

export default function ContentPage() {
  const router = useRouter();
  const { articles, projects, loadArticles, deleteArticle } = useStore();
  const { user } = useAuth();
  const isAdmin = user?.pmRole === "admin";

  if (user && !isAdmin && !user.canAccessContent) {
    router.replace("/dashboard");
    return null;
  }

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ArticleStatus | "all">("all");
  const [filterProject, setFilterProject] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  const filtered = articles.filter((a) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterProject !== "all" && a.projectId !== filterProject) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.targetKeyword.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Group by project
  const byProject = new Map<string, Article[]>();
  for (const a of filtered) {
    const key = a.projectId ?? "__none__";
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key)!.push(a);
  }

  const projectOrder = [
    ...projects.filter((p) => byProject.has(p.id)).map((p) => p.id),
    ...(byProject.has("__none__") ? ["__none__"] : []),
  ];

  async function handleDelete(id: string) {
    if (confirmDelete !== id) { setConfirmDelete(id); return; }
    await deleteArticle(id);
    setConfirmDelete(null);
  }

  const statuses: ArticleStatus[] = ["draft", "pending_review", "changes_requested", "approved", "published"];

  return (
    <>
      <Topbar title="Content" />
      <div className="p-6 flex flex-col gap-5">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-48"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <Search size={14} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search articles…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm outline-none flex-1"
              style={{ color: "var(--text)" }}
            />
          </div>

          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            <option value="all">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ArticleStatus | "all")}
            className="text-sm px-3 py-2 rounded-lg outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>

          <button
            onClick={() => router.push("/content/new")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            <Plus size={15} /> New Article
          </button>
        </div>

        {/* Status summary chips */}
        <div className="flex gap-2 flex-wrap">
          {statuses.map((s) => {
            const count = articles.filter((a) => a.status === s).length;
            if (count === 0) return null;
            const meta = STATUS_META[s];
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: filterStatus === s ? meta.color + "25" : "var(--bg-card)",
                  border: `1px solid ${filterStatus === s ? meta.color + "60" : "var(--border)"}`,
                  color: filterStatus === s ? meta.color : "var(--text-muted)",
                }}
              >
                {meta.icon} {meta.label}
                <span className="font-bold">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Project groups */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <FileEdit size={32} style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {articles.length === 0 ? "No articles yet — click New Article to get started." : "No articles match your filters."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {projectOrder.map((pid) => {
              const proj = projects.find((p) => p.id === pid);
              const name = proj?.name ?? "No project";
              return (
                <ProjectGroup
                  key={pid}
                  projectName={name}
                  articles={byProject.get(pid)!}
                  onOpen={(id) => router.push(`/content/${id}`)}
                  onDelete={handleDelete}
                  isAdmin={isAdmin}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
