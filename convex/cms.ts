import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/roles";

// ----- SETTINGS -----

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const raw = await ctx.db.query("cmsSettings").collect();
    const settings: Record<string, any> = {};
    for (const r of raw) {
      settings[r.key] = r.value;
    }
    return settings;
  },
});

export const updateSettings = mutation({
  args: {
    settings: v.array(v.object({ key: v.string(), value: v.any() })),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    for (const setting of args.settings) {
      const existing = await ctx.db.query("cmsSettings").withIndex("by_key", (q) => q.eq("key", setting.key)).first();
      if (existing) {
        await ctx.db.patch(existing._id, { value: setting.value });
      } else {
        await ctx.db.insert("cmsSettings", { key: setting.key, value: setting.value });
      }
    }
    return { success: true };
  },
});

// ----- PRACTICE AREAS -----

export const listPracticeAreas = query({
  args: {
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("practiceAreas");
    const areas = await q.collect();
    if (args.isActive !== undefined) {
      return areas.filter(a => a.isActive === args.isActive);
    }
    return areas;
  },
});

export const createPracticeArea = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    icon: v.string(),
    slug: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    return ctx.db.insert("practiceAreas", args);
  },
});

export const updatePracticeArea = mutation({
  args: {
    id: v.id("practiceAreas"),
    title: v.string(),
    description: v.string(),
    icon: v.string(),
    slug: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
    return { success: true };
  },
});

export const deletePracticeArea = mutation({
  args: {
    id: v.id("practiceAreas"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// ----- BLOG POSTS -----

export const listBlogPosts = query({
  args: {
    status: v.optional(v.union(v.literal("published"), v.literal("draft"))),
  },
  handler: async (ctx, args) => {
    let q: any = ctx.db.query("blogPosts");
    if (args.status) {
      q = q.withIndex("by_status", (q: any) => q.eq("status", args.status as any));
    }
    const posts: any[] = await q.collect();
    // Sort by publishDate descending
    return posts.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
  },
});

export const createBlogPost = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    category: v.string(),
    excerpt: v.string(),
    content: v.string(),
    coverImageUrl: v.optional(v.string()),
    author: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
    publishDate: v.string(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    return ctx.db.insert("blogPosts", args);
  },
});

export const updateBlogPost = mutation({
  args: {
    id: v.id("blogPosts"),
    title: v.string(),
    slug: v.string(),
    category: v.string(),
    excerpt: v.string(),
    content: v.string(),
    coverImageUrl: v.optional(v.string()),
    author: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
    publishDate: v.string(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
    return { success: true };
  },
});

export const deleteBlogPost = mutation({
  args: {
    id: v.id("blogPosts"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// ----- CAREERS -----
export const listCareers = query({
  args: {
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let jobs = args.isActive !== undefined
      ? await ctx.db.query("careers").withIndex("by_status", (q) => q.eq("isActive", args.isActive!)).collect()
      : await ctx.db.query("careers").collect();
    return jobs.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
  },
});

export const getCareer = query({
  args: { id: v.id("careers") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const createCareer = mutation({
  args: {
    title: v.string(),
    department: v.string(),
    location: v.string(),
    type: v.union(v.literal("full_time"), v.literal("part_time"), v.literal("contract"), v.literal("internship")),
    description: v.string(),
    requirements: v.array(v.string()),
    isActive: v.boolean(),
    postedDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    return ctx.db.insert("careers", args);
  },
});

export const updateCareer = mutation({
  args: {
    id: v.id("careers"),
    title: v.string(),
    department: v.string(),
    location: v.string(),
    type: v.union(v.literal("full_time"), v.literal("part_time"), v.literal("contract"), v.literal("internship")),
    description: v.string(),
    requirements: v.array(v.string()),
    isActive: v.boolean(),
    postedDate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
    return { success: true };
  },
});

export const deleteCareer = mutation({
  args: { id: v.id("careers") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const listJobApplications = query({
  args: {
    jobId: v.optional(v.id("careers")),
    status: v.optional(v.union(v.literal("new"), v.literal("reviewed"), v.literal("interviewed"), v.literal("rejected"), v.literal("hired"))),
  },
  handler: async (ctx, args) => {
    let apps = args.jobId
      ? await ctx.db.query("jobApplications").withIndex("by_job", (q) => q.eq("jobId", args.jobId!)).collect()
      : args.status
        ? await ctx.db.query("jobApplications").withIndex("by_status", (q) => q.eq("status", args.status!)).collect()
        : await ctx.db.query("jobApplications").collect();

    const enriched = await Promise.all(
      apps.map(async (app) => {
        const job = await ctx.db.get(app.jobId);
        return { ...app, jobTitle: job?.title || "Unknown Job" };
      }),
    );

    return enriched.sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime());
  },
});

export const updateJobApplicationStatus = mutation({
  args: {
    id: v.id("jobApplications"),
    status: v.union(v.literal("new"), v.literal("reviewed"), v.literal("interviewed"), v.literal("rejected"), v.literal("hired")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.patch(args.id, { status: args.status });
    return { success: true };
  },
});

// ----- RESOURCES -----
export const listResources = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resources = args.category
      ? await ctx.db.query("resources").withIndex("by_category", (q) => q.eq("category", args.category!)).collect()
      : await ctx.db.query("resources").collect();
    return resources.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
  },
});

export const createResource = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    coverImageUrl: v.optional(v.string()),
    fileUrl: v.string(),
    isGated: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    return ctx.db.insert("resources", {
      ...args,
      downloads: 0,
      publishedDate: new Date().toISOString(),
    });
  },
});

export const updateResource = mutation({
  args: {
    id: v.id("resources"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    isGated: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return { success: true };
  },
});

export const deleteResource = mutation({
  args: { id: v.id("resources") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const incrementResourceDownload = mutation({
  args: { id: v.id("resources") },
  handler: async (ctx, args) => {
    const res = await ctx.db.get(args.id);
    if (!res) return;
    await ctx.db.patch(args.id, { downloads: res.downloads + 1 });
  },
});

// ----- NEWS & AWARDS -----
export const listNewsAndAwards = query({
  args: {
    type: v.optional(v.union(v.literal("award"), v.literal("press_release"), v.literal("firm_news"))),
  },
  handler: async (ctx, args) => {
    const news = args.type
      ? await ctx.db.query("newsAndAwards").withIndex("by_type", (q) => q.eq("type", args.type!)).collect()
      : await ctx.db.query("newsAndAwards").collect();
    return news.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
});

export const createNewsAndAward = mutation({
  args: {
    title: v.string(),
    excerpt: v.string(),
    content: v.string(),
    date: v.string(),
    type: v.union(v.literal("award"), v.literal("press_release"), v.literal("firm_news")),
    linkUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    return ctx.db.insert("newsAndAwards", args);
  },
});

export const updateNewsAndAward = mutation({
  args: {
    id: v.id("newsAndAwards"),
    title: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    content: v.optional(v.string()),
    date: v.optional(v.string()),
    type: v.optional(v.union(v.literal("award"), v.literal("press_release"), v.literal("firm_news"))),
    linkUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return { success: true };
  },
});

export const deleteNewsAndAward = mutation({
  args: { id: v.id("newsAndAwards") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const createJobApplication = mutation({
  args: {
    jobId: v.id("careers"),
    applicantName: v.string(),
    email: v.string(),
    phone: v.string(),
    resumeUrl: v.optional(v.string()),
    coverLetter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("jobApplications", {
      ...args,
      status: "new",
      appliedDate: new Date().toISOString(),
    });
  },
});

export const getBlogPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("blogPosts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const listPublicTeam = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.filter(
      (u) =>
        u.isPublicFacing &&
        u.isActive &&
        u.role !== "client",
    );
  },
});

export const listTestimonials = query({
  args: { isApproved: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    let rows = await ctx.db.query("testimonials").collect();
    if (args.isApproved !== undefined) {
      rows = rows.filter((t) => t.isApproved === args.isApproved);
    }
    return rows;
  },
});

export const createTestimonial = mutation({
  args: {
    clientName: v.string(),
    company: v.optional(v.string()),
    quote: v.string(),
    rating: v.optional(v.number()),
    isApproved: v.boolean(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    return ctx.db.insert("testimonials", args);
  },
});

export const updateTestimonial = mutation({
  args: {
    id: v.id("testimonials"),
    clientName: v.optional(v.string()),
    company: v.optional(v.string()),
    quote: v.optional(v.string()),
    rating: v.optional(v.number()),
    isApproved: v.optional(v.boolean()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return { success: true };
  },
});

export const deleteTestimonial = mutation({
  args: { id: v.id("testimonials") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const getLegalPage = query({
  args: { slug: v.union(v.literal("privacy-policy"), v.literal("terms")) },
  handler: async (ctx, args) => {
    return ctx.db
      .query("legalPages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const upsertLegalPage = mutation({
  args: {
    slug: v.union(v.literal("privacy-policy"), v.literal("terms")),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const existing = await ctx.db
      .query("legalPages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    const updatedAt = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, { title: args.title, content: args.content, updatedAt });
      return existing._id;
    }
    return ctx.db.insert("legalPages", { ...args, updatedAt });
  },
});

export const subscribeNewsletter = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { isActive: true });
      return { success: true, alreadySubscribed: true };
    }
    await ctx.db.insert("newsletterSubscribers", {
      email,
      subscribedAt: new Date().toISOString(),
      isActive: true,
    });
    await ctx.db.insert("leads", {
      fullName: email,
      email,
      source: "newsletter",
      status: "new",
      message: "Newsletter subscription",
    });
    return { success: true, alreadySubscribed: false };
  },
});

// ----- NAVIGATION & MENUS -----
export const listNavigationLinks = query({
  args: {
    location: v.optional(v.union(v.literal("header"), v.literal("footer_col_1"), v.literal("footer_col_2"))),
  },
  handler: async (ctx, args) => {
    const links = args.location
      ? await ctx.db.query("navigation").withIndex("by_location", (q) => q.eq("location", args.location!)).collect()
      : await ctx.db.query("navigation").collect();
    return links.sort((a, b) => a.order - b.order);
  },
});

export const createNavigationLink = mutation({
  args: {
    label: v.string(),
    url: v.string(),
    location: v.union(v.literal("header"), v.literal("footer_col_1"), v.literal("footer_col_2")),
    order: v.number(),
    isActive: v.boolean(),
    parentId: v.optional(v.id("navigation")),
    openInNewTab: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    return await ctx.db.insert("navigation", args);
  },
});

export const updateNavigationLink = mutation({
  args: {
    id: v.id("navigation"),
    label: v.optional(v.string()),
    url: v.optional(v.string()),
    location: v.optional(v.union(v.literal("header"), v.literal("footer_col_1"), v.literal("footer_col_2"))),
    order: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    parentId: v.optional(v.id("navigation")),
    openInNewTab: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return { success: true };
  },
});

export const deleteNavigationLink = mutation({
  args: {
    id: v.id("navigation"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    // Delete children first
    const children = await ctx.db.query("navigation").withIndex("by_parent", q => q.eq("parentId", args.id)).collect();
    for (const child of children) {
      await ctx.db.delete(child._id);
    }
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const reorderNavigationLinks = mutation({
  args: {
    id1: v.id("navigation"),
    order1: v.number(),
    id2: v.id("navigation"),
    order2: v.number(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.patch(args.id1, { order: args.order1 });
    await ctx.db.patch(args.id2, { order: args.order2 });
    return { success: true };
  },
});

