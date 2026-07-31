import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole, STAFF_ROLES } from "./lib/roles";

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
    timeEntryIds: v.optional(v.array(v.id("timeEntries"))),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);

    let entries = await ctx.db
      .query("timeEntries")
      .withIndex("by_case", (q) => q.eq("caseId", args.caseId))
      .collect();
    entries = entries.filter((e) => e.isBillable && !e.invoiceId);
    if (args.timeEntryIds?.length) {
      const set = new Set(args.timeEntryIds);
      entries = entries.filter((e) => set.has(e._id));
    }

    const subtotal = entries.reduce(
      (s, e) => s + (e.minutes / 60) * e.ratePerHour,
      0,
    );
    const vatAmount = Math.round(subtotal * 0.13 * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;

    const invoiceId = await ctx.db.insert("invoices", {
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      caseId: args.caseId,
      clientId: args.clientId,
      subtotal,
      vatAmount,
      total,
      issuedDate: new Date().toISOString().split("T")[0],
      dueDate: args.dueDate,
      notes: args.notes,
      status: "draft",
    });

    for (const e of entries) {
      await ctx.db.insert("invoiceLineItems", {
        invoiceId,
        description: e.description,
        quantity: Math.round((e.minutes / 60) * 100) / 100,
        unitPrice: e.ratePerHour,
        amount: Math.round((e.minutes / 60) * e.ratePerHour * 100) / 100,
        type: "time",
      });
      await ctx.db.patch(e._id, { invoiceId });
    }

    return invoiceId;
  },
});

export const payInvoice = mutation({
  args: {
    invoiceId: v.id("invoices"),
    gateway: v.optional(v.union(
      v.literal("esewa"), v.literal("khalti"), v.literal("connectips"),
      v.literal("bank_transfer"), v.literal("cash"),
    )),
    referenceNumber: v.optional(v.string()),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");

    const paidAt = new Date().toISOString();
    await ctx.db.patch(args.invoiceId, { status: "paid", paidDate: paidAt.slice(0, 10) });

    const paymentId = await ctx.db.insert("payments", {
      invoiceId: args.invoiceId,
      clientId: invoice.clientId,
      amount: args.amount ?? invoice.total,
      gateway: args.gateway ?? "bank_transfer",
      referenceNumber: args.referenceNumber,
      status: "completed",
      paidAt,
    });

    // Notify assigned lawyer if possible
    const matter = await ctx.db.get(invoice.caseId);
    if (matter) {
      await ctx.db.insert("notifications", {
        userId: matter.assignedLawyerId,
        title: "Payment received",
        body: `Invoice ${invoice.invoiceNumber} marked paid (${args.gateway || "bank_transfer"}).`,
        type: "payment_received",
        relatedId: args.invoiceId,
        isRead: false,
      });
    }

    return { success: true, paymentId };
  },
});

export const initiateGatewayPayment = mutation({
  args: {
    invoiceId: v.id("invoices"),
    gateway: v.union(v.literal("esewa"), v.literal("khalti"), v.literal("connectips")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");

    const paymentId = await ctx.db.insert("payments", {
      invoiceId: args.invoiceId,
      clientId: invoice.clientId,
      amount: invoice.total,
      gateway: args.gateway,
      status: "pending",
      referenceNumber: `PEND-${Date.now()}`,
    });

    // Return payload for client redirect (sandbox-style until merchant keys wired)
    return {
      paymentId,
      gateway: args.gateway,
      amount: invoice.total,
      invoiceNumber: invoice.invoiceNumber,
      // Client should complete via gateway then call payInvoice with reference
      nextStep: "redirect_or_confirm",
    };
  },
});
