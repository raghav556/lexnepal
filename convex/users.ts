import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel.d.ts";
import { requireRole } from "./lib/roles";

export type UserRole = Doc<"users">["role"];

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx): Promise<{ id: string; role: UserRole }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "User not logged in" });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (user !== null) return { id: user._id, role: user.role };
    const id = await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: identity.tokenIdentifier,
      role: "client",
      isActive: true,
    });
    return { id, role: "client" };
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});

export const listUsers = query({
  args: { role: v.optional(v.string()) },
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    return await ctx.db.query("users").collect();
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.union(
      v.literal("partner"), v.literal("senior_associate"), v.literal("associate"),
      v.literal("paralegal"), v.literal("intern"), v.literal("admin"), v.literal("client"),
    )),
    barCouncilNumber: v.optional(v.string()),
    barCouncilExpiry: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const { userId, ...updates } = args;
    await ctx.db.patch(userId, updates);
  },
});

export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    role: v.union(
      v.literal("partner"), v.literal("senior_associate"), v.literal("associate"),
      v.literal("paralegal"), v.literal("intern"), v.literal("admin"), v.literal("client"),
    ),
    isPublicFacing: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const tokenIdentifier = "manual_" + Math.random().toString(36).substring(2, 15);
    const id = await ctx.db.insert("users", {
      tokenIdentifier,
      name: args.name,
      email: args.email,
      role: args.role,
      isActive: true,
      isPublicFacing: args.isPublicFacing || false,
    });
    return id;
  },
});

export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.delete(args.userId);
  },
});

export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    role: v.optional(v.union(
      v.literal("partner"),
      v.literal("senior_associate"),
      v.literal("associate"),
      v.literal("paralegal"),
      v.literal("intern"),
      v.literal("admin"),
      v.literal("client"),
    )),
    bio: v.optional(v.string()),
    longBio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    twitterUrl: v.optional(v.string()),
    publicEmail: v.optional(v.string()),
    barCouncilNumber: v.optional(v.string()),
    isPublicFacing: v.optional(v.boolean()),
    practiceAreas: v.optional(v.array(v.string())),
    notableCases: v.optional(v.array(v.string())),
    education: v.optional(v.array(v.object({
      degree: v.string(),
      institution: v.string(),
      year: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const { userId, avatarUrl, ...rest } = args as typeof args & { avatarUrl?: string };
    const updates: Record<string, unknown> = { ...rest };
    if (avatarUrl !== undefined) updates.avatar = avatarUrl;
    delete updates.userId;
    await ctx.db.patch(userId, updates);
  },
});

export const togglePublicStatus = mutation({
  args: {
    userId: v.id("users"),
    isPublicFacing: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.patch(args.userId, { isPublicFacing: args.isPublicFacing });
  },
});

export const sendPasswordReset = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found");
    // Token stored for setup; email delivery is Phase 6
    const token = `reset_${Math.random().toString(36).slice(2)}`;
    await ctx.db.patch(args.userId, { activationToken: token, isPending: true });
    return { success: true, token };
  },
});

export const activateAccount = mutation({
  args: {
    token: v.string(),
    password: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_activation", (q) => q.eq("activationToken", args.token))
      .first();
    if (!user) throw new ConvexError("Invalid activation token");
    await ctx.db.patch(user._id, {
      isPending: false,
      activationToken: undefined,
      name: args.name || user.name,
      isActive: true,
    });
    return { success: true, userId: user._id, role: user.role };
  },
});

export const listSessions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    return ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const revokeSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [
      "admin", "partner", "senior_associate", "associate", "paralegal", "intern", "client",
    ]);
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;
    if (session.userId !== user._id && user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot revoke another user's session" });
    }
    await ctx.db.delete(args.sessionId);
  },
});

export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx) => {
    // Password is managed by OIDC provider; acknowledge for UI compatibility
    await requireRole(ctx, [
      "admin", "partner", "senior_associate", "associate", "paralegal", "intern", "client",
    ]);
    return {
      success: true,
      message: "Password changes are handled by your identity provider.",
    };
  },
});

export const toggle2FA = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [
      "admin", "partner", "senior_associate", "associate", "paralegal", "intern", "client",
    ]);
    await ctx.db.patch(user._id, { twoFactorEnabled: args.enabled });
    return { success: true };
  },
});
