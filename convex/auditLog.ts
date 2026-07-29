import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole } from "./lib/roles.ts";

export const listAuditLog = query({
  args: {
    userId: v.optional(v.id("users")),
    resource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    if (args.userId) {
      return ctx.db.query("auditLog").withIndex("by_user", (q) => q.eq("userId", args.userId!)).order("desc").take(200);
    }
    if (args.resource) {
      return ctx.db.query("auditLog").withIndex("by_resource", (q) => q.eq("resource", args.resource!)).order("desc").take(200);
    }
    return ctx.db.query("auditLog").order("desc").take(200);
  },
});

export const writeAuditLog = mutation({
  args: {
    action: v.string(),
    resource: v.string(),
    resourceId: v.optional(v.string()),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    return ctx.db.insert("auditLog", { ...args, userId: user._id });
  },
});
