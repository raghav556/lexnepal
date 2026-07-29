import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listTimeEntries = query({
  args: {
    caseId: v.optional(v.id("cases")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    if (args.caseId) {
      return ctx.db.query("timeEntries").withIndex("by_case", (q) => q.eq("caseId", args.caseId!)).collect();
    }
    if (args.userId) {
      return ctx.db.query("timeEntries").withIndex("by_user", (q) => q.eq("userId", args.userId!)).collect();
    }
    return ctx.db.query("timeEntries").collect();
  },
});

export const createTimeEntry = mutation({
  args: {
    caseId: v.id("cases"),
    description: v.string(),
    minutes: v.number(),
    isBillable: v.boolean(),
    date: v.string(),
    ratePerHour: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    return ctx.db.insert("timeEntries", { ...args, userId: user._id });
  },
});

export const deleteTimeEntry = mutation({
  args: { entryId: v.id("timeEntries") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    await ctx.db.delete(args.entryId);
  },
});
