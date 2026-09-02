// The agency's STANDARD SEO work set — what every client gets the moment a
// project is labelled SEO (or Web + SEO).
//
// It is a TASK, not a checklist: a parent "SEO Setup" task on the board with
// one child per phase, in the order the work actually happens —
//   1. Competitors → 2. Keyword Research → 3. Technical SEO → 4. On-Page Fixes
// so the admin can review each phase on its own, and the next staff member can
// see what has been done and which keywords are being targeted.
//
// Dependency-free on purpose (no supabase / next / react imports) so the store
// that creates the tasks and the panel that displays them share one definition
// and can't drift.

export type SeoPhaseKey =
  | "setup"
  | "competitors"
  | "keyword-research"
  | "technical-seo"
  | "onpage-fixes";

export interface SeoPhase {
  key: SeoPhaseKey;
  /** Task title as it appears on the board. */
  title: string;
  /** Short label for the record panel. */
  label: string;
  color: string;
  /** Seeded into the task description: what to do, and what to record. */
  description: string;
}

/** True for the project types that get the SEO work set. */
export function isSeoProjectType(type: string): boolean {
  return type === "seo" || type === "both";
}

export const SEO_SETUP_PARENT: SeoPhase = {
  key: "setup",
  title: "SEO Setup",
  label: "SEO Setup",
  color: "#22c55e",
  description:
    "<p>The standard SEO start for this client. Work through the four phases below in order — competitors first, then keyword research, then the technical fixes, then on-page.</p>" +
    "<p>Each phase is its own task: write what you did in that task, so the next person can pick up from it and the work can be checked.</p>",
};

export const SEO_PHASES: SeoPhase[] = [
  {
    // First on purpose: the client usually names their competitors at kickoff,
    // and who they are does not depend on our keyword research or rankings.
    key: "competitors",
    title: "1. Competitors",
    label: "Competitors",
    color: "#f59e0b",
    description:
      "<p>Record who this client is up against — the competitors the client named, plus any others dominating the search results for their services and area.</p>" +
      "<p>For each one note the website, what they are doing well (content, backlinks, Google Business Profile, site speed) and the gap we can win on. Keep it here so the next person can see who we are benchmarking against without asking the client again.</p>",
  },
  {
    key: "keyword-research",
    title: "2. Keyword Research",
    label: "Keyword Research",
    color: "#22c55e",
    description:
      "<p>Research the keywords this client should rank for and enter them in the project's <strong>Keywords</strong> tab — search volume, difficulty, the page each keyword targets, and priority.</p>" +
      "<p>Then note here where the research came from (tools used, competitors checked) and anything the next person should know before writing or optimising.</p>",
  },
  {
    key: "technical-seo",
    title: "3. Technical SEO",
    label: "Technical SEO",
    color: "#38b6e8",
    description:
      "<p>Fix the technical foundation before any on-page work: indexing, robots.txt and sitemap, HTTPS, redirects and broken links, page speed and Core Web Vitals, mobile rendering, canonicals and schema, Search Console and GA4.</p>" +
      "<p>Record here what you actually changed, what was already in place, and anything you could not fix (and why).</p>",
  },
  {
    key: "onpage-fixes",
    title: "4. On-Page Fixes",
    label: "On-Page Fixes",
    color: "#a855f7",
    description:
      "<p>Optimise the pages against the researched keywords: title tags and meta descriptions, one H1 per page with a clean heading order, URL slugs, image alt text, internal linking, and the page content itself.</p>" +
      "<p>Record here which pages you changed and which keyword each one targets.</p>",
  },
];

/** Falls back to the raw key so an unknown phase can never crash the panel. */
export function seoPhaseMeta(key: string): SeoPhase {
  if (key === SEO_SETUP_PARENT.key) return SEO_SETUP_PARENT;
  return (
    SEO_PHASES.find((p) => p.key === key) ?? {
      key: key as SeoPhaseKey,
      title: key,
      label: key,
      color: "#4a7090",
      description: "",
    }
  );
}

export interface SeoSetupTaskDef {
  seoPhase: SeoPhaseKey;
  title: string;
  description: string;
  sortOrder: number;
}

/**
 * The rows to create for a newly-labelled SEO project: the parent first, then
 * its phase children in order. Sort order keeps them 1-2-3-4 in every list
 * (loadAll orders pm_tasks by sort_order, then created_at).
 */
export function seoSetupTaskDefs(): { parent: SeoSetupTaskDef; children: SeoSetupTaskDef[] } {
  return {
    parent: {
      seoPhase: SEO_SETUP_PARENT.key,
      title: SEO_SETUP_PARENT.title,
      description: SEO_SETUP_PARENT.description,
      sortOrder: 0,
    },
    children: SEO_PHASES.map((p, i) => ({
      seoPhase: p.key,
      title: p.title,
      description: p.description,
      sortOrder: i,
    })),
  };
}
