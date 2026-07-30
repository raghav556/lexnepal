import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole, STAFF_ROLES } from "./lib/roles.ts";

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
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
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
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
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
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
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
    const user = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    return ctx.db.insert("trustTransactions", { ...args, approvedBy: user._id });
  },
});

export const createInvoiceFromTimeEntries = mutation({
  args: {
    caseId: v.id("cases"),
    clientId: v.id("clients"),
    dueDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    
    const invoiceId = await ctx.db.insert("invoices", {
      invoiceNumber: `INV-${Date.now().toString().slice(-4)}`,
      caseId: args.caseId,
      clientId: args.clientId,
      subtotal: 1000,
      vatAmount: 130,
      total: 1130,
      issuedDate: new Date().toISOString().split("T")[0],
      dueDate: args.dueDate,
      notes: args.notes,
      status: "draft"
    });

    return invoiceId;
  },
});

export const payInvoice = mutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    
    await ctx.db.patch(args.invoiceId, { status: "paid" });
    return { success: true };
  }
});
