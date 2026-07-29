import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listCases = query({
  args: {
    status: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    lawyerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const q = ctx.db.query("cases");
    if (args.lawyerId) {
      return q.withIndex("by_lawyer", (idx) => idx.eq("assignedLawyerId", args.lawyerId!)).collect();
    }
    if (args.clientId) {
      return q.withIndex("by_client", (idx) => idx.eq("clientId", args.clientId!)).collect();
    }
    return q.collect();
  },
});

export const getCase = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    return ctx.db.get(args.caseId);
  },
});

export const createCase = mutation({
  args: {
    caseNumber: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    practiceArea: v.string(),
    clientId: v.id("clients"),
    assignedLawyerId: v.id("users"),
    teamMemberIds: v.array(v.id("users")),
    court: v.optional(v.string()),
    judge: v.optional(v.string()),
    opposingCounsel: v.optional(v.string()),
    filingDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    return ctx.db.insert("cases", {
      ...args,
      status: "active",
      conflictChecked: false,
    });
  },
});

export const updateCase = mutation({
  args: {
    caseId: v.id("cases"),
    title: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("inquiry"), v.literal("active"), v.literal("on_hold"),
      v.literal("closed_won"), v.literal("closed_lost"),
    )),
    court: v.optional(v.string()),
    judge: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const { caseId, ...updates } = args;
    await ctx.db.patch(caseId, updates);
  },
});
