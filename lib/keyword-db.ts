// Keyword research CRUD (table pm_keywords).
//
// Called directly by the panel rather than via the Zustand store, matching the
// invoices / expenses / seo-checklist pattern — keyword research is tab-local
// and does not belong in the global project payload.
//
// EVERY helper THROWS on error (Known Recurring Mistake #13).

import { supabase } from "@/lib/supabase";
import type { Keyword, ParsedKeywordRow } from "@/lib/keyword-types";

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
  /** Keywords the project already had — skipped rather than duplicated. */
  skipped: number;
}

/**
 * Bulk-inserts parsed rows, skipping keywords the project already holds
 * (case-insensitive). Skipping instead of erroring is deliberate: re-pasting a
 * research set that has grown by ten rows should add those ten, not fail.
 */
export async function importKeywords(
  projectId: string,
  rows: ParsedKeywordRow[],
): Promise<ImportResult> {
  if (rows.length === 0) return { inserted: [], skipped: 0 };

  const existing = await listKeywords(projectId);
  const have = new Set(existing.map((k) => k.keyword.trim().toLowerCase()));
  const fresh = rows.filter((r) => !have.has(r.keyword.trim().toLowerCase()));
  const skipped = rows.length - fresh.length;
  if (fresh.length === 0) return { inserted: [], skipped };

  const baseOrder = existing.length
    ? Math.max(...existing.map((k) => k.sortOrder)) + 1
    : 0;

  const { data, error } = await supabase
    .from("pm_keywords")
    .insert(fresh.map((r, i) => ({
      project_id: projectId,
      keyword: r.keyword,
      search_volume: r.searchVolume,
      difficulty: r.difficulty,
      target_url: r.targetUrl,
      current_rank: r.currentRank,
      rank_checked_at: r.currentRank != null ? new Date().toISOString() : null,
      sort_order: baseOrder + i,
    })))
    .select("*");
  if (error) throw error;
  return { inserted: ((data as Row[]) ?? []).map(rowToKeyword), skipped };
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
