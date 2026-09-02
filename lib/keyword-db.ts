// Keyword research CRUD (table pm_keywords).
//
// Called directly by the panel rather than via the Zustand store, matching the
// invoices / expenses / seo-checklist pattern — keyword research is tab-local
// and does not belong in the global project payload.
//
// EVERY helper THROWS on error (Known Recurring Mistake #13).

import { supabase } from "@/lib/supabase";
import type { Keyword, ParsedKeywordRow, KeywordField } from "@/lib/keyword-types";

type Row = {
  id: string;
  project_id: string;
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  target_url: string | null;
  current_rank: number | null;
  rank_checked_at: string | null;
  status: string;
  priority: string;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function rowToKeyword(r: Row): Keyword {
  return {
    id: r.id,
    projectId: r.project_id,
    keyword: r.keyword,
    searchVolume: r.search_volume,
    difficulty: r.difficulty,
    targetUrl: r.target_url,
    currentRank: r.current_rank,
    rankCheckedAt: r.rank_checked_at,
    status: r.status,
    priority: r.priority,
    notes: r.notes,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listKeywords(projectId: string): Promise<Keyword[]> {
  const { data, error } = await supabase
    .from("pm_keywords")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data as Row[]) ?? []).map(rowToKeyword);
}

export async function addKeyword(
  projectId: string,
  data: Partial<Keyword> & { keyword: string },
): Promise<Keyword> {
  const { data: row, error } = await supabase
    .from("pm_keywords")
    .insert({
      project_id: projectId,
      keyword: data.keyword,
      search_volume: data.searchVolume ?? null,
      difficulty: data.difficulty ?? null,
      target_url: data.targetUrl ?? null,
      current_rank: data.currentRank ?? null,
      rank_checked_at: data.currentRank != null ? new Date().toISOString() : null,
      status: data.status ?? "target",
      priority: data.priority ?? "medium",
      notes: data.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToKeyword(row as Row);
}

export interface ImportResult {
  inserted: Keyword[];
  /** Existing keywords refreshed from the report. */
  updated: Keyword[];
  /** Existing keywords the report changed nothing on. */
  unchanged: number;
}

/**
 * Imports parsed rows: NEW keywords are inserted, keywords the project already
 * holds are UPDATED from the report (case-insensitive match on the keyword).
 *
 * Updating rather than skipping is the whole point of importing a rank-tracker
 * export — a monthly ranking report is by definition news about keywords you
 * already track, and the previous skip-everything behaviour made re-importing
 * one a silent no-op.
 *
 * What an update is allowed to touch is decided by `mappedFields` — the columns
 * the source actually had:
 *
 *  - A field the report doesn't have a column for is never written. Importing a
 *    volume-only list must not wipe every recorded position.
 *  - A field it DOES have a column for is written even when the cell is blank,
 *    because that is the report saying "no value" — a blank Position on a rank
 *    export means the keyword dropped out of the results, which is exactly the
 *    news worth recording. The one exception is `targetUrl`: a blank ranking-page
 *    cell accompanies a keyword that isn't ranking, and it is not a statement
 *    that the page you're targeting has gone away.
 *
 * `rank_checked_at` is stamped whenever the report carries rank information, from
 * the row's own "Last checked" date when it has one and the import time
 * otherwise — so a keyword that is checked and NOT ranking is stored as
 * rank NULL + a timestamp, which is how pm_keywords distinguishes "not ranking"
 * from "never checked".
 */
export async function importKeywords(
  projectId: string,
  rows: ParsedKeywordRow[],
  mappedFields: KeywordField[] = ["searchVolume", "difficulty"],
): Promise<ImportResult> {
  if (rows.length === 0) return { inserted: [], updated: [], unchanged: 0 };

  const has = (f: KeywordField) => mappedFields.includes(f);
  const existing = await listKeywords(projectId);
  const byKeyword = new Map(existing.map((k) => [k.keyword.trim().toLowerCase(), k]));

  const fresh = rows.filter((r) => !byKeyword.has(r.keyword.trim().toLowerCase()));
  const known = rows
    .map((r) => ({ row: r, current: byKeyword.get(r.keyword.trim().toLowerCase()) }))
    .filter((x): x is { row: ParsedKeywordRow; current: Keyword } => !!x.current);

  const stamp = new Date().toISOString();
  const inserted: Keyword[] = [];

  if (fresh.length > 0) {
    const baseOrder = existing.length ? Math.max(...existing.map((k) => k.sortOrder)) + 1 : 0;
    const { data, error } = await supabase
      .from("pm_keywords")
      .insert(fresh.map((r, i) => ({
        project_id: projectId,
        keyword: r.keyword,
        search_volume: r.searchVolume,
        difficulty: r.difficulty,
        target_url: r.targetUrl,
        current_rank: r.currentRank,
        // Checked-and-not-ranking is real information, so the timestamp follows
        // the report carrying a rank COLUMN, not the row having a number in it.
        rank_checked_at: has("currentRank") ? (r.rankCheckedAt ?? stamp) : null,
        // A keyword the report shows in the results is already ranking; calling
        // it "Target" would be wrong on arrival. Only ever set on INSERT.
        status: has("currentRank") && r.currentRank != null ? "ranking" : "target",
        notes: r.intent ? `Search intent: ${r.intent}` : null,
        sort_order: baseOrder + i,
      })))
      .select("*");
    if (error) throw error;
    inserted.push(...((data as Row[]) ?? []).map(rowToKeyword));
  }

  const updated: Keyword[] = [];
  let unchanged = 0;

  for (const { row, current } of known) {
    const patch: Record<string, unknown> = {};
    if (has("searchVolume") && row.searchVolume !== current.searchVolume) patch.search_volume = row.searchVolume;
    if (has("difficulty") && row.difficulty !== current.difficulty) patch.difficulty = row.difficulty;
    // Blank target URL is absence, not news — see the note above.
    if (has("targetUrl") && row.targetUrl && row.targetUrl !== current.targetUrl) patch.target_url = row.targetUrl;
    if (has("currentRank")) {
      const checkedAt = row.rankCheckedAt ?? stamp;
      // Re-stamp the check date even when the position is identical: "still #5,
      // confirmed today" is the answer to "is this number stale?".
      if (row.currentRank !== current.currentRank) patch.current_rank = row.currentRank;
      if (checkedAt !== current.rankCheckedAt) patch.rank_checked_at = checkedAt;
    }
    if (Object.keys(patch).length === 0) { unchanged++; continue; }

    const { data, error } = await supabase
      .from("pm_keywords")
      .update(patch)
      .eq("id", current.id)
      .select("*")
      .single();
    if (error) throw error;
    updated.push(rowToKeyword(data as Row));
  }

  return { inserted, updated, unchanged };
}

export async function updateKeyword(
  id: string,
  patch: Partial<Pick<Keyword, "keyword" | "searchVolume" | "difficulty" | "targetUrl" | "currentRank" | "status" | "priority" | "notes">>,
): Promise<Keyword> {
  const db: Record<string, unknown> = {};
  if (patch.keyword !== undefined) db.keyword = patch.keyword;
  if (patch.searchVolume !== undefined) db.search_volume = patch.searchVolume;
  if (patch.difficulty !== undefined) db.difficulty = patch.difficulty;
  if (patch.targetUrl !== undefined) db.target_url = patch.targetUrl;
  if (patch.status !== undefined) db.status = patch.status;
  if (patch.priority !== undefined) db.priority = patch.priority;
  if (patch.notes !== undefined) db.notes = patch.notes;
  // Recording a position also records WHEN it was checked, so a stale number is
  // always identifiable as stale.
  if (patch.currentRank !== undefined) {
    db.current_rank = patch.currentRank;
    db.rank_checked_at = patch.currentRank === null ? null : new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("pm_keywords")
    .update(db)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToKeyword(data as Row);
}

export async function deleteKeyword(id: string): Promise<void> {
  const { error } = await supabase.from("pm_keywords").delete().eq("id", id);
  if (error) throw error;
}
