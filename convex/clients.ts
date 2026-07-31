import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole, STAFF_ROLES } from "./lib/roles";

export const listClients = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    return ctx.db.query("clients").collect();
  },
});

export const getClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    return ctx.db.get(args.clientId);
  },
});

/** Resolve the clients row linked to the logged-in user */
export const getMyClientRecord = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    return ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

export const createClient = mutation({
  args: {
    type: v.union(v.literal("individual"), v.literal("corporate")),
    fullName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    companyName: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    return ctx.db.insert("clients", { ...args, kycStatus: "pending", isActive: true });
  },
});

export const updateClient = mutation({
  args: {
    clientId: v.id("clients"),
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    kycStatus: v.optional(v.union(
      v.literal("pending"), v.literal("submitted"), v.literal("verified"),
    )),
    kycDocuments: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const { clientId, ...updates } = args;
    const client = await ctx.db.get(clientId);
    if (!client) throw new ConvexError("Client not found");
    const isStaff = STAFF_ROLES.includes(user.role as any) || user.role === "admin";
    const isOwner = client.userId === user._id;
    if (!isStaff && !isOwner) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Access denied" });
    }
    // Clients may only update KYC fields on their own record
    if (!isStaff) {
      await ctx.db.patch(clientId, {
        kycStatus: updates.kycStatus,
        kycDocuments: updates.kycDocuments,
        address: updates.address,
        phone: updates.phone,
      });
      return;
    }
    await ctx.db.patch(clientId, updates);
  },
});

export const submitKyc = mutation({
  args: {
    clientId: v.optional(v.id("clients")),
    documentStorageIds: v.array(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    let client = args.clientId ? await ctx.db.get(args.clientId) : null;
    if (!client) {
      client = await ctx.db
        .query("clients")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
    }
    if (!client) throw new ConvexError("No client profile linked to this account");
    if (client.userId !== user._id && user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Access denied" });
    }
    await ctx.db.patch(client._id, {
      kycStatus: "submitted",
      kycDocuments: args.documentStorageIds,
      address: args.address ?? client.address,
    });
    return { success: true };
  },
});
