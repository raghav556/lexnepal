import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole } from "./lib/roles";

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

export const getDocumentAuditLog = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    // Fetch all logs for this document, limit to 100 for now.
    // In a production app, we'd add an index on [resource, resourceId] for better performance.
    const logs = await ctx.db
      .query("auditLog")
      .withIndex("by_resource", (q) => q.eq("resource", "documents"))
      .order("desc")
      .take(1000);
      
    const docLogs = logs.filter(l => l.resourceId === args.documentId);
    
    // Enrich with user data
    return Promise.all(docLogs.map(async (log) => {
       const user = await ctx.db.get(log.userId);
       return {
         ...log,
         userName: user?.name || "System",
         userRole: user?.role || "System",
       }
    }));
  }
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
