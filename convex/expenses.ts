import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole, STAFF_ROLES } from "./lib/roles";

const category = v.union(
  v.literal("office_rent"), v.literal("utilities"), v.literal("court_fees"),
  v.literal("courier"), v.literal("printing"), v.literal("travel"),
  v.literal("supplies"), v.literal("software"), v.literal("other"),
);

export const list = query({
  args: {
    category: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    let rows = await ctx.db.query("expenses").collect();
    if (args.category && args.category !== "all") {
      rows = rows.filter((e) => e.category === args.category);
    }
    if (args.status && args.status !== "all") {
      rows = rows.filter((e) => e.status === args.status);
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const rows = await ctx.db.query("expenses").collect();
    const total = rows.reduce((s, e) => s + e.amount, 0);
    const approved = rows.filter((e) => e.status === "approved").reduce((s, e) => s + e.amount, 0);
    const pending = rows.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0);
    const caseLinked = rows.filter((e) => !!e.caseId).reduce((s, e) => s + e.amount, 0);
    const byCategory: Record<string, number> = {};
    rows.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    return {
      total,
      approved,
      pending,
      caseLinked,
      byCategory,
      count: rows.length,
      pendingCount: rows.filter((e) => e.status === "pending").length,
    };
  },
});

export const create = mutation({
  args: {
    description: v.string(),
    category,
    amount: v.number(),
    caseId: v.optional(v.id("cases")),
    receiptId: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    return ctx.db.insert("expenses", {
      ...args,
      submittedBy: user._id,
      status: "pending",
    });
  },
});

export const approve = mutation({
  args: {
    id: v.id("expenses"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    approvedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin", "partner"]);
    await ctx.db.patch(args.id, {
      status: args.status,
      approvedBy: args.approvedBy || user._id,
    });
    return { success: true };
  },
});

export const remove = mutation({
  args: { id: v.id("expenses") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "partner"]);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
