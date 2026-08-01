import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole, STAFF_ROLES } from "./lib/roles";
import { notifyUser } from "./lib/notify";

const KYC_CONSENT_VERSION = "kyc-consent-v1";

const kycFileValidator = v.object({
  storageId: v.string(),
  docType: v.union(
    v.literal("government_id"),
    v.literal("proof_of_address"),
    v.literal("other"),
  ),
  fileName: v.string(),
  mimeType: v.optional(v.string()),
});

export const listClients = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    return ctx.db.query("clients").collect();
  },
});

export const getClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const client = await ctx.db.get(args.clientId);
    if (!client) return null;
    const isStaff = STAFF_ROLES.includes(user.role as any) || user.role === "admin";
    if (!isStaff && client.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Access denied" });
    }
    return client;
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

/** Staff: resolve viewable URLs for a client's KYC files */
export const getClientKycFileUrls = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const client = await ctx.db.get(args.clientId);
    if (!client) return [];

    const files =
      client.kycFiles && client.kycFiles.length > 0
        ? client.kycFiles
        : (client.kycDocuments || []).map((storageId, i) => ({
            storageId,
            docType: "other" as const,
            fileName: `Document ${i + 1}`,
            mimeType: undefined as string | undefined,
          }));

    const result: Array<{
      storageId: string;
      docType: "government_id" | "proof_of_address" | "other";
      fileName: string;
      mimeType?: string;
      url: string | null;
    }> = [];
    for (const file of files) {
      const url = await ctx.storage.getUrl(file.storageId as any);
      result.push({ ...file, url });
    }
    return result;
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
    isActive: v.optional(v.boolean()),
    userId: v.optional(v.id("users")),
    notes: v.optional(v.string()),
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
    // Clients: contact fields only. KYC status changes go through submitKyc / reviewKyc.
    if (!isStaff) {
      const patch: { phone?: string; address?: string } = {};
      if (updates.phone !== undefined) patch.phone = updates.phone;
      if (updates.address !== undefined) patch.address = updates.address;
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(clientId, patch);
      }
      return;
    }
    await ctx.db.patch(clientId, updates);
  },
});

export const submitKyc = mutation({
  args: {
    clientId: v.optional(v.id("clients")),
    files: v.array(kycFileValidator),
    address: v.string(),
    idNumber: v.string(),
    consentAccepted: v.boolean(),
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
    if (client.kycStatus === "verified") {
      throw new ConvexError("KYC already verified — contact the firm to update documents");
    }
    if (!args.consentAccepted) {
      throw new ConvexError("You must accept the KYC consent statement to continue");
    }
    if (!args.address.trim() || !args.idNumber.trim()) {
      throw new ConvexError("Address and ID / citizenship number are required");
    }
    if (args.files.length === 0) {
      throw new ConvexError("Upload at least one KYC document");
    }
    const hasId = args.files.some((f) => f.docType === "government_id");
    const hasAddress = args.files.some((f) => f.docType === "proof_of_address");
    if (!hasId || !hasAddress) {
      throw new ConvexError("Upload both a government ID and a proof of address");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(client._id, {
      kycStatus: "submitted",
      kycFiles: args.files,
      kycDocuments: args.files.map((f) => f.storageId),
      address: args.address.trim(),
      kycIdNumber: args.idNumber.trim(),
      kycConsentAt: now,
      kycConsentVersion: KYC_CONSENT_VERSION,
      kycSubmittedAt: now,
      kycRejectionReason: undefined,
      kycReviewedAt: undefined,
      kycReviewedBy: undefined,
    });

    await ctx.db.insert("auditLog", {
      userId: user._id,
      action: "kyc.submitted",
      resource: "clients",
      resourceId: client._id,
      details: `Submitted ${args.files.length} KYC file(s) for review (consent ${KYC_CONSENT_VERSION})`,
    });

    if (client.userId) {
      await notifyUser(ctx, {
        userId: client.userId,
        title: "KYC submitted",
        body: "Your identity documents were submitted and are awaiting firm review.",
        type: "system",
        relatedId: client._id,
      });
    }

    return { success: true };
  },
});

/** Staff-only: approve or reject KYC with audit + client notification */
export const reviewKyc = mutation({
  args: {
    clientId: v.id("clients"),
    decision: v.union(v.literal("verified"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new ConvexError("Client not found");

    if (args.decision === "rejected") {
      const reason = (args.rejectionReason || "").trim();
      if (!reason) {
        throw new ConvexError("A rejection reason is required");
      }
    }

    if (client.kycStatus !== "submitted") {
      throw new ConvexError("Only submitted KYC packages can be reviewed");
    }

    const now = new Date().toISOString();
    if (args.decision === "verified") {
      await ctx.db.patch(args.clientId, {
        kycStatus: "verified",
        kycRejectionReason: undefined,
        kycReviewedAt: now,
        kycReviewedBy: reviewer._id,
      });
      await ctx.db.insert("auditLog", {
        userId: reviewer._id,
        action: "kyc.verified",
        resource: "clients",
        resourceId: args.clientId,
        details: "KYC approved by staff",
      });
      if (client.userId) {
        await notifyUser(ctx, {
          userId: client.userId,
          title: "KYC verified",
          body: "Your identity verification was approved. You can continue with case work.",
          type: "system",
          relatedId: args.clientId,
        });
      }
    } else {
      await ctx.db.patch(args.clientId, {
        kycStatus: "rejected",
        kycRejectionReason: args.rejectionReason!.trim(),
        kycReviewedAt: now,
        kycReviewedBy: reviewer._id,
      });
      await ctx.db.insert("auditLog", {
        userId: reviewer._id,
        action: "kyc.rejected",
        resource: "clients",
        resourceId: args.clientId,
        details: `KYC rejected: ${args.rejectionReason!.trim()}`,
      });
      if (client.userId) {
        await notifyUser(ctx, {
          userId: client.userId,
          title: "KYC needs attention",
          body: `Your KYC was rejected: ${args.rejectionReason!.trim()}. Please resubmit corrected documents.`,
          type: "system",
          relatedId: args.clientId,
        });
      }
    }

    return { success: true };
  },
});
