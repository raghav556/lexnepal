import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const logSearch = mutation({
  args: {
    searchQuery: v.string(),
    hitsCount: v.number(),
    runByName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    // Allow unauthenticated for now if needed, or link to user
    let runBy = undefined;
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
      if (user) {
        runBy = user._id;
      }
    }

    const checkId = await ctx.db.insert("conflictChecks", {
      searchQuery: args.searchQuery,
      hitsCount: args.hitsCount,
      status: args.hitsCount === 0 ? "cleared" : "pending",
      runBy: runBy,
      runByName: identity?.name || args.runByName || "Admin User",
      timestamp: new Date().toISOString(),
    });

    return checkId;
  },
});

export const updateStatus = mutation({
  args: {
    checkId: v.id("conflictChecks"),
    status: v.union(v.literal("cleared"), v.literal("conflict")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.checkId, {
      status: args.status,
      notes: args.notes,
    });
  },
});

export const listRecentChecks = query({
  args: {},
  handler: async (ctx) => {
    const checks = await ctx.db
      .query("conflictChecks")
      .order("desc")
      .take(50);
    return checks;
  },
});
