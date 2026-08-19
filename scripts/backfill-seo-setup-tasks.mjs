#!/usr/bin/env node
/**
 * One-off backfill: give every live SEO / Web + SEO project its standard SEO
 * work set — the "SEO Setup" parent task plus the three phase subtasks
 * (keyword research, technical SEO, on-page fixes).
 *
 * New projects get these automatically when they are labelled SEO
 * (store.ensureSeoSetupTasks). Projects labelled long before that existed need
 * this once. Run again any time — it skips a project that already has any
 * seo_phase task, so it can never duplicate.
 *
 *   node scripts/backfill-seo-setup-tasks.mjs           # dry run (default)
 *   node scripts/backfill-seo-setup-tasks.mjs --apply   # actually write
 *
 * Plain fetch + PostgREST, no supabase-js: node_modules is unreliable under
 * OneDrive (same reason as scripts/migrate-base64-descriptions.mjs).
 *
 * Titles and descriptions are READ OUT OF lib/seo-setup.ts rather than copied
 * here, so a backfilled project is identical to one the app creates — the SEO
 * Work panel decides "still the prompt" vs "work recorded" by comparing against
 * that exact text. It aborts if that file stops parsing as the 4 phases.
 *
 * RUN AGAINST LIVE 2026-08-19: 56 tasks across all 14 SEO / Web + SEO projects.
 * 11 sets landed on a person (9 from the weekly SEO plan, 2 from project
 * staffing); 3 stayed unassigned. Verified afterwards: 4 rows per project,
 * 1 parent each, no due dates, all todo, no orphaned children.
 *
 * Undo (before anyone edits them):
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
const PHASE_KEYS = ["setup", "keyword-research", "technical-seo", "onpage-fixes"];

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
  if (entries.length !== 4 || PHASE_KEYS.some((k) => !keys.includes(k))) {
    throw new Error(`lib/seo-setup.ts did not parse as the 4 expected phases (got: ${keys.join(", ") || "none"})`);
  }
  if (entries.some((e) => !e.description.trim())) throw new Error("a phase parsed with an empty description");
  const parent = entries.find((e) => e.seoPhase === "setup");
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

  const existing = await rest("pm_tasks?select=project_id,seo_phase&seo_phase=not.is.null");
  const alreadyHas = new Set(existing.map((r) => r.project_id));

  // Same assignee rule as store.ensureSeoSetupTasks: the weekly SEO plan's
  // assignee is the person doing this client's SEO, so it wins over project
  // staffing (which is often several people, or nobody).
  const plans = await rest("pm_weekly_seo_plans?select=project_id,assignee_id");
  const planAssignee = new Map(plans.filter((r) => r.assignee_id).map((r) => [r.project_id, r.assignee_id]));

  const todo = seoProjects.filter((p) => !alreadyHas.has(p.id));

  console.log(`${APPLY ? "APPLY" : "DRY RUN"} — ${URL_BASE}`);
  console.log(`${projects.length} live projects, ${seoProjects.length} labelled SEO / Web + SEO`);
  console.log(`${seoProjects.length - todo.length} already have the work set, ${todo.length} to create\n`);

  let created = 0;
  for (const p of todo) {
    const staff = Array.isArray(p.assigned_staff) ? p.assigned_staff : [];
    const assignee = planAssignee.get(p.id) ?? (staff.length === 1 ? staff[0] : null);
    const via = planAssignee.get(p.id) ? "weekly SEO plan" : staff.length === 1 ? "project staff" : "";
    const label = `${p.name} [${p.type}] ${assignee ? `-> assigned (${via})` : "-> unassigned"}`;

    if (!APPLY) {
      console.log(`would create: ${label} — ${parent.title} + ${children.length} phases`);
      continue;
    }

    const parentId = randomUUID();
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
    for (const [i, child] of children.entries()) {
      await rest("pm_tasks", {
        method: "POST",
        body: JSON.stringify({
          id: randomUUID(), project_id: p.id, parent_id: parentId,
          title: child.title, description: child.description,
          status: "todo", priority: 5, type: "seo",
          assignee_id: assignee, due_date: null, tags: [],
          seo_phase: child.seoPhase, sort_order: i,
        }),
      });
    }
    created += 1 + children.length;
    console.log(`created: ${label}`);
  }

  console.log(`\n${APPLY ? `Done — ${created} tasks created across ${todo.length} projects.` : "Dry run only. Re-run with --apply to write."}`);
}

main().catch((e) => {
  console.error("backfill failed:", e.message);
  process.exit(1);
});
