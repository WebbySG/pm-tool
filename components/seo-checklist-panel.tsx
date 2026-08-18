"use client";
import { useEffect, useMemo, useState } from "react";
import {
  listSeoChecklist, seedStandardChecklist, addSeoChecklistItem,
  setSeoChecklistItemDone, updateSeoChecklistItem, deleteSeoChecklistItem,
  type SeoChecklistItem,
} from "@/lib/seo-checklist-db";
import {
  SEO_CHECKLIST_CATEGORIES, categoryMeta, STANDARD_CHECKLIST_SIZE,
  type SeoChecklistCategory,
} from "@/lib/seo-checklist";
import { errorMessage } from "@/lib/utils";
import { Loader2, Plus, Trash2, Check, X, Pencil, StickyNote, AlertCircle, ListChecks } from "lucide-react";

export interface SeoChecklistStaff { id: string; name: string }

interface Props {
  projectId: string;
  /** Admin, or a staff member assigned to this project. */
  canEdit: boolean;
  /** Admins alone may delete items — everyone editing can tick, note and add. */
  isAdmin: boolean;
  /** Auth id of the signed-in user — stamped onto completed_by when ticking. */
  currentUserId: string | null;
  staff: SeoChecklistStaff[];
}

function fmtWhen(iso: string) {
  // Date + time, per the app-wide timestamp rule.
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function SeoChecklistPanel({ projectId, canEdit, isAdmin, currentUserId, staff }: Props) {
  const [items, setItems] = useState<SeoChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [adding, setAdding] = useState<{ category: SeoChecklistCategory; value: string } | null>(null);
  const [editing, setEditing] = useState<{ id: string; field: "label" | "note"; value: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // No setLoading(true) in the effect body: `loading` already starts true and
  // this repo's react-hooks/set-state-in-effect rule rejects a synchronous
  // setState here (see the Dismiss & Discard Guard lint note in CLAUDE.md).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listSeoChecklist(projectId);
        if (alive) { setItems(data); setError(null); }
      } catch (e) {
        if (alive) setError(errorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [projectId]);

  const staffName = (id: string | null) =>
    (id && staff.find((s) => s.id === id)?.name) || "Unknown";

  // Known categories first in their declared order, then any unknown category
  // the DB happens to hold (the column is unconstrained on purpose).
  const sections = useMemo(() => {
    const known = SEO_CHECKLIST_CATEGORIES.map((c) => c.key as string);
    const extra = [...new Set(items.map((i) => i.category))].filter((c) => !known.includes(c));
    return [...known, ...extra].map((key) => ({
      key,
      meta: categoryMeta(key),
      rows: items
        .filter((i) => i.category === key)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)),
    }));
  }, [items]);

  const doneCount = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  function replaceItem(next: SeoChecklistItem) {
    setItems((prev) => prev.map((i) => (i.id === next.id ? next : i)));
  }

  async function run<T>(id: string | null, fn: () => Promise<T>) {
    setBusyId(id);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(errorMessage(e));
      return null;
    } finally {
      setBusyId(null);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    setError(null);
    try {
      setItems(await seedStandardChecklist(projectId));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSeeding(false);
    }
  }

  async function handleToggle(item: SeoChecklistItem) {
    if (!canEdit) return;
    const next = await run(item.id, () =>
      setSeoChecklistItemDone(item.id, !item.done, currentUserId));
    if (next) replaceItem(next);
  }

  async function handleAdd(category: SeoChecklistCategory) {
    const label = adding?.value.trim();
    if (!label) { setAdding(null); return; }
    const sortOrder = Math.max(0, ...items.filter((i) => i.category === category).map((i) => i.sortOrder + 1));
    const created = await run(null, () => addSeoChecklistItem(projectId, category, label, sortOrder));
    if (created) {
      setItems((prev) => [...prev, created]);
      // Keep the composer open so a run of items can be typed one after another.
      setAdding({ category, value: "" });
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    const { id, field, value } = editing;
    const trimmed = value.trim();
    if (field === "label" && !trimmed) { setEditing(null); return; }
    const next = await run(id, () =>
      updateSeoChecklistItem(id, field === "label" ? { label: trimmed } : { note: trimmed || null }));
    if (next) replaceItem(next);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    const ok = await run(id, async () => { await deleteSeoChecklistItem(id); return true; });
    if (ok) setItems((prev) => prev.filter((i) => i.id !== id));
    setConfirmDelete(null);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-sm" style={{ color: "#4a7090" }}>
        <Loader2 size={14} className="animate-spin" /> Loading checklist…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm"
             style={{ background: "#ef444415", border: "1px solid #ef444440", color: "#ef4444" }}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-14 flex flex-col items-center gap-3">
          <ListChecks size={32} style={{ color: "#1c3248" }} />
          <p className="text-sm" style={{ color: "#4a7090" }}>
            No Technical / On-Page items recorded for this project yet.
          </p>
          {canEdit ? (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{ background: "#38b6e8", color: "#fff" }}
            >
              {seeding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add the standard checklist ({STANDARD_CHECKLIST_SIZE} items)
            </button>
          ) : (
            <p className="text-xs" style={{ color: "#4a7090" }}>An admin can add the standard checklist.</p>
          )}
          <p className="text-xs max-w-md" style={{ color: "#4a7090" }}>
            Items are copied into this project, so you can add or remove them for this client
            without affecting any other project.
          </p>
        </div>
      ) : (
        <>
          {/* Overall progress */}
          <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "#cce4ff" }}>Technical / On-Page progress</h3>
              <span className="text-xs font-medium" style={{ color: "#cce4ff" }}>{pct}% · {doneCount}/{items.length} done</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1c3248" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#38b6e8" }} />
            </div>
          </div>

          {sections.map((section) => {
            if (section.rows.length === 0 && !SEO_CHECKLIST_CATEGORIES.some((c) => c.key === section.key)) return null;
            const secDone = section.rows.filter((r) => r.done).length;
            return (
              <div key={section.key}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold" style={{ color: section.meta.color }}>{section.meta.label}</h3>
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: section.meta.color + "20", color: section.meta.color }}>
                    {secDone}/{section.rows.length}
                  </span>
                </div>

                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1c3248" }}>
                  {section.rows.map((item, i) => {
                    const isEditingLabel = editing?.id === item.id && editing.field === "label";
                    const isEditingNote = editing?.id === item.id && editing.field === "note";
                    return (
                      <div
                        key={item.id}
                        className="group flex items-start gap-3 px-4 py-2.5"
                        style={{
                          background: "#0f1d2e",
                          borderBottom: i < section.rows.length - 1 ? "1px solid #1c3248" : "none",
                        }}
                      >
                        <button
                          onClick={() => handleToggle(item)}
                          disabled={!canEdit || busyId === item.id}
                          title={canEdit ? (item.done ? "Mark not done" : "Mark done") : "Only admins and assigned staff can update this"}
                          className="w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-transform disabled:cursor-not-allowed"
                          style={{
                            borderColor: item.done ? "#22c55e" : "#4a7090",
                            background: item.done ? "#22c55e" : "transparent",
                            opacity: canEdit ? 1 : 0.6,
                          }}
                        >
                          {busyId === item.id
                            ? <Loader2 size={11} className="animate-spin" style={{ color: "#cce4ff" }} />
                            : item.done ? <Check size={12} style={{ color: "#0a1520" }} /> : null}
                        </button>

                        <div className="flex-1 min-w-0">
                          {isEditingLabel ? (
                            <div className="flex items-center gap-2">
                              <input
                                autoFocus
                                value={editing.value}
                                onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); handleSaveEdit(); }
                                  if (e.key === "Escape") setEditing(null);
                                }}
                                className="flex-1 px-2 py-1 rounded text-sm outline-none"
                                style={{ background: "#0a1520", border: "1px solid #38b6e8", color: "#cce4ff" }}
                              />
                              <button onClick={handleSaveEdit} className="text-xs px-2 py-1 rounded" style={{ background: "#38b6e8", color: "#fff" }}>Save</button>
                              <button onClick={() => setEditing(null)} style={{ color: "#4a7090" }}><X size={14} /></button>
                            </div>
                          ) : (
                            <p className="text-sm" style={{ color: item.done ? "#4a7090" : "#cce4ff", textDecoration: item.done ? "line-through" : "none" }}>
                              {item.label}
                            </p>
                          )}

                          {item.done && item.completedAt && (
                            <p className="text-xs mt-0.5" style={{ color: "#22c55e" }}>
                              {staffName(item.completedBy)} · {fmtWhen(item.completedAt)}
                            </p>
                          )}

                          {isEditingNote ? (
                            <div className="flex flex-col gap-1.5 mt-1.5">
                              <textarea
                                autoFocus
                                rows={2}
                                value={editing.value}
                                placeholder="What was done, where, any reference…"
                                onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") setEditing(null);
                                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSaveEdit(); }
                                }}
                                className="w-full px-2 py-1.5 rounded text-sm outline-none resize-y"
                                style={{ background: "#0a1520", border: "1px solid #38b6e8", color: "#cce4ff" }}
                              />
                              <div className="flex items-center gap-2">
                                <button onClick={handleSaveEdit} className="text-xs px-2 py-1 rounded" style={{ background: "#38b6e8", color: "#fff" }}>Save note</button>
                                <button onClick={() => setEditing(null)} className="text-xs" style={{ color: "#4a7090" }}>Cancel</button>
                              </div>
                            </div>
                          ) : item.note ? (
                            <p className="text-xs mt-1 whitespace-pre-wrap" style={{ color: "#8fb3d0" }}>{item.note}</p>
                          ) : null}
                        </div>

                        {canEdit && !isEditingLabel && !isEditingNote && (
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditing({ id: item.id, field: "note", value: item.note ?? "" })}
                              title={item.note ? "Edit note" : "Add note"}
                              className="p-1 rounded hover:opacity-80"
                              style={{ color: item.note ? "#38b6e8" : "#4a7090" }}
                            >
                              <StickyNote size={13} />
                            </button>
                            <button
                              onClick={() => setEditing({ id: item.id, field: "label", value: item.label })}
                              title="Rename item"
                              className="p-1 rounded hover:opacity-80"
                              style={{ color: "#4a7090" }}
                            >
                              <Pencil size={13} />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => confirmDelete === item.id ? handleDelete(item.id) : setConfirmDelete(item.id)}
                                onBlur={() => setConfirmDelete(null)}
                                title={confirmDelete === item.id ? "Click again to remove" : "Remove item from this project"}
                                className="p-1 rounded hover:opacity-80 text-xs font-medium"
                                style={{ color: "#ef4444" }}
                              >
                                {confirmDelete === item.id ? "Sure?" : <Trash2 size={13} />}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add item */}
                  {canEdit && (
                    <div className="px-4 py-2.5" style={{ background: "#0f1d2e", borderTop: section.rows.length ? "1px solid #1c3248" : "none" }}>
                      {adding?.category === section.key ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={adding.value}
                            placeholder={`New ${section.meta.label} item`}
                            onChange={(e) => setAdding({ ...adding, value: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); handleAdd(section.key as SeoChecklistCategory); }
                              if (e.key === "Escape") setAdding(null);
                            }}
                            className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
                            style={{ background: "#0a1520", border: "1px solid #38b6e8", color: "#cce4ff" }}
                          />
                          <button
                            onClick={() => handleAdd(section.key as SeoChecklistCategory)}
                            className="text-xs px-2.5 py-1.5 rounded font-medium"
                            style={{ background: "#38b6e8", color: "#fff" }}
                          >
                            Add
                          </button>
                          <button onClick={() => setAdding(null)} style={{ color: "#4a7090" }}><X size={14} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAdding({ category: section.key as SeoChecklistCategory, value: "" })}
                          className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80"
                          style={{ color: "#38b6e8" }}
                        >
                          <Plus size={12} /> Add item
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
