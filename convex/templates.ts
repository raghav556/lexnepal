import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole, STAFF_ROLES } from "./lib/roles";

export const listTemplates = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const rows = await ctx.db.query("documentTemplates").collect();
    return rows.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const createTemplate = mutation({
  args: {
    title: v.string(),
    type: v.union(
      v.literal("retainer"), v.literal("petition"), v.literal("nda"), v.literal("general"),
    ),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    return ctx.db.insert("documentTemplates", args);
  },
});

export const updateTemplate = mutation({
  args: {
    id: v.id("documentTemplates"),
    title: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("retainer"), v.literal("petition"), v.literal("nda"), v.literal("general"),
    )),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return { success: true };
  },
});

export const deleteTemplate = mutation({
  args: { id: v.id("documentTemplates") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
