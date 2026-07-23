"use client";
import { Topbar } from "@/components/topbar";
import { useStore } from "@/lib/store";
import { CheckSquare, Clock, AlertTriangle, TrendingUp, Bot, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function priorityColor(p: number | string): string {
  const n = typeof p === "number" ? p : 5;
  if (n <= 2) return "#ef4444";
  if (n <= 4) return "#f59e0b";
  if (n <= 6) return "#38b6e8";
  return "#22c55e";
}

const AVATAR_COLORS = ["#818cf8", "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#22d3ee"];

const STAT_CONFIG = [
  { label: "Active Projects",    icon: TrendingUp,    color: "#818cf8", glow: "rgba(129,140,248,0.25)", gradient: "linear-gradient(135deg, #0f1d2e 0%, #1e1b4b 100%)", border: "#38b6e838" },
  { label: "Tasks In Progress",  icon: Clock,         color: "#60a5fa", glow: "rgba(96,165,250,0.2)",   gradient: "linear-gradient(135deg, #0f1d2e 0%, #0f1e3d 100%)", border: "#3b82f638" },
  { label: "Awaiting Review",    icon: CheckSquare,   color: "#fbbf24", glow: "rgba(251,191,36,0.2)",   gradient: "linear-gradient(135deg, #0f1d2e 0%, #2a1f07 100%)", border: "#f59e0b38" },
  { label: "Overdue",            icon: AlertTriangle, color: "#f87171", glow: "rgba(248,113,113,0.2)",  gradient: "linear-gradient(135deg, #0f1d2e 0%, #2a0f0f 100%)", border: "#ef444438" },
];

interface LiveStaff {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_initials: string;
  pm_role: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { projects: allProjects, notifications, clients } = useStore();
  const [liveStaff, setLiveStaff] = useState<LiveStaff[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("staff_members")
      .select("*")
      .eq("status", "active")
      .then(({ data }) => setLiveStaff((data as LiveStaff[]) ?? []));
  }, [user?.id]);

  const isAdmin = user?.pmRole === "admin";

  const projects = isAdmin
    ? allProjects
    : allProjects.filter((p) => p.assignedStaff.includes(user?.id ?? ""));

  const allTasks = projects.flatMap((p) => p.tasks);

  const statValues = [
    projects.length,
    allTasks.filter((t) => t.status === "in_progress").length,
    allTasks.filter((t) => t.status === "pending_review").length,
    allTasks.filter((t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < new Date()).length,
  ];

  const aiNotif = notifications.find((n) => n.type === "ai_followup" && !n.read);
  const recentTasks = allTasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);

  return (
    <>
      <Topbar
        title="Dashboard"
        action={isAdmin ? { label: "New Project", href: "/projects/new" } : undefined}
      />
      <div className="p-6 flex flex-col gap-6">

        {/* AI Digest */}
        {aiNotif && (
          <div
            className="anim-up rounded-2xl p-4 flex gap-4 items-start relative overflow-hidden shimmer-overlay"
            style={{ background: "linear-gradient(135deg, #0f1d2e 0%, #1e1b4b 100%)", border: "1px solid #38b6e840", boxShadow: "0 4px 24px rgba(99,102,241,0.15)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #38b6e8, #ff6b47)", boxShadow: "0 4px 12px rgba(99,102,241,0.4)" }}>
              <Bot size={19} color="#fff" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold mb-1" style={{ color: "#9dd8f5" }}>AI Daily Digest</p>
              <p className="text-sm leading-relaxed" style={{ color: "#4a7090" }}>{aiNotif.body}</p>
            </div>
            <Link href="/notifications" className="p-1 rounded-lg transition-opacity hover:opacity-70" style={{ color: "#38b6e8" }}>
              <ChevronRight size={18} />
            </Link>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-4">
          {STAT_CONFIG.map(({ label, icon: Icon, color, glow, gradient, border }, i) => (
            <div
              key={label}
              className="anim-card-in card-hover rounded-2xl p-5 relative overflow-hidden shimmer-overlay"
              style={{ animationDelay: `${i * 0.08}s`, background: gradient, border: `1px solid ${border}`, boxShadow: `0 4px 24px ${glow}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#4a7090" }}>{label}</p>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, boxShadow: `0 0 12px ${color}30` }}>
                  <Icon size={16} style={{ color }} />
                </div>
              </div>
              <p className="text-4xl font-black tracking-tight" style={{ color, textShadow: `0 0 20px ${color}50` }}>
                {statValues[i]}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Active Projects */}
          <div
            className="anim-up col-span-2 rounded-2xl overflow-hidden"
            style={{ animationDelay: "0.2s", background: "#14172200", border: "1px solid #1c2030" }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1c2030", background: "#12151f" }}>
              <h2 className="font-bold text-sm" style={{ color: "#cce4ff" }}>Active Projects</h2>
              <Link href="/projects" className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-opacity hover:opacity-70" style={{ background: "#38b6e820", color: "#818cf8" }}>
                View all →
              </Link>
            </div>
            {projects.length === 0 ? (
              <div className="px-5 py-10 text-center" style={{ background: "#070d18" }}>
                <p className="text-sm mb-2" style={{ color: "#4a7090" }}>No projects yet.</p>
                {isAdmin && <Link href="/projects/new" className="text-sm font-semibold" style={{ color: "#818cf8" }}>Create your first project →</Link>}
              </div>
            ) : (
              <div style={{ background: "#070d18" }}>
                {projects.slice(0, 5).map((project, pi) => {
                  const client = clients.find((c) => c.id === project.clientId);
                  const done = project.tasks.filter((t) => t.status === "done").length;
                  const total = project.tasks.length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  const isWeb = project.type === "webdev";
                  const typeColor = isWeb ? "#818cf8" : "#34d399";

                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.slug || project.id}`}
                      className="flex items-center gap-4 px-5 py-4 group transition-all"
                      style={{ borderBottom: pi < projects.slice(0, 5).length - 1 ? "1px solid #1c2030" : "none" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#12151f")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${typeColor}20`, color: typeColor }}>
                            {isWeb ? "Web Dev" : "SEO"}
                          </span>
                          {client && <span className="text-xs" style={{ color: "#4a7090" }}>{client.name}</span>}
                        </div>
                        <p className="text-sm font-semibold truncate mb-2" style={{ color: "#cce4ff" }}>{project.name}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#1c2030" }}>
                            <div className="h-full rounded-full bar-animate" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${typeColor}, ${typeColor}99)`, boxShadow: `0 0 6px ${typeColor}60` }} />
                          </div>
                          <span className="text-xs font-medium shrink-0" style={{ color: typeColor }}>{pct}%</span>
                          <span className="text-xs shrink-0" style={{ color: "#4a7090" }}>{done}/{total}</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize shrink-0" style={{ background: "#1c2030", color: "#4a7090" }}>
                        {project.phase}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Team Workload — live staff (admin sees all; staff sees only themselves) */}
          <div
            className="anim-up rounded-2xl overflow-hidden"
            style={{ animationDelay: "0.28s", background: "#070d18", border: "1px solid #1c2030" }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1c2030", background: "#12151f" }}>
              <h2 className="font-bold text-sm" style={{ color: "#cce4ff" }}>{isAdmin ? "Team Workload" : "My Tasks"}</h2>
              {isAdmin && (
                <Link href="/team" className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: "#22d3ee20", color: "#22d3ee" }}>
                  View all →
                </Link>
              )}
            </div>

            <div className="p-4 flex flex-col gap-4">
              {liveStaff.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: "#4a7090" }}>No active staff yet.</p>
              )}
              {(isAdmin ? liveStaff : liveStaff.filter((s) => (s.user_id ?? s.id) === user?.id)).map((s, si) => {
                const avatarColor = AVATAR_COLORS[si % AVATAR_COLORS.length];
                const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email;
                const initials = s.avatar_initials || name.slice(0, 2).toUpperCase();
                const userTasks = allTasks.filter((t) => t.assigneeId === (s.user_id ?? s.id) && t.status !== "done");
                const overdue = userTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date()).length;

                return (
                  <div key={s.id}>
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}99)`, color: "#fff", boxShadow: `0 0 8px ${avatarColor}50` }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: "#cce4ff" }}>{name}</p>
                        <p className="text-xs" style={{ color: "#4a7090" }}>
                          {userTasks.length} open{overdue > 0 ? ` · ${overdue} overdue` : ""}
                        </p>
                      </div>
                      {overdue > 0 && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#ef444420", color: "#f87171" }}>
                          {overdue}
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1c2030" }}>
                      <div
                        className="h-full rounded-full bar-animate"
                        style={{
                          width: `${Math.min(userTasks.length * 15, 100)}%`,
                          background: overdue > 0 ? "linear-gradient(90deg, #ef4444, #f87171)" : `linear-gradient(90deg, ${avatarColor}, ${avatarColor}99)`,
                          boxShadow: `0 0 6px ${overdue > 0 ? "#ef444460" : avatarColor + "50"}`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {recentTasks.length > 0 && (
              <div className="px-4 pb-4">
                <div className="h-px mb-4" style={{ background: "linear-gradient(90deg, transparent, #1c2030, transparent)" }} />
                <p className="text-xs font-bold mb-3 tracking-widest" style={{ color: "#4a7090" }}>UPCOMING DUE</p>
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: priorityColor(task.priority), boxShadow: `0 0 5px ${priorityColor(task.priority)}80` }} />
                    <p className="text-xs truncate flex-1 font-medium" style={{ color: "#c4c9e0" }}>{task.title}</p>
                    <p className="text-xs shrink-0" style={{ color: "#4a7090" }}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-SG", { day: "numeric", month: "short" }) : "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
