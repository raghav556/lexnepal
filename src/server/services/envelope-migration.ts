import "server-only";
import fs from "node:fs/promises";
import { getDatabase } from "../db/client";
import { documents, signatureEnvelopes, signatureRecipients, signingChallenges, cases, users, firms } from "../db/schema";
import { and, eq } from "drizzle-orm";

async function parseJsonlFile(filePath: string): Promise<any[]> {
  const content = await fs.readFile(filePath, "utf-8");
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

export async function migrateEnvelopes(filePath: string) {
  console.log(`Starting envelopes migration from ${filePath}`);
  const envelopes = await parseJsonlFile(filePath);
  const db = getDatabase();
  
  let success = 0;
  let errors = 0;

  for (const env of envelopes) {
    try {
      let firmId = env.firmId;
      if (!firmId.includes("-")) {
        const [firm] = await db.select().from(firms).where(eq(firms.legacyConvexId, firmId));
        if (firm) firmId = firm.id;
      }

      let createdBy = env.createdBy;
      if (createdBy && !createdBy.includes("-")) {
        const [user] = await db.select().from(users).where(eq(users.legacyConvexId, createdBy));
        if (user) createdBy = user.id;
      }

      let caseId = env.caseId;
      if (caseId && !caseId.includes("-")) {
        const [caseRow] = await db.select().from(cases).where(eq(cases.legacyConvexId, caseId));
        if (caseRow) caseId = caseRow.id;
      }

      let documentId = env.documentId;
      if (documentId && !documentId.includes("-")) {
        const [docRow] = await db.select().from(documents).where(eq(documents.legacyConvexId, documentId));
        if (docRow) documentId = docRow.id;
      }

      const existing = await db.select().from(signatureEnvelopes).where(eq(signatureEnvelopes.legacyConvexId, env._id));
      
      const payload = {
        firmId,
        documentId,
        caseId: caseId || null,
        title: env.title || "Untitled Envelope",
        status: env.status || "draft",
        routing: env.routing || "sequential",
        createdBy: createdBy || null,
        expiresAt: env.expiresAt ? new Date(env.expiresAt) : null,
        voidedAt: env.voidedAt ? new Date(env.voidedAt) : null,
        voidReason: env.voidReason || null,
        completedAt: env.completedAt ? new Date(env.completedAt) : null,
        lastRemindedAt: env.lastRemindedAt ? new Date(env.lastRemindedAt) : null,
        legacyConvexId: env._id,
        createdAt: env._creationTime ? new Date(env._creationTime) : new Date(),
        updatedAt: env._creationTime ? new Date(env._creationTime) : new Date(),
      };

      if (existing.length === 0) {
        await db.insert(signatureEnvelopes).values(payload as any);
      } else {
        await db.update(signatureEnvelopes).set(payload as any).where(eq(signatureEnvelopes.id, existing[0].id));
      }
      success++;
    } catch (err: any) {
      console.error(`Failed to migrate envelope ${env._id}: ${err.message}`);
      errors++;
    }
  }

  console.log(`Envelopes Migration Summary: ${success} migrated, ${errors} failed.`);
}

export async function migrateSignatureRecipients(filePath: string) {
  console.log(`Starting signature recipients migration from ${filePath}`);
  const recipients = await parseJsonlFile(filePath);
  const db = getDatabase();
  
  let success = 0;
  let errors = 0;

  for (const r of recipients) {
    try {
      let firmId = r.firmId;
      if (!firmId.includes("-")) {
        const [firm] = await db.select().from(firms).where(eq(firms.legacyConvexId, firmId));
        if (firm) firmId = firm.id;
      }

      let envelopeId = r.envelopeId;
      const [env] = await db.select().from(signatureEnvelopes).where(eq(signatureEnvelopes.legacyConvexId, r.envelopeId));
      if (!env) {
         errors++;
         continue;
      }
      envelopeId = env.id;

      let userId = r.userId;
      if (userId && !userId.includes("-")) {
        const [u] = await db.select().from(users).where(eq(users.legacyConvexId, userId));
        if (u) userId = u.id;
      }

      const payload = {
        firmId,
        envelopeId,
        userId,
        order: r.order || 1,
        status: r.status || "pending",
        declinedAt: r.declinedAt ? new Date(r.declinedAt) : null,
        declineReason: r.declineReason || null,
        signedAt: r.signedAt ? new Date(r.signedAt) : null,
        remindedAt: r.remindedAt ? new Date(r.remindedAt) : null,
        legacyConvexId: r._id,
        createdAt: r._creationTime ? new Date(r._creationTime) : new Date(),
        updatedAt: r._creationTime ? new Date(r._creationTime) : new Date(),
      };

      const existing = await db.select().from(signatureRecipients).where(
        eq(signatureRecipients.legacyConvexId, r._id)
      );

      if (existing.length === 0) {
        await db.insert(signatureRecipients).values(payload as any);
      } else {
        await db.update(signatureRecipients).set(payload as any).where(eq(signatureRecipients.id, existing[0].id));
      }
      success++;
    } catch (err: any) {
      console.error(`Failed to migrate recipient ${r._id}: ${err.message}`);
      errors++;
    }
  }

  console.log(`Signature Recipients Migration Summary: ${success} migrated, ${errors} failed.`);
}
