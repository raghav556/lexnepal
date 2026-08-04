import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { signatureEnvelopes, signatureRecipients, signingChallenges, users, documents } from "../db/schema";
import { AppError } from "@/shared/errors/api-error";
import { CommunicationRepository } from "./communication-repository";

export class EnvelopeRepository {
  static async listPortalSigners(firmId: string) {
    const db = getDatabase();
    // Assuming staff roles and admin are allowed, returning active users.
    const activeUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      legacyConvexId: users.legacyConvexId,
    }).from(users)
      .where(and(eq(users.firmId, firmId), eq(users.isActive, true), eq(users.isPending, false)));

    return activeUsers.map(u => ({
      _id: u.legacyConvexId || u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }));
  }

  static async createEnvelope(firmId: string, data: any, createdBy: string) {
    const db = getDatabase();
    
    // Resolve document ID if it's a legacy ID
    const isLegacyDoc = !data.documentId.includes("-");
    let docId = data.documentId;
    if (isLegacyDoc) {
      const [doc] = await db.select().from(documents).where(and(eq(documents.firmId, firmId), eq(documents.legacyConvexId, data.documentId)));
      if (!doc) throw new AppError("NOT_FOUND", "Document not found", 404);
      docId = doc.id;
    } else {
      const [doc] = await db.select().from(documents).where(and(eq(documents.firmId, firmId), eq(documents.id, docId)));
      if (!doc) throw new AppError("NOT_FOUND", "Document not found", 404);
    }

    return await db.transaction(async (tx) => {
      const [envelope] = await tx.insert(signatureEnvelopes).values({
        firmId,
        documentId: docId,
        title: data.title || "Untitled Envelope",
        status: "draft",
        routing: data.routing,
        createdBy,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      } as any).returning();

      // Resolve recipient users
      for (let i = 0; i < data.recipientUserIds.length; i++) {
        let userId = data.recipientUserIds[i];
        if (!userId.includes("-")) {
          const [u] = await tx.select().from(users).where(eq(users.legacyConvexId, userId));
          if (!u) throw new AppError("NOT_FOUND", `User ${userId} not found`, 404);
          userId = u.id;
        }

        await tx.insert(signatureRecipients).values({
          firmId,
          envelopeId: envelope!.id,
          userId,
          order: data.routing === "sequential" ? i + 1 : 1,
          status: "pending",
        } as any);
      }

      return envelope;
    });
  }

  static async listEnvelopes(firmId: string, limit = 50) {
    const db = getDatabase();
    const envs = await db.select().from(signatureEnvelopes)
      .where(eq(signatureEnvelopes.firmId, firmId))
      .orderBy(desc(signatureEnvelopes.createdAt))
      .limit(limit);

    if (envs.length === 0) return [];

    const envIds = envs.map(e => e.id);
    const recipients = await db.select().from(signatureRecipients).where(inArray(signatureRecipients.envelopeId, envIds));
    const recipsByEnv = recipients.reduce((acc, r) => {
      if (!acc[r.envelopeId]) acc[r.envelopeId] = [];
      acc[r.envelopeId].push(r);
      return acc;
    }, {} as Record<string, typeof recipients>);

    return envs.map(e => ({
      _id: e.legacyConvexId || e.id,
      documentId: e.documentId,
      title: e.title,
      status: e.status,
      routing: e.routing,
      recipients: (recipsByEnv[e.id] || []).map(r => ({
        userId: r.userId,
        status: r.status,
        signedAt: r.signedAt ? r.signedAt.getTime() : undefined,
      })),
      _creationTime: e.createdAt.getTime(),
    }));
  }

  static async sendEnvelope(firmId: string, id: string, userId: string) {
    const db = getDatabase();
    const isLegacy = !id.includes("-");
    const whereClause = isLegacy 
      ? and(eq(signatureEnvelopes.firmId, firmId), eq(signatureEnvelopes.legacyConvexId, id))
      : and(eq(signatureEnvelopes.firmId, firmId), eq(signatureEnvelopes.id, id));

    const [env] = await db.select().from(signatureEnvelopes).where(whereClause);
    if (!env) throw new AppError("NOT_FOUND", "Envelope not found", 404);
    if (env.status !== "draft") throw new AppError("BAD_REQUEST", "Can only send draft envelopes", 400);

    const [updatedEnv] = await db.update(signatureEnvelopes).set({
      status: "sent",
      updatedAt: new Date(),
    }).where(eq(signatureEnvelopes.id, env.id)).returning();

    // Notify first signers
    const firstOrder = env.routing === "sequential" ? 1 : 1;
    const pendingRecipients = await db.select().from(signatureRecipients)
      .where(and(eq(signatureRecipients.envelopeId, env.id), eq(signatureRecipients.order, firstOrder), eq(signatureRecipients.status, "pending")));

    for (const r of pendingRecipients) {
      await CommunicationRepository.createNotification(firmId, {
        userId: r.userId,
        type: "signature_requested",
        title: "Signature Requested",
        body: `You have been requested to sign ${env.title}`,
        relatedId: env.id,
      });
    }

    return updatedEnv;
  }

  static async voidEnvelope(firmId: string, id: string, reason: string) {
    const db = getDatabase();
    const isLegacy = !id.includes("-");
    const whereClause = isLegacy 
      ? and(eq(signatureEnvelopes.firmId, firmId), eq(signatureEnvelopes.legacyConvexId, id))
      : and(eq(signatureEnvelopes.firmId, firmId), eq(signatureEnvelopes.id, id));

    const [env] = await db.select().from(signatureEnvelopes).where(whereClause);
    if (!env) throw new AppError("NOT_FOUND", "Envelope not found", 404);

    return await db.update(signatureEnvelopes).set({
      status: "voided",
      voidReason: reason,
      voidedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(signatureEnvelopes.id, env.id)).returning();
  }

  static async declineEnvelope(firmId: string, id: string, userId: string, reason: string) {
    const db = getDatabase();
    return await db.transaction(async (tx) => {
      const isLegacy = !id.includes("-");
      const whereClause = isLegacy 
        ? and(eq(signatureEnvelopes.firmId, firmId), eq(signatureEnvelopes.legacyConvexId, id))
        : and(eq(signatureEnvelopes.firmId, firmId), eq(signatureEnvelopes.id, id));

      const [env] = await tx.select().from(signatureEnvelopes).where(whereClause);
      if (!env) throw new AppError("NOT_FOUND", "Envelope not found", 404);

      let uId = userId;
      if (!uId.includes("-")) {
        const [u] = await tx.select().from(users).where(eq(users.legacyConvexId, userId));
        if (u) uId = u.id;
      }

      await tx.update(signatureRecipients).set({
        status: "declined",
        declineReason: reason,
        declinedAt: new Date(),
        updatedAt: new Date(),
      }).where(and(eq(signatureRecipients.envelopeId, env.id), eq(signatureRecipients.userId, uId)));

      const [updatedEnv] = await tx.update(signatureEnvelopes).set({
        status: "voided",
        voidReason: `Declined by user`,
        voidedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(signatureEnvelopes.id, env.id)).returning();

      return updatedEnv;
    });
  }

  static async issueOtp(firmId: string, envelopeId: string, userId: string) {
    const db = getDatabase();
    const isLegacy = !envelopeId.includes("-");
    const envWhere = isLegacy 
      ? and(eq(signatureEnvelopes.firmId, firmId), eq(signatureEnvelopes.legacyConvexId, envelopeId))
      : and(eq(signatureEnvelopes.firmId, firmId), eq(signatureEnvelopes.id, envelopeId));

    const [env] = await db.select().from(signatureEnvelopes).where(envWhere);
    if (!env) throw new AppError("NOT_FOUND", "Envelope not found", 404);

    let uId = userId;
    if (!uId.includes("-")) {
      const [u] = await db.select().from(users).where(eq(users.legacyConvexId, userId));
      if (u) uId = u.id;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    // Dummy hash for now. In real system, hash it.
    const hash = Buffer.from(otp).toString('base64');
    
    // expiry 15 mins
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await db.insert(signingChallenges).values({
      firmId,
      userId: uId,
      documentId: env.documentId,
      envelopeId: env.id,
      codeHash: hash,
      expiresAt,
    });

    // Notify user with OTP
    await CommunicationRepository.createNotification(firmId, {
      userId: uId,
      type: "alert",
      title: "Signature OTP",
      body: `Your signature OTP is ${otp}`,
    });

    return { success: true };
  }

  static async verifyOtp(firmId: string, envelopeId: string, userId: string, otp: string) {
    const db = getDatabase();
    
    return await db.transaction(async (tx) => {
      const isLegacy = !envelopeId.includes("-");
      const envWhere = isLegacy 
        ? and(eq(signatureEnvelopes.firmId, firmId), eq(signatureEnvelopes.legacyConvexId, envelopeId))
        : and(eq(signatureEnvelopes.firmId, firmId), eq(signatureEnvelopes.id, envelopeId));

      const [env] = await tx.select().from(signatureEnvelopes).where(envWhere);
      if (!env) throw new AppError("NOT_FOUND", "Envelope not found", 404);

      let uId = userId;
      if (!uId.includes("-")) {
        const [u] = await tx.select().from(users).where(eq(users.legacyConvexId, userId));
        if (u) uId = u.id;
      }

      const hash = Buffer.from(otp).toString('base64');

      const [challenge] = await tx.select().from(signingChallenges)
        .where(and(
          eq(signingChallenges.firmId, firmId),
          eq(signingChallenges.envelopeId, env.id),
          eq(signingChallenges.userId, uId),
          eq(signingChallenges.codeHash, hash)
        )).orderBy(desc(signingChallenges.createdAt)).limit(1);

      if (!challenge) throw new AppError("BAD_REQUEST", "Invalid OTP", 400);
      if (challenge.expiresAt.getTime() < Date.now()) throw new AppError("BAD_REQUEST", "OTP expired", 400);

      await tx.update(signingChallenges).set({
        verifiedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(signingChallenges.id, challenge.id));

      await tx.update(signatureRecipients).set({
        status: "signed",
        signedAt: new Date(),
        updatedAt: new Date(),
      }).where(and(eq(signatureRecipients.envelopeId, env.id), eq(signatureRecipients.userId, uId)));

      // Check if all signed
      const allRecips = await tx.select().from(signatureRecipients).where(eq(signatureRecipients.envelopeId, env.id));
      const allSigned = allRecips.every(r => r.status === "signed");

      if (allSigned) {
        await tx.update(signatureEnvelopes).set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(signatureEnvelopes.id, env.id));
      } else if (env.routing === "sequential") {
        const myRecip = allRecips.find(r => r.userId === uId);
        const nextOrder = myRecip!.order + 1;
        const nextRecipients = allRecips.filter(r => r.order === nextOrder && r.status === "pending");
        for (const nr of nextRecipients) {
          await CommunicationRepository.createNotification(firmId, {
            userId: nr.userId,
            type: "signature_requested",
            title: "Signature Requested",
            body: `You have been requested to sign ${env.title}`,
            relatedId: env.id,
          });
        }
      }

      return { success: true, allSigned };
    });
  }
}
