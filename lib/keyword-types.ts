// Keyword research types + the paste parser.
//
// Dependency-free on purpose (no supabase / next / react imports), like
// lib/weekly-seo.ts and lib/seo-checklist.ts, so the panel, the importer and any
// future report share one implementation and can't drift. The parser is pure,
// which is what makes it checkable without a browser.

export type KeywordStatus = "target" | "in_progress" | "ranking" | "dropped";
export type KeywordPriority = "high" | "medium" | "low";

export interface Keyword {
  id: string;
  projectId: string;
  keyword: string;
  searchVolume: number | null;
  difficulty: number | null;
  targetUrl: string | null;
  currentRank: number | null;
  rankCheckedAt: string | null;
  status: string;
  priority: string;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const KEYWORD_STATUSES: { key: KeywordStatus; label: string; color: string }[] = [
  { key: "target", label: "Target", color: "#64748b" },
  { key: "in_progress", label: "In Progress", color: "#3b82f6" },
  { key: "ranking", label: "Ranking", color: "#22c55e" },
  { key: "dropped", label: "Dropped", color: "#ef4444" },
];

export const KEYWORD_PRIORITIES: { key: KeywordPriority; label: string; color: string }[] = [
  { key: "high", label: "High", color: "#ef4444" },
  { key: "medium", label: "Medium", color: "#f59e0b" },
  { key: "low", label: "Low", color: "#4a7090" },
];

/** Both lookups fall back to the raw key so an unknown value can't crash the page. */
export function statusMeta(key: string) {
  return KEYWORD_STATUSES.find((s) => s.key === key) ?? { key: key as KeywordStatus, label: key, color: "#4a7090" };
}
export function priorityMeta(key: string) {
  return KEYWORD_PRIORITIES.find((p) => p.key === key) ?? { key: key as KeywordPriority, label: key, color: "#4a7090" };
}

/** Difficulty colouring follows the usual Ahrefs/SEMrush banding. */
export function difficultyColor(kd: number | null): string {
  if (kd === null) return "#4a7090";
  if (kd <= 14) return "#22c55e";
  if (kd <= 29) return "#84cc16";
  if (kd <= 49) return "#f59e0b";
  if (kd <= 69) return "#f97316";
  return "#ef4444";
}

export interface ParsedKeywordRow {
  keyword: string;
  searchVolume: number | null;
  difficulty: number | null;
  targetUrl: string | null;
  currentRank: number | null;
  /**
   * When the rank tracker checked, from a "Last checked" column. NULL when the
   * source has no such column (the importer then stamps the import time).
   */
  rankCheckedAt: string | null;
  /** "commercial" / "local" / … from a Search intent column. Insert-only. */
  intent: string | null;
}

/** The fields a source actually supplied — see ParsedPaste.mappedFields. */
export type KeywordField = keyof Omit<ParsedKeywordRow, "keyword">;

export interface ParsedPaste {
  rows: ParsedKeywordRow[];
  /** Duplicate keywords collapsed WITHIN the pasted text itself. */
  duplicatesInPaste: number;
  /** True when a header row was detected and used for column mapping. */
  usedHeader: boolean;
  /**
   * Which columns the source actually HAD. This is what lets a re-import tell
   * "this report says the keyword no longer ranks" (rank column present, cell
   * blank -> null) from "this report doesn't mention rank at all" (no column ->
   * leave what's stored alone). Without it, importing a volume-only list would
   * silently wipe every recorded position.
   */
  mappedFields: KeywordField[];
  /** Rows whose date cell couldn't be read — the importer falls back to now. */
  unreadableDates: number;
}

/**
 * Numbers as SEO tools actually export them: "2,400", "1.2K", "3.4M", "—", "n/a",
 * "<10", "" . Returns null for anything that isn't a usable number, so a junk
 * cell degrades to "unknown" instead of poisoning the row with 0.
 */
export function parseSeoNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  let s = raw.trim().toLowerCase();
  if (!s || s === "-" || s === "—" || s === "–" || s === "n/a" || s === "na") return null;
  s = s.replace(/^[<>~≈]+/, "").replace(/,/g, "").replace(/\s+/g, "");
  const m = /^(\d+(?:\.\d+)?)([km])?$/.exec(s);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const mult = m[2] === "k" ? 1_000 : m[2] === "m" ? 1_000_000 : 1;
  return Math.round(n * mult);
}

/**
 * A date as rank trackers export it. ISO (2026-08-31) and textual months
 * ("31 Aug 2026", "Aug 31, 2026") only.
 *
 * Ambiguous all-numeric slash dates are deliberately REFUSED: 03/09/2026 is
 * 3 September to this agency and 9 March to a US tool, and silently picking one
 * would misdate a rank check by six months with nothing on screen to show for
 * it. The caller falls back to the import time and says so.
 */
export function parseSeoDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(s);
  if (iso) {
    const d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
    // Rejects 2026-02-31 rather than letting Date roll it into March.
    if (d.getUTCMonth() !== +iso[2] - 1 || d.getUTCDate() !== +iso[3]) return null;
    return d.toISOString();
  }
  // Textual month, either order. Requires letters, so a slash date can't reach here.
  if (!/[a-z]{3}/i.test(s)) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/**
 * Header cells as tools really label them: "Difficulty (0-100)", "Volume (US)",
 * "Position*". The bracketed qualifier and trailing punctuation are noise for
 * matching, and stripping them here keeps the patterns below readable instead of
 * growing a tail of optional groups.
 */
function normalizeHeader(cell: string): string {
  return cell
    .replace(/\([^)]*\)/g, " ")
    .replace(/[*:#]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Matched against the NORMALIZED header. Alternatives are anchored whole-string
// on purpose: "Google page" (a page NUMBER derived from position) must not match
// the target-URL pattern, and "Ranking page" must not match the rank pattern.
const HEADER_PATTERNS: { field: keyof ParsedKeywordRow; re: RegExp }[] = [
  { field: "keyword", re: /^(keyword|kw|term|query|search term)s?$/i },
  { field: "searchVolume", re: /^((search|monthly|avg\.? monthly|average monthly) )?(volume|vol|searches|search volume|sv)$/i },
  { field: "difficulty", re: /^(keyword |seo )?(difficulty|kd|comp|competition)$/i },
  { field: "targetUrl", re: /^(target|target url|url|page url|landing page|destination|ranking page|ranking url|current url|result url|ranked page)$/i },
  { field: "currentRank", re: /^(rank|ranking|position|pos|current rank|current position|best position)$/i },
  { field: "rankCheckedAt", re: /^(last checked|checked|checked on|check date|last update|last updated|date)$/i },
  { field: "intent", re: /^(search intent|intent|keyword intent)$/i },
];

/**
 * Splits one line on the delimiter, respecting double-quoted fields.
 *
 * A naive split() corrupts quoted CSV silently: `"halal restaurant, sg",2400`
 * came out as the keyword `"halal restaurant` with the volume lost. Quoted
 * fields are normal in tool exports, and a mangled keyword is worse than a
 * rejected paste because nobody notices. `""` inside a quoted field is an
 * escaped quote, per RFC 4180.
 */
function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/**
 * Turns pasted spreadsheet / SEO-tool output into keyword rows.
 *
 * Handles: a bare list of keywords (one per line), tab-separated (what you get
 * copying from Sheets/Excel/Ahrefs), and comma-separated. Uses a header row to
 * map columns when one is present; otherwise falls back to the common
 * keyword / volume / difficulty column order, and only assigns those numeric
 * fields when the cell actually parses as a number — so a stray text column
 * can't silently land in `searchVolume`.
 */
export function parseKeywordPaste(text: string): ParsedPaste {
  // Strip a UTF-8 BOM before anything else. Excel writes one on every CSV it
  // saves, and it would otherwise glue itself to the first header cell — the
  // keyword column then fails to match, header detection is skipped, and the
  // header row is imported as a keyword called "Keyword".
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const empty: ParsedPaste = {
    rows: [], duplicatesInPaste: 0, usedHeader: false, mappedFields: [], unreadableDates: 0,
  };
  if (lines.length === 0) return empty;

  const delimiter = lines.some((l) => l.includes("\t")) ? "\t" : lines.some((l) => l.includes(",")) ? "," : "";

  // Header detection: only when the first row's cells LOOK like column names.
  let usedHeader = false;
  const map: Partial<Record<keyof ParsedKeywordRow, number>> = {};
  if (delimiter) {
    const first = splitLine(lines[0], delimiter);
    const matched = first
      .map((cell, i) => ({ i, hit: HEADER_PATTERNS.find((h) => h.re.test(normalizeHeader(cell))) }))
      .filter((x) => x.hit);
    // Require the keyword column specifically — otherwise a data row whose first
    // cell happens to read "position" would be eaten as a header.
    if (matched.some((x) => x.hit!.field === "keyword")) {
      usedHeader = true;
      for (const { i, hit } of matched) if (map[hit!.field] === undefined) map[hit!.field] = i;
    }
  }

  // Which fields this source is authoritative for. Without a header we only
  // trust the classic keyword/volume/difficulty order, so a positional paste can
  // never be read as "this keyword has no rank".
  const mappedFields: KeywordField[] = usedHeader
    ? (["searchVolume", "difficulty", "targetUrl", "currentRank", "rankCheckedAt", "intent"] as KeywordField[])
        .filter((f) => map[f] !== undefined)
    : (["searchVolume", "difficulty"] as KeywordField[]);

  const body = usedHeader ? lines.slice(1) : lines;
  const seen = new Set<string>();
  const rows: ParsedKeywordRow[] = [];
  let duplicatesInPaste = 0;
  let unreadableDates = 0;

  for (const line of body) {
    const cells = delimiter ? splitLine(line, delimiter) : [line.trim()];
    const keyword = (usedHeader ? cells[map.keyword ?? 0] : cells[0])?.trim();
    if (!keyword) continue;

    const key = keyword.toLowerCase();
    if (seen.has(key)) { duplicatesInPaste++; continue; }
    seen.add(key);

    const pick = (field: keyof ParsedKeywordRow, positional: number) =>
      usedHeader ? (map[field] === undefined ? undefined : cells[map[field]!]) : cells[positional];

    const rawDate = usedHeader && map.rankCheckedAt !== undefined ? cells[map.rankCheckedAt] : undefined;
    const rankCheckedAt = parseSeoDate(rawDate);
    if (rawDate?.trim() && !rankCheckedAt) unreadableDates++;

    rows.push({
      keyword,
      searchVolume: parseSeoNumber(pick("searchVolume", 1)),
      difficulty: parseSeoNumber(pick("difficulty", 2)),
      // Only mapped from a header — positionally guessing a URL is too risky.
      targetUrl: (usedHeader && map.targetUrl !== undefined ? cells[map.targetUrl]?.trim() : "") || null,
      currentRank: usedHeader && map.currentRank !== undefined ? parseSeoNumber(cells[map.currentRank]) : null,
      rankCheckedAt,
      intent: (usedHeader && map.intent !== undefined ? cells[map.intent]?.trim() : "") || null,
    });
  }

  return { rows, duplicatesInPaste, usedHeader, mappedFields, unreadableDates };
}
