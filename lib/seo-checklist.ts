// The agency's STANDARD Technical / On-Page SEO checklist.
//
// Every client project needs this work done and recorded. A project is seeded
// from this list once, then owns its rows — renaming, adding or removing an item
// on one client never touches another. Editing this file therefore changes what
// NEW projects (and re-seeds) get, not what is already recorded.
//
// Dependency-free on purpose (no supabase / next / react imports) so the seeder,
// the panel and any future template can share it without drifting.

export type SeoChecklistCategory = "technical" | "onpage";

export const SEO_CHECKLIST_CATEGORIES: {
  key: SeoChecklistCategory; label: string; color: string;
}[] = [
  { key: "technical", label: "Technical SEO", color: "#38b6e8" },
  { key: "onpage", label: "On-Page SEO", color: "#a855f7" },
];

/** Falls back to the raw key so an unknown category can never crash the page. */
export function categoryMeta(key: string) {
  return (
    SEO_CHECKLIST_CATEGORIES.find((c) => c.key === key) ?? {
      key: key as SeoChecklistCategory,
      label: key,
      color: "#4a7090",
    }
  );
}

export const STANDARD_TECHNICAL_ITEMS: string[] = [
  "SSL / HTTPS active and forced",
  "Google Search Console verified",
  "Google Analytics (GA4) installed and tracking",
  "robots.txt configured correctly",
  "XML sitemap generated and submitted",
  "Indexing checked — no accidental noindex or blocked pages",
  "Canonical tags set on all pages",
  "Mobile-friendly / responsive on all breakpoints",
  "Core Web Vitals pass (LCP, CLS, INP)",
  "Page speed optimised — images, caching, minification",
  "Broken links and 404 errors fixed",
  "301 redirects mapped for any old URLs",
  "Structured data / schema markup added",
  "Duplicate content and URL variants resolved",
];

export const STANDARD_ONPAGE_ITEMS: string[] = [
  "Keyword research completed and mapped to pages",
  "Title tags written for all key pages",
  "Meta descriptions written for all key pages",
  "One H1 per page with correct H2 / H3 hierarchy",
  "URL slugs clean and keyword-relevant",
  "Image alt text added",
  "Internal linking between key pages",
  "Primary content optimised for target keywords",
  "Content depth adequate versus competitors",
  "Clear call-to-action on key pages",
  "Open Graph / social preview tags set",
  "Google Business Profile and NAP consistency",
];

export interface StandardChecklistEntry {
  category: SeoChecklistCategory;
  label: string;
  sortOrder: number;
}

/** The full standard list, flattened and pre-ordered for insertion. */
export function standardChecklist(): StandardChecklistEntry[] {
  return [
    ...STANDARD_TECHNICAL_ITEMS.map((label, i) => ({
      category: "technical" as const, label, sortOrder: i,
    })),
    ...STANDARD_ONPAGE_ITEMS.map((label, i) => ({
      category: "onpage" as const, label, sortOrder: i,
    })),
  ];
}

export const STANDARD_CHECKLIST_SIZE =
  STANDARD_TECHNICAL_ITEMS.length + STANDARD_ONPAGE_ITEMS.length;
