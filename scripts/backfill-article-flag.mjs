#!/usr/bin/env node
/**
 * OPTIONAL one-off backfill: mark existing tasks as articles
 * (pm_tasks.is_article) so the Articles sheet shows work already on the board,
 * not just what is created from now on.
 *
 * ⚠ NOT RUN AGAINST LIVE. Offered on 2026-08-25 (139 candidates across 11
 * clients) and DECLINED by the owner — "not all are articles". Marking is done
 * by hand instead, from the Article column on a project's Sheet tab, which has
 * a bulk "Mark N shown as articles" action for exactly this. Keep this script
 * as an accelerator if that ever changes: tier A alone (56 rows) is evidence on
 * the row itself, not a guess. It defaults to a dry run either way.
 *
 *   node scripts/backfill-article-flag.mjs            # dry run (default)
 *   node scripts/backfill-article-flag.mjs --apply    # actually write
 *   node scripts/backfill-article-flag.mjs --apply --exclude <id>,<id>

 *
 * WHY A HEURISTIC AT ALL: the flag is the identity going forward, but nothing
 * recorded it before it existed. The live data rules out matching by title on
 * its own — 109 tasks contain "article" while 62 of them are not articles
 * ("Featured image not showing in single article page"), and 19 real articles
 * with live URLs recorded are titled only "Monday", "wednesday post" or
 * "Wednesday Blogs". So candidates are tiered by how much evidence there is,
 * printed for a human to read, and only then applied.
 *
 *   A  strong    a live article URL is recorded on the task, or it is a weekly
 *                generator article slot. Not a judgement call.
 *   B  weekly    a child of a weekly articles parent ("week 6 articles",
 *                "Article Upload (Week 4)") whose own title is an article, a
 *                blog, a post or a weekday. This is the shape every hand-made
 *                week in the live data uses.
 *   C  standalone a task with no children whose title says article or blog.
 *
 * Tasks that HOLD articles (the weekly parent itself) are never flagged: the
 * sheet renders one row per article, and a flagged parent would count its own
 * week a second time. lib/articles.ts enforces the same rule at render time.
 *
 * Plain fetch + PostgREST, no supabase-js: node_modules is unreliable under
 * OneDrive (same reason as scripts/migrate-base64-descriptions.mjs).
 *
 * Undo, before anyone edits the sheet:
 *   update pm_tasks set is_article = false where is_article;
 *   -- then re-run the weekly generator's own rows back on, or re-run this.
 */
import fs from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
// --exclude a,b,c  or  --exclude=a,b,c. Guarded: without the flag at all,
// indexOf(undefined) is -1 and argv[0] (the node binary path) would silently
// become a bogus "excluded id".
function readExcludes() {
  const i = process.argv.findIndex((a) => a === "--exclude" || a.startsWith("--exclude="));
  if (i === -1) return "";
  const arg = process.argv[i];
  return arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : (process.argv[i + 1] ?? "");
}
const EXCLUDE = new Set(readExcludes().split(",").map((s) => s.trim()).filter(Boolean));

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..",
);

function readEnv() {
  const txt = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
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

async function rest(pathAndQuery, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json", ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${text}`);
  return text ? JSON.parse(text) : null;
}

// ── Heuristics ───────────────────────────────────────────────────────────────

const ARTICLE_SLOT = /^article-\d+$/;
/** A piece of content. "Blog" and "post" included — the live titles use all three. */
const CONTENT_WORD = /\b(articles?|blogs?)\b/i;
/** What a weekly child is actually called: "monday article", "wednesday", "friday post". */
const WEEKDAY = /\b(mon|tues|wednes|thurs|fri|satur|sun)day\b/i;
const CHILD_WORD = /\b(articles?|blogs?|posts?)\b/i;
/** A weekly grouping task: "week 6 articles", "Article Upload (Week 4)", "August 3rd week Task". */
const WEEKLY_PARENT = /\b(articles?|blogs?)\b|\bweek\s*\d|\b\d+(st|nd|rd|th)\s+week\b/i;
/**
 * Titles that mention an article but describe work ON the site rather than a
 * piece of content — the exact false positives in the live data.
 */
const NOT_CONTENT = /\b(fix|bug|error|issue|not showing|broken|plugin|theme|layout|css|image|page speed|redirect|404)\b/i;

function classify(task, parent, children) {
  if (task.is_article) return null;                      // already flagged
  // A weekly parent is the group, never a row.
  if (children.length > 0 && children.some((c) => looksLikeArticle(c, task, []))) return null;

  if (task.article_url) return { tier: "A", why: "live article URL recorded" };
  if (task.seo_slot && ARTICLE_SLOT.test(task.seo_slot)) return { tier: "A", why: `generator slot ${task.seo_slot}` };

  if (NOT_CONTENT.test(task.title)) return null;

  if (parent && WEEKLY_PARENT.test(parent.title) && (CHILD_WORD.test(task.title) || WEEKDAY.test(task.title))) {
    return { tier: "B", why: `child of "${parent.title}"` };
  }
  if (task.requires_article_post) return { tier: "B", why: "task is set to require a live article link" };
  if (children.length === 0 && CONTENT_WORD.test(task.title)) {
    return { tier: "C", why: "title names an article or blog" };
  }
  return null;
}

/** Shallow re-check used to decide whether a parent is a grouping task. */
function looksLikeArticle(task, parent, children) {
  if (task.is_article) return true;
  if (task.article_url) return true;
  if (task.seo_slot && ARTICLE_SLOT.test(task.seo_slot)) return true;
  if (NOT_CONTENT.test(task.title)) return false;
  if (parent && WEEKLY_PARENT.test(parent.title) && (CHILD_WORD.test(task.title) || WEEKDAY.test(task.title))) return true;
  if (task.requires_article_post) return true;
  return children.length === 0 && CONTENT_WORD.test(task.title);
}

async function main() {
  const projects = await rest("pm_projects?select=id,name&archived_at=is.null");
  const projectName = new Map(projects.map((p) => [p.id, p.name]));

  // Archived tasks are included deliberately: unarchiving one should bring it
  // back to the sheet already marked, rather than needing this run again.
  const tasks = await rest(
    "pm_tasks?select=id,parent_id,project_id,title,status,due_date,seo_slot,article_url," +
    "requires_article_post,is_article,archived_at&order=created_at"
  );

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const kids = new Map();
  for (const t of tasks) {
    if (!t.parent_id) continue;
    if (!kids.has(t.parent_id)) kids.set(t.parent_id, []);
    kids.get(t.parent_id).push(t);
  }

  const hits = [];
  for (const t of tasks) {
    const verdict = classify(t, t.parent_id ? byId.get(t.parent_id) ?? null : null, kids.get(t.id) ?? []);
    if (verdict) hits.push({ task: t, ...verdict });
  }

  const already = tasks.filter((t) => t.is_article).length;
  console.log(`${APPLY ? "APPLY" : "DRY RUN"} — ${URL_BASE}`);
  console.log(`${tasks.length} tasks scanned, ${already} already flagged as articles\n`);

  for (const tier of ["A", "B", "C"]) {
    const list = hits.filter((h) => h.tier === tier);
    const name = { A: "A · STRONG — evidence on the row itself", B: "B · WEEKLY — the shape every hand-made week uses", C: "C · STANDALONE — title only" }[tier];
    console.log(`${name}  (${list.length})`);
    for (const h of list) {
      const skip = EXCLUDE.has(h.task.id) ? "  [EXCLUDED]" : "";
      const arch = h.task.archived_at ? " (archived)" : "";
      console.log(
        `  ${h.task.id.slice(0, 8)} | ${String(projectName.get(h.task.project_id) ?? "?").slice(0, 18).padEnd(18)}` +
        ` | ${String(h.task.title).slice(0, 38).padEnd(38)} | ${String(h.task.status).padEnd(23)}` +
        ` | ${h.why}${arch}${skip}`
      );
    }
    console.log("");
  }

  const toWrite = hits.filter((h) => !EXCLUDE.has(h.task.id)).map((h) => h.task.id);
  console.log(`${toWrite.length} tasks would be marked as articles` +
    (EXCLUDE.size ? ` (${EXCLUDE.size} excluded by hand)` : "") + ".");

  if (!APPLY) {
    console.log("\nDry run — nothing written. Re-run with --apply once the list above is right.");
    return;
  }

  // Chunked so one oversized URL can't fail the whole batch.
  let written = 0;
  for (let i = 0; i < toWrite.length; i += 40) {
    const chunk = toWrite.slice(i, i + 40);
    await rest(`pm_tasks?id=in.(${chunk.join(",")})`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ is_article: true }),
    });
    written += chunk.length;
    console.log(`  wrote ${written}/${toWrite.length}`);
  }

  const after = await rest("pm_tasks?select=id&is_article=is.true");
  console.log(`\nDone. ${after.length} tasks are now marked as articles.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
