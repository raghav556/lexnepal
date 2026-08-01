import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAuth, requireRole, STAFF_ROLES, isStaffOrAdmin } from "./lib/roles";
import { notifyUser } from "./lib/notify";
import { assertOtpVerified, completeRecipientAfterSign } from "./envelopes";

export const SIGN_CONSENT_VERSION = "esign-consent-v1";

async function getClientCaseIds(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
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
  return { client, caseIds: new Set(cases.map((c) => c._id)) };
}

function clientCanAccessDoc(
  doc: Doc<"documents">,
  userId: Id<"users">,
  caseIds: Set<Id<"cases">>,
) {
  if (doc.isTemplate) return false;
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
  if (isStaffOrAdmin(user.role)) return;
  const { caseIds } = await getClientCaseIds(ctx, user._id);
  if (!clientCanAccessDoc(doc, user._id, caseIds)) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Access denied to this document" });
  }
}

async function assertCanSign(ctx: MutationCtx, user: Doc<"users">, doc: Doc<"documents">) {
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
    const user = await requireAuth(ctx);
    
    // Base filter function
    const isVisible = (d: Doc<"documents">) => {
      if (args.inTrash) return d.isDeleted === true;
      return d.isDeleted !== true;
    };

    if (isStaffOrAdmin(user.role)) {
      if (args.caseId) {
        const docs = await ctx.db
          .query("documents")
          .withIndex("by_case", (q) => q.eq("caseId", args.caseId!))
          .collect();
        return docs.filter(isVisible);
      }
      if (args.isTemplate !== undefined) {
        const docs = await ctx.db
          .query("documents")
          .withIndex("by_template", (q) => q.eq("isTemplate", args.isTemplate!))
          .collect();
        return docs.filter(isVisible);
      }
      const allDocs = await ctx.db.query("documents").collect();
      return allDocs.filter(isVisible);
    }

    const { caseIds } = await getClientCaseIds(ctx, user._id);
    if (args.isTemplate === true) return [];
    if (args.caseId) {
      if (!caseIds.has(args.caseId)) {
        throw new ConvexError({ code: "FORBIDDEN", message: "Access denied to this case" });
      }
      const docs = await ctx.db
        .query("documents")
        .withIndex("by_case", (q) => q.eq("caseId", args.caseId!))
        .collect();
      return docs.filter(isVisible);
    }

    const all = await ctx.db.query("documents").collect();
    return all.filter((d) => isVisible(d) && clientCanAccessDoc(d, user._id, caseIds));
  },
});

export const getDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return null;
    await assertCanAccessDocument(ctx, user, doc);
    return doc;
    return doc;
  },
});

export const searchDocuments = query({
  args: {
    query: v.string(),
    caseId: v.optional(v.id("cases")),
    type: v.optional(v.string()),
    isDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const isStaff = user.role !== "client" && user.role !== "admin";
    const isAdmin = user.role === "admin";

    let q = ctx.db.query("documents")
      .withSearchIndex("search_text", (q) => {
        const search = q.search("searchableText", args.query);
        if (args.caseId) search.eq("caseId", args.caseId);
        if (args.type) search.eq("type", args.type as any);
        if (args.isDeleted !== undefined) search.eq("isDeleted", args.isDeleted);
        return search;
      });

    const docs = await q.collect();

    // Client filtering
    let caseIds = new Set<import("./_generated/dataModel").Id<"cases">>();
    if (!isStaff && !isAdmin) {
      const res = await getClientCaseIds(ctx, user._id);
      caseIds = res.caseIds;
    }

    return docs.filter((d) => {
      // 1. deleted check
      if (d.isDeleted && !args.isDeleted) return false;
      // 2. staff access check
      if (isStaff || isAdmin) {
        if (d.isPrivileged && !isAdmin) return false;
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
    const user = await requireAuth(ctx);
    const isStaff = user.role !== "client" && user.role !== "admin";
    const isAdmin = user.role === "admin";
    
    // Fetch documents, sort by _creationTime desc
    const docs = await ctx.db.query("documents").order("desc").take(args.limit || 5);
    
    // Filter
    let caseIds = new Set<import("./_generated/dataModel").Id<"cases">>();
    if (!isStaff && !isAdmin) {
      const res = await getClientCaseIds(ctx, user._id);
      caseIds = res.caseIds;
    }
    
    return docs.filter((d) => {
      if (d.isDeleted) return false;
      if (isStaff || isAdmin) {
        if (d.isPrivileged && !isAdmin) return false;
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
    const user = await requireAuth(ctx);
    
    // Auto-generate documentNumber (e.g. DOC-YYYY-XXXX)
    const year = new Date().getFullYear();
    const count = (await ctx.db.query("documents").collect()).length + 1;
    const documentNumber = `DOC-${year}-${count.toString().padStart(4, "0")}`;

    let version = 1;
    if (args.parentDocumentId) {
       const parent = await ctx.db.get(args.parentDocumentId);
       if (parent) {
         // Count existing versions in this chain to determine next version
         const allDocs = await ctx.db.query("documents").collect();
         const chain = allDocs.filter(d => d._id === args.parentDocumentId || d.parentDocumentId === args.parentDocumentId);
         version = chain.length + 1;
       }
    }

    const docId = await ctx.db.insert("documents", { 
      ...args,
      tags: args.tags || [],
      documentNumber,
      version, 
      uploadedBy: user._id,
      isDeleted: false,
      status: "draft"
    });

    await ctx.db.insert("auditLog", {
      userId: user._id,
      action: args.parentDocumentId ? "document.version_uploaded" : "document.created",
      resource: "documents",
      resourceId: docId,
      details: `Document "${args.title}" uploaded. Version ${version}.`
    });

    return docId;
  },
});

export const trashDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (!isStaffOrAdmin(user.role)) {
       throw new ConvexError("Only staff can trash documents.");
    }
    
    await ctx.db.patch(args.documentId, { 
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: user._id
    });

    await ctx.db.insert("auditLog", {
      userId: user._id,
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
    const user = await requireAuth(ctx);
    if (!isStaffOrAdmin(user.role)) {
       throw new ConvexError("Only staff can restore documents.");
    }
    
    await ctx.db.patch(args.documentId, { 
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined
    });

    await ctx.db.insert("auditLog", {
      userId: user._id,
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
     const user = await requireAuth(ctx);
     // For simplicity, we just fetch all docs and filter in memory since document volume per case is small
     const allDocs = await ctx.db.query("documents").collect();
     
     // Find the root doc
     const root = allDocs.find(d => d._id === args.rootDocumentId);
     if (!root) return [];
     
     // The chain includes the root and any docs that point to it
     // For a true robust system, we would traverse up to find the true root, but assuming rootDocumentId is the true root for now
     const versions = allDocs.filter(d => 
       (d._id === args.rootDocumentId || d.parentDocumentId === args.rootDocumentId) &&
       d.isDeleted !== true
     );
     
     return versions.sort((a, b) => b.version - a.version);
  }
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
    const user = await requireAuth(ctx);
    const docs = await ctx.db.query("documents").collect();
    const matchingDoc = docs.find(
      (d) =>
        d.storageId === args.storageId || d.signatureArtifactStorageId === args.storageId,
    );
    if (matchingDoc) {
      await assertCanAccessDocument(ctx, user, matchingDoc);
      return ctx.storage.getUrl(args.storageId as any);
    }

    const { client } = await getClientCaseIds(ctx, user._id);
    const kycIds = [
      ...(client?.kycDocuments || []),
      ...((client?.kycFiles || []).map((f) => f.storageId)),
    ];
    if (kycIds.includes(args.storageId) || isStaffOrAdmin(user.role)) {
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
    const staff = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new ConvexError("Document not found");
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
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new ConvexError("Document not found");
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
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new ConvexError("Document not found");
    if (!doc.requiresSignature) {
      throw new ConvexError("Document does not require signature");
    }

    // Envelope multi-sign: document may still be pending until all recipients finish
    if (!args.envelopeId && doc.signatureStatus === "signed") {
      throw new ConvexError("Document already signed");
    }

    if (args.envelopeId) {
      const envelope = await ctx.db.get(args.envelopeId);
      if (!envelope || envelope.documentId !== args.documentId) {
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
    passwordHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (!isStaffOrAdmin(user.role)) {
      throw new ConvexError("Only staff can generate share links");
    }
    const token = crypto.randomUUID();
    await ctx.db.insert("documentShares", {
      documentId: args.documentId,
      token,
      expiresAt: args.expiresAt,
      passwordHash: args.passwordHash,
      createdBy: user._id,
      downloadsCount: 0,
      isActive: true,
    });
    return token;
  },
});

export const getSharedDocument = query({
  args: { token: v.string(), password: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("documentShares")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    
    if (!share || !share.isActive) {
      throw new ConvexError("This share link is invalid or has been revoked.");
    }
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      throw new ConvexError("This share link has expired.");
    }

    if (share.passwordHash && share.passwordHash !== args.password) {
      return { isPasswordRequired: true };
    }

    const doc = await ctx.db.get(share.documentId);
    if (!doc || doc.isDeleted) {
      throw new ConvexError("The document has been deleted or is unavailable.");
    }

    const url = await ctx.storage.getUrl(doc.storageId as any);
    return { ...doc, url };
  },
});

export const triggerOCR = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (!isStaffOrAdmin(user.role)) {
      throw new ConvexError("Only staff can trigger OCR");
    }
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new ConvexError("Document not found");

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
    const user = await requireAuth(ctx);
    if (!isStaffOrAdmin(user.role)) throw new ConvexError("Unauthorized");
    
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new ConvexError("Document not found");
    
    if (!doc.isDeleted) throw new ConvexError("Document must be in trash to hard delete");
    
    await ctx.db.delete(args.documentId);
    return { success: true };
  },
});

