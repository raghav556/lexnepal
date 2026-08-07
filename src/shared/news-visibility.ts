/**
 * News & Awards visibility (NW-0)
 *
 * | Surface              | Rule                                              |
 * |----------------------|---------------------------------------------------|
 * | /news                | status=published && !deleted                      |
 * | /news/[slug]         | same; else 404                                    |
 * | /news/{uuid}         | redirect to /news/{slug} when published           |
 * | Public APIs          | published only                                    |
 * | Sitemap              | /news + each published slug                       |
 * | Admin                | all statuses; Approve/Reject pending_review       |
 * | Staff Content        | own drafts/rejected/pending; cannot publish       |
 *
 * Owner acceptance:
 * 1. Admin publish → on /news; draft/pending do not.
 * 2. Shareable /news/{slug} with SEO; UUID redirects.
 * 3. Listing: CMS hero, trust strip, ribbon, mobile OK.
 * 4. Detail: markdown, related by type; verify:news passes.
 */

export function slugifyNewsTitle(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "news-update"
  );
}

export function isUuidParam(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function isPublicNewsStatus(status: string | null | undefined): boolean {
  return status === "published";
}
