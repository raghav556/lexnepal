/**
 * Smoke-test CMS content for local preview (news on /news, header nav link).
 * Targets PUBLIC_FIRM_SLUG (default phase-6-firm-a).
 */
import { and, eq, inArray } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getServerEnvironment } from "../../src/server/env";
import { firms, navigation, newsAndAwards, cmsSettings, practiceAreas, testimonials, resources, blogPosts } from "../../db/schema";
import { DEFAULT_DIRECTOR_MESSAGE } from "../../src/shared/director-message";
import { seedBrandAssets, seedDirectorMessageAssets, seedPromotedCmsAsset } from "./seed-cms-assets";

const SMOKE_NEWS_LEGACY_ID = "e2e_smoke_news_1";

const HEADER_ROOTS = [
  { legacyConvexId: "e2e_smoke_nav_home", label: "Home", url: "/", order: 1 },
  { legacyConvexId: "e2e_smoke_nav_practice", label: "Practice Areas", url: "/practice-areas", order: 2 },
  { legacyConvexId: "cms_nav_2", label: "Our Team", url: "/lawyers", order: 3 },
  { legacyConvexId: "e2e_smoke_nav_resources", label: "Resources", url: "#", order: 4 },
  { legacyConvexId: "e2e_smoke_nav_contact", label: "Contact", url: "/contact", order: 5 },
  { legacyConvexId: "cms_nav_1", label: "About", url: "/about-us", order: 6 },
] as const;

const HEADER_CHILDREN = [
  // Resources submenu — remaining content pages
  {
    legacyConvexId: "e2e_smoke_nav_resources_lib",
    label: "Resource Library",
    url: "/resources",
    order: 1,
    parentLegacyId: "e2e_smoke_nav_resources",
  },
  {
    legacyConvexId: "e2e_smoke_nav_blog",
    label: "Blog",
    url: "/blog",
    order: 2,
    parentLegacyId: "e2e_smoke_nav_resources",
  },
  {
    legacyConvexId: "e2e_smoke_nav_news",
    label: "News & Awards",
    url: "/news",
    order: 3,
    parentLegacyId: "e2e_smoke_nav_resources",
  },
  // About submenu
  {
    legacyConvexId: "e2e_smoke_nav_careers",
    label: "Careers",
    url: "/careers",
    order: 1,
    parentLegacyId: "cms_nav_1",
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

  const NEWS_SEED = [
    {
      legacyConvexId: SMOKE_NEWS_LEGACY_ID,
      title: "LexNepal Named Top Corporate Law Firm 2026",
      slug: "lexnepal-named-top-corporate-law-firm-2026",
      excerpt:
        "Recognition for corporate and commercial counsel serving Nepal businesses and investors.",
      content:
        "## Recognition\n\nLexNepal was named among the top corporate law firms for 2026.\n\n### Why it matters\n\nClients rely on practical counsel across company law, FDI, and commercial disputes.",
      type: "award" as const,
      status: "published" as const,
      isFeatured: true,
      displayOrder: 1,
      linkUrl: "https://example.invalid/lexnepal-smoke-test",
      imageUrl: null as string | null,
      seoTitle: "Top Corporate Law Firm 2026 | LexNepal",
      seoDescription: "LexNepal recognition for corporate and commercial counsel in Nepal.",
    },
    {
      legacyConvexId: "e2e_smoke_news_press",
      title: "LexNepal Advises on Cross-Border Investment Round",
      slug: "lexnepal-advises-cross-border-investment-round",
      excerpt: "Press coverage of LexNepal counsel on a recent Nepal inbound investment.",
      content:
        "## Press note\n\nOur corporate team advised on documentation and regulatory filings for an inbound investment.\n\nContact LexNepal for FDI and company law support.",
      type: "press_release" as const,
      status: "published" as const,
      isFeatured: false,
      displayOrder: 2,
      linkUrl: null as string | null,
      imageUrl: null as string | null,
      seoTitle: null as string | null,
      seoDescription: null as string | null,
    },
    {
      legacyConvexId: "e2e_smoke_news_firm",
      title: "LexNepal Opens Extended Client Hours in Kathmandu",
      slug: "lexnepal-extended-client-hours-kathmandu",
      excerpt: "Firm news: extended consultation availability for busy clients.",
      content:
        "## Firm update\n\nWe now offer extended consultation windows on weekdays.\n\nBook via the consultation page or contact the front desk.",
      type: "firm_news" as const,
      status: "published" as const,
      isFeatured: false,
      displayOrder: 3,
      linkUrl: null as string | null,
      imageUrl: null as string | null,
      seoTitle: null as string | null,
      seoDescription: null as string | null,
    },
    // Extra published items so /news shows pagination (6/page after featured).
    {
      legacyConvexId: "e2e_smoke_news_p4",
      title: "LexNepal Speaks at Kathmandu Corporate Counsel Forum",
      slug: "lexnepal-kathmandu-corporate-counsel-forum",
      excerpt: "Our partners shared practical notes on company law filings and board governance.",
      content: "## Forum\n\nLexNepal advocates joined peers to discuss governance and OCR practice tips.",
      type: "firm_news" as const,
      status: "published" as const,
      isFeatured: false,
      displayOrder: 4,
      linkUrl: null as string | null,
      imageUrl: null as string | null,
      seoTitle: null as string | null,
      seoDescription: null as string | null,
    },
    {
      legacyConvexId: "e2e_smoke_news_p5",
      title: "Chambers Note: LexNepal Employment Practice",
      slug: "chambers-note-lexnepal-employment-practice",
      excerpt: "Recognition for labor and employment counsel supporting Nepal employers.",
      content: "## Award note\n\nEmployment counsel continues to support compliant hiring and workplace policies.",
      type: "award" as const,
      status: "published" as const,
      isFeatured: false,
      displayOrder: 5,
      linkUrl: null as string | null,
      imageUrl: null as string | null,
      seoTitle: null as string | null,
      seoDescription: null as string | null,
    },
    {
      legacyConvexId: "e2e_smoke_news_p6",
      title: "Press: LexNepal on Digital Signature Law Updates",
      slug: "press-lexnepal-digital-signature-law-updates",
      excerpt: "Media commentary on electronic signatures and evidence practice in Nepal.",
      content: "## Press\n\nDigital signature rules affect contracts and court filings. LexNepal summarized the practical impact.",
      type: "press_release" as const,
      status: "published" as const,
      isFeatured: false,
      displayOrder: 6,
      linkUrl: null as string | null,
      imageUrl: null as string | null,
      seoTitle: null as string | null,
      seoDescription: null as string | null,
    },
    {
      legacyConvexId: "e2e_smoke_news_p7",
      title: "LexNepal Hosts Client Briefing on FDI Approvals",
      slug: "lexnepal-client-briefing-fdi-approvals",
      excerpt: "Firm news covering a private briefing for inbound investors and local partners.",
      content: "## Briefing\n\nTopics included DOI filings, sectoral restrictions, and documentation timelines.",
      type: "firm_news" as const,
      status: "published" as const,
      isFeatured: false,
      displayOrder: 7,
      linkUrl: null as string | null,
      imageUrl: null as string | null,
      seoTitle: null as string | null,
      seoDescription: null as string | null,
    },
    {
      legacyConvexId: "e2e_smoke_news_p8",
      title: "LexNepal Recognized for Dispute Resolution Work",
      slug: "lexnepal-recognized-dispute-resolution-work",
      excerpt: "Award spotlight for commercial litigation and arbitration support.",
      content: "## Recognition\n\nOur disputes team continues to advise on commercial and arbitration matters.",
      type: "award" as const,
      status: "published" as const,
      isFeatured: false,
      displayOrder: 8,
      linkUrl: null as string | null,
      imageUrl: null as string | null,
      seoTitle: null as string | null,
      seoDescription: null as string | null,
    },
    {
      legacyConvexId: "e2e_smoke_news_pending",
      title: "Pending Review: Regional Expansion Announcement",
      slug: "pending-review-regional-expansion",
      excerpt: "Draft firm news awaiting admin approval.",
      content:
        "## Draft\n\nThis item should **not** appear on the public news page until approved.",
      type: "firm_news" as const,
      status: "pending_review" as const,
      isFeatured: false,
      displayOrder: 99,
      linkUrl: null as string | null,
      imageUrl: null as string | null,
      seoTitle: null as string | null,
      seoDescription: null as string | null,
    },
  ];

  const newsLegacyIds = NEWS_SEED.map((n) => n.legacyConvexId);
  await db.delete(newsAndAwards).where(
    and(eq(newsAndAwards.firmId, firm.id), inArray(newsAndAwards.legacyConvexId, newsLegacyIds)),
  );

  let newsId = "";
  for (const item of NEWS_SEED) {
    const [row] = await db
      .insert(newsAndAwards)
      .values({
        firmId: firm.id,
        legacyConvexId: item.legacyConvexId,
        title: item.title,
        slug: item.slug,
        excerpt: item.excerpt,
        content: item.content,
        publicationDate: today,
        type: item.type,
        status: item.status,
        linkUrl: item.linkUrl,
        imageUrl: item.imageUrl,
        seoTitle: item.seoTitle,
        seoDescription: item.seoDescription,
        displayOrder: item.displayOrder,
        isFeatured: item.isFeatured,
      })
      .returning({ id: newsAndAwards.id });
    if (item.legacyConvexId === SMOKE_NEWS_LEGACY_ID) newsId = row!.id;
  }

  const navIds: string[] = [];
  const legacyIdToDbId = new Map<string, string>();
  const smokeLegacyIds = [
    ...HEADER_ROOTS,
    ...HEADER_CHILDREN,
    ...FOOTER_NAV,
  ].map((item) => item.legacyConvexId);

  // Replace firm header nav completely so leftover CMS verify junk / wrong nesting cannot leak into the public menu.
  await db.delete(navigation).where(and(eq(navigation.firmId, firm.id), eq(navigation.location, "header")));
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
  await upsertSetting(firm.id, "lawyersHeroTitle", "Our Advocates");
  await upsertSetting(
    firm.id,
    "lawyersHeroSubtitle",
    "Meet the Nepal Bar Council advocates behind LexNepal — specialists across corporate, litigation, and advisory work.",
  );
  await upsertSetting(firm.id, "resourcesHeroTitle", "Legal Resources");
  await upsertSetting(
    firm.id,
    "resourcesHeroSubtitle",
    "Guides, whitepapers, and reports prepared by our advocates to help you navigate Nepal law.",
  );
  await upsertSetting(firm.id, "blogHeroTitle", "Legal Insights");
  await upsertSetting(
    firm.id,
    "blogHeroSubtitle",
    "Plain-language guides to Nepal law from LexNepal advocates.",
  );
  await upsertSetting(firm.id, "newsHeroTitle", "News & Awards");
  await upsertSetting(
    firm.id,
    "newsHeroSubtitle",
    "Firm announcements, press coverage, and recognition from LexNepal advocates.",
  );
  await upsertSetting(firm.id, "contactHeroTitle", "Get in Touch");
  await upsertSetting(
    firm.id,
    "contactHeroSubtitle",
    "Reach LexNepal for general inquiries, legal support, press, or partnership opportunities.",
  );
  await upsertSetting(firm.id, "firmName", "LexNepal");
  await upsertSetting(firm.id, "email", "hello@lexnepal.example");
  await upsertSetting(firm.id, "phone", "+977-1-4000000");
  await upsertSetting(firm.id, "address", "Durbar Marg, Kathmandu, Nepal");
  await upsertSetting(firm.id, "businessHoursText", "Mon–Fri: 9:00 AM – 6:00 PM (NPT)");
  await upsertSetting(firm.id, "emergencyPhone", "+977-9800000000");

  const BLOG_SEED = [
    {
      legacyConvexId: "e2e_smoke_blog_company",
      title: "How to Register a Company in Nepal",
      slug: "how-to-register-a-company-in-nepal",
      category: "Corporate Law",
      excerpt: "A practical overview of OCR filings, timelines, and documents for private limited companies.",
      content:
        "## Overview\n\nRegistering a private limited company in Nepal typically takes **7–14 working days**.\n\n### Key steps\n\n1. Reserve a name\n2. Prepare MoA and AoA\n3. File with the Office of Company Registrar\n",
      author: "LexNepal Editorial",
      status: "published" as const,
      isFeatured: true,
      displayOrder: 1,
    },
    {
      legacyConvexId: "e2e_smoke_blog_labor",
      title: "Labor Law Basics for Employers",
      slug: "labor-law-basics-for-employers",
      category: "General",
      excerpt: "Core obligations under the Labor Act that every employer should understand.",
      content:
        "## Employment contracts\n\nWritten contracts reduce disputes. Include role, pay, and notice periods.\n\n## Working hours\n\nStandard hours and overtime rules apply under the Labor Act.",
      author: "LexNepal Editorial",
      status: "published" as const,
      isFeatured: false,
      displayOrder: 2,
    },
    {
      legacyConvexId: "e2e_smoke_blog_pending",
      title: "Pending Review: FDI Entry Modes",
      slug: "pending-review-fdi-entry-modes",
      category: "Corporate Law",
      excerpt: "Draft article awaiting editorial approval.",
      content: "## Draft\n\nThis post should **not** appear on the public blog until approved.",
      author: "Staff Author",
      status: "pending_review" as const,
      isFeatured: false,
      displayOrder: 99,
    },
  ];

  const blogLegacyIds = BLOG_SEED.map((b) => b.legacyConvexId);
  await db.delete(blogPosts).where(
    and(eq(blogPosts.firmId, firm.id), inArray(blogPosts.legacyConvexId, blogLegacyIds)),
  );
  const blogIds: string[] = [];
  for (const item of BLOG_SEED) {
    const [row] = await db
      .insert(blogPosts)
      .values({
        firmId: firm.id,
        legacyConvexId: item.legacyConvexId,
        title: item.title,
        slug: item.slug,
        category: item.category,
        excerpt: item.excerpt,
        content: item.content,
        author: item.author,
        status: item.status,
        isFeatured: item.isFeatured,
        displayOrder: item.displayOrder,
        publishDate: item.status === "published" ? new Date() : null,
      })
      .returning({ id: blogPosts.id });
    blogIds.push(row!.id);
  }

  const RESOURCES_SEED = [
    {
      legacyConvexId: "e2e_smoke_res_company",
      title: "Company Registration Guide",
      slug: "company-registration-guide",
      description:
        "Step-by-step overview of registering a private limited company in Nepal, including OCR filings and practical timelines.",
      category: "Guide",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      isGated: false,
      status: "published" as const,
      displayOrder: 1,
    },
    {
      legacyConvexId: "e2e_smoke_res_fdi",
      title: "FDI Checklist for Nepal",
      slug: "fdi-checklist-nepal",
      description:
        "A practical checklist for foreign direct investment approvals, sectoral restrictions, and documentation.",
      category: "Whitepaper",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      isGated: true,
      status: "published" as const,
      displayOrder: 2,
    },
    {
      legacyConvexId: "e2e_smoke_res_draft",
      title: "Draft Employment Handbook (Internal)",
      slug: "draft-employment-handbook",
      description: "Internal draft — should not appear on the public library.",
      category: "Guide",
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      isGated: false,
      status: "draft" as const,
      displayOrder: 99,
    },
  ];

  const resourceLegacyIds = RESOURCES_SEED.map((r) => r.legacyConvexId);
  await db.delete(resources).where(
    and(eq(resources.firmId, firm.id), inArray(resources.legacyConvexId, resourceLegacyIds)),
  );
  const resourceIds: string[] = [];
  for (const item of RESOURCES_SEED) {
    const [row] = await db
      .insert(resources)
      .values({
        firmId: firm.id,
        legacyConvexId: item.legacyConvexId,
        title: item.title,
        slug: item.slug,
        description: item.description,
        category: item.category,
        fileUrl: item.fileUrl,
        isGated: item.isGated,
        status: item.status,
        displayOrder: item.displayOrder,
        publishedDate: new Date().toISOString().slice(0, 10),
        downloads: 0,
      })
      .returning({ id: resources.id });
    resourceIds.push(row!.id);
  }

  await upsertSetting(firm.id, "about_page", DEFAULT_ABOUT_PAGE);
  await upsertSetting(firm.id, "urlRedirects", [
    { from: "/legacy-home", to: "/", permanent: true },
  ]);
  const { writeCmsRedirectsCache } = await import("../../src/server/cms/redirect-cache");
  writeCmsRedirectsCache([
    { from: "/legacy-home", to: "/", permanent: true },
  ]);

  return {
    firmId: firm.id,
    firmSlug: slug,
    newsId,
    navigationIds: navIds,
    practiceAreaIds,
    testimonialIds,
    resourceIds,
    blogIds,
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
