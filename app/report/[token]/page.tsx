import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Zap, Calendar, ExternalLink } from "lucide-react";

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface TaskSnap { id: string; title: string; status: string; assigneeName: string; dueDate: string; }

const CATEGORY_KEYWORDS: { label: string; keywords: string[] }[] = [
  { label: "Backlinks",     keywords: ["backlink", "link build", "link building"] },
  { label: "GMB Posts",     keywords: ["gmb", "google my business", "google business"] },
  { label: "Website Posts", keywords: ["website post", "blog post", "website", "blog"] },
  { label: "Other Tasks",   keywords: [] },
];

function categorise(tasks: TaskSnap[]) {
  const buckets: Record<string, TaskSnap[]> = {
    "Backlinks": [], "GMB Posts": [], "Website Posts": [], "Other Tasks": [],
  };
  for (const t of tasks) {
    const low = t.title.toLowerCase();
    let placed = false;
    for (const cat of CATEGORY_KEYWORDS.slice(0, -1)) {
      if (cat.keywords.some((k) => low.includes(k))) {
        buckets[cat.label].push(t);
        placed = true;
        break;
      }
    }
    if (!placed) buckets["Other Tasks"].push(t);
  }
  return buckets;
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

function weekRange(startIso: string) {
  const start = new Date(startIso + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${fmtDate(startIso)} – ${fmtDate(end.toISOString().slice(0, 10))}`;
}

export default async function ReportPage({ params }: { params: { token: string } }) {
  const { data: report } = await serviceClient
    .from("pm_weekly_reports")
    .select("*")
    .eq("share_token", params.token)
    .maybeSingle();

  if (!report) notFound();

  const { data: project } = await serviceClient
    .from("pm_projects")
    .select("name, client_id")
    .eq("id", report.project_id)
    .maybeSingle();

  const clientName = project?.client_id
    ? (await serviceClient.from("pm_clients").select("name").eq("id", project.client_id).maybeSingle()).data?.name ?? ""
    : "";

  const tasks: TaskSnap[] = report.tasks_snapshot ?? [];
  const buckets = categorise(tasks);
  const totalDone = tasks.filter((t: TaskSnap) => t.status === "done").length;
  const monthYear = new Date(report.week_starting + "T00:00:00").toLocaleDateString("en-SG", { month: "long", year: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: "#060e18", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#0a1929", borderBottom: "1px solid #1c3248" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #38b6e8, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={18} color="#fff" fill="#fff" />
          </div>
          <div>
            <p style={{ color: "#38b6e8", fontWeight: 700, fontSize: 15, margin: 0 }}>WebbyOps</p>
            <p style={{ color: "#4a7090", fontSize: 12, margin: 0 }}>Weekly Work Report</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
        {/* Project info */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: "#cce4ff", fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>
            {project?.name ?? "Project Report"}
          </h1>
          {clientName && (
            <p style={{ color: "#4a7090", fontSize: 14, margin: "0 0 12px" }}>Client: <span style={{ color: "#cce4ff" }}>{clientName}</span></p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, background: "#1c3248", borderRadius: 8, padding: "5px 12px", fontSize: 13, color: "#cce4ff" }}>
              <Calendar size={13} style={{ color: "#38b6e8" }} />
              Week of {weekRange(report.week_starting)}
            </span>
            <span style={{ background: "#22c55e20", border: "1px solid #22c55e40", borderRadius: 8, padding: "5px 12px", fontSize: 13, color: "#22c55e" }}>
              {totalDone} / {tasks.length} completed
            </span>
            <span style={{ background: "#38b6e815", borderRadius: 8, padding: "5px 12px", fontSize: 13, color: "#4a7090" }}>
              {monthYear}
            </span>
          </div>
        </div>

        {/* Task categories */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
          {CATEGORY_KEYWORDS.map(({ label }) => {
            const items = buckets[label];
            if (items.length === 0) return null;
            const catColors: Record<string, string> = {
              "Backlinks": "#38b6e8",
              "GMB Posts": "#f59e0b",
              "Website Posts": "#6366f1",
              "Other Tasks": "#4a7090",
            };
            const color = catColors[label] ?? "#4a7090";
            return (
              <div key={label} style={{ background: "#0a1929", border: "1px solid #1c3248", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #1c3248", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#cce4ff" }}>{label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "#4a7090" }}>
                    {items.filter((t) => t.status === "done").length}/{items.length} done
                  </span>
                </div>
                {items.map((t) => {
                  const done = t.status === "done";
                  return (
                    <div key={t.id} style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #0f1d2e" }}>
                      {done
                        ? <CheckCircle2 size={15} style={{ color: "#22c55e", flexShrink: 0 }} />
                        : <Circle size={15} style={{ color: "#4a7090", flexShrink: 0 }} />
                      }
                      <span style={{ flex: 1, fontSize: 14, color: done ? "#4a7090" : "#cce4ff", textDecoration: done ? "line-through" : "none" }}>
                        {t.title}
                      </span>
                      {t.assigneeName && (
                        <span style={{ fontSize: 12, color: "#4a7090", flexShrink: 0 }}>{t.assigneeName}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Admin notes */}
        {report.summary_notes && (
          <div style={{ background: "#0a1929", border: "1px solid #1c3248", borderRadius: 14, padding: 16, marginBottom: 28 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#4a7090", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Notes from WebbyOps</p>
            <p style={{ fontSize: 14, color: "#cce4ff", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{report.summary_notes}</p>
          </div>
        )}

        {/* Footer */}
        <p style={{ fontSize: 12, color: "#4a7090", textAlign: "center" }}>
          Prepared by WebbyOps · This link is private and was shared with you directly.
        </p>
      </div>
    </div>
  );
}
