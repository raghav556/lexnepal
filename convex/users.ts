import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel.d.ts";
import { requireRole } from "./lib/roles.ts";

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
    role: v.optional(v.string()),
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
    const { userId, ...updates } = args;
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
