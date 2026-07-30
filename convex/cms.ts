import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/roles.ts";

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
    excerpt: v.string(),
    content: v.string(),
    slug: v.string(),
    author: v.string(),
    publishDate: v.string(),
    status: v.union(v.literal("published"), v.literal("draft")),
    imageUrl: v.optional(v.string()),
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
    excerpt: v.string(),
    content: v.string(),
    slug: v.string(),
    author: v.string(),
    publishDate: v.string(),
    status: v.union(v.literal("published"), v.literal("draft")),
    imageUrl: v.optional(v.string()),
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
    let q = ctx.db.query("careers");
    if (args.isActive !== undefined) {
      q = q.withIndex("by_status", (q) => q.eq("isActive", args.isActive!));
    }
    const jobs = await q.collect();
    return jobs.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
  },
});

export const getCareer = query({
  args: { id: v.id("careers") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

// ----- RESOURCES -----
export const listResources = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("resources");
    if (args.category) {
      q = q.withIndex("by_category", (q) => q.eq("category", args.category!));
    }
    const res = await q.collect();
    return res.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
  },
});

// ----- NEWS & AWARDS -----
export const listNewsAndAwards = query({
  args: {
    type: v.optional(v.union(v.literal("award"), v.literal("press_release"), v.literal("firm_news"))),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("newsAndAwards");
    if (args.type) {
      q = q.withIndex("by_type", (q) => q.eq("type", args.type!));
    }
    const news = await q.collect();
    return news.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
});
