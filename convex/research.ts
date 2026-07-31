import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole, STAFF_ROLES } from "./lib/roles";

const category = v.union(
  v.literal("supreme_court"), v.literal("high_court"), v.literal("district_court"),
  v.literal("commentary"), v.literal("procedure"), v.literal("template_research"),
);

export const listNotes = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const rows = await ctx.db.query("researchNotes").collect();
    return rows.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const createNote = mutation({
  args: {
    title: v.string(),
    category,
    tags: v.array(v.string()),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    return ctx.db.insert("researchNotes", {
      ...args,
      authorId: user._id,
    });
  },
});

export const updateNote = mutation({
  args: {
    id: v.id("researchNotes"),
    title: v.optional(v.string()),
    category: v.optional(category),
    tags: v.optional(v.array(v.string())),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return { success: true };
  },
});

export const deleteNote = mutation({
  args: { id: v.id("researchNotes") },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
