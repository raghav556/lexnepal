import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, requireAuth, STAFF_ROLES } from "./lib/roles";

export const listCases = query({
  args: {
    status: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    lawyerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    let rows = await ctx.db.query("cases").collect();

    if (args.lawyerId) {
      rows = rows.filter((c) => c.assignedLawyerId === args.lawyerId);
    }
    if (args.clientId) {
      rows = rows.filter((c) => c.clientId === args.clientId);
    }

    // RBAC: associates/paralegals/interns only see assigned matters; partners/admin see all
    const elevated = user.role === "admin" || user.role === "partner" || user.role === "senior_associate";
    if (user.role === "client") {
      const client = await ctx.db
        .query("clients")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      rows = client ? rows.filter((c) => c.clientId === client._id) : [];
    } else if (!elevated) {
      rows = rows.filter(
        (c) =>
          c.assignedLawyerId === user._id ||
          c.teamMemberIds.includes(user._id),
      );
    }

    if (args.status) {
      rows = rows.filter((c) => c.status === args.status);
    }
    return rows;
  },
});

export const getCase = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    return ctx.db.get(args.caseId);
  },
});

export const getCaseWithDetails = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    const c = await ctx.db.get(args.caseId);
    if (!c) return null;
    const client = await ctx.db.get(c.clientId);
    const lawyer = await ctx.db.get(c.assignedLawyerId);
    return { ...c, client, lawyer };
  },
});

export const createCase = mutation({
  args: {
    caseNumber: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    practiceArea: v.string(),
    clientId: v.id("clients"),
    assignedLawyerId: v.id("users"),
    teamMemberIds: v.array(v.id("users")),
    court: v.optional(v.string()),
    judge: v.optional(v.string()),
    opposingCounsel: v.optional(v.string()),
    filingDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    return ctx.db.insert("cases", {
      ...args,
      status: "active",
      conflictChecked: false,
    });
  },
});

export const updateCase = mutation({
  args: {
    caseId: v.id("cases"),
    title: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("inquiry"), v.literal("active"), v.literal("on_hold"),
      v.literal("closed_won"), v.literal("closed_lost"),
    )),
    court: v.optional(v.string()),
    judge: v.optional(v.string()),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    opposingCounsel: v.optional(v.string()),
    conflictChecked: v.optional(v.boolean()),
    conflictClearedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const { caseId, notes, ...rest } = args;
    const updates: Record<string, unknown> = { ...rest };
    // UI historically sent "notes"; schema field is description
    if (notes !== undefined) updates.description = notes;
    delete updates.caseId;
    await ctx.db.patch(caseId, updates);
  },
});

export const checkConflict = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const q = args.query.trim().toLowerCase();
    if (!q) return { hits: [] as any[] };
    const clients = await ctx.db.query("clients").collect();
    const cases = await ctx.db.query("cases").collect();
    const hits: any[] = [];
    for (const c of clients) {
      if (
        c.fullName.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q))
      ) {
        hits.push({ type: "client", id: c._id, name: c.fullName, detail: c.companyName || c.email });
      }
    }
    for (const matter of cases) {
      if (
        matter.title.toLowerCase().includes(q) ||
        (matter.opposingCounsel && matter.opposingCounsel.toLowerCase().includes(q)) ||
        (matter.judge && matter.judge.toLowerCase().includes(q))
      ) {
        hits.push({
          type: "case",
          id: matter._id,
          name: matter.title,
          detail: matter.opposingCounsel || matter.caseNumber,
        });
      }
    }
    return { hits };
  },
});

export const markConflictChecked = mutation({
  args: {
    caseId: v.id("cases"),
    cleared: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    await ctx.db.patch(args.caseId, {
      conflictChecked: true,
      conflictClearedBy: args.cleared ? user._id : undefined,
    });
    return { success: true };
  },
});
