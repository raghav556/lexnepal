import "server-only";
import { and, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  documentScanJobs,
  durableJobs,
  auditLog,
  documents,
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
import type { StorageMigrationJournal } from "@/server/storage/storage-migration";

export class PostgresDocumentStorageRepository
  implements DocumentPipelineRepository, DownloadDocumentRepository, StorageMigrationJournal
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
      const [intent] = await transaction
        .update(documentUploadIntents)
        .set({ status: "scanning", actualSha256: sha256, uploadedAt: at, updatedAt: at })
        .where(
          and(eq(documentUploadIntents.id, intentId), eq(documentUploadIntents.status, "pending")),
        )
        .returning({
          id: documentUploadIntents.id,
          firmId: documentUploadIntents.firmId,
          createdBy: documentUploadIntents.createdBy,
        });
      if (!intent) throw new Error("Upload intent was concurrently completed");
      await transaction.insert(documentScanJobs).values({
        firmId: intent.firmId,
        uploadIntentId: intent.id,
        status: "pending",
        availableAt: at,
      });
      const [durableJob] = await transaction
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
        .onConflictDoNothing({
          target: [durableJobs.firmId, durableJobs.type, durableJobs.idempotencyKey],
        })
        .returning({ id: durableJobs.id });
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
    const atIso = at.toISOString();
    const expiredLeaseIso = new Date(at.getTime() - 5 * 60_000).toISOString();
    const targetIntentId = uploadIntentId ?? null;
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`
        UPDATE document_scan_jobs
        SET status = 'dead_letter', last_error = 'Worker lease expired after final attempt', updated_at = ${atIso}
        WHERE status = 'processing'
          AND locked_at <= ${expiredLeaseIso}
          AND attempts >= max_attempts
          AND deleted_at IS NULL
      `);
      const result = await transaction.execute<{
        id: string;
        firm_id: string;
        upload_intent_id: string;
        attempts: number;
        max_attempts: number;
      }>(sql`
        WITH candidate AS (
          SELECT id FROM document_scan_jobs
          WHERE (
            (status IN ('pending', 'retry') AND available_at <= ${atIso})
            OR (status = 'processing' AND locked_at <= ${expiredLeaseIso})
          )
          AND (${targetIntentId}::uuid IS NULL OR upload_intent_id = ${targetIntentId}::uuid)
          AND attempts < max_attempts AND deleted_at IS NULL
          ORDER BY available_at, created_at
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE document_scan_jobs AS job
        SET status = 'processing', attempts = job.attempts + 1,
            locked_at = ${atIso}, locked_by = ${workerId}, updated_at = ${atIso}
        FROM candidate
        WHERE job.id = candidate.id
        RETURNING job.id, job.firm_id, job.upload_intent_id, job.attempts, job.max_attempts
      `);
      const row = result[0];
      return row
        ? {
            id: row.id,
            firmId: row.firm_id,
            uploadIntentId: row.upload_intent_id,
            attempts: row.attempts,
            maxAttempts: row.max_attempts,
          }
        : null;
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
      if (intent.parentDocumentId) {
        const [parent] = await transaction
          .select({ version: documents.version })
          .from(documents)
          .where(eq(documents.id, intent.parentDocumentId))
          .limit(1);
        if (!parent) throw new Error("Parent document was not found during promotion");
        version = parent.version + 1;
      }
      const [document] = await transaction
        .insert(documents)
        .values({
          firmId: intent.firmId,
          caseId: intent.caseId,
          documentNumber: `DOC-${input.intentId}`,
          title: intent.originalFileName,
          type: "other",
          storageId: input.protectedKey,
          mimeType: intent.declaredMimeType,
          sizeBytes: intent.declaredSizeBytes,
          sha256: input.sha256,
          version,
          parentDocumentId: intent.parentDocumentId,
          uploadedBy: intent.createdBy,
          isTemplate: false,
          isPrivileged: false,
          uploadStatus: "clean",
          scanProvider: input.provider,
          scanCompletedAt: input.at,
          scanDetails: input.details,
        })
        .returning({ id: documents.id });
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
      .onConflictDoUpdate({
        target: [storageMigrationItems.firmId, storageMigrationItems.legacyStorageId],
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
