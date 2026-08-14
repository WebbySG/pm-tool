// ─── Weekly SEO engine — calendar + naming rules ─────────────────────────────
// Shared by the generator route (app/api/weekly-seo/run/route.ts, service role)
// and the admin UI, so this module must stay free of supabase / next / react
// imports. All date maths is done in UTC — callers hand in UTC-midnight Dates.
//
// A week is a Monday-start block; articles go out on Monday, Wednesday and
// Friday. Two rules decide what a week produces:
//
//   1. A week BELONGS TO THE MONTH OF ITS FRIDAY. Week N is therefore the Nth
//      Friday of that month — which is exactly the Nth week of the month that
//      contains any weekday of it.
//   2. Only the article days that actually fall inside that month are
//      generated. A week that straddles a month boundary produces tasks for
//      the NEW month only:
//
//        Mon 28 Jul · Wed 30 Jul · Fri 1 Aug
//          → "August (Week 1)" with ONE child, Article 1 (Friday).
//            The two July days are not generated.
//
//        Mon 31 Aug · Wed 2 Sep · Fri 4 Sep
//          → "September (Week 1)" with Article 1 (Wednesday) + Article 2 (Friday).
//            The 31 Aug Monday is not generated.
//
// Articles are numbered 1..n WITHIN their parent (so a one-day week reads
// "Article 1 (Friday)", not "Article 3"), but the slot that identifies the row
// in the database stays keyed to the weekday — article-1 = Monday,
// article-2 = Wednesday, article-3 = Friday — so generation stays idempotent.

export const ARTICLE_DAYS = [
  { slot: "article-1", day: "Monday", offset: 0 },
  { slot: "article-2", day: "Wednesday", offset: 2 },
  { slot: "article-3", day: "Friday", offset: 4 },
] as const;

export const PARENT_SLOT = "articles-parent";
export const SINGLE_SLOTS = [
  { slot: "backlinks", title: "Backlinks" },
  { slot: "gmb", title: "GMB Post" },
] as const;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** UTC midnight for the given calendar parts (month is 0-indexed). */
export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

/** Monday (UTC midnight) of the week containing `d`. */
export function mondayOf(d: Date): Date {
  const m = new Date(d);
  m.setUTCHours(0, 0, 0, 0);
  m.setUTCDate(m.getUTCDate() - ((m.getUTCDay() + 6) % 7));
  return m;
}

/** Monday of the current week, read off the browser's local calendar date. */
export function mondayOfToday(): Date {
  const n = new Date();
  return mondayOf(utcDate(n.getFullYear(), n.getMonth(), n.getDate()));
}

export interface PlannedArticle {
  /** Stable per-weekday DB identity: article-1 | article-2 | article-3. */
  slot: string;
  /** "Monday" | "Wednesday" | "Friday" */
  day: string;
  /** 1-based position within this parent (not within the week). */
  n: number;
  title: string;
  dueIso: string;
}

export interface WeekPlan {
  mondayIso: string;
  fridayIso: string;
  /** 0-indexed month the week is filed under (the month of its Friday). */
  month: number;
  year: number;
  /** Nth week of that month — the ordinal of its Friday. */
  weekNo: number;
  /** Parent task title, e.g. "August (Week 1)". */
  title: string;
  /** Only the article days that fall inside the owning month. */
  articles: PlannedArticle[];
  /** True when the week straddles a month boundary (some days dropped). */
  split: boolean;
}

/**
 * Everything the generator needs for one Monday-start week.
 * `monday` must be a UTC-midnight Monday (use `mondayOf`).
 */
export function planWeek(monday: Date): WeekPlan {
  const friday = addDays(monday, 4);
  const month = friday.getUTCMonth();
  const year = friday.getUTCFullYear();
  // The Nth Friday of the month == the Nth week of the month with weekdays in it.
  const weekNo = Math.ceil(friday.getUTCDate() / 7);

  const inMonth = ARTICLE_DAYS.map((a) => ({ ...a, date: addDays(monday, a.offset) }))
    .filter((a) => a.date.getUTCMonth() === month && a.date.getUTCFullYear() === year);

  return {
    mondayIso: isoDate(monday),
    fridayIso: isoDate(friday),
    month,
    year,
    weekNo,
    title: `${MONTHS[month]} (Week ${weekNo})`,
    articles: inMonth.map((a, i) => ({
      slot: a.slot,
      day: a.day,
      n: i + 1,
      title: `Article ${i + 1} (${a.day})`,
      dueIso: isoDate(a.date),
    })),
    split: inMonth.length < ARTICLE_DAYS.length,
  };
}

/** The next `count` week plans starting from the week containing `from`. */
export function upcomingWeekPlans(from: Date, count: number): WeekPlan[] {
  const start = mondayOf(from);
  return Array.from({ length: count }, (_, i) => planWeek(addDays(start, i * 7)));
}

/** Title for a weekly single (Backlinks / GMB Post) in a given week. */
export function singleTitle(baseTitle: string, week: WeekPlan): string {
  return `${baseTitle} — ${week.title}`;
}
