/**
 * Smoke-test CMS content for local preview (news on /news, header nav link).
 * Targets PUBLIC_FIRM_SLUG (default phase-6-firm-a).
 */
import { eq, inArray } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getServerEnvironment } from "../../src/server/env";
import { firms, navigation, newsAndAwards, cmsSettings, practiceAreas, testimonials } from "../../db/schema";
import { DEFAULT_DIRECTOR_MESSAGE } from "../../src/shared/director-message";
import { seedBrandAssets, seedDirectorMessageAssets, seedPromotedCmsAsset } from "./seed-cms-assets";

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

const PRACTICE_AREAS_SEED = [
  {
    legacyConvexId: "cms_pa_1",
    title: "Corporate Law",
    slug: "corporate-law",
    icon: "Briefcase",
    displayOrder: 1,
    showOnHome: true,
    description: "Corporate advisory and transactions.",
    longDescription:
      "Comprehensive corporate legal services including company formation, mergers & acquisitions, joint ventures, corporate governance, and commercial contracts.",
    faqs: [
      {
        question: "How long does company registration take in Nepal?",
        answer:
          "Private limited company registration typically takes 7–14 working days through the Office of Company Registrar.",
      },
      {
        question: "What is the minimum paid-up capital?",
        answer:
          "For private limited companies, no minimum paid-up capital is required under the Companies Act 2063.",
      },
    ],
  },
  {
    legacyConvexId: "e2e_smoke_pa_criminal",
    title: "Criminal Defense",
    slug: "criminal-defense",
    icon: "Shield",
    displayOrder: 2,
    showOnHome: true,
    description: "Expert criminal defense and prosecution support.",
    longDescription:
      "Expert criminal defense and prosecution support covering bail applications, trial advocacy, appeals, and white-collar crime defense.",
    faqs: [
      {
        question: "What are bail rights in Nepal?",
        answer:
          "Under Nepal's Criminal Procedure Code, bail is available for most offenses. The court considers gravity, flight risk, and evidence.",
      },
    ],
  },
  {
    legacyConvexId: "e2e_smoke_pa_civil",
    title: "Civil Litigation",
    slug: "civil-litigation",
    icon: "Gavel",
    displayOrder: 3,
    showOnHome: true,
    description: "Property disputes, contracts, and civil claims.",
    longDescription:
      "Sensitive handling of property disputes, contracts, tort claims, and other civil matters through mediation, arbitration, and courtroom representation.",
    faqs: [
      {
        question: "What is the statute of limitations for civil cases?",
        answer:
          "Under the Muluki Civil Code 2074, limitation periods vary by claim type — typically 2-5 years from the date of the cause of action.",
      },
    ],
  },
  {
    legacyConvexId: "e2e_smoke_pa_property",
    title: "Property & Real Estate",
    slug: "property-real-estate",
    icon: "Building2",
    displayOrder: 4,
    showOnHome: true,
    description: "Land, conveyancing, and real estate disputes.",
    longDescription:
      "Title due diligence, conveyancing, landlord-tenant matters, and real estate dispute resolution across Nepal.",
    faqs: [
      {
        question: "Do you handle property transfer registrations?",
        answer:
          "Yes. We assist with due diligence, drafting, and registration formalities with the Land Revenue Office.",
      },
    ],
  },
  {
    legacyConvexId: "e2e_smoke_pa_ip",
    title: "Intellectual Property",
    slug: "intellectual-property",
    icon: "FileText",
    displayOrder: 5,
    showOnHome: false,
    description: "Trademarks, patents, and IP enforcement.",
    longDescription:
      "Trademark and patent filings, brand protection strategies, and IP enforcement before Nepalese authorities and courts.",
    faqs: [
      {
        question: "How long does trademark registration take?",
        answer:
          "Trademark registration in Nepal typically takes 12–18 months depending on oppositions and examination timelines.",
      },
    ],
  },
] as const;

const TESTIMONIALS_SEED = [
  {
    legacyConvexId: "e2e_smoke_t1",
    clientName: "Rajesh Shrestha",
    company: "Shrestha Group",
    quote:
      "LexNepal guided our corporate restructuring with clarity and precision. We felt informed at every step.",
    rating: 5,
    isApproved: true,
    showOnHome: true,
    displayOrder: 1,
    withAvatar: true,
  },
  {
    legacyConvexId: "e2e_smoke_t2",
    clientName: "Anita Gurung",
    company: "Himalayan Exports",
    quote: "Professional, responsive, and deeply knowledgeable about Nepal commercial law.",
    rating: 5,
    isApproved: true,
    showOnHome: true,
    displayOrder: 2,
    withAvatar: false,
  },
  {
    legacyConvexId: "e2e_smoke_t3",
    clientName: "Bikash Thapa",
    company: null as string | null,
    quote: "They handled our dispute with diligence and achieved a fair settlement.",
    rating: 4,
    isApproved: true,
    showOnHome: true,
    displayOrder: 3,
    withAvatar: false,
  },
  {
    legacyConvexId: "e2e_smoke_t4",
    clientName: "Sita Maharjan",
    company: "Valley Tech Pvt. Ltd.",
    quote: "Excellent counsel for our employment and compliance matters.",
    rating: 5,
    isApproved: true,
    showOnHome: false,
    displayOrder: 4,
    withAvatar: false,
  },
  {
    legacyConvexId: "e2e_smoke_t5",
    clientName: "Pending Review Client",
    company: "Draft Co.",
    quote: "This draft should not appear on the public homepage until approved.",
    rating: 3,
    isApproved: false,
    showOnHome: true,
    displayOrder: 5,
    withAvatar: false,
  },
] as const;

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

  const practiceAreaIds: string[] = [];
  const paLegacyIds = PRACTICE_AREAS_SEED.map((item) => item.legacyConvexId);
  await db.delete(practiceAreas).where(inArray(practiceAreas.legacyConvexId, [...paLegacyIds]));
  for (const item of PRACTICE_AREAS_SEED) {
    const [row] = await db
      .insert(practiceAreas)
      .values({
        firmId: firm.id,
        legacyConvexId: item.legacyConvexId,
        title: item.title,
        slug: item.slug,
        icon: item.icon,
        description: item.description,
        longDescription: item.longDescription,
        faqs: [...item.faqs],
        displayOrder: item.displayOrder,
        showOnHome: item.showOnHome,
        isActive: true,
        coverImageUrl: null,
        seoTitle: `${item.title} | LexNepal`,
        seoDescription: item.description,
      })
      .returning({ id: practiceAreas.id });
    practiceAreaIds.push(row!.id);
  }

  const testimonialIds: string[] = [];
  const tLegacyIds = TESTIMONIALS_SEED.map((item) => item.legacyConvexId);
  await db.delete(testimonials).where(inArray(testimonials.legacyConvexId, [...tLegacyIds]));
  const avatarUrl = await seedPromotedCmsAsset(firm.id, "testimonial_avatar");
  for (const item of TESTIMONIALS_SEED) {
    const [row] = await db
      .insert(testimonials)
      .values({
        firmId: firm.id,
        legacyConvexId: item.legacyConvexId,
        clientName: item.clientName,
        company: item.company,
        quote: item.quote,
        rating: item.rating,
        isApproved: item.isApproved,
        showOnHome: item.showOnHome,
        displayOrder: item.displayOrder,
        avatarUrl: item.withAvatar ? avatarUrl : null,
      })
      .returning({ id: testimonials.id });
    testimonialIds.push(row!.id);
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
  await upsertSetting(firm.id, "practiceAreasHeroTitle", "Practice Areas");
  await upsertSetting(
    firm.id,
    "practiceAreasHeroSubtitle",
    "Our advocates bring deep specialization and courtroom experience across major areas of Nepal law.",
  );
  await upsertSetting(firm.id, "about_page", DEFAULT_ABOUT_PAGE);

  return {
    firmId: firm.id,
    firmSlug: slug,
    newsId: news!.id,
    navigationIds: navIds,
    practiceAreaIds,
    testimonialIds,
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
