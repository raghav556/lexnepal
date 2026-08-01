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

    // Determine caller's role
    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    const result = await ctx.db
      .query("messages")
      .withIndex("by_case", (q) => q.eq("caseId", args.caseId))
      .order("desc")
      .paginate(args.paginationOpts);

    // If caller is a client, filter out internal staff messages
    if (caller && caller.role === "client") {
      return {
        ...result,
        page: result.page.filter((msg) => !msg.isInternal),
      };
    }

    return result;
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
    const msgId = await ctx.db.insert("messages", {
      ...args,
      senderId: user._id,
      readBy: [user._id],
    });

    // Auto-create notification for the other party (non-internal messages only)
    if (!args.isInternal) {
      const caseData = await ctx.db.get(args.caseId);
      if (caseData) {
        const isStaff = ([...STAFF_ROLES, "admin"] as string[]).includes(user.role);
        if (isStaff) {
          // Staff sent → notify the client (find client's userId)
          const client = await ctx.db.get(caseData.clientId);
          if (client?.userId) {
            await ctx.db.insert("notifications", {
              userId: client.userId,
              title: "New Message",
              body: `${user.name} sent you a message regarding ${caseData.title}.`,
              type: "message" as const,
              relatedId: args.caseId,
              link: "/client/messages",
              isRead: false,
            });
          }
        } else {
          // Client sent → notify the assigned lawyer
          await ctx.db.insert("notifications", {
            userId: caseData.assignedLawyerId,
            title: "New Client Message",
            body: `${user.name} sent a message regarding ${caseData.title}.`,
            type: "message" as const,
            relatedId: args.caseId,
            link: `/staff/cases/${args.caseId}`,
            isRead: false,
          });
        }
      }
    }

    return msgId;
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
