import "server-only";
import { createHash, randomInt } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "../db/client";
import {
  documents,
  signatureEnvelopes,
  signatureRecipients,
  signingChallenges,
  users,
} from "../db/schema";
import { AppError } from "@/shared/errors/api-error";
import { CommunicationRepository } from "./communication-repository";

const notifications = new CommunicationRepository();
const SIGN_CONSENT_VERSION = "esign-consent-v1";

function hashOtp(code: string) {
  return createHash("sha256").update(`${code}:srimar-esign-otp-v1`).digest("hex");
}

function generateOtpCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function dtoId(row: { id: string; legacyConvexId?: string | null }) {
  return row.id;
}

export class EnvelopeRepository {
  static async listPortalSigners(firmId: string) {
    const db = getDatabase();
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.firmId, firmId), eq(users.isActive, true), eq(users.isPending, false)));
    return rows.map((u) => ({ _id: u.id, id: u.id, name: u.name, email: u.email, role: u.role }));
  }

  static async resolveDocument(firmId: string, documentId: string) {
    const db = getDatabase();
    const isUuid = /^[0-9a-f-]{36}$/i.test(documentId);
    const [doc] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.firmId, firmId),
          isUuid ? eq(documents.id, documentId) : eq(documents.legacyConvexId, documentId),
        ),
      )
      .limit(1);
    return doc ?? null;
  }

  static async resolveEnvelope(firmId: string, envelopeId: string) {
    const db = getDatabase();
    const isUuid = /^[0-9a-f-]{36}$/i.test(envelopeId);
    const [env] = await db
      .select()
      .from(signatureEnvelopes)
      .where(
        and(
          eq(signatureEnvelopes.firmId, firmId),
          isUuid
            ? eq(signatureEnvelopes.id, envelopeId)
            : eq(signatureEnvelopes.legacyConvexId, envelopeId),
        ),
      )
      .limit(1);
    return env ?? null;
  }

  static async expireIfNeeded(env: typeof signatureEnvelopes.$inferSelect) {
    if (
      env.status === "sent" &&
      env.expiresAt &&
      env.expiresAt.getTime() < Date.now()
    ) {
      const db = getDatabase();
      const [updated] = await db
        .update(signatureEnvelopes)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(signatureEnvelopes.id, env.id))
        .returning();
      return updated ?? { ...env, status: "expired" as const };
    }
    return env;
  }

  static async createEnvelope(
    firmId: string,
    data: {
      documentId: string;
      title?: string;
      routing: "sequential" | "parallel";
      expiresAt?: string | null;
      recipientUserIds: string[];
    },
    createdBy: string,
  ) {
    const db = getDatabase();
    const doc = await this.resolveDocument(firmId, data.documentId);
    if (!doc) throw new AppError("NOT_FOUND", "Document not found", 404);
    if (
      doc.uploadStatus === "quarantined" ||
      doc.uploadStatus === "scanning" ||
      doc.uploadStatus === "rejected"
    ) {
      throw new AppError(
        "CONFLICT",
        "Only security-cleared documents can be sent for signature",
        409,
      );
    }
    if (doc.isTemplate || doc.isPrivileged) {
      throw new AppError(
        "FORBIDDEN",
        "Cannot create an envelope for template or privileged documents",
        403,
      );
    }
    const unique = [...new Set(data.recipientUserIds)];
    if (unique.length !== data.recipientUserIds.length) {
      throw new AppError("VALIDATION_FAILED", "Duplicate signers are not allowed", 422);
    }

    return await db.transaction(async (tx) => {
      const [envelope] = await tx
        .insert(signatureEnvelopes)
        .values({
          firmId,
          documentId: doc.id,
          caseId: doc.caseId,
          title: data.title || doc.title,
          status: "draft",
          routing: data.routing,
          createdBy,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        })
        .returning();

      for (let i = 0; i < unique.length; i++) {
        const userId = unique[i]!;
        const [user] = await tx
          .select()
          .from(users)
          .where(and(eq(users.id, userId), eq(users.firmId, firmId)))
          .limit(1);
        if (!user || !user.isActive || user.isPending) {
          throw new AppError("NOT_FOUND", `Signer not found or inactive: ${userId}`, 404);
        }
        await tx.insert(signatureRecipients).values({
          firmId,
          envelopeId: envelope!.id,
          userId,
          order: i,
          status: data.routing === "sequential" && i > 0 ? "awaiting_turn" : "pending",
        });
      }

      return { envelopeId: envelope!.id, _id: envelope!.id };
    });
  }

  static async listEnvelopes(firmId: string, limit = 50) {
    const db = getDatabase();
    const envs = await db
      .select()
      .from(signatureEnvelopes)
      .where(eq(signatureEnvelopes.firmId, firmId))
      .orderBy(desc(signatureEnvelopes.createdAt))
      .limit(limit);
    if (envs.length === 0) return [];
    const recipients = await db
      .select()
      .from(signatureRecipients)
      .where(
        inArray(
          signatureRecipients.envelopeId,
          envs.map((e) => e.id),
        ),
      );
    const byEnv = recipients.reduce(
      (acc, row) => {
        (acc[row.envelopeId] ??= []).push(row);
        return acc;
      },
      {} as Record<string, typeof recipients>,
    );
    return envs.map((e) => ({
      _id: dtoId(e),
      id: e.id,
      documentId: e.documentId,
      title: e.title,
      status: e.status,
      routing: e.routing,
      expiresAt: e.expiresAt?.toISOString() ?? null,
      recipients: (byEnv[e.id] || []).map((r) => ({
        _id: r.id,
        userId: r.userId,
        order: r.order,
        status: r.status,
        signedAt: r.signedAt?.toISOString() ?? null,
      })),
      _creationTime: e.createdAt.getTime(),
    }));
  }

  static async listMyPendingActions(firmId: string, userId: string) {
    const db = getDatabase();
    const mine = await db
      .select()
      .from(signatureRecipients)
      .where(
        and(
          eq(signatureRecipients.firmId, firmId),
          eq(signatureRecipients.userId, userId),
          eq(signatureRecipients.status, "pending"),
        ),
      );
    const actions = [];
    for (const recipient of mine) {
      let envelope = await this.resolveEnvelope(firmId, recipient.envelopeId);
      if (!envelope) continue;
      envelope = await this.expireIfNeeded(envelope);
      if (envelope.status !== "sent") continue;
      const doc = await this.resolveDocument(firmId, envelope.documentId);
      actions.push({
        recipientId: recipient.id,
        envelopeId: envelope.id,
        envelopeTitle: envelope.title,
        routing: envelope.routing,
        expiresAt: envelope.expiresAt?.toISOString() ?? undefined,
        document: doc
          ? {
              _id: doc.id,
              id: doc.id,
              title: doc.title,
              storageId: doc.storageId,
              mimeType: doc.mimeType,
              sizeBytes: doc.sizeBytes,
              requiresSignature: doc.requiresSignature,
              signatureStatus: doc.signatureStatus,
              viewedAt: doc.viewedAt?.toISOString() ?? null,
            }
          : null,
        order: recipient.order,
      });
    }
    return actions;
  }

  static async sendEnvelope(firmId: string, id: string) {
    const db = getDatabase();
    let env = await this.resolveEnvelope(firmId, id);
    if (!env) throw new AppError("NOT_FOUND", "Envelope not found", 404);
    env = await this.expireIfNeeded(env);
    if (env.status === "expired") throw new AppError("CONFLICT", "This envelope has expired", 410);
    if (env.status !== "draft" && env.status !== "sent") {
      throw new AppError("CONFLICT", `Cannot send envelope in status ${env.status}`, 409);
    }

    const [updated] = await db
      .update(signatureEnvelopes)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(signatureEnvelopes.id, env.id))
      .returning();

    await db
      .update(documents)
      .set({
        requiresSignature: true,
        signatureStatus: "pending",
        updatedAt: new Date(),
      })
      .where(eq(documents.id, env.documentId));

    const recipients = await db
      .select()
      .from(signatureRecipients)
      .where(eq(signatureRecipients.envelopeId, env.id));
    const active = recipients
      .slice()
      .sort((a, b) => a.order - b.order)
      .filter((r) => r.status === "pending");
    for (const r of active) {
      await notifications.createNotification(firmId, {
        userId: r.userId,
        type: "document_request",
        title: "Signature Requested",
        body: `You have been requested to sign ${env.title}`,
        relatedId: env.id,
      });
      await db
        .update(documents)
        .set({ intendedSignerUserId: r.userId, updatedAt: new Date() })
        .where(eq(documents.id, env.documentId));
      if (env.routing === "sequential") break;
    }

    return { _id: updated!.id, id: updated!.id, status: updated!.status };
  }

  static async voidEnvelope(firmId: string, id: string, reason: string) {
    const db = getDatabase();
    const env = await this.resolveEnvelope(firmId, id);
    if (!env) throw new AppError("NOT_FOUND", "Envelope not found", 404);
    if (env.status === "completed" || env.status === "voided" || env.status === "expired") {
      throw new AppError("CONFLICT", `Cannot void envelope in status ${env.status}`, 409);
    }
    const [updated] = await db
      .update(signatureEnvelopes)
      .set({
        status: "voided",
        voidReason: reason,
        voidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(signatureEnvelopes.id, env.id))
      .returning();
    return { _id: updated!.id, id: updated!.id, status: updated!.status };
  }

  static async expireEnvelope(firmId: string, id: string) {
    const db = getDatabase();
    let env = await this.resolveEnvelope(firmId, id);
    if (!env) throw new AppError("NOT_FOUND", "Envelope not found", 404);
    env = await this.expireIfNeeded(env);
    if (env.status === "expired") return { _id: env.id, id: env.id, status: env.status };
    if (env.status !== "sent") {
      throw new AppError("CONFLICT", `Cannot expire envelope in status ${env.status}`, 409);
    }
    if (!env.expiresAt || env.expiresAt.getTime() >= Date.now()) {
      throw new AppError("CONFLICT", "Envelope expiry time has not been reached", 409);
    }
    const [updated] = await db
      .update(signatureEnvelopes)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(signatureEnvelopes.id, env.id))
      .returning();
    return { _id: updated!.id, id: updated!.id, status: updated!.status };
  }

  static async declineEnvelope(firmId: string, id: string, userId: string, reason: string) {
    const db = getDatabase();
    return await db.transaction(async (tx) => {
      let env = await this.resolveEnvelope(firmId, id);
      if (!env) throw new AppError("NOT_FOUND", "Envelope not found", 404);
      env = await this.expireIfNeeded(env);
      if (env.status !== "sent") {
        throw new AppError("CONFLICT", "Only active envelopes can be declined", 409);
      }
      const [recipient] = await tx
        .select()
        .from(signatureRecipients)
        .where(
          and(
            eq(signatureRecipients.envelopeId, env.id),
            eq(signatureRecipients.userId, userId),
            eq(signatureRecipients.status, "pending"),
          ),
        )
        .limit(1);
      if (!recipient) throw new AppError("FORBIDDEN", "You are not an active signer", 403);

      await tx
        .update(signatureRecipients)
        .set({
          status: "declined",
          declineReason: reason,
          declinedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(signatureRecipients.id, recipient.id));

      const [updated] = await tx
        .update(signatureEnvelopes)
        .set({
          status: "declined",
          voidReason: reason,
          voidedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(signatureEnvelopes.id, env.id))
        .returning();

      return { _id: updated!.id, id: updated!.id, status: updated!.status };
    });
  }

  static async remindEnvelope(firmId: string, id: string) {
    const db = getDatabase();
    let env = await this.resolveEnvelope(firmId, id);
    if (!env) throw new AppError("NOT_FOUND", "Envelope not found", 404);
    env = await this.expireIfNeeded(env);
    if (env.status !== "sent") {
      throw new AppError("CONFLICT", "Can only remind on sent envelopes", 409);
    }
    const pending = await db
      .select()
      .from(signatureRecipients)
      .where(
        and(eq(signatureRecipients.envelopeId, env.id), eq(signatureRecipients.status, "pending")),
      );
    for (const r of pending) {
      await notifications.createNotification(firmId, {
        userId: r.userId,
        type: "document_request",
        title: "Signature reminder",
        body: `Reminder: "${env.title}" still needs your signature.`,
        relatedId: env.id,
      });
      await db
        .update(signatureRecipients)
        .set({ remindedAt: new Date(), updatedAt: new Date() })
        .where(eq(signatureRecipients.id, r.id));
    }
    await db
      .update(signatureEnvelopes)
      .set({ lastRemindedAt: new Date(), updatedAt: new Date() })
      .where(eq(signatureEnvelopes.id, env.id));
    return { success: true as const, reminded: pending.length };
  }

  static async issueOtp(
    firmId: string,
    userId: string,
    input: { documentId: string; envelopeId?: string },
  ) {
    const db = getDatabase();
    const doc = await this.resolveDocument(firmId, input.documentId);
    if (!doc) throw new AppError("NOT_FOUND", "Document not found", 404);

    if (input.envelopeId) {
      let envelope = await this.resolveEnvelope(firmId, input.envelopeId);
      if (!envelope || envelope.status !== "sent") {
        throw new AppError("CONFLICT", "Envelope is not available for signing", 409);
      }
      envelope = await this.expireIfNeeded(envelope);
      if (envelope.status === "expired") {
        throw new AppError("CONFLICT", "This envelope has expired", 410);
      }
      const [mine] = await db
        .select()
        .from(signatureRecipients)
        .where(
          and(
            eq(signatureRecipients.envelopeId, envelope.id),
            eq(signatureRecipients.userId, userId),
            eq(signatureRecipients.status, "pending"),
          ),
        )
        .limit(1);
      if (!mine) {
        throw new AppError("FORBIDDEN", "You are not the active signer for this envelope", 403);
      }
    }

    const code = generateOtpCode();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db
      .delete(signingChallenges)
      .where(
        and(
          eq(signingChallenges.firmId, firmId),
          eq(signingChallenges.userId, userId),
          eq(signingChallenges.documentId, doc.id),
        ),
      );

    const [challenge] = await db
      .insert(signingChallenges)
      .values({
        firmId,
        userId,
        documentId: doc.id,
        envelopeId: input.envelopeId ?? null,
        codeHash,
        expiresAt,
        attempts: 0,
      })
      .returning();

    await notifications.createNotification(firmId, {
      userId,
      type: "system",
      title: "Your signing verification code",
      body: `Your e-sign code is ${code}. It expires in 10 minutes.`,
      relatedId: challenge!.id,
    });

    return {
      challengeId: challenge!.id,
      expiresAt: expiresAt.getTime(),
      demoCode: code,
    };
  }

  static async verifyOtp(
    firmId: string,
    userId: string,
    input: { challengeId: string; code: string },
  ) {
    const db = getDatabase();
    const [challenge] = await db
      .select()
      .from(signingChallenges)
      .where(
        and(
          eq(signingChallenges.id, input.challengeId),
          eq(signingChallenges.firmId, firmId),
          eq(signingChallenges.userId, userId),
        ),
      )
      .limit(1);
    if (!challenge) throw new AppError("NOT_FOUND", "Invalid challenge", 404);
    if (challenge.verifiedAt) {
      return { verified: true as const, challengeId: challenge.id };
    }
    if (challenge.expiresAt.getTime() < Date.now()) {
      throw new AppError("CONFLICT", "Code expired — request a new one", 410);
    }
    if (challenge.attempts >= 5) {
      throw new AppError("RATE_LIMITED", "Too many attempts — request a new code", 429);
    }
    const ok = hashOtp(input.code.trim()) === challenge.codeHash;
    await db
      .update(signingChallenges)
      .set({ attempts: challenge.attempts + 1, updatedAt: new Date() })
      .where(eq(signingChallenges.id, challenge.id));
    if (!ok) throw new AppError("BAD_REQUEST", "Incorrect code", 400);
    await db
      .update(signingChallenges)
      .set({ verifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(signingChallenges.id, challenge.id));
    return { verified: true as const, challengeId: challenge.id };
  }

  static async assertOtpVerified(firmId: string, userId: string, documentId: string, challengeId: string) {
    const db = getDatabase();
    const [challenge] = await db
      .select()
      .from(signingChallenges)
      .where(
        and(
          eq(signingChallenges.id, challengeId),
          eq(signingChallenges.firmId, firmId),
          eq(signingChallenges.userId, userId),
        ),
      )
      .limit(1);
    if (!challenge) throw new AppError("FORBIDDEN", "OTP verification required", 403);
    if (challenge.documentId !== documentId) {
      throw new AppError("FORBIDDEN", "OTP challenge does not match this document", 403);
    }
    if (!challenge.verifiedAt) {
      throw new AppError("FORBIDDEN", "Verify your OTP code before signing", 403);
    }
    if (challenge.verifiedAt.getTime() + 15 * 60 * 1000 < Date.now()) {
      throw new AppError("CONFLICT", "OTP session expired — request a new code", 410);
    }
  }

  static async markDocumentViewed(firmId: string, documentId: string, userId: string) {
    const db = getDatabase();
    const doc = await this.resolveDocument(firmId, documentId);
    if (!doc) throw new AppError("NOT_FOUND", "Document not found", 404);
    if (!doc.requiresSignature || doc.signatureStatus === "signed") {
      throw new AppError("CONFLICT", "Document is not awaiting signature", 409);
    }
    const viewedAt = doc.viewedAt ?? new Date();
    if (!doc.viewedAt) {
      await db
        .update(documents)
        .set({ viewedAt, updatedAt: new Date() })
        .where(eq(documents.id, doc.id));
    }
    void userId;
    return { viewedAt: viewedAt.toISOString() };
  }

  static async requestSignature(
    firmId: string,
    documentId: string,
    intendedSignerUserId: string | undefined,
  ) {
    const db = getDatabase();
    const doc = await this.resolveDocument(firmId, documentId);
    if (!doc) throw new AppError("NOT_FOUND", "Document not found", 404);
    if (doc.isTemplate) throw new AppError("CONFLICT", "Templates cannot be sent for signature", 409);
    let signerId = intendedSignerUserId;
    if (!signerId) {
      throw new AppError(
        "VALIDATION_FAILED",
        "No signer found — pass intendedSignerUserId",
        422,
      );
    }
    const [signer] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, signerId), eq(users.firmId, firmId)))
      .limit(1);
    if (!signer || !signer.isActive || signer.isPending) {
      throw new AppError("NOT_FOUND", "Signer must be an active user in the same firm", 404);
    }
    await db
      .update(documents)
      .set({
        requiresSignature: true,
        signatureStatus: "pending",
        intendedSignerUserId: signer.id,
        signedAt: null,
        signedByUserId: null,
        signatureMethod: null,
        signatureArtifactStorageId: null,
        typedSignatureText: null,
        signConsentVersion: null,
        signConsentAt: null,
        viewedAt: null,
        signerUserAgent: null,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, doc.id));
    await notifications.createNotification(firmId, {
      userId: signer.id,
      type: "document_request",
      title: "Document ready to sign",
      body: `"${doc.title}" requires your electronic acknowledgment in the client portal.`,
      relatedId: doc.id,
    });
    return { success: true as const, intendedSignerUserId: signer.id };
  }

  static async signDocument(
    firmId: string,
    userId: string,
    input: {
      documentId: string;
      signatureMethod: "draw" | "type" | "upload";
      signatureArtifactStorageId?: string;
      typedSignatureText?: string;
      consentAccepted: boolean;
      documentSha256: string;
      userAgent?: string;
      otpChallengeId: string;
      envelopeId?: string;
    },
  ) {
    const db = getDatabase();
    const doc = await this.resolveDocument(firmId, input.documentId);
    if (!doc) throw new AppError("NOT_FOUND", "Document not found", 404);
    if (!doc.requiresSignature) {
      throw new AppError("CONFLICT", "Document does not require signature", 409);
    }
    if (!input.envelopeId && doc.signatureStatus === "signed") {
      throw new AppError("CONFLICT", "Document already signed", 409);
    }
    if (!input.consentAccepted) {
      throw new AppError("VALIDATION_FAILED", "Consent is required to sign", 422);
    }
    if (!doc.viewedAt) {
      throw new AppError("CONFLICT", "Preview the document before signing", 409);
    }
    if (input.signatureMethod === "type") {
      if (!input.typedSignatureText?.trim()) {
        throw new AppError("VALIDATION_FAILED", "Typed signature text is required", 422);
      }
    } else if (!input.signatureArtifactStorageId) {
      throw new AppError("VALIDATION_FAILED", "Signature image artifact is required", 422);
    }

    if (input.envelopeId) {
      let envelope = await this.resolveEnvelope(firmId, input.envelopeId);
      if (!envelope || envelope.documentId !== doc.id) {
        throw new AppError("NOT_FOUND", "Envelope does not match this document", 404);
      }
      envelope = await this.expireIfNeeded(envelope);
      if (envelope.status === "expired") {
        throw new AppError("CONFLICT", "This envelope has expired", 410);
      }
      if (envelope.status !== "sent") {
        throw new AppError("CONFLICT", "Envelope is not open for signing", 409);
      }
      const [mine] = await db
        .select()
        .from(signatureRecipients)
        .where(
          and(
            eq(signatureRecipients.envelopeId, envelope.id),
            eq(signatureRecipients.userId, userId),
            eq(signatureRecipients.status, "pending"),
          ),
        )
        .limit(1);
      if (!mine) {
        throw new AppError("FORBIDDEN", "You are not the active signer on this envelope", 403);
      }
    } else if (doc.intendedSignerUserId && doc.intendedSignerUserId !== userId) {
      throw new AppError("FORBIDDEN", "You are not the intended signer", 403);
    }

    await this.assertOtpVerified(firmId, userId, doc.id, input.otpChallengeId);

    const signedAt = new Date();
    if (input.envelopeId) {
      await db
        .update(documents)
        .set({
          signatureMethod: input.signatureMethod,
          signatureArtifactStorageId: input.signatureArtifactStorageId ?? null,
          typedSignatureText: input.typedSignatureText ?? null,
          signConsentVersion: SIGN_CONSENT_VERSION,
          signConsentAt: signedAt,
          signerUserAgent: input.userAgent ?? null,
          sha256: input.documentSha256.toLowerCase(),
          updatedAt: signedAt,
        })
        .where(eq(documents.id, doc.id));
      await this.completeRecipientAfterSign(firmId, input.envelopeId, userId);
    } else {
      await db
        .update(documents)
        .set({
          signatureStatus: "signed",
          signedAt,
          signedByUserId: userId,
          signatureMethod: input.signatureMethod,
          signatureArtifactStorageId: input.signatureArtifactStorageId ?? null,
          typedSignatureText: input.typedSignatureText ?? null,
          signConsentVersion: SIGN_CONSENT_VERSION,
          signConsentAt: signedAt,
          signerUserAgent: input.userAgent ?? null,
          sha256: input.documentSha256.toLowerCase(),
          updatedAt: signedAt,
        })
        .where(eq(documents.id, doc.id));
    }
    return { success: true as const, signedAt: signedAt.toISOString() };
  }

  static async completeRecipientAfterSign(firmId: string, envelopeId: string, userId: string) {
    const db = getDatabase();
    let envelope = await this.resolveEnvelope(firmId, envelopeId);
    if (!envelope || envelope.status !== "sent") return;
    const recipients = (
      await db
        .select()
        .from(signatureRecipients)
        .where(eq(signatureRecipients.envelopeId, envelope.id))
    ).sort((a, b) => a.order - b.order);
    const mine = recipients.find((r) => r.userId === userId);
    if (!mine) return;

    await db
      .update(signatureRecipients)
      .set({ status: "signed", signedAt: new Date(), updatedAt: new Date() })
      .where(eq(signatureRecipients.id, mine.id));

    const refreshed = (
      await db
        .select()
        .from(signatureRecipients)
        .where(eq(signatureRecipients.envelopeId, envelope.id))
    ).sort((a, b) => a.order - b.order);
    const allSigned = refreshed.every((r) => r.status === "signed");

    if (allSigned) {
      await db
        .update(signatureEnvelopes)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(signatureEnvelopes.id, envelope.id));
      await db
        .update(documents)
        .set({
          signatureStatus: "signed",
          signedAt: new Date(),
          signedByUserId: userId,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, envelope.documentId));
      await notifications.createNotification(firmId, {
        userId: envelope.createdBy,
        type: "system",
        title: "Envelope completed",
        body: `All signers completed "${envelope.title}".`,
        relatedId: envelope.id,
      });
      return;
    }

    if (envelope.routing === "sequential") {
      const next = refreshed.find((r) => r.status === "awaiting_turn");
      if (next) {
        await db
          .update(signatureRecipients)
          .set({ status: "pending", updatedAt: new Date() })
          .where(eq(signatureRecipients.id, next.id));
        await db
          .update(documents)
          .set({
            requiresSignature: true,
            signatureStatus: "pending",
            intendedSignerUserId: next.userId,
            signedAt: null,
            signedByUserId: null,
            viewedAt: null,
            signatureMethod: null,
            signatureArtifactStorageId: null,
            typedSignatureText: null,
            signConsentVersion: null,
            signConsentAt: null,
            updatedAt: new Date(),
          })
          .where(eq(documents.id, envelope.documentId));
        await notifications.createNotification(firmId, {
          userId: next.userId,
          type: "document_request",
          title: "Your turn to sign",
          body: `"${envelope.title}" is ready for your signature.`,
          relatedId: envelope.id,
        });
      }
    }
  }
}
