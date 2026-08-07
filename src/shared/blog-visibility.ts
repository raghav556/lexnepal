/**
 * Blog / Legal Insights visibility (BL-0)
 *
 * | Surface                 | Rule                                                         |
 * |-------------------------|--------------------------------------------------------------|
 * | /blog, /blog/[slug]     | status=published && !deleted                                 |
 * | Public APIs             | published only                                               |
 * | Sitemap                 | published slugs only                                         |
 * | Admin CMS               | all statuses for firm; Approve/Reject pending_review         |
 * | Staff Content           | own drafts/rejected/pending; submit → pending_review         |
 * | Staff cannot            | set status=published (cms.manage only)                       |
 *
 * Capabilities:
 * - cms.manage → full CRUD + publish + approve/reject
 * - cms.content_submit → staff draft/edit own + submit for review
 *
 * Owner acceptance:
 * 1. Admin publish → appears on /blog; draft/pending do not.
 * 2. Staff submit → Admin approve → live; reject stays private with notes.
 * 3. Detail renders markdown; listing has CMS hero + ribbon.
 * 4. verify:blog passes.
 */

export const BLOG_STATUSES = ["draft", "pending_review", "published", "rejected"] as const;
export type BlogEditorialStatus = (typeof BLOG_STATUSES)[number];

export const NEWS_EDITORIAL_STATUSES = BLOG_STATUSES;
export type NewsEditorialStatus = BlogEditorialStatus;

export function isPublicBlogStatus(status: string | null | undefined): boolean {
  return status === "published";
}

export function staffCanEditBlogStatus(status: string | null | undefined): boolean {
  return status === "draft" || status === "rejected";
}

export function slugifyBlogTitle(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "article"
  );
}

export function estimateReadTimeLabel(text?: string | null): string {
  if (!text) return "3 min read";
  const words = text.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}
