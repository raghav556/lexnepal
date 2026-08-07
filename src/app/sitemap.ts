import type { MetadataRoute } from "next";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { blogPosts, newsAndAwards, practiceAreas, firms, users, resources } from "@/server/db/schema";
import { getServerEnvironment } from "@/server/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (getServerEnvironment().APP_PUBLIC_URL || "http://localhost:3001").replace(/\/$/, "");
  const slug = getServerEnvironment().PUBLIC_FIRM_SLUG;
  const db = getDatabase();
  const [firm] = await db
    .select({ id: firms.id })
    .from(firms)
    .where(and(eq(firms.slug, slug), eq(firms.isActive, true), isNull(firms.deletedAt)))
    .limit(1);
  if (!firm) {
    return [{ url: `${base}/`, changeFrequency: "weekly", priority: 1 }];
  }

  const staticPaths = [
    "/",
    "/about-us",
    "/practice-areas",
    "/lawyers",
    "/blog",
    "/news",
    "/careers",
    "/resources",
    "/contact",
    "/consultation",
    "/privacy-policy",
    "/terms",
  ];

  const [areas, posts, news, lawyers, library] = await Promise.all([
    db
      .select({ slug: practiceAreas.slug, updatedAt: practiceAreas.updatedAt })
      .from(practiceAreas)
      .where(
        and(
          eq(practiceAreas.firmId, firm.id),
          eq(practiceAreas.isActive, true),
          isNull(practiceAreas.deletedAt),
        ),
      ),
    db
      .select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt, publishDate: blogPosts.publishDate })
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.firmId, firm.id),
          eq(blogPosts.status, "published"),
          isNull(blogPosts.deletedAt),
        ),
      ),
    db
      .select({
        slug: newsAndAwards.slug,
        updatedAt: newsAndAwards.updatedAt,
        publicationDate: newsAndAwards.publicationDate,
      })
      .from(newsAndAwards)
      .where(
        and(
          eq(newsAndAwards.firmId, firm.id),
          eq(newsAndAwards.status, "published"),
          isNull(newsAndAwards.deletedAt),
        ),
      ),
    db
      .select({ id: users.id, updatedAt: users.updatedAt })
      .from(users)
      .where(
        and(
          eq(users.firmId, firm.id),
          eq(users.isActive, true),
          eq(users.isPublicFacing, true),
          isNull(users.deletedAt),
          sql`${users.role} <> 'client'`,
        ),
      ),
    db
      .select({ slug: resources.slug, updatedAt: resources.updatedAt })
      .from(resources)
      .where(
        and(
          eq(resources.firmId, firm.id),
          eq(resources.status, "published"),
          isNull(resources.deletedAt),
        ),
      ),
  ]);

  const entries: MetadataRoute.Sitemap = [
    ...staticPaths.map((path) => ({
      url: `${base}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.7,
    })),
    ...areas.map((a) => ({
      url: `${base}/practice-areas/${a.slug}`,
      lastModified: a.updatedAt ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.publishDate ?? p.updatedAt ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...news.map((n) => ({
      url: `${base}/news/${n.slug}`,
      lastModified: n.updatedAt ?? (n.publicationDate ? new Date(n.publicationDate) : undefined),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...lawyers.map((l) => ({
      url: `${base}/lawyers/${l.id}`,
      lastModified: l.updatedAt ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...library.map((r) => ({
      url: `${base}/resources/${r.slug}`,
      lastModified: r.updatedAt ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  return entries;
}
