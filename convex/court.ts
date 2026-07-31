import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuth } from "./lib/roles";

/**
 * Court cause-list (Pesi) — placeholder until official API/scrape is available.
 * Returns empty list; UI should allow manual hearing entry.
 */
export const getPesi = query({
  args: {
    dateBs: v.optional(v.string()),
    court: v.optional(v.string()),
  },
  handler: async (ctx) => {
    await requireAuth(ctx);
    return {
      available: false,
      message: "Automated Pesi sync is not connected. Enter hearings manually or import when available.",
      items: [] as any[],
    };
  },
});
