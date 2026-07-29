import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole, STAFF_ROLES } from "./lib/roles.ts";

export const listTasks = query({
  args: {
    caseId: v.optional(v.id("cases")),
    assignedTo: v.optional(v.id("users")),
    status: v.optional(v.union(
      v.literal("todo"), v.literal("in_progress"), v.literal("done"), v.literal("cancelled"),
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    if (args.caseId) {
      return ctx.db.query("tasks").withIndex("by_case", (q) => q.eq("caseId", args.caseId!)).collect();
    }
    if (args.assignedTo) {
      return ctx.db.query("tasks").withIndex("by_assignee", (q) => q.eq("assignedTo", args.assignedTo!)).collect();
    }
    return ctx.db.query("tasks").collect();
  },
});

export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    caseId: v.optional(v.id("cases")),
    assignedTo: v.id("users"),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    dueDate: v.optional(v.string()),
    dueDateBs: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    return ctx.db.insert("tasks", {
      ...args,
      createdBy: user._id,
      status: "todo",
      isRecurring: false,
    });
  },
});

export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("todo"), v.literal("in_progress"), v.literal("done"), v.literal("cancelled"),
    )),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"))),
    assignedTo: v.optional(v.id("users")),
    dueDate: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const { taskId, ...updates } = args;
    await ctx.db.patch(taskId, updates);
  },
});

export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    await ctx.db.delete(args.taskId);
  },
});
