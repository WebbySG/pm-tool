"use client";
import { useEffect, useMemo, useState } from "react";
import {
  listKeywords, addKeyword, importKeywords, updateKeyword, deleteKeyword,
} from "@/lib/keyword-db";
import {
  parseKeywordPaste, statusMeta, priorityMeta, difficultyColor,
  KEYWORD_STATUSES, KEYWORD_PRIORITIES, type Keyword,
} from "@/lib/keyword-types";
import { errorMessage } from "@/lib/utils";
import { useDiscardGuard } from "@/components/discard-guard";
import {
  Loader2, Plus, Trash2, X, Search, AlertCircle, ClipboardPaste, ArrowUpDown, ExternalLink,
} from "lucide-react";

interface Props {
  projectId: string;
  /** Admin, or a staff member assigned to this project. */
  canEdit: boolean;
  /** Admins alone may delete keywords. */
  isAdmin: boolean;
}

type SortKey = "keyword" | "searchVolume" | "difficulty" | "currentRank" | "status";

const NUM = (n: number | null) => (n === null ? "—" : n.toLocaleString());

/**
 * Module-level, not defined inside the panel: a component created during render
 * is remounted every render (React would reset its state), and this repo's lint
 * rules reject it outright.
 */
function SortableTh({ label, k, align = "left", sortKey, onSort }: {
  label: string;
  k: SortKey;
  align?: "left" | "right";
  sortKey: SortKey;
  onSort: (k: SortKey) => void;
}) {
  return (
    <th
      onClick={() => onSort(k)}
      className="px-3 py-2 text-xs font-semibold cursor-pointer select-none whitespace-nowrap"
      style={{ color: sortKey === k ? "#38b6e8" : "#4a7090", textAlign: align }}
    >
      <span className="inline-flex items-center gap-1">
        {label}<ArrowUpDown size={10} />
      </span>
    </th>
  );
}

export function KeywordResearchPanel({ projectId, canEdit, isAdmin }: Props) {
  const [rows, setRows] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("searchVolume");
  const [sortDesc, setSortDesc] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newKw, setNewKw] = useState({ keyword: "", searchVolume: "", difficulty: "", targetUrl: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listKeywords(projectId);
        if (alive) { setRows(data); setError(null); }
      } catch (e) {
        if (alive) setError(errorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [projectId]);

  const preview = useMemo(
    () => (importText.trim() ? parseKeywordPaste(importText) : null),
    [importText],
  );

  const importGuard = useDiscardGuard({
    dirty: importText.trim().length > 0,
    busy: importing,
    onClose: () => { setShowImport(false); setImportText(""); setImportNotice(null); },
  });
  const addGuard = useDiscardGuard({
    dirty: Object.values(newKw).some((v) => v.trim().length > 0),
    busy: adding,
    onClose: () => { setShowAdd(false); setNewKw({ keyword: "", searchVolume: "", difficulty: "", targetUrl: "" }); },
  });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (q && !r.keyword.toLowerCase().includes(q) && !(r.targetUrl ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
    const dir = sortDesc ? -1 : 1;
    return out.sort((a, b) => {
      if (sortKey === "keyword") return a.keyword.localeCompare(b.keyword) * dir;
      if (sortKey === "status") return a.status.localeCompare(b.status) * dir;
      const av = a[sortKey] as number | null;
      const bv = b[sortKey] as number | null;
      // Unknown values sort last regardless of direction — an unresearched
      // keyword isn't "the best opportunity" just because its volume is null.
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return (av - bv) * dir;
    });
  }, [rows, search, filterStatus, sortKey, sortDesc]);

  const totals = useMemo(() => ({
    all: rows.length,
    ranking: rows.filter((r) => r.status === "ranking").length,
    volume: rows.reduce((sum, r) => sum + (r.searchVolume ?? 0), 0),
    top10: rows.filter((r) => r.currentRank !== null && r.currentRank <= 10).length,
  }), [rows]);

  async function run<T>(id: string | null, fn: () => Promise<T>) {
    setBusyId(id);
    setError(null);
    try { return await fn(); }
    catch (e) { setError(errorMessage(e)); return null; }
    finally { setBusyId(null); }
  }

  function replace(next: Keyword) {
    setRows((prev) => prev.map((r) => (r.id === next.id ? next : r)));
  }

  async function handleImport() {
    if (!preview || preview.rows.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const res = await importKeywords(projectId, preview.rows);
      setRows((prev) => [...prev, ...res.inserted]);
      const bits = [`${res.inserted.length} keyword${res.inserted.length !== 1 ? "s" : ""} added`];
      if (res.skipped) bits.push(`${res.skipped} already in this project`);
      if (preview.duplicatesInPaste) bits.push(`${preview.duplicatesInPaste} duplicate${preview.duplicatesInPaste !== 1 ? "s" : ""} in the paste`);
      setImportNotice(bits.join(" · "));
      setImportText("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setImporting(false);
    }
  }

  async function handleAdd() {
    const keyword = newKw.keyword.trim();
    if (!keyword) return;
    setAdding(true);
    const created = await run(null, () => addKeyword(projectId, {
      keyword,
      searchVolume: newKw.searchVolume.trim() ? Number(newKw.searchVolume) : null,
      difficulty: newKw.difficulty.trim() ? Number(newKw.difficulty) : null,
      targetUrl: newKw.targetUrl.trim() || null,
    }));
    setAdding(false);
    if (created) {
      setRows((prev) => [...prev, created]);
      setNewKw({ keyword: "", searchVolume: "", difficulty: "", targetUrl: "" });
      setShowAdd(false);
    }
  }

  async function handlePatch(id: string, patch: Parameters<typeof updateKeyword>[1]) {
    const next = await run(id, () => updateKeyword(id, patch));
    if (next) replace(next);
  }

  async function handleDelete(id: string) {
    const ok = await run(id, async () => { await deleteKeyword(id); return true; });
    if (ok) setRows((prev) => prev.filter((r) => r.id !== id));
    setConfirmDelete(null);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((d) => !d);
    else { setSortKey(key); setSortDesc(key !== "keyword" && key !== "status"); }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-sm" style={{ color: "#4a7090" }}>
        <Loader2 size={14} className="animate-spin" /> Loading keywords…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm"
             style={{ background: "#ef444415", border: "1px solid #ef444440", color: "#ef4444" }}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* Summary */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Keywords", value: totals.all.toLocaleString(), color: "#cce4ff" },
            { label: "Total monthly volume", value: totals.volume.toLocaleString(), color: "#38b6e8" },
            { label: "Ranking", value: totals.ranking.toLocaleString(), color: "#22c55e" },
            { label: "In top 10", value: totals.top10.toLocaleString(), color: "#a855f7" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl p-3" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
              <p className="text-xs" style={{ color: "#4a7090" }}>{c.label}</p>
              <p className="text-lg font-semibold mt-0.5" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#4a7090" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keywords…"
            className="pl-8 pr-3 py-2 rounded-lg text-sm outline-none w-56"
            style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#cce4ff" }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#cce4ff" }}
        >
          <option value="all">All statuses ({rows.length})</option>
          {KEYWORD_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label} ({rows.filter((r) => r.status === s.key).length})
            </option>
          ))}
        </select>
        <span className="text-sm" style={{ color: "#4a7090" }}>
          {visible.length} shown
        </span>

        {canEdit && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80"
              style={{ background: "#0f1d2e", border: "1px solid #1c3248", color: "#cce4ff" }}
            >
              <Plus size={13} /> Add keyword
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80"
              style={{ background: "#38b6e8", color: "#fff" }}
            >
              <ClipboardPaste size={13} /> Paste keywords
            </button>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-14 flex flex-col items-center gap-3">
          <Search size={32} style={{ color: "#1c3248" }} />
          <p className="text-sm" style={{ color: "#4a7090" }}>No keyword research recorded for this project yet.</p>
          {canEdit && (
            <p className="text-xs max-w-md" style={{ color: "#4a7090" }}>
              Paste straight from Ahrefs, SEMrush or a spreadsheet — keyword, volume and
              difficulty columns are picked up automatically.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-x-auto" style={{ border: "1px solid #1c3248" }}>
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr style={{ background: "#0e1e30", borderBottom: "1px solid #1c3248" }}>
                <SortableTh label="Keyword" k="keyword" sortKey={sortKey} onSort={toggleSort} />
                <SortableTh label="Volume" k="searchVolume" align="right" sortKey={sortKey} onSort={toggleSort} />
                <SortableTh label="KD" k="difficulty" align="right" sortKey={sortKey} onSort={toggleSort} />
                <SortableTh label="Rank" k="currentRank" align="right" sortKey={sortKey} onSort={toggleSort} />
                <th className="px-3 py-2 text-xs font-semibold text-left" style={{ color: "#4a7090" }}>Target page</th>
                <SortableTh label="Status" k="status" sortKey={sortKey} onSort={toggleSort} />
                <th className="px-3 py-2 text-xs font-semibold text-left" style={{ color: "#4a7090" }}>Priority</th>
                {isAdmin && <th style={{ width: 40 }} />}
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => {
                const sm = statusMeta(r.status);
                const pm = priorityMeta(r.priority);
                return (
                  <tr key={r.id} className="group" style={{
                    background: "#0f1d2e",
                    borderBottom: i < visible.length - 1 ? "1px solid #1c3248" : "none",
                  }}>
                    <td className="px-3 py-2 text-sm" style={{ color: "#cce4ff" }}>
                      {r.keyword}
                      {r.notes && (
                        <span className="block text-xs mt-0.5" style={{ color: "#8fb3d0" }}>{r.notes}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-right tabular-nums" style={{ color: "#cce4ff" }}>{NUM(r.searchVolume)}</td>
                    <td className="px-3 py-2 text-sm text-right tabular-nums" style={{ color: difficultyColor(r.difficulty) }}>
                      {NUM(r.difficulty)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {canEdit ? (
                        <input
                          type="number"
                          defaultValue={r.currentRank ?? ""}
                          placeholder="—"
                          title={r.rankCheckedAt ? `Checked ${new Date(r.rankCheckedAt).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Not checked yet"}
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            const val = raw === "" ? null : Number(raw);
                            if (val === r.currentRank) return;
                            if (val !== null && (!Number.isFinite(val) || val < 1)) { e.target.value = String(r.currentRank ?? ""); return; }
                            handlePatch(r.id, { currentRank: val });
                          }}
                          className="w-14 px-1.5 py-1 rounded text-sm text-right outline-none tabular-nums"
                          style={{ background: "#0a1520", border: "1px solid #1c3248", color: r.currentRank !== null && r.currentRank <= 10 ? "#22c55e" : "#cce4ff" }}
                        />
                      ) : (
                        <span className="text-sm tabular-nums" style={{ color: "#cce4ff" }}>{NUM(r.currentRank)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm max-w-[180px] truncate" style={{ color: "#4a7090" }}>
                      {r.targetUrl ? (
                        <span className="inline-flex items-center gap-1" title={r.targetUrl}>
                          {r.targetUrl}
                          {/^https?:\/\//i.test(r.targetUrl) && (
                            <a href={r.targetUrl} target="_blank" rel="noreferrer" style={{ color: "#38b6e8" }}>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {canEdit ? (
                        <select
                          value={r.status}
                          onChange={(e) => handlePatch(r.id, { status: e.target.value })}
                          disabled={busyId === r.id}
                          className="px-2 py-1 rounded-full text-xs font-medium outline-none"
                          style={{ background: sm.color + "20", color: sm.color, border: "none" }}
                        >
                          {KEYWORD_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: sm.color + "20", color: sm.color }}>{sm.label}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {canEdit ? (
                        <select
                          value={r.priority}
                          onChange={(e) => handlePatch(r.id, { priority: e.target.value })}
                          disabled={busyId === r.id}
                          className="px-2 py-1 rounded-full text-xs font-medium outline-none"
                          style={{ background: pm.color + "20", color: pm.color, border: "none" }}
                        >
                          {KEYWORD_PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: pm.color + "20", color: pm.color }}>{pm.label}</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-2 py-2 text-right">
                        <button
                          onClick={() => confirmDelete === r.id ? handleDelete(r.id) : setConfirmDelete(r.id)}
                          onBlur={() => setConfirmDelete(null)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium"
                          style={{ color: "#ef4444" }}
                          title={confirmDelete === r.id ? "Click again to remove" : "Remove keyword"}
                        >
                          {busyId === r.id ? <Loader2 size={13} className="animate-spin" /> : confirmDelete === r.id ? "Sure?" : <Trash2 size={13} />}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="text-center py-10 text-sm" style={{ background: "#0f1d2e", color: "#4a7090" }}>
              No keywords match the current filters.
            </div>
          )}
        </div>
      )}

      {/* PASTE IMPORT */}
      {showImport && (
        <>
          {importGuard.guard}
          <div className="fixed inset-0 z-40" style={{ background: "#00000070" }} onClick={importGuard.requestClose} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="rounded-xl w-full max-w-2xl flex flex-col gap-4 p-6" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: "#cce4ff" }}>Paste keywords</h3>
                <button onClick={importGuard.requestClose} style={{ color: "#4a7090" }}><X size={16} /></button>
              </div>
              <p className="text-xs" style={{ color: "#4a7090" }}>
                Paste rows straight from Ahrefs, SEMrush, Excel or Google Sheets. A header row
                is detected automatically; without one, columns are read as
                keyword, volume, difficulty. Keywords already in this project are skipped.
              </p>
              <textarea
                autoFocus
                rows={9}
                value={importText}
                onChange={(e) => { setImportText(e.target.value); setImportNotice(null); }}
                placeholder={"halal restaurant sg\t2,400\t34\nmuslim catering sg\t880\t21"}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono resize-y"
                style={{ background: "#0a1520", border: "1px solid #1c3248", color: "#cce4ff" }}
              />
              {preview && (
                <div className="rounded-lg p-3 text-xs flex flex-col gap-1" style={{ background: "#0e1e30", border: "1px solid #1c3248", color: "#4a7090" }}>
                  <span style={{ color: "#cce4ff" }}>
                    {preview.rows.length} keyword{preview.rows.length !== 1 ? "s" : ""} detected
                    {preview.usedHeader && " · header row mapped"}
                    {preview.duplicatesInPaste > 0 && ` · ${preview.duplicatesInPaste} duplicate${preview.duplicatesInPaste !== 1 ? "s" : ""} in paste`}
                  </span>
                  {preview.rows.slice(0, 3).map((r, i) => (
                    <span key={i}>
                      {r.keyword} — vol {NUM(r.searchVolume)}, KD {NUM(r.difficulty)}
                      {r.currentRank !== null && `, rank ${r.currentRank}`}
                      {r.targetUrl && `, ${r.targetUrl}`}
                    </span>
                  ))}
                  {preview.rows.length > 3 && <span>…and {preview.rows.length - 3} more</span>}
                </div>
              )}
              {importNotice && (
                <p className="text-xs" style={{ color: "#22c55e" }}>{importNotice}</p>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={importGuard.requestClose} className="px-3 py-2 rounded-lg text-sm" style={{ color: "#4a7090" }}>Close</button>
                <button
                  onClick={handleImport}
                  disabled={importing || !preview || preview.rows.length === 0}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ background: "#38b6e8", color: "#fff" }}
                >
                  {importing && <Loader2 size={13} className="animate-spin" />}
                  Import {preview?.rows.length ? `${preview.rows.length} keyword${preview.rows.length !== 1 ? "s" : ""}` : ""}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ADD ONE */}
      {showAdd && (
        <>
          {addGuard.guard}
          <div className="fixed inset-0 z-40" style={{ background: "#00000070" }} onClick={addGuard.requestClose} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="rounded-xl w-full max-w-sm flex flex-col gap-3 p-6" style={{ background: "#0f1d2e", border: "1px solid #1c3248" }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: "#cce4ff" }}>Add keyword</h3>
                <button onClick={addGuard.requestClose} style={{ color: "#4a7090" }}><X size={16} /></button>
              </div>
              {([
                { k: "keyword", label: "Keyword *", type: "text" },
                { k: "searchVolume", label: "Monthly volume", type: "number" },
                { k: "difficulty", label: "Difficulty (KD)", type: "number" },
                { k: "targetUrl", label: "Target page", type: "text" },
              ] as const).map((f) => (
                <div key={f.k}>
                  <label className="text-xs block mb-1" style={{ color: "#4a7090" }}>{f.label}</label>
                  <input
                    autoFocus={f.k === "keyword"}
                    type={f.type}
                    value={newKw[f.k]}
                    onChange={(e) => setNewKw({ ...newKw, [f.k]: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "#0a1520", border: "1px solid #1c3248", color: "#cce4ff" }}
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 mt-1">
                <button onClick={addGuard.requestClose} className="px-3 py-2 rounded-lg text-sm" style={{ color: "#4a7090" }}>Cancel</button>
                <button
                  onClick={handleAdd}
                  disabled={adding || !newKw.keyword.trim()}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ background: "#38b6e8", color: "#fff" }}
                >
                  {adding && <Loader2 size={13} className="animate-spin" />} Add
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
