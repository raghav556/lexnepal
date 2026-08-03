import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAuth, requireRole, requirePermission, requireFirmId, isStaffOrAdmin } from "./lib/roles";
import { notifyUser } from "./lib/notify";
import { assertOtpVerified, completeRecipientAfterSign } from "./envelopes";
import { hashSharePassword, validateDocumentMetadata, verifySharePassword } from "./lib/documentSecurity";

export const SIGN_CONSENT_VERSION = "esign-consent-v1";

async function getClientCaseIds(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  firmId: Id<"firms">,
): Promise<{ client: Doc<"clients"> | null; caseIds: Set<Id<"cases">> }> {
  const client = await ctx.db
    .query("clients")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (!client) return { client: null, caseIds: new Set() };
  const cases = await ctx.db
    .query("cases")
    .withIndex("by_client", (q) => q.eq("clientId", client._id))
    .collect();
  return { client, caseIds: new Set(cases.filter((c) => c.firmId === firmId).map((c) => c._id)) };
}

function clientCanAccessDoc(
  doc: Doc<"documents">,
  userId: Id<"users">,
  caseIds: Set<Id<"cases">>,
) {
  if (doc.isTemplate) return false;
  if (doc.isPrivileged) return false;
  if (doc.confidentialityLevel === "internal" || doc.confidentialityLevel === "privileged") return false;
  if (doc.intendedSignerUserId === userId) return true;
  if (doc.uploadedBy === userId) return true;
  if (doc.caseId && caseIds.has(doc.caseId)) return true;
  return false;
}

async function assertCanAccessDocument(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
  doc: Doc<"documents">,
) {
  const firmId = await requireFirmId(ctx, user);
  if (doc.firmId !== firmId) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Access denied to this firm's document" });
  }
  if (doc.isPrivileged && user.role !== "admin" && user.role !== "partner") {
    throw new ConvexError({ code: "FORBIDDEN", message: "Privileged document access is restricted" });
  }
  if (isStaffOrAdmin(user.role)) return;
  const { caseIds } = await getClientCaseIds(ctx, user._id, firmId);
  if (!clientCanAccessDoc(doc, user._id, caseIds)) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Access denied to this document" });
  }
}

function assertDocumentAvailable(doc: Doc<"documents">) {
  if (doc.uploadStatus === "quarantined" || doc.uploadStatus === "scanning") {
    throw new ConvexError("Document is still in security quarantine");
  }
  if (doc.uploadStatus === "rejected") {
    throw new ConvexError("Document was rejected by malware scanning");
  }
}

async function assertCaseInFirm(
  ctx: QueryCtx | MutationCtx,
  caseId: Id<"cases">,
  firmId: Id<"firms">,
) {
  const caseDoc = await ctx.db.get(caseId);
  if (!caseDoc || caseDoc.firmId !== firmId) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Case does not belong to your firm" });
  }
  return caseDoc;
}

async function assertCanSign(ctx: MutationCtx, user: Doc<"users">, doc: Doc<"documents">) {
  const firmId = await requireFirmId(ctx, user);
  if (doc.firmId !== firmId) throw new ConvexError("Document belongs to another firm");
  assertDocumentAvailable(doc);
  let allowed = false;
  if (doc.intendedSignerUserId) {
    allowed = doc.intendedSignerUserId === user._id;
  } else if (doc.caseId) {
    const caseDoc = await ctx.db.get(doc.caseId);
    if (caseDoc) {
      const client = await ctx.db.get(caseDoc.clientId);
      allowed = !!client?.userId && client.userId === user._id;
    }
  }
  if (!allowed) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You are not the authorized signer for this document",
    });
  }
}

export const listDocuments = query({
  args: {
    caseId: v.optional(v.id("cases")),
    isTemplate: v.optional(v.boolean()),
    inTrash: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "documents.read");
    const firmId = await requireFirmId(ctx, user);
    
    // Base filter function
    const isVisible = (d: Doc<"documents">) => {
      if (d.isPrivileged && user.role !== "admin" && user.role !== "partner") return false;
      if (args.inTrash) return d.isDeleted === true;
      return d.isDeleted !== true;
    };

    if (isStaffOrAdmin(user.role)) {
      if (args.caseId) {
        await assertCaseInFirm(ctx, args.caseId, firmId);
        const docs = await ctx.db
          .query("documents")
          .withIndex("by_case", (q) => q.eq("caseId", args.caseId!))
          .collect();
        return docs.filter((d) => d.firmId === firmId && isVisible(d));
      }
      if (args.isTemplate !== undefined) {
        const docs = await ctx.db
          .query("documents")
          .withIndex("by_template", (q) => q.eq("isTemplate", args.isTemplate!))
          .collect();
        return docs.filter((d) => d.firmId === firmId && isVisible(d));
      }
      const allDocs = await ctx.db.query("documents").withIndex("by_firm", (q) => q.eq("firmId", firmId)).collect();
      return allDocs.filter(isVisible);
    }

    const { caseIds } = await getClientCaseIds(ctx, user._id, firmId);
    if (args.isTemplate === true) return [];
    if (args.caseId) {
      if (!caseIds.has(args.caseId)) {
        throw new ConvexError({ code: "FORBIDDEN", message: "Access denied to this case" });
      }
      const docs = await ctx.db
        .query("documents")
        .withIndex("by_case", (q) => q.eq("caseId", args.caseId!))
        .collect();
      return docs.filter((d) => isVisible(d) && clientCanAccessDoc(d, user._id, caseIds));
    }

    const all = await ctx.db.query("documents").withIndex("by_firm", (q) => q.eq("firmId", firmId)).collect();
    return all.filter((d) => isVisible(d) && clientCanAccessDoc(d, user._id, caseIds));
  },
});

export const getDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "documents.read");
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return null;
    await assertCanAccessDocument(ctx, user, doc);
    return doc;
  },
});

export const searchDocuments = query({
  args: {
    query: v.string(),
    caseId: v.optional(v.id("cases")),
    type: v.optional(v.string()),
    tag: v.optional(v.string()),
    generalOnly: v.optional(v.boolean()),
    isDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "documents.read");
    const firmId = await requireFirmId(ctx, user);
    const isStaff = user.role !== "client" && user.role !== "admin";
    const isAdmin = user.role === "admin";

    let q = ctx.db.query("documents")
      .withSearchIndex("search_text", (q) => {
        const search = q.search("searchableText", args.query);
        search.eq("firmId", firmId);
        if (args.caseId) search.eq("caseId", args.caseId);
        if (args.generalOnly) search.eq("caseId", undefined);
        if (args.type) search.eq("type", args.type as any);
        if (args.isDeleted !== undefined) search.eq("isDeleted", args.isDeleted);
        return search;
      });

    const docs = await q.collect();

    // Client filtering
    let caseIds = new Set<import("./_generated/dataModel").Id<"cases">>();
    if (!isStaff && !isAdmin) {
      const res = await getClientCaseIds(ctx, user._id, firmId);
      caseIds = res.caseIds;
    }

    return docs.filter((d) => {
      if (args.tag && !d.tags.some((tag) => tag.toLowerCase() === args.tag!.toLowerCase())) return false;
      // 1. deleted check
      if (d.isDeleted && !args.isDeleted) return false;
      // 2. staff access check
      if (isStaff || isAdmin) {
        if (d.isPrivileged && !isAdmin && user.role !== "partner") return false;
        return true;
      }
      // 3. client access check
      if (d.isPrivileged) return false;
      if (d.confidentialityLevel === "internal" || d.confidentialityLevel === "privileged") return false;
      return clientCanAccessDoc(d, user._id, caseIds);
    });
  }
});

export const getRecentDocuments = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "documents.read");
    const firmId = await requireFirmId(ctx, user);
    const isStaff = user.role !== "client" && user.role !== "admin";
    const isAdmin = user.role === "admin";
    
    // Fetch documents, sort by _creationTime desc
    const docs = await ctx.db.query("documents").withIndex("by_firm", (q) => q.eq("firmId", firmId)).order("desc").take(args.limit || 5);
    
    // Filter
    let caseIds = new Set<import("./_generated/dataModel").Id<"cases">>();
    if (!isStaff && !isAdmin) {
      const res = await getClientCaseIds(ctx, user._id, firmId);
      caseIds = res.caseIds;
    }
    
    return docs.filter((d) => {
      if (d.isDeleted) return false;
      if (isStaff || isAdmin) {
        if (d.isPrivileged && !isAdmin && user.role !== "partner") return false;
        return true;
      }
      if (d.isPrivileged) return false;
      if (d.confidentialityLevel === "internal" || d.confidentialityLevel === "privileged") return false;
      return clientCanAccessDoc(d, user._id, caseIds);
    });
  }
});

export const createDocument = mutation({
  args: {
    caseId: v.optional(v.id("cases")),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("pleading"), v.literal("affidavit"), v.literal("contract"),
      v.literal("poa"), v.literal("correspondence"), v.literal("evidence"),
      v.literal("template"), v.literal("court_filing"), 
      v.literal("notice"), v.literal("memo"), v.literal("other"),
    ),
    storageId: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    sha256: v.optional(v.string()),
    searchableText: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isTemplate: v.boolean(),
    isPrivileged: v.boolean(),
    confidentialityLevel: v.optional(v.union(
      v.literal("public"), v.literal("internal"), 
      v.literal("confidential"), v.literal("privileged"),
    )),
    physicalLocation: v.optional(v.string()),
    dateBs: v.optional(v.string()),
    parentDocumentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "documents.upload");
    const firmId = await requireFirmId(ctx, user);
    validateDocumentMetadata(args);

    if (args.caseId) {
      await assertCaseInFirm(ctx, args.caseId, firmId);
    } else if (user.role === "client") {
      throw new ConvexError("Clients must upload documents to one of their cases");
    }
    if (user.role === "client") {
      const { caseIds } = await getClientCaseIds(ctx, user._id, firmId);
      if (!args.caseId || !caseIds.has(args.caseId)) {
        throw new ConvexError({ code: "FORBIDDEN", message: "Clients can upload only to their own cases" });
      }
      if (args.isPrivileged || args.confidentialityLevel === "privileged" || args.confidentialityLevel === "internal") {
        throw new ConvexError("Clients cannot assign internal or privileged classifications");
      }
    }
    
    // Auto-generate documentNumber (e.g. DOC-YYYY-XXXX)
    const year = new Date().getFullYear();
    const documentNumber = `DOC-${year}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    let version = 1;
    let inheritedVersionFields: Partial<Doc<"documents">> = {};
    if (args.parentDocumentId) {
       const parent = await ctx.db.get(args.parentDocumentId);
       if (!parent) throw new ConvexError("Parent document not found");
       await assertCanAccessDocument(ctx, user, parent);
       if (parent.firmId !== firmId || parent.caseId !== args.caseId || parent.type !== args.type) {
         throw new ConvexError("A new version must preserve its firm's case and document type");
       }
       if (parent.isOnLegalHold && parent.uploadStatus === "rejected") {
         throw new ConvexError("Rejected documents under legal hold cannot accept new versions");
       }
       inheritedVersionFields = {
         caseId: parent.caseId,
         type: parent.type,
         isTemplate: parent.isTemplate,
         isPrivileged: parent.isPrivileged,
         confidentialityLevel: parent.confidentialityLevel,
         retentionPolicy: parent.retentionPolicy,
         retentionUntil: parent.retentionUntil,
         isOnLegalHold: parent.isOnLegalHold,
         legalHoldReason: parent.legalHoldReason,
         legalHoldSetAt: parent.legalHoldSetAt,
         legalHoldSetBy: parent.legalHoldSetBy,
       };
       {
         // Count existing versions in this chain to determine next version
         const allDocs = await ctx.db.query("documents").withIndex("by_firm", (q) => q.eq("firmId", firmId)).collect();
         const chain = allDocs.filter(d => d._id === args.parentDocumentId || d.parentDocumentId === args.parentDocumentId);
         version = chain.length + 1;
       }
    }

    const docId = await ctx.db.insert("documents", { 
      ...args,
      ...inheritedVersionFields,
      firmId,
      tags: args.tags || [],
      searchableText: [args.title, args.description, ...(args.tags || []), args.searchableText]
        .filter((value): value is string => !!value)
        .join("\n"),
      documentNumber,
      version, 
      uploadedBy: user._id,
      isDeleted: false,
      status: "draft",
      uploadStatus: "quarantined",
    });

    await ctx.db.insert("auditLog", {
      userId: user._id,
      firmId,
      action: args.parentDocumentId ? "document.version_uploaded" : "document.created",
      resource: "documents",
      resourceId: docId,
      details: `Document "${args.title}" uploaded. Version ${version}.`
    });

    await ctx.scheduler.runAfter(0, internal.documentSecurity.scanDocumentInternal, { documentId: docId });

    return docId;
  },
});

export const trashDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "documents.delete");
    const firmId = await requireFirmId(ctx, user);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.firmId !== firmId) throw new ConvexError("Document not found");
    if (doc.isOnLegalHold) throw new ConvexError("Documents on legal hold cannot be trashed");
    
    await ctx.db.patch(args.documentId, { 
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: user._id
    });

    await ctx.db.insert("auditLog", {
      userId: user._id,
      firmId,
      action: "document.trashed",
      resource: "documents",
      resourceId: args.documentId,
      details: `Document moved to trash`
    });
  },
});

export const restoreDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "documents.delete");
    const firmId = await requireFirmId(ctx, user);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.firmId !== firmId) throw new ConvexError("Document not found");
    
    await ctx.db.patch(args.documentId, { 
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined
    });

    await ctx.db.insert("auditLog", {
      userId: user._id,
      firmId,
      action: "document.restored",
      resource: "documents",
      resourceId: args.documentId,
      details: `Document restored from trash`
    });
  },
});

export const listDocumentVersions = query({
  args: { rootDocumentId: v.id("documents") },
  handler: async (ctx, args) => {
     const user = await requirePermission(ctx, "documents.read");
     const firmId = await requireFirmId(ctx, user);
     const root = await ctx.db.get(args.rootDocumentId);
     if (!root) return [];
     await assertCanAccessDocument(ctx, user, root);
     const trueRootId = root.parentDocumentId || root._id;
     const allDocs = await ctx.db.query("documents").withIndex("by_firm", (q) => q.eq("firmId", firmId)).collect();
     const versions = allDocs.filter(d => 
       (d._id === trueRootId || d.parentDocumentId === trueRootId) &&
       d.isDeleted !== true
     );
     
     return versions.sort((a, b) => b.version - a.version);
  }
});

async function disposeDocument(
  ctx: MutationCtx,
  user: Doc<"users">,
  firmId: Id<"firms">,
  doc: Doc<"documents">,
) {
  if (!doc.isDeleted) throw new ConvexError("Document must be in trash before permanent deletion");
  if (doc.isOnLegalHold) throw new ConvexError("Legal hold blocks permanent deletion");
  if (doc.retentionUntil && Date.parse(doc.retentionUntil) > Date.now()) {
    throw new ConvexError(`Retention blocks deletion until ${doc.retentionUntil}`);
  }
  const shares = await ctx.db.query("documentShares").withIndex("by_document", (q) => q.eq("documentId", doc._id)).collect();
  for (const share of shares) await ctx.db.delete(share._id);
  const envelopes = await ctx.db.query("signatureEnvelopes").withIndex("by_document", (q) => q.eq("documentId", doc._id)).collect();
  for (const envelope of envelopes) {
    const recipients = await ctx.db.query("signatureRecipients").withIndex("by_envelope", (q) => q.eq("envelopeId", envelope._id)).collect();
    for (const recipient of recipients) await ctx.db.delete(recipient._id);
    await ctx.db.delete(envelope._id);
  }
  const challenges = await ctx.db.query("signingChallenges").withIndex("by_firm", (q) => q.eq("firmId", firmId)).collect();
  for (const challenge of challenges) if (challenge.documentId === doc._id) await ctx.db.delete(challenge._id);
  await ctx.storage.delete(doc.storageId as any);
  if (doc.signatureArtifactStorageId) await ctx.storage.delete(doc.signatureArtifactStorageId as any);
  await ctx.db.delete(doc._id);
  await ctx.db.insert("auditLog", {
    firmId, userId: user._id, action: "document.permanently_deleted", resource: "documents",
    resourceId: doc._id, details: `Disposed ${doc.documentNumber}`,
  });
}

export const deleteDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "records.dispose");
    const firmId = await requireFirmId(ctx, user);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.firmId !== firmId) throw new ConvexError("Document not found");
    await disposeDocument(ctx, user, firmId, doc);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requirePermission(ctx, "documents.upload");
    const firmId = await requireFirmId(ctx, user);
    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    const limit = user.role === "client" ? 20 : 200;
    const existing = await ctx.db.query("documentUploadRateLimits").withIndex("by_user", (q) => q.eq("userId", user._id)).first();
    if (!existing) {
      await ctx.db.insert("documentUploadRateLimits", { firmId, userId: user._id, windowStartedAt: now, count: 1 });
    } else if (existing.firmId !== firmId) {
      throw new ConvexError("Upload rate-limit record belongs to another firm");
    } else if (existing.windowStartedAt + windowMs <= now) {
      await ctx.db.patch(existing._id, { windowStartedAt: now, count: 1 });
    } else {
      if (existing.count >= limit) throw new ConvexError("Hourly upload limit reached. Try again later");
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    }
    return ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "documents.read");
    const firmId = await requireFirmId(ctx, user);
    const docs = await ctx.db.query("documents").withIndex("by_firm", (q) => q.eq("firmId", firmId)).collect();
    const matchingDoc = docs.find(
      (d) =>
        d.storageId === args.storageId || d.signatureArtifactStorageId === args.storageId,
    );
    if (matchingDoc) {
      await assertCanAccessDocument(ctx, user, matchingDoc);
      assertDocumentAvailable(matchingDoc);
      return ctx.storage.getUrl(args.storageId as any);
    }

    const { client } = await getClientCaseIds(ctx, user._id, firmId);
    const kycIds = [
      ...(client?.kycDocuments || []),
      ...((client?.kycFiles || []).map((f) => f.storageId)),
    ];
    if (kycIds.includes(args.storageId)) {
      return ctx.storage.getUrl(args.storageId as any);
    }
    throw new ConvexError({ code: "FORBIDDEN", message: "Access denied to this file" });
  },
});

export const requestSignature = mutation({
  args: {
    documentId: v.id("documents"),
    intendedSignerUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const staff = await requirePermission(ctx, "documents.share");
    const firmId = await requireFirmId(ctx, staff);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.firmId !== firmId) throw new ConvexError("Document not found");
    assertDocumentAvailable(doc);
    if (doc.isTemplate) throw new ConvexError("Templates cannot be sent for signature");

    let intendedSignerUserId = args.intendedSignerUserId;
    if (!intendedSignerUserId && doc.caseId) {
      const caseDoc = await ctx.db.get(doc.caseId);
      if (caseDoc) {
        const client = await ctx.db.get(caseDoc.clientId);
        intendedSignerUserId = client?.userId;
      }
    }
    if (!intendedSignerUserId) {
      throw new ConvexError(
        "No signer found — link the document to a case with a portal client, or pass intendedSignerUserId",
      );
    }
    const signer = await ctx.db.get(intendedSignerUserId);
    if (!signer || signer.firmId !== firmId || !signer.isActive || signer.isPending) {
      throw new ConvexError("Signer must be an active user in the same firm");
    }

    await ctx.db.patch(args.documentId, {
      requiresSignature: true,
      signatureStatus: "pending",
      intendedSignerUserId,
      signedAt: undefined,
      signedByUserId: undefined,
      signatureMethod: undefined,
      signatureArtifactStorageId: undefined,
      typedSignatureText: undefined,
      signConsentVersion: undefined,
      signConsentAt: undefined,
      viewedAt: undefined,
      signerUserAgent: undefined,
      sha256: undefined,
    });

    await ctx.db.insert("auditLog", {
      userId: staff._id,
      firmId,
      action: "document.signature_requested",
      resource: "documents",
      resourceId: args.documentId,
      details: `Signature requested for signer ${intendedSignerUserId}`,
    });

    await notifyUser(ctx, {
      userId: intendedSignerUserId,
      title: "Document ready to sign",
      body: `"${doc.title}" requires your electronic acknowledgment in the client portal.`,
      type: "document_request",
      relatedId: args.documentId,
    });

    return { success: true, intendedSignerUserId };
  },
});

/** Record that the intended signer opened/previewed the document before signing */
export const markDocumentViewed = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const firmId = await requireFirmId(ctx, user);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.firmId !== firmId) throw new ConvexError("Document not found");
    assertDocumentAvailable(doc);
    if (!doc.requiresSignature || doc.signatureStatus === "signed") {
      throw new ConvexError("Document is not awaiting signature");
    }
    await assertCanSign(ctx, user, doc);
    const viewedAt = new Date().toISOString();
    if (!doc.viewedAt) {
      await ctx.db.patch(args.documentId, { viewedAt });
    }
    return { viewedAt: doc.viewedAt || viewedAt };
  },
});

export const signDocument = mutation({
  args: {
    documentId: v.id("documents"),
    signatureMethod: v.union(v.literal("draw"), v.literal("type"), v.literal("upload")),
    signatureArtifactStorageId: v.optional(v.string()),
    typedSignatureText: v.optional(v.string()),
    consentAccepted: v.boolean(),
    documentSha256: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    signatureNote: v.optional(v.string()),
    /** P3: verified OTP challenge required before sign */
    otpChallengeId: v.id("signingChallenges"),
    envelopeId: v.optional(v.id("signatureEnvelopes")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const firmId = await requireFirmId(ctx, user);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.firmId !== firmId) throw new ConvexError("Document not found");
    assertDocumentAvailable(doc);
    if (!doc.requiresSignature) {
      throw new ConvexError("Document does not require signature");
    }

    // Envelope multi-sign: document may still be pending until all recipients finish
    if (!args.envelopeId && doc.signatureStatus === "signed") {
      throw new ConvexError("Document already signed");
    }

    if (args.envelopeId) {
      const envelope = await ctx.db.get(args.envelopeId);
      if (!envelope || envelope.firmId !== firmId || envelope.documentId !== args.documentId) {
        throw new ConvexError("Envelope does not match this document");
      }
      if (envelope.status !== "sent") {
        throw new ConvexError("Envelope is not open for signing");
      }
      if (envelope.expiresAt && new Date(envelope.expiresAt).getTime() < Date.now()) {
        await ctx.db.patch(args.envelopeId, { status: "expired" });
        throw new ConvexError("This envelope has expired");
      }
      const recipients = await ctx.db
        .query("signatureRecipients")
        .withIndex("by_envelope", (q) => q.eq("envelopeId", args.envelopeId!))
        .collect();
      const mine = recipients.find((r) => r.userId === user._id);
      if (!mine || mine.status !== "pending") {
        throw new ConvexError("You are not the active signer on this envelope");
      }
    } else {
      await assertCanSign(ctx, user, doc);
    }

    await assertOtpVerified(ctx, {
      userId: user._id,
      documentId: args.documentId,
      challengeId: args.otpChallengeId,
    });

    if (!args.consentAccepted) {
      throw new ConvexError("Consent is required to sign");
    }
    if (!doc.viewedAt) {
      throw new ConvexError("Preview the document before signing");
    }
    if (!args.documentSha256 || args.documentSha256.length < 32) {
      throw new ConvexError("Document integrity hash is required");
    }

    if (args.signatureMethod === "type") {
      if (!args.typedSignatureText?.trim()) {
        throw new ConvexError("Typed signature text is required");
      }
    } else if (!args.signatureArtifactStorageId) {
      throw new ConvexError("Signature image artifact is required");
    }

    const signedAt = new Date().toISOString();

    if (args.envelopeId) {
      // Per-signer evidence stays on audit; document marked signed only when envelope completes
      await ctx.db.insert("auditLog", {
        userId: user._id,
        firmId: doc.firmId,
        action: "document.signed",
        resource: "documents",
        resourceId: args.documentId,
        details:
          args.signatureNote ||
          `Envelope signer via ${args.signatureMethod}; consent ${SIGN_CONSENT_VERSION}; sha256=${args.documentSha256.slice(0, 16)}…; envelope=${args.envelopeId}`,
        ipAddress: args.ipAddress,
      });
      await ctx.db.patch(args.documentId, {
        signatureMethod: args.signatureMethod,
        signatureArtifactStorageId: args.signatureArtifactStorageId,
        typedSignatureText: args.typedSignatureText?.trim(),
        signConsentVersion: SIGN_CONSENT_VERSION,
        signConsentAt: signedAt,
        signerUserAgent: args.userAgent,
        sha256: args.documentSha256,
        signedByUserId: user._id,
        viewedAt: doc.viewedAt,
      });
      await completeRecipientAfterSign(ctx, {
        envelopeId: args.envelopeId,
        userId: user._id,
      });
      const envelopeAfter = await ctx.db.get(args.envelopeId);
      if (envelopeAfter?.status === "completed") {
        await ctx.db.patch(args.documentId, {
          signatureStatus: "signed",
          signedAt,
          requiresSignature: true,
        });
      }
    } else {
      await ctx.db.patch(args.documentId, {
        signatureStatus: "signed",
        signedAt,
        signedByUserId: user._id,
        signatureMethod: args.signatureMethod,
        signatureArtifactStorageId: args.signatureArtifactStorageId,
        typedSignatureText: args.typedSignatureText?.trim(),
        signConsentVersion: SIGN_CONSENT_VERSION,
        signConsentAt: signedAt,
        signerUserAgent: args.userAgent,
        sha256: args.documentSha256,
      });
      await ctx.db.insert("auditLog", {
        userId: user._id,
        firmId: doc.firmId,
        action: "document.signed",
        resource: "documents",
        resourceId: args.documentId,
        details:
          args.signatureNote ||
          `Signed via ${args.signatureMethod}; consent ${SIGN_CONSENT_VERSION}; sha256=${args.documentSha256.slice(0, 16)}…`,
        ipAddress: args.ipAddress,
      });
    }

    return { success: true, signedAt, consentVersion: SIGN_CONSENT_VERSION };
  },
});

/** Certificate of completion for a signed document */
export const getSignatureCertificate = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return null;
    await assertCanAccessDocument(ctx, user, doc);
    assertDocumentAvailable(doc);
    if (doc.signatureStatus !== "signed") {
      throw new ConvexError("Document is not signed");
    }

    const signer = doc.signedByUserId ? await ctx.db.get(doc.signedByUserId) : null;
    let artifactUrl: string | null = null;
    if (doc.signatureArtifactStorageId) {
      artifactUrl = await ctx.storage.getUrl(doc.signatureArtifactStorageId as any);
    }
    const documentUrl = await ctx.storage.getUrl(doc.storageId as any);

    return {
      certificateVersion: "completion-v1",
      documentId: doc._id,
      title: doc.title,
      mimeType: doc.mimeType,
      signedAt: doc.signedAt,
      viewedAt: doc.viewedAt,
      signatureMethod: doc.signatureMethod,
      typedSignatureText: doc.typedSignatureText,
      signConsentVersion: doc.signConsentVersion,
      signConsentAt: doc.signConsentAt,
      documentSha256: doc.sha256,
      signerUserAgent: doc.signerUserAgent,
      signer: signer
        ? { userId: signer._id, name: signer.name, email: signer.email }
        : null,
      documentUrl,
      signatureArtifactUrl: artifactUrl,
      disclaimer:
        "This certificate records an electronic acknowledgment in the Srimar Law portal. It is not a qualified cryptographic certificate under a PKI CA.",
    };
  },
});

export const createShareLink = mutation({
  args: {
    documentId: v.id("documents"),
    expiresAt: v.optional(v.string()),
    password: v.optional(v.string()),
    allowDownload: v.optional(v.boolean()),
    maxDownloads: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "documents.share");
    const firmId = await requireFirmId(ctx, user);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.firmId !== firmId) throw new ConvexError("Document not found");
    assertDocumentAvailable(doc);
    if (doc.isDeleted) throw new ConvexError("Deleted documents cannot be shared");
    if (doc.isPrivileged || doc.confidentialityLevel === "privileged") {
      throw new ConvexError("Privileged documents cannot be shared through public links");
    }
    if (doc.isOnLegalHold) throw new ConvexError("Documents on legal hold cannot be publicly shared");
    if (args.expiresAt && Date.parse(args.expiresAt) <= Date.now()) throw new ConvexError("Expiry must be in the future");
    if (args.maxDownloads !== undefined && (!Number.isInteger(args.maxDownloads) || args.maxDownloads < 1 || args.maxDownloads > 10_000)) {
      throw new ConvexError("Maximum downloads must be between 1 and 10,000");
    }
    const token = crypto.randomUUID();
    const shareId = await ctx.db.insert("documentShares", {
      firmId,
      documentId: args.documentId,
      token,
      expiresAt: args.expiresAt,
      passwordHash: args.password ? await hashSharePassword(args.password) : undefined,
      createdBy: user._id,
      downloadsCount: 0,
      isActive: true,
      allowDownload: args.allowDownload !== false,
      maxDownloads: args.maxDownloads,
      failedAttempts: 0,
    });
    await ctx.db.insert("auditLog", {
      firmId, userId: user._id, action: "document.share_created", resource: "documentShares",
      resourceId: shareId, details: `document=${args.documentId}; expires=${args.expiresAt || "never"}`,
    });
    return token;
  },
});

async function validatePublicShare(ctx: MutationCtx, token: string, password?: string) {
  const share = await ctx.db.query("documentShares").withIndex("by_token", (q) => q.eq("token", token)).first();
  if (!share || !share.isActive) throw new ConvexError("This share link is invalid or revoked");
  if (share.lockedUntil && share.lockedUntil > Date.now()) throw new ConvexError("Too many attempts. Try again later");
  if (share.expiresAt && Date.parse(share.expiresAt) <= Date.now()) throw new ConvexError("This share link has expired");
  if (share.maxDownloads !== undefined && share.downloadsCount >= share.maxDownloads) {
    throw new ConvexError("This share link has reached its download limit");
  }
  if (share.passwordHash) {
    const valid = !!password && await verifySharePassword(password, share.passwordHash);
    if (!valid) {
      const failedAttempts = (share.failedAttempts || 0) + 1;
      await ctx.db.patch(share._id, {
        failedAttempts,
        lockedUntil: failedAttempts >= 5 ? Date.now() + 15 * 60 * 1000 : undefined,
      });
      return { share, passwordRequired: true as const };
    }
  }
  await ctx.db.patch(share._id, { failedAttempts: 0, lockedUntil: undefined, lastAccessAt: new Date().toISOString() });
  const doc = await ctx.db.get(share.documentId);
  if (!doc || doc.firmId !== share.firmId || doc.isDeleted) throw new ConvexError("Document is unavailable");
  assertDocumentAvailable(doc);
  return { share, doc, passwordRequired: false as const };
}

export const getSharedDocument = mutation({
  args: { token: v.string(), password: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const result = await validatePublicShare(ctx, args.token, args.password);
    if (result.passwordRequired) {
      return { isPasswordRequired: true };
    }
    const { doc, share } = result;
    return {
      isPasswordRequired: false,
      title: doc.title,
      type: doc.type,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      allowDownload: share.allowDownload !== false,
    };
  },
});

export const downloadSharedDocument = mutation({
  args: { token: v.string(), password: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const result = await validatePublicShare(ctx, args.token, args.password);
    if (result.passwordRequired) return { isPasswordRequired: true as const };
    if (result.share.allowDownload === false) throw new ConvexError("Downloads are disabled for this share");
    await ctx.db.patch(result.share._id, { downloadsCount: result.share.downloadsCount + 1 });
    const url = await ctx.storage.getUrl(result.doc.storageId as any);
    return { isPasswordRequired: false as const, url };
  },
});

export const listShareLinks = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "documents.share");
    const firmId = await requireFirmId(ctx, user);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.firmId !== firmId) throw new ConvexError("Document not found");
    return ctx.db.query("documentShares").withIndex("by_document", (q) => q.eq("documentId", args.documentId)).collect();
  },
});

export const revokeShareLink = mutation({
  args: { shareId: v.id("documentShares") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "documents.share");
    const firmId = await requireFirmId(ctx, user);
    const share = await ctx.db.get(args.shareId);
    if (!share || share.firmId !== firmId) throw new ConvexError("Share not found");
    await ctx.db.patch(args.shareId, { isActive: false, revokedAt: new Date().toISOString(), revokedBy: user._id });
    await ctx.db.insert("auditLog", {
      firmId, userId: user._id, action: "document.share_revoked", resource: "documentShares", resourceId: args.shareId,
    });
    return { success: true };
  },
});

export const setLegalHold = mutation({
  args: { documentId: v.id("documents"), enabled: v.boolean(), reason: v.string() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "legalHold.manage");
    const firmId = await requireFirmId(ctx, user);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.firmId !== firmId) throw new ConvexError("Document not found");
    const reason = args.reason.trim();
    if (!reason) throw new ConvexError("A legal-hold reason is required");
    await ctx.db.patch(args.documentId, {
      isOnLegalHold: args.enabled,
      legalHoldReason: reason,
      legalHoldSetAt: new Date().toISOString(),
      legalHoldSetBy: user._id,
    });
    await ctx.db.insert("auditLog", {
      firmId, userId: user._id, action: args.enabled ? "document.legal_hold_set" : "document.legal_hold_released",
      resource: "documents", resourceId: args.documentId, details: reason,
    });
    return { success: true };
  },
});

export const setRetention = mutation({
  args: { documentId: v.id("documents"), policy: v.string(), retentionUntil: v.string() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "records.dispose");
    const firmId = await requireFirmId(ctx, user);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.firmId !== firmId) throw new ConvexError("Document not found");
    if (!args.policy.trim() || !Number.isFinite(Date.parse(args.retentionUntil))) throw new ConvexError("Valid retention policy and date are required");
    if (Date.parse(args.retentionUntil) <= Date.now()) throw new ConvexError("Retention date must be in the future");
    await ctx.db.patch(args.documentId, { retentionPolicy: args.policy.trim(), retentionUntil: args.retentionUntil });
    await ctx.db.insert("auditLog", {
      firmId, userId: user._id, action: "document.retention_set", resource: "documents",
      resourceId: args.documentId, details: `${args.policy.trim()} until ${args.retentionUntil}`,
    });
    return { success: true };
  },
});

export const triggerOCR = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "documents.upload");
    const firmId = await requireFirmId(ctx, user);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.firmId !== firmId) throw new ConvexError("Document not found");
    assertDocumentAvailable(doc);

    // Simulate OCR processing by generating mock searchable text
    // In a real implementation, this would call an external API (e.g., AWS Textract)
    const simulatedText = `Extracted text from ${doc.title}:\n\n This document pertains to legal matters. Confidential and privileged information. Reference: ${doc.documentNumber}. Signed and executed on the date recorded.`;
    
    await ctx.db.patch(args.documentId, {
      searchableText: simulatedText
    });
    
    return { success: true, text: simulatedText };
  },
});

export const hardDeleteDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "records.dispose");
    const firmId = await requireFirmId(ctx, user);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.firmId !== firmId) throw new ConvexError("Document not found");
    await disposeDocument(ctx, user, firmId, doc);
    return { success: true };
  },
});

/** One-time single-firm migration before enabling the strict tenant boundary. */
export const migrateLegacySecurityBoundary = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await requireRole(ctx, ["admin"]);
    const firmId = await requireFirmId(ctx, admin);
    const firms = (await ctx.db.query("firms").collect()).filter((firm) => firm.isActive);
    if (firms.length !== 1) throw new ConvexError("Automatic migration is allowed only for a single active firm");

    let updated = 0;
    for (const user of await ctx.db.query("users").collect()) {
      if (!user.firmId) { await ctx.db.patch(user._id, { firmId }); updated++; }
    }
    for (const client of await ctx.db.query("clients").collect()) {
      if (!client.firmId) { await ctx.db.patch(client._id, { firmId }); updated++; }
    }
    for (const caseDoc of await ctx.db.query("cases").collect()) {
      if (!caseDoc.firmId) { await ctx.db.patch(caseDoc._id, { firmId }); updated++; }
    }
    for (const doc of await ctx.db.query("documents").collect()) {
      const patch: { firmId?: Id<"firms">; uploadStatus?: "clean" } = {};
      if (!doc.firmId) patch.firmId = firmId;
      if (!doc.uploadStatus) patch.uploadStatus = "clean";
      if (Object.keys(patch).length) { await ctx.db.patch(doc._id, patch); updated++; }
    }
    for (const tag of await ctx.db.query("documentTags").collect()) {
      if (!tag.firmId) { await ctx.db.patch(tag._id, { firmId }); updated++; }
    }
    for (const share of await ctx.db.query("documentShares").collect()) {
      if (!share.firmId) {
        await ctx.db.patch(share._id, { firmId, isActive: false, revokedAt: new Date().toISOString(), revokedBy: admin._id });
        updated++;
      }
    }
    for (const envelope of await ctx.db.query("signatureEnvelopes").collect()) {
      if (!envelope.firmId) { await ctx.db.patch(envelope._id, { firmId }); updated++; }
    }
    for (const recipient of await ctx.db.query("signatureRecipients").collect()) {
      if (!recipient.firmId) { await ctx.db.patch(recipient._id, { firmId }); updated++; }
    }
    for (const challenge of await ctx.db.query("signingChallenges").collect()) {
      if (!challenge.firmId) { await ctx.db.patch(challenge._id, { firmId }); updated++; }
    }
    for (const rateLimit of await ctx.db.query("documentUploadRateLimits").collect()) {
      if (!rateLimit.firmId) { await ctx.db.patch(rateLimit._id, { firmId }); updated++; }
    }
    await ctx.db.insert("auditLog", {
      firmId, userId: admin._id, action: "documents.security_boundary_migrated", resource: "documents",
      details: `Backfilled ${updated} legacy records; legacy public links were revoked`,
    });
    return { success: true, updated };
  },
});

