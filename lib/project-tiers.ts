/**
 * Client tier / package badges — the pure module.
 *
 * A project carries at most one package (SEO Starter, Growth SEO, …). The badge
 * beside the project name tells staff which one, and its scope tells them what
 * that client is actually paying for — 5 pages or 10, 20 backlinks or 50 a
 * month — so the work scope is visible on the board instead of buried in a
 * quotation.
 *
 * The packages themselves are DATA (pm_project_tiers), owned and edited by the
 * admin in Settings -> Client Packages. This module only holds what has to be
 * agreed between the badge, the picker and the editor: the shape, the icon and
 * colour vocabularies, and how a name/scope is rendered.
 *
 * Dependency-free on purpose (no react, no supabase) — the badge, the picker,
 * the settings editor and the store all import it, so anything that lives here
 * cannot drift between them.
 */

export interface ProjectTier {
  id: string;
  name: string;
  /**
   * The rung on the tier ladder: 1 = first tier, 2 = second, 3 = third. This is
   * the number the owner actually says ("tier 1", "tier 2") and it is what the
   * badge shows beside a project name.
   *
   * NULL is a real value, not a gap: a package that is not a rung — a one-off
   * web build, say — still gets a badge and a scope without pretending to rank
   * above or below the SEO retainers.
   */
  level: number | null;
  /** 1–3 chars for tight spots. Blank = derive from the name. */
  shortLabel: string;
  /** A key from TIER_ICON_KEYS. Anything else falls back to DEFAULT_TIER_ICON. */
  icon: string;
  color: string;
  /** One scope item per line. Free text — quotas change with the price list. */
  scope: string;
  sortOrder: number;
}

/**
 * The icons offered in the picker. Kept to a curated list because the badge is
 * ~16px: an icon has to read at that size, and the set has to map to lucide
 * exports that are actually bundled (see TIER_ICON_COMPONENTS in
 * components/tier-badge.tsx — the two lists must stay in step).
 */
export const TIER_ICON_KEYS = [
  "Sprout", "TrendingUp", "Rocket", "Crown", "Gem", "Star",
  "Zap", "Flame", "Target", "Award", "Trophy", "Medal",
  "Shield", "Package", "Briefcase", "BarChart3",
] as const;

export type TierIconKey = (typeof TIER_ICON_KEYS)[number];

export const DEFAULT_TIER_ICON: TierIconKey = "Star";
export const DEFAULT_TIER_COLOR = "#38b6e8";

/** Swatches in the editor. Free hex entry is still allowed alongside these. */
export const TIER_COLORS = [
  "#38bdf8", "#a78bfa", "#22c55e", "#f59e0b", "#ef4444", "#ec4899",
  "#14b8a6", "#8b5cf6", "#eab308", "#f97316", "#06b6d4", "#64748b",
] as const;

export function isTierIconKey(key: string): key is TierIconKey {
  return (TIER_ICON_KEYS as readonly string[]).includes(key);
}

/**
 * The 1–2 character fallback shown where an icon doesn't fit. Uses the explicit
 * short label when set, else the initials of the first two words ("Growth SEO"
 * -> "GS", "Starter" -> "S").
 */
export function tierInitial(tier: Pick<ProjectTier, "name" | "shortLabel">): string {
  const explicit = tier.shortLabel.trim();
  if (explicit) return explicit.slice(0, 3);
  const words = tier.name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** The scope as a list, blank lines dropped. Used by the tooltip and the panel. */
export function scopeLines(scope: string): string[] {
  return scope.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/**
 * "Tier 1" / "Tier 2" / … for a ranked package, or null for one that isn't on
 * the ladder. The single place that phrase is built, so the badge, the picker,
 * the project header and the settings editor all word it identically.
 */
export function tierLevelLabel(tier: Pick<ProjectTier, "level">): string | null {
  return tier.level == null ? null : `Tier ${tier.level}`;
}

/**
 * "Tier 1 · SEO Starter", falling back to the bare name when the package has no
 * level. Used wherever there is room for the full identity (tooltips, headers).
 */
export function tierFullLabel(tier: Pick<ProjectTier, "level" | "name">): string {
  const level = tierLevelLabel(tier);
  return level ? `${level} · ${tier.name}` : tier.name;
}

/**
 * The level a NEW package should default to: one above the highest rung in use,
 * so adding the third tier is a single click rather than a decision.
 */
export function nextTierLevel(tiers: Pick<ProjectTier, "level">[]): number {
  return tiers.reduce((max, t) => Math.max(max, t.level ?? 0), 0) + 1;
}

/** Packages already sitting on a given rung — the settings editor's clash warning. */
export function tiersAtLevel<T extends Pick<ProjectTier, "id" | "level">>(
  tiers: T[],
  level: number | null,
  exceptId?: string,
): T[] {
  if (level == null) return [];
  return tiers.filter((t) => t.level === level && t.id !== exceptId);
}

/**
 * Display order: the tier ladder first (1, 2, 3), then any unranked package,
 * then sort_order and name so it is never arbitrary.
 *
 * Level leads deliberately. It is the number the admin sets and the number
 * staff read, so a list ordered any other way would contradict the badges on
 * screen. MAX_SAFE_INTEGER rather than Infinity as the "unranked" sentinel:
 * Infinity - Infinity is NaN, which would make the comparator incoherent for
 * two unranked packages.
 */
export function sortTiers<T extends Pick<ProjectTier, "sortOrder" | "name" | "level">>(tiers: T[]): T[] {
  const rank = (t: T) => t.level ?? Number.MAX_SAFE_INTEGER;
  return [...tiers].sort(
    (a, b) => rank(a) - rank(b) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

/**
 * Resolve a project's tier. Returns null for an unlabelled project AND for one
 * pointing at a package that has since been deleted — the FK is ON DELETE SET
 * NULL, but a store still holding the old row must not render a broken badge.
 */
export function findTier(tiers: ProjectTier[], tierId: string | null | undefined): ProjectTier | null {
  if (!tierId) return null;
  return tiers.find((t) => t.id === tierId) ?? null;
}
