import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, requireAuth, STAFF_ROLES } from "./lib/roles";

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

/** Nepal payroll calculator: PF 10%+10%, SSF 3.33% employer, simplified tax bands */
export const generatePayroll = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    const users = await ctx.db.query("users").collect();
    const staff = users.filter(
      (u) => u.isActive && u.role !== "client" && (u.baseSalary || 0) > 0,
    );

    return staff.map((u) => {
      const gross = u.baseSalary || 0;
      const pfEmployee = Math.round(gross * 0.1);
      const pfEmployer = Math.round(gross * 0.1);
      const ssfEmployer = Math.round(gross * 0.0333);
      // Simplified progressive tax on taxable (gross - pfEmployee)
      const taxable = Math.max(0, gross - pfEmployee);
      let tax = 0;
      if (taxable > 500000) tax += (taxable - 500000) * 0.2;
      else if (taxable > 200000) tax += (taxable - 200000) * 0.1;
      tax = Math.round(tax);
      const net = gross - pfEmployee - tax;
      return {
        userId: u._id,
        name: u.name || "Staff",
        role: u.role,
        gross,
        pf: pfEmployee,
        pfEmployer,
        ssf: ssfEmployer,
        tax,
        net,
      };
    });
  },
});

export const setBaseSalary = mutation({
  args: {
    userId: v.id("users"),
    baseSalary: v.number(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.patch(args.userId, { baseSalary: args.baseSalary });
    return { success: true };
  },
});
