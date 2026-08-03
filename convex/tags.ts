import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission, requireFirmId } from "./lib/roles";

export const listTags = query({
  handler: async (ctx) => {
    const user = await requirePermission(ctx, "documents.read");
    const firmId = await requireFirmId(ctx, user);
    return await ctx.db.query("documentTags").withIndex("by_firm", (q) => q.eq("firmId", firmId)).collect();
  },
});

export const createTag = mutation({
  args: { name: v.string(), color: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "documents.upload");
    const firmId = await requireFirmId(ctx, user);
    
    // Check if tag already exists
    const existing = await ctx.db.query("documentTags")
      .withIndex("by_firm_name", q => q.eq("firmId", firmId).eq("name", args.name))
      .first();
      
    if (existing) return existing._id;
    
    return await ctx.db.insert("documentTags", {
      name: args.name,
      color: args.color || "#e5e7eb", // default gray
      firmId,
    });
  }
});

export const deleteTag = mutation({
  args: { tagId: v.id("documentTags") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "documents.delete");
    const firmId = await requireFirmId(ctx, user);
    const tag = await ctx.db.get(args.tagId);
    if (!tag || tag.firmId !== firmId) throw new Error("Tag not found");
    await ctx.db.delete(args.tagId);
  }
});
