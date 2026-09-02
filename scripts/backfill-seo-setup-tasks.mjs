#!/usr/bin/env node
/**
 * Bring every live SEO / Web + SEO project in line with the standard SEO work
 * set in lib/seo-setup.ts — the "SEO Setup" parent task plus one task per phase
 * (competitors, keyword research, technical SEO, on-page fixes).
 *
 * New projects get these automatically when they are labelled SEO
 * (store.ensureSeoSetupTasks). This script is for the projects that were
 * labelled before a phase existed. It works PHASE BY PHASE, not project by
 * project, so adding a phase to the standard set later is a re-run, not a new
 * script. Safe to run any time — it only ever fills what is missing.
 *
 *   node scripts/backfill-seo-setup-tasks.mjs           # dry run (default)
 *   node scripts/backfill-seo-setup-tasks.mjs --apply   # actually write
 *
 * What it does to a project:
 *   1. creates any phase task it does not have (and the parent, if missing)
 *   2. renumbers a phase title that still holds an older seeded title
 *      (see LEGACY_TITLES) — a hand-renamed task is left ALONE
 *   3. refreshes the parent description if it is still an older seeded prompt
 *      (compared markup/whitespace-insensitively, like the SEO Work panel)
 *   4. stamps sort_order 0..N on the phase children so the board reads in the
 *      same order as the tab
 * It never touches a phase description — that is where staff write up their
 * work, and the panel decides "work recorded" by comparing against the seed.
 *
 * Plain fetch + PostgREST, no supabase-js: node_modules is unreliable under
 * OneDrive (same reason as scripts/migrate-base64-descriptions.mjs).
 *
 * Titles and descriptions are READ OUT OF lib/seo-setup.ts rather than copied
 * here, so a backfilled project is identical to one the app creates — the SEO
 * Work panel decides "still the prompt" vs "work recorded" by comparing against
 * that exact text. It aborts if that file stops parsing as the expected phases.
 *
 * RUN AGAINST LIVE 2026-08-19: 56 tasks across all 14 SEO / Web + SEO projects.
 * 11 sets landed on a person (9 from the weekly SEO plan, 2 from project
 * staffing); 3 stayed unassigned. Verified afterwards: 4 rows per project,
 * 1 parent each, no due dates, all todo, no orphaned children.
 *
 * RUN AGAINST LIVE 2026-08-31: the "1. Competitors" phase added to all 15 SEO
 * projects, and the three existing phases renumbered 1-2-3 → 2-3-4.
 *
 * Note: title changes are picked up by the pm_log_task_activity trigger, so
 * they appear on the History page as "System" (service-role writes have no
 * auth.uid()). That is intended — it is a real edit to a task on the board.
 *
 * Undo the whole work set (before anyone edits it):
 *   delete from pm_tasks where seo_phase is not null;
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const APPLY = process.argv.includes("--apply");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");

// ── env ─────────────────────────────────────────────────────────────────────
function readEnv() {
  const file = path.join(ROOT, ".env.local");
  const txt = fs.readFileSync(file, "utf8");
  const out = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}
const env = readEnv();
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// ── the standard set, read straight out of lib/seo-setup.ts ─────────────────
// Parsed rather than compiled: tsc cannot read its own lib/*.d.ts under
// OneDrive (the node_modules problem this repo already knows about), and
// copying the text here would drift from the app the first time it is edited.
// Every entry in that file is `{ key, title, label, color, description }` with
// the description as one or more adjacent string literals joined by `+`.
const PHASE_KEYS = ["setup", "competitors", "keyword-research", "technical-seo", "onpage-fixes"];

// Titles a phase was seeded with in an EARLIER version of the standard set.
// Adding "1. Competitors" on 2026-08-31 pushed the other three down one number.
// A live title matching one of these is renumbered to the current title; any
// other title means a person renamed it, and it is left alone.
const LEGACY_TITLES = {
  "keyword-research": ["1. Keyword Research"],
  "technical-seo": ["2. Technical SEO"],
  "onpage-fixes": ["3. On-Page Fixes"],
};

// Parent prompts from earlier versions of the set — refreshed only if the live
// text still matches one (i.e. nobody has written over it). The 2026-08-19
// original said "the three phases below", which is now wrong.
const LEGACY_PARENT_DESCRIPTIONS = [
  "<p>The standard SEO start for this client. Work through the three phases below in order — " +
  "keyword research first, then the technical fixes, then on-page.</p>" +
  "<p>Each phase is its own task: write what you did in that task, so the next person can pick " +
  "up from it and the work can be checked.</p>",
];

/** Markup/whitespace-insensitive compare — the same rule the SEO Work panel uses. */
function sameText(a, b) {
  const strip = (x) => String(x ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return strip(a) === strip(b);
}

function loadSeoSetup() {
  const src = fs.readFileSync(path.join(ROOT, "lib", "seo-setup.ts"), "utf8");
  const entryRe = /key:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*label:\s*"[^"]*",\s*color:\s*"[^"]*",\s*description:\s*((?:\s*"(?:[^"\\]|\\.)*"\s*\+?)+),/g;
  const entries = [];
  for (const m of src.matchAll(entryRe)) {
    const description = [...m[3].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((s) => s[1]).join("");
    entries.push({ seoPhase: m[1], title: m[2], description });
  }
  // Loud failure beats a half-right backfill: if the source is restructured,
  // stop rather than writing tasks with missing or wrong text.
  const keys = entries.map((e) => e.seoPhase);
  if (entries.length !== PHASE_KEYS.length || PHASE_KEYS.some((k) => !keys.includes(k))) {
    throw new Error(
      `lib/seo-setup.ts did not parse as the ${PHASE_KEYS.length} expected phases (got: ${keys.join(", ") || "none"})`
    );
  }
  if (entries.some((e) => !e.description.trim())) throw new Error("a phase parsed with an empty description");
  const parent = entries.find((e) => e.seoPhase === "setup");
  // Children in the order they appear in the file — that IS the phase order.
  const children = entries.filter((e) => e.seoPhase !== "setup");
  return { parent, children };
}

const isSeoProjectType = (type) => type === "seo" || type === "both";

// ── PostgREST ───────────────────────────────────────────────────────────────
async function rest(pathAndQuery, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  const { parent, children } = loadSeoSetup();
  console.log(`Standard set from lib/seo-setup.ts: ${parent.title} + ${children.map((c) => c.title).join(", ")}\n`);

  const projects = await rest(
    "pm_projects?select=id,name,type,assigned_staff&archived_at=is.null&order=name"
  );
  const seoProjects = projects.filter((p) => isSeoProjectType(p.type));

  // Archived tasks keep their seo_phase and still hold pm_tasks_seo_phase_unique,
  // so they must be counted as present or the insert would fail.
  const existing = await rest(
    "pm_tasks?select=id,project_id,seo_phase,title,description,assignee_id,sort_order,archived_at&seo_phase=not.is.null"
  );
  const byProject = new Map();
  for (const r of existing) {
    if (!byProject.has(r.project_id)) byProject.set(r.project_id, new Map());
    byProject.get(r.project_id).set(r.seo_phase, r);
  }

  // Same assignee rule as store.ensureSeoSetupTasks: the weekly SEO plan's
  // assignee is the person doing this client's SEO, so it wins over project
  // staffing (which is often several people, or nobody). For a project that
  // already has part of the set, the people already on those tasks win over
  // both — a new phase belongs with whoever is doing the rest of the work.
  const plans = await rest("pm_weekly_seo_plans?select=project_id,assignee_id");
  const planAssignee = new Map(plans.filter((r) => r.assignee_id).map((r) => [r.project_id, r.assignee_id]));

  console.log(`${APPLY ? "APPLY" : "DRY RUN"} — ${URL_BASE}`);
  console.log(`${projects.length} live projects, ${seoProjects.length} labelled SEO / Web + SEO\n`);

  let createdTasks = 0, renamedTasks = 0, reorderedTasks = 0, refreshedParents = 0, touchedProjects = 0;

  for (const p of seoProjects) {
    const have = byProject.get(p.id) ?? new Map();
    const staff = Array.isArray(p.assigned_staff) ? p.assigned_staff : [];
    const siblingAssignee = [...have.values()].map((r) => r.assignee_id).find((a) => !!a) ?? null;
    const assignee = siblingAssignee ?? planAssignee.get(p.id) ?? (staff.length === 1 ? staff[0] : null);
    const via = siblingAssignee ? "existing SEO tasks" : planAssignee.get(p.id) ? "weekly SEO plan" : staff.length === 1 ? "project staff" : "";

    const actions = [];

    // 1. the parent — created if missing, prompt refreshed if it is still an old seed
    let parentRow = have.get("setup") ?? null;
    if (!parentRow) actions.push({ kind: "create-parent" });
    else if (LEGACY_PARENT_DESCRIPTIONS.some((d) => sameText(parentRow.description, d))) {
      actions.push({ kind: "refresh-parent", id: parentRow.id });
    }

    // 2. missing phases, and 3. titles still holding an older seeded number
    for (const child of children) {
      const row = have.get(child.seoPhase);
      if (!row) {
        actions.push({ kind: "create-child", child });
      } else if (row.title !== child.title && (LEGACY_TITLES[child.seoPhase] ?? []).includes(row.title)) {
        actions.push({ kind: "rename", id: row.id, from: row.title, to: child.title });
      }
    }

    // 4. board order — only worth writing if something is out of place
    const orderFixes = children
      .map((child, i) => ({ row: have.get(child.seoPhase), sortOrder: i }))
      .filter((r) => r.row && r.row.sort_order !== r.sortOrder)
      .map((r) => ({ kind: "reorder", id: r.row.id, from: r.row.sort_order, to: r.sortOrder }));

    const missing = actions.filter((a) => a.kind === "create-child").length;
    const willReorder = orderFixes.length + missing; // new rows are stamped as they are created
    if (!actions.length && !orderFixes.length) continue;

    touchedProjects++;
    const summary = [
      actions.some((a) => a.kind === "create-parent") ? "parent" : null,
      missing ? `${missing} phase${missing === 1 ? "" : "s"}` : null,
      actions.filter((a) => a.kind === "rename").length ? `${actions.filter((a) => a.kind === "rename").length} renumbered` : null,
      actions.some((a) => a.kind === "refresh-parent") ? "parent prompt" : null,
      willReorder ? "order" : null,
    ].filter(Boolean).join(", ");
    const label = `${p.name} [${p.type}]${missing && assignee ? ` -> assigned (${via})` : missing ? " -> unassigned" : ""}`;

    if (!APPLY) {
      console.log(`would update: ${label} — ${summary}`);
      for (const a of actions.filter((x) => x.kind === "create-child")) console.log(`    + ${a.child.title}`);
      for (const a of actions.filter((x) => x.kind === "rename")) console.log(`    ~ "${a.from}" -> "${a.to}"`);
      continue;
    }

    // ── writes ──────────────────────────────────────────────────────────────
    let parentId = parentRow?.id ?? null;
    if (!parentId) {
      parentId = randomUUID();
      await rest("pm_tasks", {
        method: "POST",
        body: JSON.stringify({
          id: parentId, project_id: p.id, parent_id: null,
          title: parent.title, description: parent.description,
          status: "todo", priority: 5, type: "seo",
          assignee_id: assignee, due_date: null, tags: [],
          seo_phase: parent.seoPhase, sort_order: 0,
        }),
      });
      createdTasks++;
    }

    for (const a of actions) {
      if (a.kind === "refresh-parent") {
        await rest(`pm_tasks?id=eq.${a.id}`, {
          method: "PATCH",
          body: JSON.stringify({ description: parent.description }),
        });
        refreshedParents++;
      }
      if (a.kind === "rename") {
        await rest(`pm_tasks?id=eq.${a.id}`, { method: "PATCH", body: JSON.stringify({ title: a.to }) });
        renamedTasks++;
      }
      if (a.kind === "create-child") {
        const i = children.indexOf(a.child);
        await rest("pm_tasks", {
          method: "POST",
          body: JSON.stringify({
            id: randomUUID(), project_id: p.id, parent_id: parentId,
            title: a.child.title, description: a.child.description,
            status: "todo", priority: 5, type: "seo",
            assignee_id: assignee, due_date: null, tags: [],
            seo_phase: a.child.seoPhase, sort_order: i,
          }),
        });
        createdTasks++;
      }
    }

    for (const fix of orderFixes) {
      await rest(`pm_tasks?id=eq.${fix.id}`, { method: "PATCH", body: JSON.stringify({ sort_order: fix.to }) });
      reorderedTasks++;
    }

    console.log(`updated: ${label} — ${summary}`);
  }

  if (!touchedProjects) {
    console.log("Nothing to do — every SEO project already matches lib/seo-setup.ts.");
    return;
  }
  console.log(
    `\n${APPLY
      ? `Done — ${touchedProjects} projects: ${createdTasks} tasks created, ${renamedTasks} renumbered, ${refreshedParents} parent prompts refreshed, ${reorderedTasks} reordered.`
      : `Dry run only (${touchedProjects} projects would change). Re-run with --apply to write.`}`
  );
}

main().catch((e) => {
  console.error("backfill failed:", e.message);
  process.exit(1);
});
