/**
 * Smoke-test CMS content for local preview (news on /news, header nav link).
 * Targets PUBLIC_FIRM_SLUG (default phase-6-firm-a).
 */
import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getServerEnvironment } from "../../src/server/env";
import { firms, navigation, newsAndAwards, cmsSettings } from "../../db/schema";
import { DEFAULT_DIRECTOR_MESSAGE } from "../../src/shared/director-message";

const SMOKE_NEWS_LEGACY_ID = "e2e_smoke_news_1";

const HEADER_NAV = [
  { legacyConvexId: "e2e_smoke_nav_home", label: "Home", url: "/", order: 1 },
  { legacyConvexId: "cms_nav_1", label: "About Us", url: "/about-us", order: 2 },
  { legacyConvexId: "e2e_smoke_nav_practice", label: "Practice Areas", url: "/practice-areas", order: 3 },
  { legacyConvexId: "cms_nav_2", label: "Our Team", url: "/lawyers", order: 4 },
  { legacyConvexId: "e2e_smoke_nav_blog", label: "Blog", url: "/blog", order: 5 },
  { legacyConvexId: "e2e_smoke_nav_news", label: "News & Awards", url: "/news", order: 6 },
  { legacyConvexId: "e2e_smoke_nav_contact", label: "Contact", url: "/contact", order: 7 },
] as const;

export async function seedCmsSmoke() {
  const db = getDatabase();
  const slug = getServerEnvironment().PUBLIC_FIRM_SLUG;
  const [firm] = await db.select({ id: firms.id }).from(firms).where(eq(firms.slug, slug)).limit(1);
  if (!firm) throw new Error(`Public firm "${slug}" not found. Run migration fixtures first.`);

  const today = new Date().toISOString().slice(0, 10);

  const [news] = await db
    .insert(newsAndAwards)
    .values({
      firmId: firm.id,
      legacyConvexId: SMOKE_NEWS_LEGACY_ID,
      title: "LexNepal Named Top Corporate Law Firm 2026 (Smoke Test)",
      excerpt:
        "Local smoke-test entry from /admin/cms/news — visible on the public News & Awards page at /news.",
      content:
        "This is a deterministic smoke-test news item seeded for local development. " +
        "Create or edit items in Admin → CMS → News & Awards and they appear on the public site at /news " +
        "for the firm configured by PUBLIC_FIRM_SLUG.",
      publicationDate: today,
      type: "award",
      linkUrl: "https://example.invalid/lexnepal-smoke-test",
      imageUrl:
        "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
    })
    .onConflictDoUpdate({
      target: newsAndAwards.legacyConvexId,
      set: {
        title: "LexNepal Named Top Corporate Law Firm 2026 (Smoke Test)",
        excerpt:
          "Local smoke-test entry from /admin/cms/news — visible on the public News & Awards page at /news.",
        content:
          "This is a deterministic smoke-test news item seeded for local development. " +
          "Create or edit items in Admin → CMS → News & Awards and they appear on the public site at /news " +
          "for the firm configured by PUBLIC_FIRM_SLUG.",
        publicationDate: today,
        type: "award",
        linkUrl: "https://example.invalid/lexnepal-smoke-test",
        imageUrl:
          "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
        updatedAt: new Date(),
        deletedAt: null,
      },
    })
    .returning({ id: newsAndAwards.id });

  const navIds: string[] = [];
  for (const item of [...HEADER_NAV].sort((a, b) => b.order - a.order)) {
    const [row] = await db
      .insert(navigation)
      .values({
        firmId: firm.id,
        legacyConvexId: item.legacyConvexId,
        label: item.label,
        url: item.url,
        location: "header",
        order: item.order,
        isActive: true,
        parentId: null,
      })
      .onConflictDoUpdate({
        target: navigation.legacyConvexId,
        set: {
          label: item.label,
          url: item.url,
          location: "header",
          order: item.order,
          isActive: true,
          parentId: null,
          updatedAt: new Date(),
          deletedAt: null,
        },
      })
      .returning({ id: navigation.id });
    navIds.push(row!.id);
  }

  await db
    .insert(cmsSettings)
    .values({
      firmId: firm.id,
      key: "director_message",
      value: DEFAULT_DIRECTOR_MESSAGE,
    })
    .onConflictDoUpdate({
      target: [cmsSettings.firmId, cmsSettings.key],
      set: { value: DEFAULT_DIRECTOR_MESSAGE, updatedAt: new Date(), deletedAt: null },
    });

  return { firmId: firm.id, firmSlug: slug, newsId: news!.id, navigationIds: navIds };
}

const invokedDirectly = process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/seed-cms-smoke.ts");
if (invokedDirectly) {
  try {
    const result = await seedCmsSmoke();
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } finally {
    await closeDatabase();
  }
}
