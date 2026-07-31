import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/roles";

const DEFAULTS = {
  defaultHourlyRate: "5000",
  vatRate: "13",
  invoicePaymentTerms: "14",
  defaultLanguage: "en",
  clientPortalEnabled: true,
  onlineBookingEnabled: true,
  integrations: {
    smsProvider: "none",
    smsKeys: { token: "", accountSid: "", authToken: "" },
    activePayments: ["bank_transfer"] as string[],
    paymentKeys: {
      esewaMerchantId: "",
      khaltiSecretKey: "",
      bankName: "",
      accountName: "",
      accountNumber: "",
      branch: "",
    },
    videoProvider: "google_meet",
    videoKeys: { clientId: "", clientSecret: "" },
    emailProvider: "none",
    emailKeys: { apiKey: "", fromEmail: "" },
  },
};

export const getSystemSettings = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("firmSettings").collect();
    if (rows.length === 0) return DEFAULTS;
    const map: Record<string, any> = {};
    for (const r of rows) map[r.key] = r.value;
    return {
      ...DEFAULTS,
      ...map,
      integrations: {
        ...DEFAULTS.integrations,
        ...(map.integrations || {}),
      },
    };
  },
});

export const updateSystemSettings = mutation({
  args: {
    defaultHourlyRate: v.optional(v.string()),
    vatRate: v.optional(v.string()),
    invoicePaymentTerms: v.optional(v.string()),
    defaultLanguage: v.optional(v.string()),
    clientPortalEnabled: v.optional(v.boolean()),
    onlineBookingEnabled: v.optional(v.boolean()),
    integrations: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    for (const [key, value] of Object.entries(args)) {
      if (value === undefined) continue;
      const existing = await ctx.db
        .query("firmSettings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { value });
      } else {
        await ctx.db.insert("firmSettings", { key, value });
      }
    }
    return { success: true };
  },
});
