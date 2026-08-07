/**
 * Smoke-test CMS content for local preview (news on /news, header nav link).
 * Targets PUBLIC_FIRM_SLUG (default phase-6-firm-a).
 */
import { eq, inArray } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getServerEnvironment } from "../../src/server/env";
import { firms, navigation, newsAndAwards, cmsSettings } from "../../db/schema";
import { DEFAULT_DIRECTOR_MESSAGE } from "../../src/shared/director-message";
import { seedBrandAssets, seedDirectorMessageAssets } from "./seed-cms-assets";

const SMOKE_NEWS_LEGACY_ID = "e2e_smoke_news_1";

const HEADER_ROOTS = [
  { legacyConvexId: "e2e_smoke_nav_home", label: "Home", url: "/", order: 1 },
  { legacyConvexId: "cms_nav_1", label: "About Us", url: "/about-us", order: 2 },
  { legacyConvexId: "e2e_smoke_nav_practice", label: "Practice Areas", url: "/practice-areas", order: 3 },
  { legacyConvexId: "cms_nav_2", label: "Our Team", url: "/lawyers", order: 4 },
  { legacyConvexId: "e2e_smoke_nav_resources", label: "Resources", url: "#", order: 5 },
  { legacyConvexId: "e2e_smoke_nav_contact", label: "Contact", url: "/contact", order: 6 },
] as const;

const HEADER_CHILDREN = [
  {
    legacyConvexId: "e2e_smoke_nav_blog",
    label: "Blog",
    url: "/blog",
    order: 1,
    parentLegacyId: "e2e_smoke_nav_resources",
  },
  {
    legacyConvexId: "e2e_smoke_nav_news",
    label: "News & Awards",
    url: "/news",
    order: 2,
    parentLegacyId: "e2e_smoke_nav_resources",
  },
] as const;

const FOOTER_NAV = [
  {
    legacyConvexId: "e2e_smoke_footer1_privacy",
    label: "Privacy Policy",
    url: "/privacy-policy",
    location: "footer_col_1" as const,
    order: 1,
  },
  {
    legacyConvexId: "e2e_smoke_footer1_terms",
    label: "Terms of Service",
    url: "/terms",
    location: "footer_col_1" as const,
    order: 2,
  },
  {
    legacyConvexId: "e2e_smoke_footer2_careers",
    label: "Careers",
    url: "/careers",
    location: "footer_col_2" as const,
    order: 1,
  },
  {
    legacyConvexId: "e2e_smoke_footer2_resources",
    label: "Resources",
    url: "/resources",
    location: "footer_col_2" as const,
    order: 2,
  },
] as const;

const DEFAULT_ABOUT_PAGE = {
  hero: {
    title: "Modernizing Legal Practice in Nepal",
    description:
      "We combine decades of courtroom experience with cutting-edge technology to deliver transparent, efficient, and results-driven legal services.",
  },
  mission: {
    text: "Our mission is to provide every client with dedication, expertise, and transparency.",
  },
  values: [
    { icon: "Shield", title: "Integrity First", desc: "We uphold the highest ethical standards in every case." },
    { icon: "Target", title: "Precision & Diligence", desc: "Every detail matters in law." },
  ],
  timeline: [{ year: "2010", title: "Firm Founded", desc: "Established in Kathmandu." }],
};

async function upsertSetting(firmId: string, key: string, value: unknown) {
  const db = getDatabase();
  await db
    .insert(cmsSettings)
    .values({ firmId, key, value })
    .onConflictDoUpdate({
      target: [cmsSettings.firmId, cmsSettings.key],
      set: { value, updatedAt: new Date(), deletedAt: null },
    });
}

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
      status: "published",
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
        status: "published",
        linkUrl: "https://example.invalid/lexnepal-smoke-test",
        imageUrl:
          "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
        updatedAt: new Date(),
        deletedAt: null,
      },
    })
    .returning({ id: newsAndAwards.id });

  const navIds: string[] = [];
  const legacyIdToDbId = new Map<string, string>();
  const smokeLegacyIds = [
    ...HEADER_ROOTS,
    ...HEADER_CHILDREN,
    ...FOOTER_NAV,
  ].map((item) => item.legacyConvexId);

  // Hard-delete prior smoke rows so unique sibling orders are free (soft-deleted rows still hold the index).
  await db.delete(navigation).where(inArray(navigation.legacyConvexId, [...smokeLegacyIds]));

  for (const item of [...HEADER_ROOTS, ...FOOTER_NAV].sort((a, b) => b.order - a.order)) {
    const location = "location" in item ? item.location : "header";
    const [row] = await db
      .insert(navigation)
      .values({
        firmId: firm.id,
        legacyConvexId: item.legacyConvexId,
        label: item.label,
        url: item.url,
        location,
        order: item.order,
        isActive: true,
        parentId: null,
      })
      .returning({ id: navigation.id });
    navIds.push(row!.id);
    legacyIdToDbId.set(item.legacyConvexId, row!.id);
  }

  for (const item of HEADER_CHILDREN) {
    const parentId = legacyIdToDbId.get(item.parentLegacyId);
    if (!parentId) throw new Error(`Missing parent nav for ${item.legacyConvexId}`);
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
        parentId,
      })
      .returning({ id: navigation.id });
    navIds.push(row!.id);
  }

  const directorAssets = await seedDirectorMessageAssets(firm.id);
  await upsertSetting(firm.id, "director_message", {
    ...DEFAULT_DIRECTOR_MESSAGE,
    name: "Managing Partner",
    message:
      "We believe every client deserves clarity, integrity, and relentless advocacy. " +
      "Our firm combines deep courtroom experience with modern transparency.",
    photoUrl: directorAssets.photoUrl,
    signatureUrl: directorAssets.signatureUrl,
  });

  const brandAssets = await seedBrandAssets(firm.id);
  await upsertSetting(firm.id, "logoUrl", brandAssets.logoUrl);
  await upsertSetting(firm.id, "faviconUrl", brandAssets.faviconUrl);
  await upsertSetting(firm.id, "heroImageUrl", brandAssets.heroImageUrl);

  await upsertSetting(firm.id, "footerCol1Title", "Quick Links");
  await upsertSetting(firm.id, "footerCol2Title", "Explore");
  await upsertSetting(firm.id, "privacyPolicyUrl", "/privacy-policy");
  await upsertSetting(firm.id, "termsOfServiceUrl", "/terms");
  await upsertSetting(firm.id, "primaryCtaLabel", "Book Consultation");
  await upsertSetting(firm.id, "primaryCtaShortLabel", "Book Now");
  await upsertSetting(firm.id, "primaryCtaHref", "/consultation");
  await upsertSetting(firm.id, "about_page", DEFAULT_ABOUT_PAGE);

  return {
    firmId: firm.id,
    firmSlug: slug,
    newsId: news!.id,
    navigationIds: navIds,
    directorAssets,
    brandAssets,
  };
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
