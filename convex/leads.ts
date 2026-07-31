import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, STAFF_ROLES } from "./lib/roles";

export const updateLead = mutation({
  args: {
    leadId: v.id("leads"),
    status: v.optional(v.union(
      v.literal("new"), v.literal("contacted"),
      v.literal("consultation_scheduled"), v.literal("converted"), v.literal("lost"),
    )),
    assignedTo: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const { leadId, ...updates } = args;
    await ctx.db.patch(leadId, updates);
  },
});

export const createLead = mutation({
  args: {
    fullName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    practiceAreaInterest: v.optional(v.string()),
    message: v.optional(v.string()),
    source: v.union(
      v.literal("website"), v.literal("referral"), v.literal("walk_in"),
      v.literal("phone"), v.literal("social"), v.literal("newsletter"),
    ),
  },
  handler: async (ctx, args) => {
    // Public: no auth required for website form submissions
    return ctx.db.insert("leads", { ...args, status: "new" });
  },
});

export const generateIntakeLink = mutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const token = `intake_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    await ctx.db.patch(args.leadId, { intakeToken: token, intakeSubmitted: false });
    return { token, url: `/intake/${token}` };
  },
});

export const getIntakeByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const lead = await ctx.db
      .query("leads")
      .withIndex("by_intake_token", (q) => q.eq("intakeToken", args.token))
      .first();
    if (!lead) return null;
    return {
      _id: lead._id,
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      practiceAreaInterest: lead.practiceAreaInterest,
      intakeSubmitted: lead.intakeSubmitted ?? false,
    };
  },
});

export const submitIntake = mutation({
  args: {
    token: v.string(),
    fullName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    citizenshipNo: v.optional(v.string()),
    practiceArea: v.optional(v.string()),
    caseDescription: v.optional(v.string()),
    documentStorageIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db
      .query("leads")
      .withIndex("by_intake_token", (q) => q.eq("intakeToken", args.token))
      .first();
    if (!lead) throw new ConvexError("Invalid or expired intake link");
    if (lead.intakeSubmitted) throw new ConvexError("Intake already submitted");

    await ctx.db.patch(lead._id, {
      fullName: args.fullName,
      phone: args.phone,
      email: args.email,
      practiceAreaInterest: args.practiceArea || lead.practiceAreaInterest,
      message: args.caseDescription || lead.message,
      notes: [
        lead.notes,
        args.address ? `Address: ${args.address}` : null,
        args.citizenshipNo ? `Citizenship: ${args.citizenshipNo}` : null,
        args.documentStorageIds?.length
          ? `Docs: ${args.documentStorageIds.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
      intakeSubmitted: true,
      status: "contacted",
    });
    return { success: true, leadId: lead._id };
  },
});

export const convertToClient = mutation({
  args: {
    leadId: v.id("leads"),
    type: v.union(v.literal("individual"), v.literal("corporate")),
    companyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new ConvexError("Lead not found");

    const clientId = await ctx.db.insert("clients", {
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      type: args.type,
      companyName: args.companyName,
      kycStatus: "pending",
      isActive: true,
      notes: "Converted from lead",
    });

    await ctx.db.patch(args.leadId, { status: "converted", convertedClientId: clientId });

    return { clientId };
  },
});

export const listLeads = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    return ctx.db.query("leads").collect();
  },
});
