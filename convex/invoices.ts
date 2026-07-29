import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listInvoices = query({
  args: {
    caseId: v.optional(v.id("cases")),
    clientId: v.optional(v.id("clients")),
    status: v.optional(v.union(
      v.literal("draft"), v.literal("sent"), v.literal("paid"),
      v.literal("overdue"), v.literal("cancelled"),
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    if (args.caseId) {
      return ctx.db.query("invoices").withIndex("by_case", (q) => q.eq("caseId", args.caseId!)).collect();
    }
    if (args.clientId) {
      return ctx.db.query("invoices").withIndex("by_client", (q) => q.eq("clientId", args.clientId!)).collect();
    }
    return ctx.db.query("invoices").collect();
  },
});

export const getInvoice = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    return ctx.db.get(args.invoiceId);
  },
});

export const createInvoice = mutation({
  args: {
    invoiceNumber: v.string(),
    caseId: v.id("cases"),
    clientId: v.id("clients"),
    subtotal: v.number(),
    vatAmount: v.number(),
    total: v.number(),
    issuedDate: v.string(),
    dueDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    return ctx.db.insert("invoices", { ...args, status: "draft" });
  },
});

export const updateInvoiceStatus = mutation({
  args: {
    invoiceId: v.id("invoices"),
    status: v.union(
      v.literal("draft"), v.literal("sent"), v.literal("paid"),
      v.literal("overdue"), v.literal("cancelled"),
    ),
    paidDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const { invoiceId, ...updates } = args;
    await ctx.db.patch(invoiceId, updates);
  },
});

export const listLineItems = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    return ctx.db.query("invoiceLineItems").withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId)).collect();
  },
});

export const addLineItem = mutation({
  args: {
    invoiceId: v.id("invoices"),
    description: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    amount: v.number(),
    type: v.union(v.literal("time"), v.literal("fixed"), v.literal("expense")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    return ctx.db.insert("invoiceLineItems", args);
  },
});

export const listTrustTransactions = query({
  args: { clientId: v.optional(v.id("clients")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    if (args.clientId) {
      return ctx.db.query("trustTransactions").withIndex("by_client", (q) => q.eq("clientId", args.clientId!)).collect();
    }
    return ctx.db.query("trustTransactions").collect();
  },
});

export const createTrustTransaction = mutation({
  args: {
    clientId: v.id("clients"),
    caseId: v.optional(v.id("cases")),
    type: v.union(v.literal("receipt"), v.literal("disbursement")),
    amount: v.number(),
    description: v.string(),
    date: v.string(),
    balance: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    return ctx.db.insert("trustTransactions", { ...args, approvedBy: user._id });
  },
});
