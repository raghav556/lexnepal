/**
 * Practice Areas visibility matrix (PA-0)
 *
 * | Surface              | Source                         | Rule                                      |
 * |----------------------|--------------------------------|-------------------------------------------|
 * | /practice-areas      | practice_areas                 | isActive && !deleted                      |
 * | /practice-areas/:slug| practice_areas by slug         | isActive; else 404                        |
 * | Home featured cards  | practice_areas                 | isActive && showOnHome (fallback: all)    |
 * | Header mega-menu     | live from practice_areas       | same as listing; + "View all"             |
 * | Sitemap              | active slugs                   | isActive only                             |
 * | Consultation options | CMS titles                     | isActive                                  |
 *
 * Owner acceptance checklist:
 * 1. Create PA in admin → appears on listing + submenu (no Navigation edit).
 * 2. Toggle isActive off → gone from listing/submenu; slug URL 404s.
 * 3. Rename slug → old /practice-areas/{old} redirects to new.
 * 4. Detail page shows sidebar Book CTA, related areas, lawyers (if tagged).
 * 5. Consultation ?practiceArea=slug or title prefills the form.
 */

export function normalizePracticeAreaKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function consultationHrefForPracticeArea(opts: {
  title?: string | null;
  slug?: string | null;
}): string {
  const q = String(opts.slug || opts.title || "").trim();
  if (!q) return "/consultation";
  return `/consultation?practiceArea=${encodeURIComponent(q)}`;
}

export function isPracticeAreasNavRoot(link: { href?: string; label?: string }): boolean {
  const href = String(link.href ?? "");
  const label = String(link.label ?? "");
  return href === "/practice-areas" || /^practice\s*areas$/i.test(label);
}

export function resolvePracticeAreaTitleFromParam(
  param: string,
  areas: Array<{ title?: string | null; slug?: string | null }>,
): string | null {
  const raw = param.trim();
  if (!raw) return null;
  const byTitle = areas.find((a) => String(a.title ?? "") === raw);
  if (byTitle?.title) return String(byTitle.title);
  const key = normalizePracticeAreaKey(raw);
  const byTitleKey = areas.find((a) => normalizePracticeAreaKey(String(a.title ?? "")) === key);
  if (byTitleKey?.title) return String(byTitleKey.title);
  const bySlug = areas.find((a) => String(a.slug ?? "") === raw);
  if (bySlug?.title) return String(bySlug.title);
  return null;
}
