import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, requireAuth, STAFF_ROLES } from "./lib/roles.ts";

export const listAttendance = query({
  args: {
    userId: v.optional(v.id("users")),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    if (args.userId) {
      return ctx.db.query("attendance").withIndex("by_user", (q) => q.eq("userId", args.userId!)).collect();
    }
    if (args.date) {
      return ctx.db.query("attendance").withIndex("by_date", (q) => q.eq("date", args.date!)).collect();
    }
    return ctx.db.query("attendance").collect();
  },
});

export const upsertAttendance = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    clockIn: v.optional(v.string()),
    clockOut: v.optional(v.string()),
    status: v.union(
      v.literal("present"), v.literal("absent"), v.literal("half_day"), v.literal("leave"),
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { clockIn: args.clockIn, clockOut: args.clockOut, status: args.status });
      return existing._id;
    }
    return ctx.db.insert("attendance", args);
  },
});

export const listLeaveRequests = query({
  args: {
    userId: v.optional(v.id("users")),
    status: v.optional(v.union(
      v.literal("pending"), v.literal("approved"), v.literal("rejected"),
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    if (args.userId) {
      return ctx.db.query("leaveRequests").withIndex("by_user", (q) => q.eq("userId", args.userId!)).collect();
    }
    if (args.status) {
      return ctx.db.query("leaveRequests").withIndex("by_status", (q) => q.eq("status", args.status!)).collect();
    }
    return ctx.db.query("leaveRequests").collect();
  },
});

export const createLeaveRequest = mutation({
  args: {
    type: v.union(
      v.literal("annual"), v.literal("sick"), v.literal("maternity"),
      v.literal("paternity"), v.literal("unpaid"),
    ),
    fromDate: v.string(),
    toDate: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    return ctx.db.insert("leaveRequests", { ...args, userId: user._id, status: "pending" });
  },
});

export const reviewLeaveRequest = mutation({
  args: {
    leaveRequestId: v.id("leaveRequests"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin"]);
    await ctx.db.patch(args.leaveRequestId, {
      status: args.status,
      reviewedBy: reviewer._id,
    });
  },
});
