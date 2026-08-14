import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  PARENT_SLOT, SINGLE_SLOTS, addDays, isoDate, mondayOf, planWeek, singleTitle,
  type WeekPlan,
} from "@/lib/weekly-seo";

// ─── Weekly SEO task engine ───────────────────────────────────────────────────
// Node runtime. Triggered once a day by a VPS cron line (see
// scripts/weekly-seo-cron.sh), and on demand by the admin "Generate now" button
// on /weekly-seo and the project's Weekly SEO tab.
//
// For every enabled row in pm_weekly_seo_plans it makes sure a week's standard
// SEO set exists in pm_tasks:
//   • "<Month> (Week N)" parent + its article subtasks, due Mon/Wed/Fri.
//   • "Backlinks — <Month> (Week N)" and "GMB Post — <Month> (Week N)",
//     due Friday.
// The month/week naming and which article days a week produces live in
// lib/weekly-seo.ts — a week belongs to the month of its FRIDAY and only
// generates the article days inside that month, so a week straddling a month
// boundary produces the NEW month's days only.
//
// WHICH WEEKS A RUN COVERS (Asia/Singapore):
//   • Mon–Fri  → the CURRENT week (catch-up: a failed run, or a project
//                enrolled mid-week, still gets its tasks).
//   • Fri/Sat/Sun → NEXT week as well. This is the "publish next week at the
//                start of Friday" rule: the 01:00 SGT Friday cron run creates
//                the coming week's set so staff can see it before it starts.
//                Sat/Sun repeat it (idempotent) so a failed Friday still lands.
//
// NO CARRY-FORWARD. An article that isn't finished stays under its own week's
// parent and simply runs overdue — it is never moved, retitled or tombstoned,
// and the new week always gets its own full set. The only tidy-up is that a
// past week's parent is closed once every one of its children is closed.
//
// Identity is pm_tasks.seo_week (Monday date) + seo_slot
// ('articles-parent' | 'article-1..3' | 'backlinks' | 'gmb') — never by title,
// so retitling a task by hand can't cause a duplicate. Idempotent: safe to run
// as often as you like. `?dry=1` reports without writing. `?projectId=<uuid>`
// scopes the run to one project. Generated tasks have created_by NULL
// (service role).
export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const CRON_SECRET = process.env.WEEKLY_SEO_CRON_SECRET || process.env.RENEWALS_CRON_SECRET || "";

type TaskRow = {
  id: string;
  parent_id: string | null;
  title: string;
  status: string;
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

type Admin = SupabaseClient;

/** Statuses that mean "no more work will happen here" (mirrors isClosedStatus). */
const CLOSED = new Set(["done", "missed", "rejected"]);
/** Only these get auto-closed — never a parent an admin deliberately parked. */
const AUTO_CLOSEABLE = new Set(["todo", "in_progress"]);

/** "Now" shifted to SGT (UTC+8, no DST) — read with getUTC* only. */
function sgtNow(): Date { return new Date(Date.now() + 8 * 3600_000); }

function errText(e: unknown): string {
  const o = e as { message?: string; details?: string } | undefined;
  return o?.message ? `${o.message}${o.details ? ` (${o.details})` : ""}` : String(e);
}

// The cron secret OR an admin's Supabase access token (the UI "Generate now"
// button). Mirrors pm_is_admin(): owner/admin in user_roles, or
// staff_members.pm_role = 'admin'.
async function authorize(req: Request, admin: Admin): Promise<{ ok: boolean; error?: string }> {
  const secretHeader = req.headers.get("x-cron-secret") ?? "";
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (CRON_SECRET && (secretHeader === CRON_SECRET || bearer === CRON_SECRET)) return { ok: true };
  if (!bearer) return { ok: false, error: "unauthorized" };

  const { data: { user }, error } = await admin.auth.getUser(bearer);
  if (error || !user) return { ok: false, error: "unauthorized" };
  const [{ data: roleRow }, { data: staffRow }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    admin.from("staff_members").select("pm_role").eq("user_id", user.id).maybeSingle(),
  ]);
  const isAdmin = ["owner", "admin"].includes((roleRow?.role as string) ?? "")
    || staffRow?.pm_role === "admin";
  return isAdmin ? { ok: true } : { ok: false, error: "admin access required" };
}

/** Make sure one project has one week's full SEO set. Returns what it created. */
async function ensureWeek(
  admin: Admin, plan: Plan, week: WeekPlan, assignee: string | null, dry: boolean,
): Promise<string[]> {
  const { data, error } = await admin
    .from("pm_tasks")
    .select("id,parent_id,title,status,seo_week,seo_slot")
    .eq("project_id", plan.project_id)
    .eq("seo_week", week.mondayIso)
    .is("archived_at", null);
  if (error) throw error;

  const bySlot = new Map<string, TaskRow>();
  for (const r of (data ?? []) as TaskRow[]) if (r.seo_slot) bySlot.set(r.seo_slot, r);

  const base = {
    project_id: plan.project_id,
    status: "todo",
    priority: 5,
    type: "seo",
    assignee_id: assignee,
    description: "",
    tags: [] as string[],
    seo_week: week.mondayIso,
  };

  const created: string[] = [];

  if (plan.include_articles) {
    let parent = bySlot.get(PARENT_SLOT) ?? null;
    if (!parent) {
      created.push(week.title);
      if (!dry) {
        const { data: row, error: insErr } = await admin.from("pm_tasks").insert({
          ...base,
          title: week.title,
          due_date: week.fridayIso,
          seo_slot: PARENT_SLOT,
        }).select("id,parent_id,title,status,seo_week,seo_slot").single();
        if (insErr) throw insErr;
        parent = row as TaskRow;
      }
    }

    for (const a of week.articles) {
      if (bySlot.has(a.slot)) continue;
      created.push(`${week.title} › ${a.title}`);
      if (dry) continue;
      const { error: insErr } = await admin.from("pm_tasks").insert({
        ...base,
        parent_id: parent!.id,
        title: a.title,
        // Admin approval parks these in pending_article_post until the live
        // link is recorded — see the Article-Post Workflow.
        requires_article_post: true,
        due_date: a.dueIso,
        seo_slot: a.slot,
      });
      if (insErr) throw insErr;
    }
  }

  for (const s of SINGLE_SLOTS) {
    const on = s.slot === "backlinks" ? plan.include_backlinks : plan.include_gmb;
    if (!on || bySlot.has(s.slot)) continue;
    const title = singleTitle(s.title, week);
    created.push(title);
    if (dry) continue;
    const { error: insErr } = await admin.from("pm_tasks").insert({
      ...base,
      title,
      due_date: week.fridayIso,
      seo_slot: s.slot,
    });
    if (insErr) throw insErr;
  }

  return created;
}

/**
 * Close out finished past weeks. A "<Month> (Week N)" parent from an earlier
 * week is marked done once every one of its children is closed. A parent with
 * an unfinished child is left alone — that work stays where it was scheduled
 * and shows as overdue. Scans the last 6 weeks so a week finished late still
 * gets tidied up.
 */
async function closeFinishedParents(
  admin: Admin, projectId: string, beforeIso: string, fromIso: string, dry: boolean,
): Promise<string[]> {
  const { data: parentRows, error } = await admin
    .from("pm_tasks")
    .select("id,parent_id,title,status,seo_week,seo_slot")
    .eq("project_id", projectId)
    .eq("seo_slot", PARENT_SLOT)
    .gte("seo_week", fromIso)
    .lt("seo_week", beforeIso)
    .is("archived_at", null);
  if (error) throw error;

  const parents = ((parentRows ?? []) as TaskRow[]).filter((p) => AUTO_CLOSEABLE.has(p.status));
  if (parents.length === 0) return [];

  const { data: childRows, error: childErr } = await admin
    .from("pm_tasks")
    .select("id,parent_id,title,status,seo_week,seo_slot")
    .in("parent_id", parents.map((p) => p.id))
    .is("archived_at", null);
  if (childErr) throw childErr;

  const children = new Map<string, TaskRow[]>();
  for (const c of (childRows ?? []) as TaskRow[]) {
    if (!c.parent_id) continue;
    children.set(c.parent_id, [...(children.get(c.parent_id) ?? []), c]);
  }

  const closed: string[] = [];
  for (const p of parents) {
    const kids = children.get(p.id) ?? [];
    if (kids.length === 0 || !kids.every((k) => CLOSED.has(k.status))) continue;
    closed.push(p.title);
    if (dry) continue;
    const { error: upErr } = await admin.from("pm_tasks").update({ status: "done" }).eq("id", p.id);
    if (upErr) throw upErr;
  }
  return closed;
}

export async function POST(req: Request) {
  try {
    if (!SUPABASE_URL || !SERVICE) {
      return NextResponse.json({ ok: false, reason: "supabase-not-configured" });
    }
    const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

    const auth = await authorize(req, admin);
    if (!auth.ok) return NextResponse.json({ ok: false, reason: auth.error }, { status: 401 });

    const params = new globalThis.URL(req.url).searchParams;
    const dry = params.get("dry") === "1";
    const onlyProject = params.get("projectId");

    const now = sgtNow();
    const dow = now.getUTCDay();
    const thisMonday = mondayOf(now);
    const nextMonday = addDays(thisMonday, 7);

    // Mon–Fri keep the current week topped up; from Friday onwards next week is
    // published early. Sat/Sun therefore only ever touch the coming week.
    const targets: Date[] = [];
    if (dow >= 1 && dow <= 5) targets.push(thisMonday);
    if (dow === 5 || dow === 6 || dow === 0) targets.push(nextMonday);
    const weeks = targets.map(planWeek);

    let planQuery = admin.from("pm_weekly_seo_plans").select("*").eq("enabled", true);
    if (onlyProject) planQuery = planQuery.eq("project_id", onlyProject);
    const { data: planRows, error: planErr } = await planQuery;
    if (planErr) throw planErr;
    const plans = (planRows ?? []) as Plan[];
    if (plans.length === 0) {
      return NextResponse.json({ ok: true, dryRun: dry, weeks: weeks.map((w) => w.title), plans: 0, results: [] });
    }

    const { data: projRows, error: projErr } = await admin
      .from("pm_projects")
      .select("id,name,assigned_staff")
      .in("id", plans.map((p) => p.project_id))
      .is("archived_at", null);
    if (projErr) throw projErr;
    const projects = new Map(
      (projRows ?? []).map((p) => [p.id as string, p as { id: string; name: string; assigned_staff: string[] | null }]),
    );

    const scanFrom = isoDate(addDays(thisMonday, -42));
    const results: Record<string, unknown>[] = [];

    for (const plan of plans) {
      // Missing = deleted (FK cascade removes the plan) OR ARCHIVED — an
      // archived project must not keep generating weekly tasks; its plan stays
      // enrolled and resumes automatically on unarchive.
      const project = projects.get(plan.project_id);
      if (!project) continue;
      const assignee = plan.assignee_id ?? project.assigned_staff?.[0] ?? null;

      // One bad project must not abort the whole run — record it and move on.
      try {
        const created: string[] = [];
        for (const week of weeks) {
          created.push(...await ensureWeek(admin, plan, week, assignee, dry));
        }
        const closed = await closeFinishedParents(admin, plan.project_id, weeks[0].mondayIso, scanFrom, dry);
        results.push({
          project: project.name,
          created: created.length,
          closed: closed.length,
          ...(created.length ? { tasks: created } : {}),
          ...(closed.length ? { closedParents: closed } : {}),
        });
      } catch (e) {
        results.push({ project: project.name, error: errText(e) });
      }
    }

    const failed = results.filter((r) => r.error).length;
    return NextResponse.json({
      ok: failed === 0,
      dryRun: dry,
      weeks: weeks.map((w) => ({ weekStarting: w.mondayIso, label: w.title })),
      plans: plans.length,
      failed,
      results,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: errText(e) }, { status: 500 });
  }
}
