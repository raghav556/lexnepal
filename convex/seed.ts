import { mutation } from "./_generated/server";
import { requireRole } from "./lib/roles";

/** One-time seed for default firm + CMS content so public site is not empty */
export const seedDefaultFirm = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);

    let firm = (await ctx.db.query("firms").collect())[0];
    if (!firm) {
      const firmId = await ctx.db.insert("firms", {
        name: "Srimar Law",
        slug: "srimar-law",
        isActive: true,
      });
      firm = (await ctx.db.get(firmId))!;
    }

    const settings = [
      ["firmName", "Srimar Law"],
      ["email", "info@srimarlaw.com.np"],
      ["phone", "+977-1-4100000"],
      ["address", "Thapathali, Swet Binayak Marg, Kathmandu, Nepal"],
      ["seoTitleFormat", "Srimar Law | %s"],
      ["seoMetaDescription", "Full-service law firm in Kathmandu, Nepal."],
    ];
    for (const [key, value] of settings) {
      const existing = await ctx.db
        .query("cmsSettings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (!existing) await ctx.db.insert("cmsSettings", { key, value });
    }

    const areas = await ctx.db.query("practiceAreas").collect();
    if (areas.length === 0) {
      const defaults = [
        { title: "Corporate & Commercial", slug: "corporate", icon: "Briefcase", description: "Company formation, contracts, and compliance." },
        { title: "Litigation & Dispute Resolution", slug: "litigation", icon: "Scale", description: "Civil and commercial litigation across Nepal courts." },
        { title: "Family Law", slug: "family", icon: "Heart", description: "Divorce, custody, and family property matters." },
        { title: "Property & Real Estate", slug: "property", icon: "Home", description: "Title, transfer, and property disputes." },
      ];
      for (const a of defaults) {
        await ctx.db.insert("practiceAreas", { ...a, isActive: true });
      }
    }

    const nav = await ctx.db.query("navigation").collect();
    if (nav.length === 0) {
      const header = [
        { label: "Home", url: "/", order: 1 },
        { label: "About Us", url: "/about-us", order: 2 },
        { label: "Practice Areas", url: "/practice-areas", order: 3 },
        { label: "Our Team", url: "/lawyers", order: 4 },
        { label: "Blog", url: "/blog", order: 5 },
        { label: "Contact", url: "/contact", order: 6 },
      ];
      for (const item of header) {
        await ctx.db.insert("navigation", {
          ...item,
          location: "header",
          isActive: true,
        });
      }
    }

    const privacy = await ctx.db
      .query("legalPages")
      .withIndex("by_slug", (q) => q.eq("slug", "privacy-policy"))
      .first();
    if (!privacy) {
      await ctx.db.insert("legalPages", {
        slug: "privacy-policy",
        title: "Privacy Policy",
        content:
          "# Privacy Policy\n\nSrimar Law respects your privacy. We collect only information needed to provide legal services and improve our website. Contact info@srimarlaw.com.np for data requests.",
        updatedAt: new Date().toISOString(),
      });
    }
    const terms = await ctx.db
      .query("legalPages")
      .withIndex("by_slug", (q) => q.eq("slug", "terms"))
      .first();
    if (!terms) {
      await ctx.db.insert("legalPages", {
        slug: "terms",
        title: "Terms of Service",
        content:
          "# Terms of Service\n\nUse of this website and client portal is subject to engagement terms. Legal advice is provided only under a signed retainer. Governing law: Nepal.",
        updatedAt: new Date().toISOString(),
      });
    }

    const sops = await ctx.db.query("sopTemplates").collect();
    if (sops.length === 0) {
      const defaults = [
        {
          key: "new_case",
          label: "Litigation Setup (Firad Registration)",
          taskTitles: ["Draft Vakalatnama", "Prepare Firad Patra (Petition)", "Collect Client KYC & ID", "Pay Initial Court Dastur"],
          defaultPriority: "high" as const,
          practiceArea: "litigation",
        },
        {
          key: "hearing_prep",
          label: "Hearing Preparation (Bahas Prep)",
          taskTitles: ["Review opposing reply (Pratiuttar)", "Draft written arguments/notes", "Compile precedent case laws", "Client Briefing"],
          defaultPriority: "high" as const,
          practiceArea: "litigation",
        },
        {
          key: "company_incorporation",
          label: "Company Incorporation (ORC)",
          taskTitles: ["Draft MOA/AOA", "Name reservation at ORC", "PAN registration follow-up", "Share certificates issuance"],
          defaultPriority: "high" as const,
          practiceArea: "corporate",
        },
        {
          key: "property_due_diligence",
          label: "Property Due Diligence",
          taskTitles: ["Title search (Malpot)", "Check encumbrances", "Survey / boundary verification", "Draft sale deed review"],
          defaultPriority: "medium" as const,
          practiceArea: "property",
        },
        {
          key: "family_divorce",
          label: "Family — Divorce / Partition Prep",
          taskTitles: ["Collect marriage / citizenship docs", "Draft petition", "Asset inventory checklist", "Client counseling note"],
          defaultPriority: "medium" as const,
          practiceArea: "family",
        },
      ];
      for (const sop of defaults) {
        await ctx.db.insert("sopTemplates", sop);
      }
    }

    return { success: true, firmId: firm._id };
  },
});
