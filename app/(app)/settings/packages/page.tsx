"use client";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import { useStore } from "@/lib/store";
import { useDiscardGuard } from "@/components/discard-guard";
import { TierBadge, TierIconGlyph } from "@/components/tier-badge";
import {
  type ProjectTier, TIER_ICON_KEYS, TIER_COLORS,
  DEFAULT_TIER_ICON, DEFAULT_TIER_COLOR, sortTiers, scopeLines,
  tierLevelLabel, nextTierLevel, tiersAtLevel,
} from "@/lib/project-tiers";
import { errorMessage } from "@/lib/utils";
import { Plus, Pencil, Trash2, X, AlertTriangle, Package } from "lucide-react";

/**
 * Settings -> Client Packages: the admin editor for the tier badges.
 *
 * The packages are DATA, not code (user decision 2026-09-01) — a quota changes
 * with the price list, so renaming a package or editing its scope must not need
 * a deploy. The scope typed here is exactly what staff read when they hover the
 * badge on a project, which is the whole point of the feature.
 */
export default function PackagesPage() {
  return (
    <AdminOnly>
      <PackagesEditor />
    </AdminOnly>
  );
}

type TierDraft = Omit<ProjectTier, "id" | "sortOrder">;

const EMPTY_DRAFT: Omit<TierDraft, "level"> = {
  name: "",
  shortLabel: "",
  icon: DEFAULT_TIER_ICON,
  color: DEFAULT_TIER_COLOR,
  scope: "",
};

function PackagesEditor() {
  const tiers = useStore((s) => s.tiers);
  const projects = useStore((s) => s.projects);
  const deleteProjectTier = useStore((s) => s.deleteProjectTier);

  const [editing, setEditing] = useState<ProjectTier | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ordered = useMemo(() => sortTiers(tiers), [tiers]);
  // How many live projects each package is on — the number that makes a delete
  // an informed decision rather than a guess.
  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projects) if (p.tierId) map.set(p.tierId, (map.get(p.tierId) ?? 0) + 1);
    return map;
  }, [projects]);

  async function handleDelete(tier: ProjectTier) {
    if (confirmDelete !== tier.id) {
      setConfirmDelete(tier.id);
      window.setTimeout(() => setConfirmDelete((c) => (c === tier.id ? null : c)), 4000);
      return;
    }
    setError(null);
    try {
      await deleteProjectTier(tier.id);
    } catch (e) {
      setError(`Couldn't delete "${tier.name}": ${errorMessage(e)}`);
    } finally {
      setConfirmDelete(null);
    }
  }

  return (
    <>
      <Topbar title="Client Packages" back={{ label: "Settings", href: "/settings" }} />
      <div className="p-6 max-w-3xl flex flex-col gap-4">

        <div className="flex items-start justify-between gap-4">
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Each package shows as a numbered icon beside its projects — <strong>1</strong>, <strong>2</strong>,
            <strong> 3</strong> down the ladder. Hovering it shows the scope below, so staff can see what a
            client is paying for without opening the quotation.
          </p>
          <button
            onClick={() => setEditing("new")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white shrink-0 transition-opacity hover:opacity-80"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
          >
            <Plus size={14} /> New package
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm"
            style={{ background: "#ef444412", border: "1px solid #ef444440", color: "#fca5a5" }}>
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="hover:opacity-70"><X size={13} /></button>
          </div>
        )}

        {ordered.length === 0 && (
          <div className="rounded-2xl px-5 py-10 text-center"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <Package size={26} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
            <p className="text-sm mb-1" style={{ color: "var(--text)" }}>No packages yet.</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Create one for each retainer you sell — its scope is what staff will read off the badge.
            </p>
          </div>
        )}

        {ordered.map((tier) => {
          const lines = scopeLines(tier.scope);
          const count = usage.get(tier.id) ?? 0;
          return (
            <section key={tier.id} className="rounded-2xl overflow-hidden"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: `4px solid ${tier.color}` }}>
              <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: lines.length ? "1px solid var(--border)" : "none" }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: tier.color + "22", color: tier.color }}>
                  <TierIconGlyph icon={tier.icon} size={17} />
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-sm truncate flex items-center gap-2" style={{ color: "var(--text)" }}>
                    {tierLevelLabel(tier) && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wide shrink-0"
                        style={{ background: tier.color + "22", color: tier.color }}>
                        {tierLevelLabel(tier)}
                      </span>
                    )}
                    <span className="truncate">{tier.name}</span>
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {count === 0 ? "No projects on this package" : `${count} project${count === 1 ? "" : "s"}`}
                  </p>
                </div>
                <TierBadge tier={tier} />
                <button
                  onClick={() => setEditing(tier)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  <Pencil size={11} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(tier)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80"
                  style={{
                    background: confirmDelete === tier.id ? "#ef4444" : "#ef444414",
                    border: `1px solid ${confirmDelete === tier.id ? "#ef4444" : "#ef444440"}`,
                    color: confirmDelete === tier.id ? "#fff" : "#f87171",
                  }}
                  title={count > 0
                    ? `${count} project${count === 1 ? "" : "s"} will simply lose the badge — nothing is deleted`
                    : "Delete this package"}
                >
                  {confirmDelete === tier.id ? <><AlertTriangle size={11} /> Confirm</> : <Trash2 size={11} />}
                </button>
              </div>
              {lines.length > 0 && (
                <ul className="px-5 py-3 grid grid-cols-2 gap-x-5 gap-y-1">
                  {lines.map((line, i) => (
                    <li key={i} className="text-xs leading-snug flex gap-1.5" style={{ color: "var(--text-muted)" }}>
                      <span style={{ color: tier.color }}>•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {editing && (
        <TierDialog
          tier={editing === "new" ? null : editing}
          existing={tiers}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

// ── Add / edit dialog ─────────────────────────────────────────────────────────

function TierDialog({
  tier, existing, onClose,
}: {
  tier: ProjectTier | null;
  existing: ProjectTier[];
  onClose: () => void;
}) {
  const addProjectTier = useStore((s) => s.addProjectTier);
  const updateProjectTier = useStore((s) => s.updateProjectTier);

  // A new package defaults to the next free rung, so adding the third tier is a
  // click rather than a decision. An existing one keeps whatever it has,
  // including null (deliberately off the ladder).
  const initial: TierDraft = tier
    ? {
      name: tier.name, level: tier.level, shortLabel: tier.shortLabel,
      icon: tier.icon, color: tier.color, scope: tier.scope,
    }
    : { ...EMPTY_DRAFT, level: nextTierLevel(existing) };
  const [draft, setDraft] = useState<TierDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rungs offered as buttons. Always at least 1–5, and always stretched far
  // enough to include the level this package already holds — otherwise editing
  // a tier 7 package would silently offer no way back to 7.
  const highest = Math.max(5, nextTierLevel(existing), draft.level ?? 0);
  const levelChoices = Array.from({ length: highest }, (_, i) => i + 1);
  // A warning, never a block: a refused write mid-relabel is worse than a
  // duplicate number the admin can see and fix (same reasoning as the DB, which
  // deliberately has no unique index on level).
  const levelClash = tiersAtLevel(existing, draft.level, tier?.id);

  // Derived, never stored (Dismiss & Discard rule): on a new package "anything
  // meaningful filled", on an edit "differs from the row as loaded".
  const dirty = tier
    ? (Object.keys(initial) as (keyof TierDraft)[]).some((k) => draft[k] !== initial[k])
    : draft.name.trim() !== "" || draft.scope.trim() !== "";

  const { requestClose, guard } = useDiscardGuard({
    dirty,
    busy: saving,
    onClose,
    title: tier ? "Discard changes to this package?" : "Discard this package?",
  });

  async function save() {
    const name = draft.name.trim();
    if (!name) { setError("Give the package a name."); return; }
    const clash = existing.some((t) => t.id !== tier?.id && t.name.trim().toLowerCase() === name.toLowerCase());
    if (clash) { setError(`A package named "${name}" already exists.`); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...draft, name, shortLabel: draft.shortLabel.trim().slice(0, 3) };
      if (tier) await updateProjectTier(tier.id, payload);
      else await addProjectTier(payload);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  const preview: ProjectTier = {
    id: tier?.id ?? "preview",
    sortOrder: tier?.sortOrder ?? 0,
    ...draft,
    name: draft.name.trim() || "Untitled package",
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: "#00000090" }} onClick={requestClose}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="font-semibold text-sm" style={{ color: "var(--text)" }}>
            {tier ? "Edit package" : "New package"}
          </h3>
          <button onClick={requestClose} style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto">
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>PACKAGE NAME *</label>
              <input
                autoFocus
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Growth SEO"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>
            <div className="w-24 flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>SHORT</label>
              <input
                value={draft.shortLabel}
                onChange={(e) => setDraft({ ...draft, shortLabel: e.target.value.slice(0, 3) })}
                placeholder="auto"
                maxLength={3}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>TIER LEVEL</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setDraft({ ...draft, level: null })}
                className="px-3 h-9 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                style={{
                  background: draft.level == null ? draft.color + "22" : "var(--bg-surface)",
                  border: `1px solid ${draft.level == null ? draft.color : "var(--border)"}`,
                  color: draft.level == null ? draft.color : "var(--text-muted)",
                }}
              >
                None
              </button>
              {levelChoices.map((n) => (
                <button
                  key={n}
                  onClick={() => setDraft({ ...draft, level: n })}
                  className="w-9 h-9 rounded-lg text-sm font-bold transition-opacity hover:opacity-80"
                  style={{
                    background: draft.level === n ? draft.color + "22" : "var(--bg-surface)",
                    border: `1px solid ${draft.level === n ? draft.color : "var(--border)"}`,
                    color: draft.level === n ? draft.color : "var(--text-muted)",
                  }}
                  title={`Tier ${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              The rung on your ladder — this is the number staff see beside the project name.
              Pick <strong>None</strong> for a package that isn&apos;t a tier (a one-off build, say).
            </p>
            {levelClash.length > 0 && (
              <p className="text-[11px] px-2.5 py-1.5 rounded-lg"
                style={{ background: "#f59e0b12", color: "#fbbf24", border: "1px solid #f59e0b40" }}>
                Tier {draft.level} is already {levelClash.map((t) => t.name).join(", ")}. Two packages on the
                same rung will both show the same number — allowed, but check it&apos;s what you meant.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>ICON</label>
            <div className="flex flex-wrap gap-1.5">
              {TIER_ICON_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => setDraft({ ...draft, icon: key })}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80"
                  style={{
                    background: draft.icon === key ? draft.color + "22" : "var(--bg-surface)",
                    border: `1px solid ${draft.icon === key ? draft.color : "var(--border)"}`,
                    color: draft.icon === key ? draft.color : "var(--text-muted)",
                  }}
                  title={key}
                >
                  <TierIconGlyph icon={key} size={15} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>COLOUR</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {TIER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setDraft({ ...draft, color: c })}
                  className="w-7 h-7 rounded-lg transition-transform hover:scale-110"
                  style={{ background: c, border: draft.color === c ? "2px solid var(--text)" : "1px solid var(--border)" }}
                  title={c}
                />
              ))}
              <input
                value={draft.color}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                className="w-24 px-2 py-1.5 rounded-lg text-xs outline-none ml-1"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>WORK SCOPE — ONE ITEM PER LINE</label>
            <textarea
              value={draft.scope}
              onChange={(e) => setDraft({ ...draft, scope: e.target.value })}
              rows={9}
              placeholder={"S$750 / month\nOn-page optimisation: up to 10 pages\nTarget keywords: up to 20\nBacklinks: 50 / month\nContent: 4 articles / month"}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-y font-mono leading-relaxed"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              This is exactly what staff see when they hover the badge. Keep the quotas in it —
              pages, keywords, backlinks, articles per month.
            </p>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Preview:</span>
            <TierBadge tier={preview} showName size="md" />
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>hover it to check the scope</span>
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#ef444412", color: "#fca5a5" }}>{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={requestClose}
            className="px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
          >
            {saving ? "Saving…" : tier ? "Save changes" : "Create package"}
          </button>
        </div>
      </div>
      {guard}
    </div>
  );
}
