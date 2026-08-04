import "server-only";
import fs from "node:fs/promises";
import { getDatabase } from "../db/client";
import { documents, documentTags, documentTagAssignments, documentShares, cases, users, firms } from "../db/schema";
import { and, eq } from "drizzle-orm";

async function parseJsonlFile(filePath: string): Promise<any[]> {
  const content = await fs.readFile(filePath, "utf-8");
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

export async function migrateDocuments(filePath: string) {
  console.log(`Starting documents migration from ${filePath}`);
  const docs = await parseJsonlFile(filePath);
  const db = getDatabase();
  
  let success = 0;
  let errors = 0;

  for (const doc of docs) {
    try {
      let firmId = doc.firmId;
      if (!firmId.includes("-")) {
        const [firm] = await db.select().from(firms).where(eq(firms.legacyConvexId, firmId));
        if (firm) firmId = firm.id;
      }

      let uploadedBy = doc.uploadedBy;
      if (uploadedBy && !uploadedBy.includes("-")) {
        const [user] = await db.select().from(users).where(eq(users.legacyConvexId, uploadedBy));
        if (user) uploadedBy = user.id;
      }

      let caseId = doc.caseId;
      if (caseId && !caseId.includes("-")) {
        const [caseRow] = await db.select().from(cases).where(eq(cases.legacyConvexId, caseId));
        if (caseRow) caseId = caseRow.id;
      }

      const existing = await db.select().from(documents).where(eq(documents.legacyConvexId, doc._id));
      
      const payload = {
        firmId,
        caseId: caseId || null,
        title: doc.title || "Untitled Document",
        documentNumber: doc.documentNumber || `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        description: doc.description || null,
        type: doc.type || "other",
        storageId: doc.storageId || doc._id,
        mimeType: doc.mimeType || "application/octet-stream",
        sizeBytes: doc.sizeBytes || 0,
        uploadedBy: uploadedBy || null,
        isTemplate: doc.isTemplate || false,
        isPrivileged: doc.isPrivileged || false,
        confidentialityLevel: doc.confidentialityLevel || "internal",
        status: doc.status || "active",
        isOnLegalHold: doc.isOnLegalHold || false,
        legalHoldReason: doc.legalHoldReason || null,
        deletedAt: doc.isDeleted ? new Date() : null,
        legacyConvexId: doc._id,
        createdAt: doc._creationTime ? new Date(doc._creationTime) : new Date(),
        updatedAt: doc._creationTime ? new Date(doc._creationTime) : new Date(),
      };

      if (existing.length === 0) {
        await db.insert(documents).values(payload as any);
      } else {
        await db.update(documents).set(payload as any).where(eq(documents.id, existing[0].id));
      }

      if (doc.tags && Array.isArray(doc.tags)) {
        const [insertedDoc] = await db.select().from(documents).where(eq(documents.legacyConvexId, doc._id));
        if (insertedDoc) {
          for (const tagName of doc.tags) {
            let [tag] = await db.select().from(documentTags).where(and(eq(documentTags.firmId, firmId), eq(documentTags.name, tagName)));
            if (!tag) {
              [tag] = await db.insert(documentTags).values({
                firmId,
                name: tagName,
                color: "#cccccc",
              }).returning();
            }
            const existingAssignment = await db.select().from(documentTagAssignments)
              .where(and(
                eq(documentTagAssignments.documentId, insertedDoc.id),
                eq(documentTagAssignments.tagId, tag.id)
              ));
            if (existingAssignment.length === 0) {
              await db.insert(documentTagAssignments).values({
                firmId,
                documentId: insertedDoc.id,
                tagId: tag.id,
              });
            }
          }
        }
      }
      success++;
    } catch (err: any) {
      console.error(`Failed to migrate document ${doc._id}: ${err.message}`);
      errors++;
    }
  }

  console.log(`Documents Migration Summary: ${success} migrated, ${errors} failed.`);
}

export async function migrateDocumentShares(filePath: string) {
  console.log(`Starting document shares migration from ${filePath}`);
  const shares = await parseJsonlFile(filePath);
  const db = getDatabase();
  
  let success = 0;
  let errors = 0;

  for (const share of shares) {
    try {
      let firmId = share.firmId;
      if (!firmId.includes("-")) {
        const [firm] = await db.select().from(firms).where(eq(firms.legacyConvexId, firmId));
        if (firm) firmId = firm.id;
      }

      let documentId = share.documentId;
      const [doc] = await db.select().from(documents).where(eq(documents.legacyConvexId, share.documentId));
      if (!doc) {
         errors++;
         continue;
      }
      documentId = doc.id;

      let createdBy = share.createdBy;
      if (createdBy && !createdBy.includes("-")) {
        const [user] = await db.select().from(users).where(eq(users.legacyConvexId, createdBy));
        if (user) createdBy = user.id;
      }

      const payload = {
        firmId,
        documentId,
        token: share.token || crypto.randomUUID(),
        expiresAt: share.expiresAt ? new Date(share.expiresAt) : null,
        createdBy: createdBy || null,
        createdAt: share._creationTime ? new Date(share._creationTime) : new Date(),
        updatedAt: share._creationTime ? new Date(share._creationTime) : new Date(),
      };

      const existing = await db.select().from(documentShares).where(
        eq(documentShares.documentId, documentId)
      );

      if (existing.length === 0) {
        await db.insert(documentShares).values(payload as any);
      }
      success++;
    } catch (err: any) {
      console.error(`Failed to migrate share ${share._id}: ${err.message}`);
      errors++;
    }
  }

  console.log(`Document Shares Migration Summary: ${success} migrated, ${errors} failed.`);
}
