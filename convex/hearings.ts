import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, STAFF_ROLES } from "./lib/roles.ts";

export const listHearings = query({
  args: { caseId: v.optional(v.id("cases")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    if (args.caseId) {
      return ctx.db.query("hearings").withIndex("by_case", (q) => q.eq("caseId", args.caseId!)).collect();
    }
    return ctx.db.query("hearings").order("asc").collect();
  },
});

export const createHearing = mutation({
  args: {
    caseId: v.id("cases"),
    court: v.string(),
    judge: v.optional(v.string()),
    dateGregorian: v.string(),
    dateBs: v.string(),
    time: v.optional(v.string()),
    purpose: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    return ctx.db.insert("hearings", { ...args, status: "scheduled" });
  },
});

export const updateHearing = mutation({
  args: {
    hearingId: v.id("hearings"),
    outcome: v.optional(v.string()),
    nextDateGregorian: v.optional(v.string()),
    nextDateBs: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("scheduled"), v.literal("completed"),
      v.literal("adjourned"), v.literal("cancelled"),
    )),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const { hearingId, ...updates } = args;
    await ctx.db.patch(hearingId, updates);
  },
});
