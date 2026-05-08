"use client";
import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import {
  Search, Globe, Shield, Megaphone, TrendingUp, AlertCircle,
  ExternalLink, Loader2, Monitor, Smartphone,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface PageSpeedData {
  mobile: Record<string, unknown> | null;
  desktop: Record<string, unknown> | null;
  error?: string;
}
interface PageRankRow {
  page_rank_integer: number;
  page_rank_decimal: number;
  rank: string;
  domain: string;
}
interface PageRankData { response?: PageRankRow[]; error?: string; }
interface AdRow {
  id: string;
  ad_creation_time: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_snapshot_url?: string;
  impressions?: { lower_bound: string; upper_bound: string };
  spend?: { lower_bound: string; upper_bound: string; currency: string };
  publisher_platforms?: string[];
  page_name?: string;
}
interface AdsData { data?: AdRow[]; error?: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  return s >= 0.9 ? "#22c55e" : s >= 0.5 ? "#f59e0b" : "#ef4444";
}
function scoreLabel(s: number) {
  return s >= 0.9 ? "Good" : s >= 0.5 ? "Needs Work" : "Poor";
}

// ── Shared UI components ───────────────────────────────────────────────────────
function ScoreRing({ score, label, size = 72 }: { score: number; label: string; size?: number }) {
  const pct = Math.round(score * 100);
  const color = scoreColor(score);
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-surface)" strokeWidth={5} />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={5}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black" style={{ color }}>{pct}</span>
        </div>
      </div>
      <span className="text-xs text-center leading-tight" style={{ color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}

function MetricRow({ label, value, score }: { label: string; value: string; score?: number | null }) {
  const color = score != null ? scoreColor(score) : "var(--text)";
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}

function StatCard({
  label, value, sub, color, icon: Icon,
}: {
  label: string; value: string; sub?: string; color: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

function ApiKeyNotice({ service, envKey, docsUrl }: { service: string; envKey: string; docsUrl: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid #f59e0b30" }}>
      <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{service} key not configured</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Get a free key at{" "}
          <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--accent)" }}>
            {docsUrl}
          </a>{" "}
          then add <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--bg-card)" }}>{envKey}</code> to your{" "}
          <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--bg-card)" }}>.env.local</code>.
        </p>
      </div>
    </div>
  );
}

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",  label: "Overview",          icon: TrendingUp },
  { id: "seo",       label: "SEO & Performance",  icon: Monitor    },
  { id: "authority", label: "Authority",           icon: Shield     },
  { id: "ads",       label: "Ads",                icon: Megaphone  },
] as const;
type TabId = (typeof TABS)[number]["id"];

// ── SEO & Performance tab ──────────────────────────────────────────────────────
function SeoTab({ ps }: { ps: PageSpeedData }) {
  if (ps.error) {
    return <p className="text-sm py-10 text-center" style={{ color: "var(--text-muted)" }}>Failed to load: {ps.error}</p>;
  }

  const mobile = (ps.mobile as any)?.lighthouseResult;
  const desktop = (ps.desktop as any)?.lighthouseResult;
  if (!mobile || !desktop) {
    return <p className="text-sm py-10 text-center" style={{ color: "var(--text-muted)" }}>No PageSpeed data available.</p>;
  }

  const CATS = [
    { id: "performance",    label: "Perf" },
    { id: "seo",            label: "SEO"  },
    { id: "accessibility",  label: "A11y" },
    { id: "best-practices", label: "Best" },
  ];
  const CWV = [
    { key: "first-contentful-paint",    label: "First Contentful Paint" },
    { key: "largest-contentful-paint",  label: "Largest Contentful Paint" },
    { key: "total-blocking-time",       label: "Total Blocking Time" },
    { key: "cumulative-layout-shift",   label: "Cumulative Layout Shift" },
    { key: "interactive",               label: "Time to Interactive" },
    { key: "speed-index",               label: "Speed Index" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Score rings — mobile + desktop side by side */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-5" style={{ color: "var(--text)" }}>Lighthouse Scores</h3>
        <div className="grid grid-cols-2 gap-10">
          {([["Mobile", mobile, Smartphone], ["Desktop", desktop, Monitor]] as const).map(([label, lr, Icon]) => (
            <div key={label}>
              <div className="flex items-center gap-2 mb-4">
                <Icon size={13} style={{ color: "var(--text-muted)" }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</span>
              </div>
              <div className="flex justify-around">
                {CATS.map(({ id, label: l }) => (
                  <ScoreRing key={id} score={lr.categories?.[id]?.score ?? 0} label={l} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Core Web Vitals — mobile + desktop side by side */}
      <div className="grid grid-cols-2 gap-4">
        {([["Mobile", mobile.audits, Smartphone], ["Desktop", desktop.audits, Monitor]] as const).map(([label, audits, Icon]) => (
          <div key={label} className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Icon size={13} style={{ color: "var(--accent)" }} />
              <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Core Web Vitals — {label}</h3>
            </div>
            {CWV.map(({ key, label: l }) => (
              <MetricRow
                key={key}
                label={l}
                value={audits?.[key]?.displayValue ?? "—"}
                score={audits?.[key]?.score ?? null}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Authority tab ──────────────────────────────────────────────────────────────
function AuthorityTab({ pr, domain }: { pr: PageRankData; domain: string }) {
  if (pr.error === "OPENPAGERANK_KEY not set") {
    return (
      <ApiKeyNotice
        service="OpenPageRank"
        envKey="OPENPAGERANK_KEY"
        docsUrl="https://www.openpagerank.com/"
      />
    );
  }
  if (pr.error) {
    return <p className="text-sm py-10 text-center" style={{ color: "var(--text-muted)" }}>Error: {pr.error}</p>;
  }

  const row = pr.response?.[0];
  if (!row) {
    return <p className="text-sm py-10 text-center" style={{ color: "var(--text-muted)" }}>No data found for {domain}.</p>;
  }

  const ri = row.page_rank_integer;
  const color = ri >= 7 ? "#22c55e" : ri >= 4 ? "#f59e0b" : "#ef4444";
  const strength = ri >= 7 ? "Strong authority" : ri >= 4 ? "Moderate authority" : "Low authority";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>OpenPageRank</span>
          <p className="text-5xl font-black" style={{ color }}>
            {ri}<span className="text-2xl font-normal" style={{ color: "var(--text-muted)" }}>/10</span>
          </p>
          <p className="text-xs font-semibold" style={{ color }}>{strength}</p>
        </div>
        <div className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Global Rank</span>
          <p className="text-4xl font-black" style={{ color: "var(--accent)" }}>
            #{Number(row.rank).toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Among all indexed domains</p>
        </div>
        <div className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Decimal Score</span>
          <p className="text-4xl font-black" style={{ color: "var(--text)" }}>{row.page_rank_decimal.toFixed(2)}</p>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{row.domain}</p>
        </div>
      </div>

      {/* Visual scale bar */}
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>Authority Scale</h3>
        <div className="flex gap-1.5 h-3 rounded-full overflow-hidden">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="flex-1 rounded-full transition-all"
              style={{ background: i < ri ? color : "var(--bg-surface)" }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>0 — Low</span>
          <span className="text-xs font-bold" style={{ color }}>{ri} / 10</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>High — 10</span>
        </div>
      </div>
    </div>
  );
}

// ── Ads tab ────────────────────────────────────────────────────────────────────
function AdsTab({ ads, domain }: { ads: AdsData; domain: string }) {
  if (ads.error === "META_ACCESS_TOKEN not set") {
    return (
      <ApiKeyNotice
        service="Meta Ad Library"
        envKey="META_ACCESS_TOKEN"
        docsUrl="https://developers.facebook.com/docs/marketing-api/access"
      />
    );
  }
  if (ads.error) {
    return <p className="text-sm py-10 text-center" style={{ color: "var(--text-muted)" }}>Error: {ads.error}</p>;
  }

  const list = ads.data ?? [];
  if (list.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-3">
        <Megaphone size={32} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No ads found for {domain}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {list.length} ad{list.length !== 1 ? "s" : ""} found across Meta platforms
      </p>
      {list.map((ad) => (
        <div
          key={ad.id}
          className="rounded-2xl p-5 flex flex-col gap-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {ad.page_name && (
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--accent)" }}>{ad.page_name}</p>
              )}
              {ad.ad_creative_link_titles?.[0] && (
                <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{ad.ad_creative_link_titles[0]}</p>
              )}
              {ad.ad_creative_bodies?.[0] && (
                <p className="text-sm mt-1 line-clamp-3" style={{ color: "var(--text-muted)" }}>
                  {ad.ad_creative_bodies[0]}
                </p>
              )}
            </div>
            {ad.ad_snapshot_url && (
              <a
                href={ad.ad_snapshot_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-2 rounded-lg hover:opacity-70 transition-opacity"
                style={{ background: "var(--bg-surface)", color: "var(--accent)" }}
                title="View ad"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {ad.publisher_platforms?.map((p) => (
              <span key={p} className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: "#a855f720", color: "#a855f7" }}>
                {p}
              </span>
            ))}
            {ad.impressions && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {Number(ad.impressions.lower_bound).toLocaleString()}–{Number(ad.impressions.upper_bound).toLocaleString()} impressions
              </span>
            )}
            {ad.spend && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {ad.spend.currency} {Number(ad.spend.lower_bound).toLocaleString()}–{Number(ad.spend.upper_bound).toLocaleString()} spend
              </span>
            )}
            <span className="text-xs ml-auto shrink-0" style={{ color: "var(--text-muted)" }}>
              {new Date(ad.ad_creation_time).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function CompetitorResearchPage() {
  const [url, setUrl]         = useState("");
  const [domain, setDomain]   = useState("");
  const [tab, setTab]         = useState<TabId>("overview");
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const [pagespeed, setPagespeed] = useState<PageSpeedData | null>(null);
  const [pagerank, setPagerank]   = useState<PageRankData  | null>(null);
  const [ads, setAds]             = useState<AdsData       | null>(null);

  async function analyze() {
    let target = url.trim();
    if (!target) return;
    if (!target.startsWith("http")) target = "https://" + target;

    let d: string;
    try { d = new URL(target).hostname.replace(/^www\./, ""); }
    catch { d = target.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]; }

    setDomain(d);
    setLoading(true);
    setAnalyzed(false);
    setPagespeed(null);
    setPagerank(null);
    setAds(null);

    await Promise.all([
      fetch(`/api/competitor/pagespeed?url=${encodeURIComponent(target)}`)
        .then((r) => r.json()).then(setPagespeed)
        .catch(() => setPagespeed({ mobile: null, desktop: null, error: "Request failed" })),
      fetch(`/api/competitor/pagerank?domain=${encodeURIComponent(d)}`)
        .then((r) => r.json()).then(setPagerank)
        .catch(() => setPagerank({ error: "Request failed" })),
      fetch(`/api/competitor/ads?query=${encodeURIComponent(d)}`)
        .then((r) => r.json()).then(setAds)
        .catch(() => setAds({ error: "Request failed" })),
    ]);

    setLoading(false);
    setAnalyzed(true);
    setTab("overview");
  }

  // Derived overview values
  const mobileScore  = (pagespeed?.mobile  as any)?.lighthouseResult?.categories?.performance?.score ?? null;
  const desktopScore = (pagespeed?.desktop as any)?.lighthouseResult?.categories?.performance?.score ?? null;
  const prRow        = pagerank?.response?.[0];

  return (
    <AdminOnly>
      <Topbar title="Competitor Research" />
      <div className="p-6 flex flex-col gap-6">

        {/* URL input */}
        <div className="flex gap-3">
          <div
            className="flex-1 flex items-center gap-3 rounded-xl px-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <Globe size={15} style={{ color: "var(--text-muted)" }} />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
              placeholder="https://competitor.com"
              className="flex-1 py-3 text-sm bg-transparent outline-none"
              style={{ color: "var(--text)" }}
            />
            {loading && <Loader2 size={15} className="animate-spin shrink-0" style={{ color: "var(--accent)" }} />}
          </div>
          <button
            onClick={analyze}
            disabled={loading || !url.trim()}
            className="px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-opacity hover:opacity-80"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "#fff" }}
          >
            <Search size={14} />
            Analyze
          </button>
        </div>

        {/* Empty state */}
        {!analyzed && !loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <Search size={22} style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Enter a competitor URL above</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Analyzes SEO performance, domain authority, and active Meta ads
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Analyzing {domain}…</p>
          </div>
        )}

        {/* Results */}
        {analyzed && !loading && (
          <>
            {/* Domain pill */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{domain}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>— analysis complete</span>
            </div>

            {/* Tab bar */}
            <div
              className="flex gap-1 p-1 rounded-xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", width: "fit-content" }}
            >
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: tab === id ? "linear-gradient(135deg, var(--accent), var(--accent-2))" : "transparent",
                    color: tab === id ? "#fff" : "var(--text-muted)",
                  }}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {/* ── Overview ── */}
            {tab === "overview" && (
              <div className="grid grid-cols-4 gap-4">
                <StatCard
                  label="Desktop Perf"
                  value={desktopScore != null ? String(Math.round(desktopScore * 100)) : "—"}
                  sub={desktopScore != null ? scoreLabel(desktopScore) : "unavailable"}
                  color={desktopScore != null ? scoreColor(desktopScore) : "var(--text-muted)"}
                  icon={Monitor}
                />
                <StatCard
                  label="Mobile Perf"
                  value={mobileScore != null ? String(Math.round(mobileScore * 100)) : "—"}
                  sub={mobileScore != null ? scoreLabel(mobileScore) : "unavailable"}
                  color={mobileScore != null ? scoreColor(mobileScore) : "var(--text-muted)"}
                  icon={Smartphone}
                />
                <StatCard
                  label="Page Rank"
                  value={prRow ? `${prRow.page_rank_integer}/10` : pagerank?.error === "OPENPAGERANK_KEY not set" ? "No key" : "—"}
                  sub={prRow ? `Global rank #${Number(prRow.rank).toLocaleString()}` : ""}
                  color={prRow ? (prRow.page_rank_integer >= 7 ? "#22c55e" : prRow.page_rank_integer >= 4 ? "#f59e0b" : "#ef4444") : "var(--text-muted)"}
                  icon={Shield}
                />
                <StatCard
                  label="Active Ads"
                  value={ads?.data ? String(ads.data.length) : ads?.error === "META_ACCESS_TOKEN not set" ? "No key" : "—"}
                  sub="on Meta platforms"
                  color="#a855f7"
                  icon={Megaphone}
                />
              </div>
            )}

            {/* ── SEO & Performance ── */}
            {tab === "seo" && pagespeed && <SeoTab ps={pagespeed} />}

            {/* ── Authority ── */}
            {tab === "authority" && pagerank && <AuthorityTab pr={pagerank} domain={domain} />}

            {/* ── Ads ── */}
            {tab === "ads" && ads && <AdsTab ads={ads} domain={domain} />}
          </>
        )}
      </div>
    </AdminOnly>
  );
}
