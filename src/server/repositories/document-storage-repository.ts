import { returningInsert, returningMutation, returningUpsert } from "@/server/db/mysql-returning";
import "server-only";
import { and, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  documentScanJobs,
  durableJobs,
  auditLog,
  documents,
  documentTagAssignments,
  documentTags,
  documentUploadIntents,
  storageMigrationItems,
} from "@/server/db/schema";
import type {
  DocumentPipelineRepository,
  ScanJobRecord,
  UploadIntentRecord,
} from "@/server/storage/document-pipeline";
import type {
  DownloadableDocument,
  DownloadDocumentRepository,
} from "@/server/storage/document-download";
import type { DocumentArchiveRepository } from "@/server/storage/document-archive";
import type { StorageMigrationJournal } from "@/server/storage/storage-migration";

export class MySqlDocumentStorageRepository
  implements
    DocumentPipelineRepository,
    DownloadDocumentRepository,
    DocumentArchiveRepository,
    StorageMigrationJournal
{
  private readonly database = getDatabase();

  async createIntent(intent: UploadIntentRecord): Promise<void> {
    await this.database.insert(documentUploadIntents).values({
      id: intent.id,
      firmId: intent.firmId,
      createdBy: intent.createdBy,
      caseId: intent.caseId,
      parentDocumentId: intent.parentDocumentId,
      documentId: intent.documentId,
      originalFileName: intent.originalFileName,
      metadata: intent.metadata,
      declaredMimeType: intent.declaredMimeType,
      declaredSizeBytes: intent.declaredSizeBytes,
      expectedSha256: intent.expectedSha256,
      actualSha256: intent.actualSha256,
      quarantineKey: intent.quarantineKey,
      protectedKey: intent.protectedKey,
      status: intent.status,
      expiresAt: intent.expiresAt,
    });
  }

  async getIntent(intentId: string): Promise<UploadIntentRecord | null> {
    const [intent] = await this.database
      .select()
      .from(documentUploadIntents)
      .where(and(eq(documentUploadIntents.id, intentId), isNull(documentUploadIntents.deletedAt)))
      .limit(1);
    return intent ? mapIntent(intent) : null;
  }

  async markUploadedAndEnqueue(intentId: string, sha256: string, at: Date): Promise<void> {
    await this.database.transaction(async (transaction) => {
      const [intent] = await returningMutation(
        transaction
          .update(documentUploadIntents)
          .set({ status: "scanning", actualSha256: sha256, uploadedAt: at, updatedAt: at })
          .where(
            and(
              eq(documentUploadIntents.id, intentId),
              eq(documentUploadIntents.status, "pending"),
            ),
          ),
        () =>
          transaction
            .select()
            .from(documentUploadIntents)
            .where(eq(documentUploadIntents.id, intentId)),
      );
      if (!intent) throw new Error("Upload intent was concurrently completed");
      await transaction.insert(documentScanJobs).values({
        firmId: intent.firmId,
        uploadIntentId: intent.id,
        status: "pending",
        availableAt: at,
      });
      const [durableJob] = await returningUpsert(
        transaction
          .insert(durableJobs)
          .values({
            firmId: intent.firmId,
            type: "document.malware_scan",
            idempotencyKey: `document-scan:${intent.id}`,
            payload: { uploadIntentId: intent.id },
            actorUserId: intent.createdBy,
            maxAttempts: 5,
            timeoutSeconds: 300,
          })
          .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } }),
        () =>
          transaction
            .select()
            .from(durableJobs)
            .where(
              and(
                eq(durableJobs.firmId, intent.firmId),
                eq(durableJobs.type, "document.malware_scan"),
                eq(durableJobs.idempotencyKey, `document-scan:${intent.id}`),
              ),
            )
            .limit(1),
      );
      if (durableJob) {
        await transaction.insert(auditLog).values({
          firmId: intent.firmId,
          userId: intent.createdBy,
          action: "job.enqueued",
          resource: "durable_jobs",
          resourceId: durableJob.id,
          details: `type=document.malware_scan; uploadIntent=${intent.id}`,
          ipAddress: "document-pipeline",
        });
      }
    });
  }

  async claimScanJob(
    workerId: string,
    at: Date,
    uploadIntentId?: string,
  ): Promise<ScanJobRecord | null> {
    const expiredLeaseAt = new Date(at.getTime() - 5 * 60_000);
    return this.database.transaction(async (transaction) => {
      await transaction
        .update(documentScanJobs)
        .set({
          status: "dead_letter",
          lastError: "Worker lease expired after final attempt",
          updatedAt: at,
        })
        .where(
          and(
            eq(documentScanJobs.status, "processing"),
            lte(documentScanJobs.lockedAt, expiredLeaseAt),
            sql`${documentScanJobs.attempts} >= ${documentScanJobs.maxAttempts}`,
            isNull(documentScanJobs.deletedAt),
          ),
        );
      const [candidate] = await transaction
        .select()
        .from(documentScanJobs)
        .where(
          and(
            or(
              and(
                inArray(documentScanJobs.status, ["pending", "retry"]),
                lte(documentScanJobs.availableAt, at),
              ),
              and(
                eq(documentScanJobs.status, "processing"),
                lte(documentScanJobs.lockedAt, expiredLeaseAt),
              ),
            ),
            uploadIntentId ? eq(documentScanJobs.uploadIntentId, uploadIntentId) : undefined,
            sql`${documentScanJobs.attempts} < ${documentScanJobs.maxAttempts}`,
            isNull(documentScanJobs.deletedAt),
          ),
        )
        .orderBy(documentScanJobs.availableAt, documentScanJobs.createdAt)
        .limit(1)
        .for("update", { skipLocked: true });
      if (!candidate) return null;
      const attempts = candidate.attempts + 1;
      await transaction
        .update(documentScanJobs)
        .set({ status: "processing", attempts, lockedAt: at, lockedBy: workerId, updatedAt: at })
        .where(eq(documentScanJobs.id, candidate.id));
      return {
        id: candidate.id,
        firmId: candidate.firmId,
        uploadIntentId: candidate.uploadIntentId,
        attempts,
        maxAttempts: candidate.maxAttempts,
      };
    });
  }

  async markRejected(input: {
    intentId: string;
    jobId?: string;
    code: string;
    details: string;
    provider?: string;
    at: Date;
  }): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction
        .update(documentUploadIntents)
        .set({
          status: "rejected",
          failureCode: input.code,
          failureDetails: input.details,
          completedAt: input.at,
          updatedAt: input.at,
        })
        .where(eq(documentUploadIntents.id, input.intentId));
      if (input.jobId) {
        await transaction
          .update(documentScanJobs)
          .set({
            status: "completed",
            completedAt: input.at,
            lastError: input.details,
            updatedAt: input.at,
          })
          .where(eq(documentScanJobs.id, input.jobId));
      }
    });
  }

  async markPromoted(input: {
    intentId: string;
    jobId: string;
    protectedKey: string;
    sha256: string;
    provider: string;
    details: string;
    at: Date;
  }): Promise<{ documentId: string }> {
    return this.database.transaction(async (transaction) => {
      const [intent] = await transaction
        .select()
        .from(documentUploadIntents)
        .where(eq(documentUploadIntents.id, input.intentId))
        .limit(1);
      if (!intent || intent.status !== "scanning")
        throw new Error("Upload intent is not ready for promotion");
      let version = 1;
      let parent: typeof documents.$inferSelect | undefined;
      if (intent.parentDocumentId) {
        [parent] = await transaction
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.firmId, intent.firmId),
              eq(documents.id, intent.parentDocumentId),
              isNull(documents.deletedAt),
            ),
          )
          .limit(1);
        if (!parent) throw new Error("Parent document was not found during promotion");
        version = parent.version + 1;
      }
      const [document] = await returningInsert(
        transaction
          .insert(documents)
          .values({
            firmId: intent.firmId,
            caseId: parent?.caseId ?? intent.caseId,
            documentNumber: `DOC-${input.intentId}`,
            title: parent?.title ?? intent.metadata?.title ?? intent.originalFileName,
            description: parent ? parent.description : intent.metadata?.description,
            type: parent?.type ?? intent.metadata?.type ?? "other",
            storageId: input.protectedKey,
            mimeType: intent.declaredMimeType,
            sizeBytes: intent.declaredSizeBytes,
            sha256: input.sha256,
            version,
            parentDocumentId: intent.parentDocumentId,
            uploadedBy: intent.createdBy,
            isTemplate: parent?.isTemplate ?? intent.metadata?.isTemplate ?? false,
            isPrivileged: parent?.isPrivileged ?? intent.metadata?.isPrivileged ?? false,
            confidentialityLevel:
              parent?.confidentialityLevel ?? intent.metadata?.confidentialityLevel ?? "internal",
            retentionPolicy: parent?.retentionPolicy,
            retentionUntil: parent?.retentionUntil,
            isOnLegalHold: parent?.isOnLegalHold ?? false,
            legalHoldReason: parent?.legalHoldReason,
            legalHoldSetAt: parent?.legalHoldSetAt,
            legalHoldSetBy: parent?.legalHoldSetBy,
            uploadStatus: "clean",
            scanProvider: input.provider,
            scanCompletedAt: input.at,
            scanDetails: input.details,
          })
          .$returningId(),
        (id) => transaction.select().from(documents).where(eq(documents.id, id)).limit(1),
      );
      if (!parent && intent.metadata?.tags?.length) {
        for (const name of new Set(intent.metadata.tags)) {
          await transaction
            .insert(documentTags)
            .values({ firmId: intent.firmId, name })
            .onDuplicateKeyUpdate({ set: { deletedAt: null, updatedAt: input.at } });
          const [tag] = await transaction
            .select({ id: documentTags.id })
            .from(documentTags)
            .where(and(eq(documentTags.firmId, intent.firmId), eq(documentTags.name, name)))
            .limit(1);
          await transaction.insert(documentTagAssignments).values({
            firmId: intent.firmId,
            documentId: document.id,
            tagId: tag!.id,
          });
        }
      }
      if (parent) {
        const parentTags = await transaction
          .select({ tagId: documentTagAssignments.tagId })
          .from(documentTagAssignments)
          .where(
            and(
              eq(documentTagAssignments.firmId, intent.firmId),
              eq(documentTagAssignments.documentId, parent.id),
              isNull(documentTagAssignments.deletedAt),
            ),
          );
        if (parentTags.length > 0) {
          await transaction.insert(documentTagAssignments).values(
            parentTags.map(({ tagId }) => ({
              firmId: intent.firmId,
              documentId: document.id,
              tagId,
            })),
          );
        }
        await transaction.insert(auditLog).values({
          firmId: intent.firmId,
          userId: intent.createdBy,
          action: "document.version_uploaded",
          resource: "documents",
          resourceId: document.id,
          details: `parent=${parent.id}; newVersion=${version}`,
          ipAddress: "document-pipeline",
          createdAt: input.at,
          updatedAt: input.at,
        });
      }
      await transaction
        .update(documentUploadIntents)
        .set({
          documentId: document.id,
          protectedKey: input.protectedKey,
          actualSha256: input.sha256,
          status: "promoted",
          completedAt: input.at,
          updatedAt: input.at,
        })
        .where(eq(documentUploadIntents.id, input.intentId));
      await transaction
        .update(documentScanJobs)
        .set({ status: "completed", completedAt: input.at, updatedAt: input.at })
        .where(eq(documentScanJobs.id, input.jobId));
      return { documentId: document.id };
    });
  }

  async retryScanJob(input: {
    jobId: string;
    error: string;
    availableAt: Date;
    deadLetter: boolean;
    at: Date;
  }): Promise<void> {
    await this.database
      .update(documentScanJobs)
      .set({
        status: input.deadLetter ? "dead_letter" : "retry",
        availableAt: input.availableAt,
        lockedAt: null,
        lockedBy: null,
        lastError: input.error,
        updatedAt: input.at,
      })
      .where(eq(documentScanJobs.id, input.jobId));
  }

  async listCleanupCandidates(at: Date, limit: number): Promise<UploadIntentRecord[]> {
    const rejectedBefore = new Date(at.getTime() - 30 * 24 * 60 * 60 * 1000);
    const rows = await this.database
      .select()
      .from(documentUploadIntents)
      .where(
        and(
          isNull(documentUploadIntents.deletedAt),
          or(
            and(
              inArray(documentUploadIntents.status, ["pending", "uploaded"]),
              lte(documentUploadIntents.expiresAt, at),
            ),
            and(
              eq(documentUploadIntents.status, "rejected"),
              lte(documentUploadIntents.updatedAt, rejectedBefore),
            ),
          ),
        ),
      )
      .limit(limit);
    return rows.map(mapIntent);
  }

  async markExpired(intentId: string, at: Date): Promise<void> {
    await this.database
      .update(documentUploadIntents)
      .set({ status: "expired", completedAt: at, updatedAt: at })
      .where(eq(documentUploadIntents.id, intentId));
  }

  async getDownloadableDocument(documentId: string): Promise<DownloadableDocument | null> {
    const [document] = await this.database
      .select({
        id: documents.id,
        firmId: documents.firmId,
        storageKey: documents.storageId,
        uploadStatus: documents.uploadStatus,
      })
      .from(documents)
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .limit(1);
    return document ?? null;
  }

  async getArchiveDocument(documentId: string) {
    const [document] = await this.database
      .select({
        id: documents.id,
        firmId: documents.firmId,
        storageKey: documents.storageId,
        uploadStatus: documents.uploadStatus,
        title: documents.title,
        mimeType: documents.mimeType,
        sizeBytes: documents.sizeBytes,
      })
      .from(documents)
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .limit(1);
    return document ?? null;
  }

  async record(input: {
    firmId: string;
    legacyStorageId: string;
    destinationKey: string;
    expectedSha256: string | null;
    actualSha256: string | null;
    sizeBytes: number | null;
    status: "verified" | "failed";
    error?: string;
  }): Promise<void> {
    await this.database
      .insert(storageMigrationItems)
      .values({
        ...input,
        lastError: input.error,
        attempts: 1,
        verifiedAt: input.status === "verified" ? new Date() : null,
      })
      .onDuplicateKeyUpdate({
        set: {
          destinationKey: input.destinationKey,
          expectedSha256: input.expectedSha256,
          actualSha256: input.actualSha256,
          sizeBytes: input.sizeBytes,
          status: input.status,
          lastError: input.error,
          attempts: sql`${storageMigrationItems.attempts} + 1`,
          updatedAt: new Date(),
        },
      });
  }
}

function mapIntent(intent: typeof documentUploadIntents.$inferSelect): UploadIntentRecord {
  return {
    id: intent.id,
    firmId: intent.firmId,
    createdBy: intent.createdBy,
    caseId: intent.caseId,
    parentDocumentId: intent.parentDocumentId,
    documentId: intent.documentId,
    originalFileName: intent.originalFileName,
    metadata: intent.metadata,
    declaredMimeType: intent.declaredMimeType,
    declaredSizeBytes: intent.declaredSizeBytes,
    expectedSha256: intent.expectedSha256,
    actualSha256: intent.actualSha256,
    quarantineKey: intent.quarantineKey,
    protectedKey: intent.protectedKey,
    status: intent.status,
    expiresAt: intent.expiresAt,
  };
}
