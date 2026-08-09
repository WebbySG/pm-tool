/**
 * One-off backfill: move base64 images OUT of pm_tasks.description into storage.
 *
 * Why this exists
 * ---------------
 * The task description editor is a contentEditable. Its paste handler only
 * intercepted clipboard items of kind "file" (screenshots), so an image copied
 * from a WEB PAGE, Word or Google Docs — which the browser delivers as text/html
 * containing <img src="data:image/...;base64,…"> — was pasted straight into the
 * row. That produced descriptions of over 1.4 MB each. Consequences:
 *
 *   1. loadAll() does `select *` on pm_tasks, so EVERY user downloaded all of
 *      that base64 on every navigation (refresh runs on each pathname change).
 *   2. Saving such a task sends the whole blob back. Those saves were failing —
 *      and because dbUpdateTask discarded its error and the caller dropped the
 *      promise, the failure was invisible. Freshly uploaded images appeared to
 *      attach and then vanished on the next refresh.
 *
 * The paste handler and the error handling are both fixed in the app now. This
 * script cleans up the rows that were already damaged, so those tasks become
 * saveable again and the payload drops back to a few KB.
 *
 * It uploads each embedded image to the existing public `pm-attachments` bucket
 * under `<task id>/` (same layout as every other task attachment) and rewrites
 * the description to point at the uploaded URL. A description is only written
 * back if every image in it uploaded successfully — a partial rewrite would
 * silently drop someone's screenshot.
 *
 * Usage (from the repo root, with .env.local present):
 *   node scripts/migrate-base64-descriptions.mjs          # dry run, writes nothing
 *   node scripts/migrate-base64-descriptions.mjs --apply  # perform the migration
 */

// Uses plain fetch against PostgREST + the Storage REST API rather than
// @supabase/supabase-js, so it runs even when node_modules is unreadable
// (the repo lives in a OneDrive folder, which intermittently locks files).
import { readFileSync, writeFileSync } from "node:fs";

// --- env -------------------------------------------------------------------
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const BUCKET = "pm-attachments";
const authHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

async function rest(path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...authHeaders, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function uploadObject(path, bytes, contentType) {
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": contentType },
    body: bytes,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
}

console.log(`Supabase project: ${url}`);
console.log(APPLY ? "MODE: APPLY (will write)" : "MODE: DRY RUN (no writes)\n");

// --- load damaged rows -----------------------------------------------------
let rows;
try {
  rows = await rest("pm_tasks?select=id,title,description&description=like.*data:image*");
} catch (e) {
  console.error("Failed to load tasks:", e.message);
  process.exit(1);
}
if (!rows?.length) {
  console.log("No tasks contain base64 images. Nothing to do.");
  process.exit(0);
}

// Full backup of every original description before anything is rewritten, so the
// migration can be undone. Written beside this script and gitignored (it holds
// several MB of base64). Path is printed below.
if (APPLY) {
  const backupPath = new URL("./base64-descriptions-backup.json", import.meta.url);
  writeFileSync(backupPath, JSON.stringify(rows, null, 2), "utf8");
  console.log(`Backup of ${rows.length} original description(s): ${backupPath.pathname}\n`);
}

const DATA_URI_RE = /data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)/g;

let totalImages = 0;
let totalBefore = 0;
let totalAfter = 0;
let migrated = 0;
let skipped = 0;

for (const task of rows) {
  const desc = task.description ?? "";
  const matches = [...desc.matchAll(DATA_URI_RE)];
  if (!matches.length) continue;

  totalBefore += desc.length;
  console.log(`\n• ${task.title || "(untitled)"} [${task.id}]`);
  console.log(`  ${matches.length} embedded image(s), description ${(desc.length / 1024).toFixed(0)} KB`);

  let out = desc;
  let allOk = true;

  for (const [i, m] of matches.entries()) {
    const [full, ext, b64] = m;
    const bytes = Buffer.from(b64.replace(/\s/g, ""), "base64");
    const safeExt = ext.toLowerCase() === "jpeg" ? "jpg" : ext.toLowerCase();
    const path = `${task.id}/${Date.now()}_embedded-${i + 1}.${safeExt}`;

    if (!APPLY) {
      console.log(`    [dry] would upload image ${i + 1}: ${(bytes.length / 1024).toFixed(0)} KB → ${path}`);
      // Simulate the shrink so the dry run reports a realistic final size.
      out = out.replace(full, `${url}/storage/v1/object/public/${BUCKET}/${path}`);
      totalImages++;
      continue;
    }

    let publicUrl;
    try {
      publicUrl = await uploadObject(path, bytes, `image/${ext}`);
    } catch (e) {
      console.error(`    ✗ upload failed for image ${i + 1}:`, e.message);
      allOk = false;
      break;
    }
    out = out.replace(full, publicUrl);
    totalImages++;
    console.log(`    ✓ uploaded image ${i + 1} (${(bytes.length / 1024).toFixed(0)} KB)`);
  }

  if (!allOk) {
    // Leave the row untouched rather than write a half-migrated description.
    console.log("    → SKIPPED (an upload failed; description left unchanged)");
    skipped++;
    continue;
  }

  totalAfter += out.length;
  console.log(`  description ${(desc.length / 1024).toFixed(0)} KB → ${(out.length / 1024).toFixed(1)} KB`);

  if (APPLY) {
    try {
      await rest(`pm_tasks?id=eq.${task.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ description: out }),
      });
    } catch (e) {
      console.error("    ✗ description update failed:", e.message);
      skipped++;
      continue;
    }
    console.log("    ✓ description rewritten");
  }
  migrated++;
}

console.log("\n────────────────────────────────────────");
console.log(`Tasks ${APPLY ? "migrated" : "to migrate"}: ${migrated}   skipped: ${skipped}`);
console.log(`Images ${APPLY ? "uploaded" : "to upload"}: ${totalImages}`);
console.log(`Description bytes: ${(totalBefore / 1024 / 1024).toFixed(2)} MB → ${(totalAfter / 1024).toFixed(1)} KB`);
if (!APPLY) console.log("\nRe-run with --apply to perform the migration.");
