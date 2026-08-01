import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/roles";

export const listTags = query({
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("documentTags").collect();
  },
});

export const createTag = mutation({
  args: { name: v.string(), color: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    // Check if tag already exists
    const existing = await ctx.db.query("documentTags")
      .withIndex("by_name", q => q.eq("name", args.name))
      .first();
      
    if (existing) return existing._id;
    
    return await ctx.db.insert("documentTags", {
      name: args.name,
      color: args.color || "#e5e7eb" // default gray
    });
  }
});

export const deleteTag = mutation({
  args: { tagId: v.id("documentTags") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.delete(args.tagId);
  }
});
