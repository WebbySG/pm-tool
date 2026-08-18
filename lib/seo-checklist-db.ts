// Technical / On-Page SEO checklist CRUD (table pm_seo_checklist_items).
//
// Called directly by the panel rather than going through the Zustand store,
// matching the invoices / expenses / weekly-reports pattern — the checklist is
// tab-local and does not belong in the global project payload.
//
// EVERY helper THROWS on error (Known Recurring Mistake #13): the UI patches
// optimistically, so a helper that swallowed its error would look like success
// and silently lose the record at the next reload.

import { supabase } from "@/lib/supabase";
import { standardChecklist, type SeoChecklistCategory } from "@/lib/seo-checklist";

export interface SeoChecklistItem {
  id: string;
  projectId: string;
  category: string;
  label: string;
  sortOrder: number;
  done: boolean;
  note: string | null;
  completedBy: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type Row = {
  id: string;
  project_id: string;
  category: string;
  label: string;
  sort_order: number;
  done: boolean;
  note: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToItem(r: Row): SeoChecklistItem {
  return {
    id: r.id,
    projectId: r.project_id,
    category: r.category,
    label: r.label,
    sortOrder: r.sort_order,
    done: r.done,
    note: r.note,
    completedBy: r.completed_by,
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listSeoChecklist(projectId: string): Promise<SeoChecklistItem[]> {
  const { data, error } = await supabase
    .from("pm_seo_checklist_items")
    .select("*")
    .eq("project_id", projectId)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data as Row[]) ?? []).map(rowToItem);
}

/**
 * Seeds this project with the standard list. Deliberately NOT automatic — the
 * panel offers it as a button so opening a project never silently writes rows.
 * Refuses if the project already has items, so it can't double-seed.
 */
export async function seedStandardChecklist(projectId: string): Promise<SeoChecklistItem[]> {
  const existing = await listSeoChecklist(projectId);
  if (existing.length > 0) return existing;

  const rows = standardChecklist().map((e) => ({
    project_id: projectId,
    category: e.category,
    label: e.label,
    sort_order: e.sortOrder,
  }));
  const { data, error } = await supabase
    .from("pm_seo_checklist_items")
    .insert(rows)
    .select("*");
  if (error) throw error;
  return ((data as Row[]) ?? []).map(rowToItem);
}

export async function addSeoChecklistItem(
  projectId: string,
  category: SeoChecklistCategory,
  label: string,
  sortOrder: number,
): Promise<SeoChecklistItem> {
  const { data, error } = await supabase
    .from("pm_seo_checklist_items")
    .insert({ project_id: projectId, category, label, sort_order: sortOrder })
    .select("*")
    .single();
  if (error) throw error;
  return rowToItem(data as Row);
}

/**
 * Ticking records WHO and WHEN — that's the "recorded" half of the feature.
 * Unticking clears both so a stale name can never sit against an open item.
 */
export async function setSeoChecklistItemDone(
  id: string,
  done: boolean,
  userId: string | null,
): Promise<SeoChecklistItem> {
  const { data, error } = await supabase
    .from("pm_seo_checklist_items")
    .update({
      done,
      completed_by: done ? userId : null,
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToItem(data as Row);
}

export async function updateSeoChecklistItem(
  id: string,
  patch: { label?: string; note?: string | null },
): Promise<SeoChecklistItem> {
  const { data, error } = await supabase
    .from("pm_seo_checklist_items")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToItem(data as Row);
}

export async function deleteSeoChecklistItem(id: string): Promise<void> {
  const { error } = await supabase
    .from("pm_seo_checklist_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
