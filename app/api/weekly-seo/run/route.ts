import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── Weekly SEO task engine ───────────────────────────────────────────────────
// Node runtime. Triggered once a day by a VPS cron line (see scripts/weekly-seo-cron.sh):
//   curl -fsS -X POST https://os.webby.sg/api/weekly-seo/run -H "x-cron-secret: $WEEKLY_SEO_CRON_SECRET"
//
// For every enabled row in pm_weekly_seo_plans it makes sure the CURRENT week
// (Mon–Fri, Asia/Singapore) has its standard SEO set in pm_tasks:
//   • "Article Upload (Week N)" parent + subtasks Article 1 (Monday) / Article 2
//     (Wednesday) / Article 3 (Friday)  — N = which 7-day block of the month the
//     week's FRIDAY falls in (matches the admin's numbering: Jul 20-24 = week 4).
//   • "Backlinks" and "GMB Post" top-level weekly tasks, due Friday.
//
// Carry-forward (runs once per week transition, on the first run that sees the
// new week):
//   • Unfinished articles from last week MOVE into this week's earliest free
//     slots (same task row — description/comments/attachments travel with it),
//     retitled "Article n (Day) — carried over" + tagged `carried-over`.
//   • Each vacated slot gets a tombstone subtask under LAST week's parent with
//     status `missed` ("Article n (Day) — missed, no article posted") so the
//     record shows exactly which articles were never posted.
//   • Last week's parent is closed (status done) and, when articles were
//     missed, suffixed "— x/3 posted".
//   • An unfinished Backlinks / GMB Post task is carried forward as-is (due
//     this Friday, tagged `carried-over`) instead of creating a duplicate.
//
// Identity is via pm_tasks.seo_week (Monday date) + seo_slot
// ('articles-parent' | 'article-1..3' | 'backlinks' | 'gmb') — never by title.
// Idempotent: safe to run daily; Sat/Sun runs no-op. `?dry=1` reports without
// writing. Generated tasks have created_by NULL (service role).
export const runtime = "nodejs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const CRON_SECRET = process.env.WEEKLY_SEO_CRON_SECRET || process.env.RENEWALS_CRON_SECRET || "";

type TaskRow = {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  status: string;
  assignee_id: string | null;
  due_date: string | null;
  tags: string[] | null;
  seo_week: string | null;
  seo_slot: string | null;
};

type Plan = {
  id: string;
  project_id: string;
  enabled: boolean;
  assignee_id: string | null;
  include_articles: boolean;
  include_backlinks: boolean;
  include_gmb: boolean;
};

const ARTICLE_SLOTS = [
  { n: 1, slot: "article-1", day: "Monday", offset: 0 },
  { n: 2, slot: "article-2", day: "Wednesday", offset: 2 },
  { n: 3, slot: "article-3", day: "Friday", offset: 4 },
] as const;

function iso(d: Date): string { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; }

// "Now" shifted to SGT (UTC+8, no DST) — read with getUTC* only.
function sgtNow(): Date { return new Date(Date.now() + 8 * 3600_000); }

function mondayOf(d: Date): Date {
  const m = new Date(d);
  m.setUTCHours(0, 0, 0, 0);
  m.setUTCDate(m.getUTCDate() - ((m.getUTCDay() + 6) % 7));
  return m;
}

// Week label = which 7-day block of the month the week's Friday falls in.
function weekNumberOf(monday: Date): number { return Math.ceil(addDays(monday, 4).getUTCDate() / 7); }

function slotTitle(slot: string): string {
  const s = ARTICLE_SLOTS.find((x) => x.slot === slot);
  return s ? `Article ${s.n} (${s.day})` : slot;
}

function uniqTags(tags: string[] | null, add: string): string[] {
  const t = tags ?? [];
  return t.includes(add) ? t : [...t, add];
}

function authed(req: Request): boolean {
  if (!CRON_SECRET) return false;
  const hdr = req.headers.get("x-cron-secret")
    || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return hdr === CRON_SECRET;
}

export async function POST(req: Request) {
  try {
    if (!URL || !SERVICE) return NextResponse.json({ ok: false, reason: "supabase-not-configured" });
    if (!authed(req)) return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });

    const dry = new globalThis.URL(req.url).searchParams.get("dry") === "1";
    const now = sgtNow();
    const dow = now.getUTCDay();
    if (dow === 0 || dow === 6) {
      return NextResponse.json({ ok: true, skipped: "weekend" });
    }

    const weekStart = mondayOf(now);
    const prevStart = addDays(weekStart, -7);
    const weekIso = iso(weekStart);
    const prevIso = iso(prevStart);
    const fridayIso = iso(addDays(weekStart, 4));
    const weekNo = weekNumberOf(weekStart);

    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

    const { data: planRows, error: planErr } = await admin
      .from("pm_weekly_seo_plans")
      .select("*")
      .eq("enabled", true);
    if (planErr) throw planErr;
    const plans = (planRows ?? []) as Plan[];
    if (plans.length === 0) return NextResponse.json({ ok: true, week: weekIso, plans: 0 });

    const { data: projRows, error: projErr } = await admin
      .from("pm_projects")
      .select("id,name,assigned_staff")
      .in("id", plans.map((p) => p.project_id));
    if (projErr) throw projErr;
    const projects = new Map((projRows ?? []).map((p) => [p.id as string, p as { id: string; name: string; assigned_staff: string[] | null }]));

    const results: Record<string, unknown>[] = [];

    for (const plan of plans) {
      const project = projects.get(plan.project_id);
      if (!project) continue; // project deleted; FK cascade will have removed the plan anyway
      const assignee = plan.assignee_id ?? project.assigned_staff?.[0] ?? null;

      const { data: rowData, error: rowErr } = await admin
        .from("pm_tasks")
        .select("id,project_id,parent_id,title,status,assignee_id,due_date,tags,seo_week,seo_slot")
        .eq("project_id", plan.project_id)
        .in("seo_week", [prevIso, weekIso])
        .is("archived_at", null);
      if (rowErr) throw rowErr;
      const rows = (rowData ?? []) as TaskRow[];
      const cur = rows.filter((r) => r.seo_week === weekIso);
      const prev = rows.filter((r) => r.seo_week === prevIso);

      const base = {
        project_id: plan.project_id,
        status: "todo",
        priority: 5,
        type: "seo",
        assignee_id: assignee,
        description: "",
        tags: [] as string[],
      };

      let created = 0, carried = 0, missed = 0;
      const dryNotes: string[] = [];

      if (plan.include_articles) {
        // 1) Ensure this week's parent exists.
        let parent = cur.find((r) => r.seo_slot === "articles-parent") ?? null;
        if (!parent) {
          if (dry) {
            dryNotes.push(`create parent "Article Upload (Week ${weekNo})"`);
          } else {
            const { data, error } = await admin.from("pm_tasks").insert({
              ...base,
              title: `Article Upload (Week ${weekNo})`,
              due_date: fridayIso,
              seo_week: weekIso,
              seo_slot: "articles-parent",
            }).select("id,project_id,parent_id,title,status,assignee_id,due_date,tags,seo_week,seo_slot").single();
            if (error) throw error;
            parent = data as TaskRow;
            created++;
          }
        }

        const occupied = new Set(cur.filter((r) => r.seo_slot?.startsWith("article-")).map((r) => r.seo_slot as string));

        // 2) Carry-forward — once per week transition (marked by `rollover-done`
        //    on this week's parent so a mid-week catch-up run can't repeat it).
        const prevParent = prev.find((r) => r.seo_slot === "articles-parent") ?? null;
        const needRollover = !!prevParent && (!parent || !(parent.tags ?? []).includes("rollover-done"));
        if (needRollover && prevParent) {
          const prevIncomplete = prev
            .filter((r) => r.seo_slot?.startsWith("article-") && r.seo_slot !== "articles-parent"
              && r.status !== "done" && r.status !== "missed")
            .sort((a, b) => (a.seo_slot ?? "").localeCompare(b.seo_slot ?? ""));

          for (const t of prevIncomplete) {
            const free = ARTICLE_SLOTS.find((s) => !occupied.has(s.slot));
            if (!free) break;
            occupied.add(free.slot);
            const vacatedSlot = t.seo_slot as string;
            const vacatedInfo = ARTICLE_SLOTS.find((s) => s.slot === vacatedSlot);
            if (dry) {
              dryNotes.push(`carry "${t.title}" → Article ${free.n} (${free.day}); tombstone ${vacatedSlot}`);
              carried++; missed++;
              continue;
            }
            const { error: moveErr } = await admin.from("pm_tasks").update({
              parent_id: parent!.id,
              title: `Article ${free.n} (${free.day}) — carried over`,
              due_date: iso(addDays(weekStart, free.offset)),
              seo_week: weekIso,
              seo_slot: free.slot,
              tags: uniqTags(t.tags, "carried-over"),
            }).eq("id", t.id);
            if (moveErr) throw moveErr;
            carried++;

            const { error: tombErr } = await admin.from("pm_tasks").insert({
              ...base,
              parent_id: prevParent.id,
              title: `${slotTitle(vacatedSlot)} — missed, no article posted`,
              status: "missed",
              due_date: vacatedInfo ? iso(addDays(prevStart, vacatedInfo.offset)) : prevIso,
              seo_week: prevIso,
              seo_slot: vacatedSlot,
              tags: ["missed"],
            });
            if (tombErr) throw tombErr;
            missed++;
          }

          // Close out last week's parent; record the shortfall in its title.
          if (!dry) {
            const posted = Math.max(0, 3 - prevIncomplete.length);
            let title = prevParent.title;
            if (prevIncomplete.length > 0 && !/\d\/3 posted/.test(title)) title += ` — ${posted}/3 posted`;
            const { error: closeErr } = await admin.from("pm_tasks")
              .update({ status: "done", title }).eq("id", prevParent.id);
            if (closeErr) throw closeErr;
            const { error: tagErr } = await admin.from("pm_tasks")
              .update({ tags: uniqTags(parent!.tags, "rollover-done") }).eq("id", parent!.id);
            if (tagErr) throw tagErr;
          }
        }

        // 3) Fill any remaining empty slots with fresh articles.
        for (const s of ARTICLE_SLOTS) {
          if (occupied.has(s.slot)) continue;
          if (dry) { dryNotes.push(`create Article ${s.n} (${s.day})`); created++; continue; }
          const { error } = await admin.from("pm_tasks").insert({
            ...base,
            parent_id: parent!.id,
            title: `Article ${s.n} (${s.day})`,
            due_date: iso(addDays(weekStart, s.offset)),
            seo_week: weekIso,
            seo_slot: s.slot,
          });
          if (error) throw error;
          created++;
        }
      }

      // 4) Weekly singles: Backlinks + GMB Post. An unfinished one from last
      //    week is carried forward (same row) instead of duplicated.
      const singles = [
        { on: plan.include_backlinks, slot: "backlinks", title: "Backlinks" },
        { on: plan.include_gmb, slot: "gmb", title: "GMB Post" },
      ];
      for (const s of singles) {
        if (!s.on) continue;
        if (cur.some((r) => r.seo_slot === s.slot)) continue;
        const prevRow = prev.find((r) => r.seo_slot === s.slot);
        if (prevRow && prevRow.status !== "done" && prevRow.status !== "missed") {
          if (dry) { dryNotes.push(`carry ${s.title} forward`); carried++; continue; }
          const { error } = await admin.from("pm_tasks").update({
            due_date: fridayIso,
            seo_week: weekIso,
            tags: uniqTags(prevRow.tags, "carried-over"),
          }).eq("id", prevRow.id);
          if (error) throw error;
          carried++;
        } else {
          if (dry) { dryNotes.push(`create ${s.title}`); created++; continue; }
          const { error } = await admin.from("pm_tasks").insert({
            ...base,
            title: s.title,
            due_date: fridayIso,
            seo_week: weekIso,
            seo_slot: s.slot,
          });
          if (error) throw error;
          created++;
        }
      }

      results.push({
        project: project.name,
        created, carried, missed,
        ...(dry && dryNotes.length ? { would: dryNotes } : {}),
      });
    }

    return NextResponse.json({ ok: true, dryRun: dry, week: weekIso, weekNo, results });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: String((e as { message?: string })?.message ?? e) }, { status: 500 });
  }
}
