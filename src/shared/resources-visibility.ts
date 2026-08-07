/**
 * Resources / Legal Library visibility (RS-0)
 *
 * | Surface              | Rule                                                      |
 * |----------------------|-----------------------------------------------------------|
 * | /resources           | status=published && !deleted                              |
 * | /resources/[slug]    | same; else 404                                            |
 * | Public list/detail   | omit fileUrl when isGated                                 |
 * | Download endpoint    | published only; gated requires name+email lead            |
 * | Sitemap              | /resources + each published slug                          |
 * | Admin                | all statuses for firm                                     |
 *
 * Owner acceptance:
 * 1. Publish in Admin → appears on /resources; draft does not.
 * 2. Gated: public JSON has no fileUrl; unlock via email then download works.
 * 3. Ungated: one-click download via secure endpoint; counter increments.
 * 4. /resources/{slug} shareable with SEO title.
 * 5. verify:resources passes.
 */

export function slugifyResourceTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "resource";
}

export function fileTypeLabelFromUrl(url: string | null | undefined): string {
  if (!url) return "File";
  const path = url.split("?")[0]?.toLowerCase() || "";
  if (path.endsWith(".pdf") || path.includes("application/pdf")) return "PDF";
  if (path.endsWith(".doc") || path.endsWith(".docx")) return "Document";
  if (path.endsWith(".xls") || path.endsWith(".xlsx")) return "Spreadsheet";
  return "File";
}
