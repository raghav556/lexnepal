import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole, STAFF_ROLES } from "./lib/roles";
import { paginationOptsValidator } from "convex/server";

export const listMessages = query({
  args: {
    caseId: v.id("cases"),
    isInternal: v.optional(v.boolean()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    return ctx.db
      .query("messages")
      .withIndex("by_case", (q) => q.eq("caseId", args.caseId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const sendMessage = mutation({
  args: {
    caseId: v.id("cases"),
    content: v.string(),
    isInternal: v.boolean(),
    attachmentIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    // Internal messages are staff/admin only
    if (args.isInternal) {
      if (!([...STAFF_ROLES, "admin"] as string[]).includes(user.role)) {
        throw new ConvexError({ code: "FORBIDDEN", message: "Only staff may send internal messages" });
      }
    }
    return ctx.db.insert("messages", {
      ...args,
      senderId: user._id,
      readBy: [user._id],
    });
  },
});

export const markMessagesRead = mutation({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const unread = await ctx.db
      .query("messages")
      .withIndex("by_case", (q) => q.eq("caseId", args.caseId))
      .collect();
    for (const msg of unread) {
      if (!msg.readBy.includes(user._id)) {
        await ctx.db.patch(msg._id, { readBy: [...msg.readBy, user._id] });
      }
    }
  },
});
