import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole, STAFF_ROLES } from "./lib/roles";

export const listDocuments = query({
  args: {
    caseId: v.optional(v.id("cases")),
    isTemplate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    if (args.caseId) {
      return ctx.db.query("documents").withIndex("by_case", (q) => q.eq("caseId", args.caseId!)).collect();
    }
    if (args.isTemplate !== undefined) {
      return ctx.db.query("documents").withIndex("by_template", (q) => q.eq("isTemplate", args.isTemplate!)).collect();
    }
    return ctx.db.query("documents").collect();
  },
});

export const getDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    return ctx.db.get(args.documentId);
  },
});

export const createDocument = mutation({
  args: {
    caseId: v.optional(v.id("cases")),
    title: v.string(),
    type: v.union(
      v.literal("pleading"), v.literal("affidavit"), v.literal("contract"),
      v.literal("poa"), v.literal("correspondence"), v.literal("evidence"),
      v.literal("template"), v.literal("other"),
    ),
    storageId: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    tags: v.array(v.string()),
    isTemplate: v.boolean(),
    isPrivileged: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    return ctx.db.insert("documents", { ...args, version: 1, uploadedBy: user._id });
  },
});

export const deleteDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    await ctx.db.delete(args.documentId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    return ctx.storage.getUrl(args.storageId as any);
  },
});

export const requestSignature = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    await ctx.db.patch(args.documentId, {
      requiresSignature: true,
      signatureStatus: "pending",
    });
    return { success: true };
  },
});

export const signDocument = mutation({
  args: {
    documentId: v.id("documents"),
    signatureNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new ConvexError("Document not found");
    if (!doc.requiresSignature) throw new ConvexError("Document does not require signature");
    await ctx.db.patch(args.documentId, {
      signatureStatus: "signed",
      signedAt: new Date().toISOString(),
    });
    await ctx.db.insert("auditLog", {
      userId: user._id,
      action: "document.signed",
      resource: "documents",
      resourceId: args.documentId,
      details: args.signatureNote || "Client e-signed document",
    });
    return { success: true };
  },
});
