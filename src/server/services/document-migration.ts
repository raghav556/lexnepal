import { returningInsert } from "@/server/db/mysql-returning";
import "server-only";
import fs from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../db/client";
import {
  cases,
  documentShares,
  documents,
  documentTagAssignments,
  documentTags,
  firms,
  users,
} from "../db/schema";

async function parseJsonlFile(filePath: string): Promise<Record<string, unknown>[]> {
  const content = await fs.readFile(filePath, "utf-8");
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function enumOr<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export interface DocumentMigrationReport {
  source: Record<string, number>;
  migrated: Record<string, number>;
  exceptions: Array<{ table: string; id?: string; reason: string }>;
  reconciliation: {
    passed: boolean;
    checks: Record<string, { source: number; target: number }>;
  };
}

export async function migrateDocuments(
  filePath: string,
  options?: { firmMap?: Record<string, string> },
): Promise<DocumentMigrationReport> {
  console.log(`Starting documents migration from ${filePath}`);
  const docs = await parseJsonlFile(filePath);
  const db = getDatabase();
  const firmMap = options?.firmMap ?? {};
  const exceptions: DocumentMigrationReport["exceptions"] = [];
  let success = 0;

  for (const doc of docs) {
    const legacyId = asString(doc._id);
    try {
      if (!legacyId) throw new Error("Missing legacy ID");

      let firmId = asString(doc.firmId);
      if (!firmId) throw new Error("Missing firmId");
      if (firmMap[firmId]) firmId = firmMap[firmId]!;
      else if (!isUuid(firmId)) {
        const [firm] = await db.select().from(firms).where(eq(firms.legacyConvexId, firmId));
        if (!firm) throw new Error(`Unknown firmId ${firmId}`);
        firmId = firm.id;
      }

      let uploadedBy = asString(doc.uploadedBy);
      if (uploadedBy && !isUuid(uploadedBy)) {
        const [user] = await db.select().from(users).where(eq(users.legacyConvexId, uploadedBy));
        if (!user) throw new Error(`Unknown uploadedBy ${uploadedBy}`);
        uploadedBy = user.id;
      }
      if (!uploadedBy) throw new Error("uploadedBy is required");

      let caseId = asString(doc.caseId) ?? null;
      if (caseId && !isUuid(caseId)) {
        const [caseRow] = await db.select().from(cases).where(eq(cases.legacyConvexId, caseId));
        caseId = caseRow?.id ?? null;
      }

      const existing = await db
        .select()
        .from(documents)
        .where(eq(documents.legacyConvexId, legacyId));

      const payload = {
        firmId,
        caseId,
        title: asString(doc.title) || "Untitled Document",
        documentNumber:
          asString(doc.documentNumber) || `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        description: asString(doc.description) || null,
        type: enumOr(
          asString(doc.type),
          [
            "pleading",
            "affidavit",
            "contract",
            "poa",
            "correspondence",
            "evidence",
            "template",
            "court_filing",
            "notice",
            "memo",
            "other",
          ] as const,
          "other",
        ),
        storageId: asString(doc.storageId) || legacyId,
        mimeType: asString(doc.mimeType) || "application/octet-stream",
        sizeBytes: typeof doc.sizeBytes === "number" ? doc.sizeBytes : 0,
        uploadedBy,
        isTemplate: Boolean(doc.isTemplate),
        isPrivileged: Boolean(doc.isPrivileged),
        confidentialityLevel: enumOr(
          asString(doc.confidentialityLevel),
          ["public", "internal", "confidential", "privileged"] as const,
          "internal",
        ),
        status: enumOr(
          asString(doc.status),
          ["draft", "review", "approved", "filed", "archived"] as const,
          "draft",
        ),
        uploadStatus: "clean" as const,
        isOnLegalHold: Boolean(doc.isOnLegalHold),
        legalHoldReason: asString(doc.legalHoldReason) || null,
        deletedAt: doc.isDeleted ? new Date() : null,
        legacyConvexId: legacyId,
        createdAt: typeof doc._creationTime === "number" ? new Date(doc._creationTime) : new Date(),
        updatedAt: typeof doc._creationTime === "number" ? new Date(doc._creationTime) : new Date(),
      };

      if (existing.length === 0) {
        await db.insert(documents).values(payload);
      } else {
        await db.update(documents).set(payload).where(eq(documents.id, existing[0]!.id));
      }

      if (Array.isArray(doc.tags)) {
        const [insertedDoc] = await db
          .select()
          .from(documents)
          .where(eq(documents.legacyConvexId, legacyId));
        if (insertedDoc) {
          for (const tagName of doc.tags) {
            if (typeof tagName !== "string") continue;
            let [tag] = await db
              .select()
              .from(documentTags)
              .where(and(eq(documentTags.firmId, firmId), eq(documentTags.name, tagName)));
            if (!tag) {
              [tag] = await returningInsert(
                db
                  .insert(documentTags)
                  .values({ firmId, name: tagName, color: "#cccccc" })
                  .$returningId(),
                (id) => db.select().from(documentTags).where(eq(documentTags.id, id)).limit(1),
              );
            }
            if (!tag) continue;
            const existingAssignment = await db
              .select()
              .from(documentTagAssignments)
              .where(
                and(
                  eq(documentTagAssignments.documentId, insertedDoc.id),
                  eq(documentTagAssignments.tagId, tag.id),
                ),
              );
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
      success += 1;
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      console.error(`Failed to migrate document ${legacyId}: ${reason}`);
      exceptions.push({ table: "documents", id: legacyId, reason });
    }
  }

  console.log(`Documents Migration Summary: ${success} migrated, ${exceptions.length} failed.`);
  const checks = { documents: { source: docs.length, target: success } };
  return {
    source: { documents: docs.length },
    migrated: { documents: success },
    exceptions,
    reconciliation: { passed: exceptions.length === 0 && success === docs.length, checks },
  };
}

export async function migrateDocumentShares(
  filePath: string,
  options?: { firmMap?: Record<string, string> },
): Promise<DocumentMigrationReport> {
  console.log(`Starting document shares migration from ${filePath}`);
  const shares = await parseJsonlFile(filePath);
  const db = getDatabase();
  const firmMap = options?.firmMap ?? {};
  const exceptions: DocumentMigrationReport["exceptions"] = [];
  let success = 0;

  for (const share of shares) {
    const legacyId = asString(share._id);
    try {
      let firmId = asString(share.firmId);
      if (!firmId) throw new Error("Missing firmId");
      if (firmMap[firmId]) firmId = firmMap[firmId]!;
      else if (!isUuid(firmId)) {
        const [firm] = await db.select().from(firms).where(eq(firms.legacyConvexId, firmId));
        if (!firm) throw new Error(`Unknown firmId ${firmId}`);
        firmId = firm.id;
      }

      const docLegacy = asString(share.documentId);
      if (!docLegacy) throw new Error("Missing documentId");
      const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.legacyConvexId, docLegacy));
      if (!doc) throw new Error(`Document ${docLegacy} not found`);

      let createdBy = asString(share.createdBy) ?? null;
      if (createdBy && !isUuid(createdBy)) {
        const [user] = await db.select().from(users).where(eq(users.legacyConvexId, createdBy));
        createdBy = user?.id ?? null;
      }

      const payload = {
        firmId,
        documentId: doc.id,
        token: asString(share.token) || crypto.randomUUID(),
        expiresAt: share.expiresAt ? new Date(String(share.expiresAt)) : null,
        createdBy,
        createdAt:
          typeof share._creationTime === "number" ? new Date(share._creationTime) : new Date(),
        updatedAt:
          typeof share._creationTime === "number" ? new Date(share._creationTime) : new Date(),
        legacyConvexId: legacyId,
      };

      if (!createdBy) throw new Error("createdBy is required for document share");

      const existing = await db
        .select()
        .from(documentShares)
        .where(eq(documentShares.documentId, doc.id));

      if (existing.length === 0) {
        await db.insert(documentShares).values({ ...payload, createdBy });
      }
      success += 1;
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      console.error(`Failed to migrate share ${legacyId}: ${reason}`);
      exceptions.push({ table: "documentShares", id: legacyId, reason });
    }
  }

  console.log(
    `Document Shares Migration Summary: ${success} migrated, ${exceptions.length} failed.`,
  );
  return {
    source: { documentShares: shares.length },
    migrated: { documentShares: success },
    exceptions,
    reconciliation: {
      passed: exceptions.length === 0 && success === shares.length,
      checks: { documentShares: { source: shares.length, target: success } },
    },
  };
}
