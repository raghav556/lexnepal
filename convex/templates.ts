import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, isStaffOrAdmin } from "./lib/roles";

export const listTemplates = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    if (!isStaffOrAdmin(user.role)) {
      throw new Error("Only staff can access templates");
    }
    // Return all system templates and firm-specific templates (if we handled firmId)
    // For now, return all
    return await ctx.db.query("templates").order("desc").collect();
  },
});

export const getTemplate = query({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (!isStaffOrAdmin(user.role)) {
      throw new Error("Only staff can access templates");
    }
    return await ctx.db.get(args.id);
  },
});

export const createTemplate = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(v.literal("vakalatnama"), v.literal("firad_patra"), v.literal("jawab"), v.literal("prastab_patra"), v.literal("retainer"), v.literal("poa"), v.literal("contract"), v.literal("other")),
    htmlContent: v.string(),
    variables: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (!isStaffOrAdmin(user.role)) {
      throw new Error("Only staff can create templates");
    }
    
    return await ctx.db.insert("templates", {
      ...args,
      createdBy: user._id,
    });
  },
});

export const updateTemplate = mutation({
  args: {
    id: v.id("templates"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(v.literal("vakalatnama"), v.literal("firad_patra"), v.literal("jawab"), v.literal("prastab_patra"), v.literal("retainer"), v.literal("poa"), v.literal("contract"), v.literal("other")),
    htmlContent: v.string(),
    variables: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (!isStaffOrAdmin(user.role)) {
      throw new Error("Only staff can update templates");
    }
    
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
    return id;
  },
});

export const deleteTemplate = mutation({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (!isStaffOrAdmin(user.role)) {
      throw new Error("Only staff can delete templates");
    }
    
    await ctx.db.delete(args.id);
  },
});

export const seedTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    if (user.role !== "admin") throw new Error("Unauthorized");
    
    const existing = await ctx.db.query("templates").collect();
    if (existing.length > 0) return;
    
    const templates = [
      {
        title: "Standard Vakalatnama (Supreme Court)",
        description: "Standard power of attorney for representation in the Supreme Court.",
        category: "vakalatnama" as const,
        variables: ["client.name", "client.address", "lawyer.name", "lawyer.barNumber", "case.number", "today_bs"],
        htmlContent: `<h2 style="text-align: center;">श्री सर्वोच्च अदालतमा चढाएको वकालतनामा</h2><p>मुद्दा नं: <strong>{{case.number}}</strong></p><p>निवेदक: <strong>{{client.name}}</strong> (ठेगाना: {{client.address}})</p><p>म/हामीले यस मुद्दामा मेरो/हाम्रो तर्फबाट बहस पैरवी गर्न अधिवक्ता <strong>{{lawyer.name}}</strong> (प्रमाणपत्र नं: {{lawyer.barNumber}}) लाई नियुक्त गरेको छु/छौं।</p><p>मिति: {{today_bs}}</p>`,
      },
      {
        title: "Client Retainer Agreement",
        description: "General retainer agreement for new clients.",
        category: "retainer" as const,
        variables: ["client.name", "lawyer.name", "firm.name", "today_gregorian"],
        htmlContent: `<h2>Retainer Agreement</h2><p>This agreement is made on <strong>{{today_gregorian}}</strong> between <strong>{{client.name}}</strong> (Client) and <strong>{{lawyer.name}}</strong> of {{firm.name}} (Attorney).</p><p>The Client retains the Attorney to provide legal services...</p>`,
      }
    ];
    
    for (const t of templates) {
      await ctx.db.insert("templates", t);
    }
  }
});
