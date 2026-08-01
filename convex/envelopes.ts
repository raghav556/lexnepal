import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { requireAuth, requireRole, STAFF_ROLES } from "./lib/roles";
import { notifyUser } from "./lib/notify";

async function hashOtp(code: string): Promise<string> {
  const data = new TextEncoder().encode(`${code}:srimar-esign-otp-v1`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateOtpCode(): string {
  const n = Math.floor(Math.random() * 1_000_000);
  return n.toString().padStart(6, "0");
}

async function expireIfNeeded(ctx: MutationCtx, envelope: Doc<"signatureEnvelopes">) {
  if (
    envelope.status === "sent" &&
    envelope.expiresAt &&
    new Date(envelope.expiresAt).getTime() < Date.now()
  ) {
    await ctx.db.patch(envelope._id, { status: "expired" });
    return { ...envelope, status: "expired" as const };
  }
  return envelope;
}

async function getRecipients(ctx: MutationCtx | any, envelopeId: Id<"signatureEnvelopes">) {
  return ctx.db
    .query("signatureRecipients")
    .withIndex("by_envelope", (q: any) => q.eq("envelopeId", envelopeId))
    .collect();
}

function isStaff(role: string) {
  return STAFF_ROLES.includes(role as any) || role === "admin";
}

/** Staff: users eligible to be envelope signers */
export const listPortalSigners = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.isActive && !u.isPending)
      .map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
      }));
  },
});

/** Staff: create draft envelope with ordered recipients */
export const createEnvelope = mutation({
  args: {
    documentId: v.id("documents"),
    title: v.optional(v.string()),
    routing: v.union(v.literal("sequential"), v.literal("parallel")),
    expiresAt: v.optional(v.string()),
    recipientUserIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const staff = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new ConvexError("Document not found");
    if (doc.isTemplate || doc.isPrivileged) {
      throw new ConvexError("Cannot create an envelope for template or internal-only documents");
    }
    if (args.recipientUserIds.length === 0) {
      throw new ConvexError("Add at least one signer");
    }
    const unique = [...new Set(args.recipientUserIds)];
    if (unique.length !== args.recipientUserIds.length) {
      throw new ConvexError("Duplicate signers are not allowed");
    }

    const envelopeId = await ctx.db.insert("signatureEnvelopes", {
      documentId: args.documentId,
      caseId: doc.caseId,
      title: args.title || doc.title,
      status: "draft",
      routing: args.routing,
      createdBy: staff._id,
      expiresAt: args.expiresAt,
    });

    for (let i = 0; i < unique.length; i++) {
      const userId = unique[i];
      const user = await ctx.db.get(userId);
      if (!user || !user.isActive) {
        throw new ConvexError(`Signer not found or inactive: ${userId}`);
      }
      await ctx.db.insert("signatureRecipients", {
        envelopeId,
        userId,
        order: i,
        status: args.routing === "sequential" && i > 0 ? "awaiting_turn" : "pending",
      });
    }

    await ctx.db.insert("auditLog", {
      userId: staff._id,
      action: "envelope.created",
      resource: "signatureEnvelopes",
      resourceId: envelopeId,
      details: `${unique.length} signer(s), routing=${args.routing}`,
    });

    return { envelopeId };
  },
});

/** Staff: send envelope — notify active recipients, mark document for signature */
export const sendEnvelope = mutation({
  args: { envelopeId: v.id("signatureEnvelopes") },
  handler: async (ctx, args) => {
    const staff = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    let envelope = await ctx.db.get(args.envelopeId);
    if (!envelope) throw new ConvexError("Envelope not found");
    if (envelope.status !== "draft" && envelope.status !== "sent") {
      throw new ConvexError(`Cannot send envelope in status ${envelope.status}`);
    }

    const recipients = await getRecipients(ctx, args.envelopeId);
    const firstPending = recipients
      .slice()
      .sort((a, b) => a.order - b.order)
      .find((r) => r.status === "pending" || r.status === "awaiting_turn");

    // Activate first sequential signer
    if (envelope.routing === "sequential") {
      for (const r of recipients) {
        if (r.order === 0) {
          await ctx.db.patch(r._id, { status: "pending" });
        } else if (r.status !== "signed" && r.status !== "declined") {
          await ctx.db.patch(r._id, { status: "awaiting_turn" });
        }
      }
    }

    const activeSignerIds =
      envelope.routing === "parallel"
        ? recipients.filter((r) => r.status !== "signed" && r.status !== "declined").map((r) => r.userId)
        : firstPending
          ? [recipients.find((r) => r.order === 0)?.userId].filter(Boolean)
          : [];

    await ctx.db.patch(args.envelopeId, { status: "sent" });
    await ctx.db.patch(envelope.documentId, {
      requiresSignature: true,
      signatureStatus: "pending",
      intendedSignerUserId: activeSignerIds[0] as Id<"users"> | undefined,
      signedAt: undefined,
      signedByUserId: undefined,
    });

    for (const userId of activeSignerIds) {
      if (!userId) continue;
      await notifyUser(ctx, {
        userId: userId as Id<"users">,
        title: "Signature envelope ready",
        body: `"${envelope.title}" is ready for your signature.`,
        type: "document_request",
        relatedId: args.envelopeId,
      });
    }

    await ctx.db.insert("auditLog", {
      userId: staff._id,
      action: "envelope.sent",
      resource: "signatureEnvelopes",
      resourceId: args.envelopeId,
      details: `Notified ${activeSignerIds.length} signer(s)`,
    });

    return { success: true };
  },
});

export const voidEnvelope = mutation({
  args: {
    envelopeId: v.id("signatureEnvelopes"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const staff = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const envelope = await ctx.db.get(args.envelopeId);
    if (!envelope) throw new ConvexError("Envelope not found");
    if (envelope.status === "completed" || envelope.status === "voided") {
      throw new ConvexError("Envelope cannot be voided");
    }
    const reason = args.reason.trim();
    if (!reason) throw new ConvexError("Void reason is required");

    await ctx.db.patch(args.envelopeId, {
      status: "voided",
      voidedAt: new Date().toISOString(),
      voidReason: reason,
    });
    await ctx.db.patch(envelope.documentId, {
      requiresSignature: false,
      signatureStatus: undefined,
    });
    await ctx.db.insert("auditLog", {
      userId: staff._id,
      action: "envelope.voided",
      resource: "signatureEnvelopes",
      resourceId: args.envelopeId,
      details: reason,
    });
    return { success: true };
  },
});

export const declineEnvelope = mutation({
  args: {
    envelopeId: v.id("signatureEnvelopes"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    let envelope = await ctx.db.get(args.envelopeId);
    if (!envelope) throw new ConvexError("Envelope not found");
    envelope = await expireIfNeeded(ctx, envelope);
    if (envelope.status !== "sent") {
      throw new ConvexError("Only active envelopes can be declined");
    }
    const reason = args.reason.trim();
    if (!reason) throw new ConvexError("Decline reason is required");

    const recipients = await getRecipients(ctx, args.envelopeId);
    const mine = recipients.find((r) => r.userId === user._id);
    if (!mine || mine.status === "awaiting_turn") {
      throw new ConvexError("It is not your turn, or you are not a signer on this envelope");
    }
    if (mine.status !== "pending") {
      throw new ConvexError("You cannot decline in the current state");
    }

    await ctx.db.patch(mine._id, {
      status: "declined",
      declinedAt: new Date().toISOString(),
      declineReason: reason,
    });
    await ctx.db.patch(args.envelopeId, { status: "declined" });
    await ctx.db.patch(envelope.documentId, {
      requiresSignature: false,
      signatureStatus: undefined,
    });

    await ctx.db.insert("auditLog", {
      userId: user._id,
      action: "envelope.declined",
      resource: "signatureEnvelopes",
      resourceId: args.envelopeId,
      details: reason,
    });

    // Notify envelope creator
    await notifyUser(ctx, {
      userId: envelope.createdBy,
      title: "Envelope declined",
      body: `${user.name} declined "${envelope.title}": ${reason}`,
      type: "system",
      relatedId: args.envelopeId,
    });

    return { success: true };
  },
});

export const remindEnvelope = mutation({
  args: { envelopeId: v.id("signatureEnvelopes") },
  handler: async (ctx, args) => {
    const staff = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    let envelope = await ctx.db.get(args.envelopeId);
    if (!envelope) throw new ConvexError("Envelope not found");
    envelope = await expireIfNeeded(ctx, envelope);
    if (envelope.status !== "sent") {
      throw new ConvexError("Can only remind on sent envelopes");
    }

    const recipients = await getRecipients(ctx, args.envelopeId);
    const pending = recipients.filter((r) => r.status === "pending");
    if (pending.length === 0) {
      throw new ConvexError("No pending signers to remind");
    }

    const now = new Date().toISOString();
    for (const r of pending) {
      await notifyUser(ctx, {
        userId: r.userId,
        title: "Reminder: signature needed",
        body: `Please sign "${envelope.title}" in the client portal.`,
        type: "document_request",
        relatedId: args.envelopeId,
      });
      await ctx.db.patch(r._id, { remindedAt: now });
    }
    await ctx.db.patch(args.envelopeId, { lastRemindedAt: now });
    await ctx.db.insert("auditLog", {
      userId: staff._id,
      action: "envelope.reminded",
      resource: "signatureEnvelopes",
      resourceId: args.envelopeId,
      details: `Reminded ${pending.length} signer(s)`,
    });
    return { success: true, reminded: pending.length };
  },
});

export const listEnvelopes = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("sent"),
        v.literal("completed"),
        v.literal("declined"),
        v.literal("voided"),
        v.literal("expired"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (isStaff(user.role)) {
      const all = await ctx.db.query("signatureEnvelopes").collect();
      return args.status ? all.filter((e) => e.status === args.status) : all;
    }
    // Clients: envelopes where they are a recipient
    const myRecipients = await ctx.db
      .query("signatureRecipients")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const envelopes: Doc<"signatureEnvelopes">[] = [];
    for (const r of myRecipients) {
      const env = await ctx.db.get(r.envelopeId);
      if (!env) continue;
      if (args.status && env.status !== args.status) continue;
      envelopes.push(env);
    }
    return envelopes;
  },
});

export const getEnvelope = query({
  args: { envelopeId: v.id("signatureEnvelopes") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const envelope = await ctx.db.get(args.envelopeId);
    if (!envelope) return null;

    const recipients = await ctx.db
      .query("signatureRecipients")
      .withIndex("by_envelope", (q) => q.eq("envelopeId", args.envelopeId))
      .collect();

    const isRecipient = recipients.some((r) => r.userId === user._id);
    if (!isStaff(user.role) && !isRecipient) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Access denied" });
    }

    const enriched: Array<
      Doc<"signatureRecipients"> & { userName?: string; userEmail?: string }
    > = [];
    for (const r of recipients.sort((a, b) => a.order - b.order)) {
      const u = await ctx.db.get(r.userId);
      enriched.push({
        ...r,
        userName: u?.name,
        userEmail: u?.email,
      });
    }

    const doc = await ctx.db.get(envelope.documentId);
    return { envelope, recipients: enriched, document: doc };
  },
});

export const listMyPendingEnvelopeActions = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const myRecipients = await ctx.db
      .query("signatureRecipients")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const actions: Array<{
      recipientId: Id<"signatureRecipients">;
      envelopeId: Id<"signatureEnvelopes">;
      envelopeTitle: string;
      routing: "sequential" | "parallel";
      expiresAt?: string;
      document: Doc<"documents"> | null;
      order: number;
    }> = [];
    for (const r of myRecipients) {
      if (r.status !== "pending") continue;
      const envelope = await ctx.db.get(r.envelopeId);
      if (!envelope || envelope.status !== "sent") continue;
      if (envelope.expiresAt && new Date(envelope.expiresAt).getTime() < Date.now()) continue;
      const doc = await ctx.db.get(envelope.documentId);
      actions.push({
        recipientId: r._id,
        envelopeId: envelope._id,
        envelopeTitle: envelope.title,
        routing: envelope.routing,
        expiresAt: envelope.expiresAt,
        document: doc,
        order: r.order,
      });
    }
    return actions;
  },
});

/** Issue a 6-digit OTP for step-up before signing */
export const issueSigningOtp = mutation({
  args: {
    documentId: v.id("documents"),
    envelopeId: v.optional(v.id("signatureEnvelopes")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new ConvexError("Document not found");

    if (args.envelopeId) {
      const envelope = await ctx.db.get(args.envelopeId);
      if (!envelope || envelope.status !== "sent") {
        throw new ConvexError("Envelope is not available for signing");
      }
      if (envelope.expiresAt && new Date(envelope.expiresAt).getTime() < Date.now()) {
        await ctx.db.patch(args.envelopeId, { status: "expired" });
        throw new ConvexError("This envelope has expired");
      }
      const recipients = await getRecipients(ctx, args.envelopeId);
      const mine = recipients.find((r) => r.userId === user._id);
      if (!mine || mine.status !== "pending") {
        throw new ConvexError("You are not the active signer for this envelope");
      }
    }

    const code = generateOtpCode();
    const codeHash = await hashOtp(code);
    const expiresAt = Date.now() + 10 * 60 * 1000;

    // Invalidate prior challenges for this user+doc
    const existing = await ctx.db
      .query("signingChallenges")
      .withIndex("by_user_document", (q) =>
        q.eq("userId", user._id).eq("documentId", args.documentId),
      )
      .collect();
    for (const c of existing) {
      await ctx.db.delete(c._id);
    }

    const challengeId = await ctx.db.insert("signingChallenges", {
      userId: user._id,
      documentId: args.documentId,
      envelopeId: args.envelopeId,
      codeHash,
      expiresAt,
      attempts: 0,
    });

    await notifyUser(ctx, {
      userId: user._id,
      title: "Your signing verification code",
      body: `Your e-sign code is ${code}. It expires in 10 minutes.`,
      type: "system",
      relatedId: challengeId,
    });

    return {
      challengeId,
      expiresAt,
      /** Returned for local/dev testing when email provider is not configured */
      demoCode: code,
    };
  },
});

export const verifySigningOtp = mutation({
  args: {
    challengeId: v.id("signingChallenges"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge || challenge.userId !== user._id) {
      throw new ConvexError("Invalid challenge");
    }
    if (challenge.verifiedAt) {
      return { verified: true, challengeId: args.challengeId };
    }
    if (challenge.expiresAt < Date.now()) {
      throw new ConvexError("Code expired — request a new one");
    }
    if (challenge.attempts >= 5) {
      throw new ConvexError("Too many attempts — request a new code");
    }

    const ok = (await hashOtp(args.code.trim())) === challenge.codeHash;
    await ctx.db.patch(args.challengeId, { attempts: challenge.attempts + 1 });
    if (!ok) {
      throw new ConvexError("Incorrect code");
    }
    await ctx.db.patch(args.challengeId, { verifiedAt: Date.now() });
    return { verified: true, challengeId: args.challengeId };
  },
});

/** Called from documents.signDocument after successful sign — advances sequential envelope */
export async function completeRecipientAfterSign(
  ctx: MutationCtx,
  args: {
    envelopeId: Id<"signatureEnvelopes">;
    userId: Id<"users">;
  },
) {
  const envelope = await ctx.db.get(args.envelopeId);
  if (!envelope || envelope.status !== "sent") return;

  const recipients = (await getRecipients(ctx, args.envelopeId)).sort(
    (a, b) => a.order - b.order,
  );
  const mine = recipients.find((r) => r.userId === args.userId);
  if (!mine) return;

  await ctx.db.patch(mine._id, {
    status: "signed",
    signedAt: new Date().toISOString(),
  });

  const refreshed = (await getRecipients(ctx, args.envelopeId)).sort(
    (a, b) => a.order - b.order,
  );
  const allSigned = refreshed.every((r) => r.status === "signed");

  if (allSigned) {
    await ctx.db.patch(args.envelopeId, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    await notifyUser(ctx, {
      userId: envelope.createdBy,
      title: "Envelope completed",
      body: `All signers completed "${envelope.title}".`,
      type: "system",
      relatedId: args.envelopeId,
    });
    return;
  }

  if (envelope.routing === "sequential") {
    const next = refreshed.find((r) => r.status === "awaiting_turn");
    if (next) {
      await ctx.db.patch(next._id, { status: "pending" });
      await ctx.db.patch(envelope.documentId, {
        requiresSignature: true,
        signatureStatus: "pending",
        intendedSignerUserId: next.userId,
        signedAt: undefined,
        signedByUserId: undefined,
        viewedAt: undefined,
        signatureMethod: undefined,
        signatureArtifactStorageId: undefined,
        typedSignatureText: undefined,
        signConsentVersion: undefined,
        signConsentAt: undefined,
        sha256: undefined,
      });
      await notifyUser(ctx, {
        userId: next.userId,
        title: "Your turn to sign",
        body: `"${envelope.title}" is ready for your signature.`,
        type: "document_request",
        relatedId: args.envelopeId,
      });
    }
  }
}

export async function assertOtpVerified(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    documentId: Id<"documents">;
    challengeId: Id<"signingChallenges">;
  },
) {
  const challenge = await ctx.db.get(args.challengeId);
  if (!challenge || challenge.userId !== args.userId) {
    throw new ConvexError("OTP verification required");
  }
  if (challenge.documentId !== args.documentId) {
    throw new ConvexError("OTP challenge does not match this document");
  }
  if (!challenge.verifiedAt) {
    throw new ConvexError("Verify your OTP code before signing");
  }
  // Verified codes valid for 15 minutes
  if (challenge.verifiedAt + 15 * 60 * 1000 < Date.now()) {
    throw new ConvexError("OTP session expired — request a new code");
  }
}
