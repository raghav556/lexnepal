import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, STAFF_ROLES } from "./lib/roles.ts";

export const updateLead = mutation({
  args: {
    leadId: v.id("leads"),
    status: v.optional(v.union(
      v.literal("new"), v.literal("contacted"),
      v.literal("consultation_scheduled"), v.literal("converted"), v.literal("lost"),
    )),
    assignedTo: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const { leadId, ...updates } = args;
    await ctx.db.patch(leadId, updates);
  },
});

export const createLead = mutation({
  args: {
    fullName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    practiceAreaInterest: v.optional(v.string()),
    message: v.optional(v.string()),
    source: v.union(
      v.literal("website"), v.literal("referral"), v.literal("walk_in"),
      v.literal("phone"), v.literal("social"),
    ),
  },
  handler: async (ctx, args) => {
    // Public: no auth required for website form submissions
    return ctx.db.insert("leads", { ...args, status: "new" });
  },
});

export const listLeads = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    return ctx.db.query("leads").collect();
  },
});
