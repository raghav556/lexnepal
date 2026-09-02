import "server-only";
import { randomUUID } from "node:crypto";
import { AppError } from "@/shared/errors/api-error";
import type { AuthPrincipal } from "@/server/auth/types";
import {
  requireCapability,
  requireCaseAccess,
  requireDocumentAccess,
  requireSameFirm,
  type AuthorizationDataSource,
} from "@/server/policies/authorization";
import type { DocumentScanner } from "@/server/storage/document-scanner";
import { RetryableScanError } from "@/server/storage/document-scanner";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  FileValidationError,
  MAX_DOCUMENT_BYTES,
  validateUploadedFile,
} from "@/server/storage/file-validation";
import type { ObjectStorage, UploadGrant } from "@/server/storage/object-storage";

export type UploadIntentStatus =
  "pending" | "uploaded" | "scanning" | "promoted" | "rejected" | "expired";

export interface UploadIntentRecord {
  id: string;
  firmId: string;
  createdBy: string;
  caseId: string | null;
  parentDocumentId: string | null;
  documentId: string | null;
  originalFileName: string;
  declaredMimeType: string;
  declaredSizeBytes: number;
  expectedSha256: string | null;
  actualSha256: string | null;
  quarantineKey: string;
  protectedKey: string | null;
  status: UploadIntentStatus;
  expiresAt: Date;
}

export interface ScanJobRecord {
  id: string;
  firmId: string;
  uploadIntentId: string;
  attempts: number;
  maxAttempts: number;
}

export interface DocumentPipelineRepository {
  createIntent(intent: UploadIntentRecord): Promise<void>;
  getIntent(intentId: string): Promise<UploadIntentRecord | null>;
  markUploadedAndEnqueue(intentId: string, sha256: string, at: Date): Promise<void>;
  claimScanJob(workerId: string, at: Date, uploadIntentId?: string): Promise<ScanJobRecord | null>;
  markRejected(input: {
    intentId: string;
    jobId?: string;
    code: string;
    details: string;
    provider?: string;
    at: Date;
  }): Promise<void>;
  markPromoted(input: {
    intentId: string;
    jobId: string;
    protectedKey: string;
    sha256: string;
    provider: string;
    details: string;
    at: Date;
  }): Promise<{ documentId: string }>;
  retryScanJob(input: {
    jobId: string;
    error: string;
    availableAt: Date;
    deadLetter: boolean;
    at: Date;
  }): Promise<void>;
  listCleanupCandidates(at: Date, limit: number): Promise<UploadIntentRecord[]>;
  markExpired(intentId: string, at: Date): Promise<void>;
}

export interface CreateUploadIntentInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256?: string;
  caseId?: string;
  parentDocumentId?: string;
}

export class DocumentPipelineService {
  constructor(
    private readonly repository: DocumentPipelineRepository,
    private readonly storage: ObjectStorage,
    private readonly authorization: AuthorizationDataSource,
    private readonly scanner: DocumentScanner,
    private readonly options: {
      uploadTtlSeconds: number;
      uploadUrlTtlSeconds: number;
      now?: () => Date;
      observe?: (event: string, attributes: Record<string, unknown>) => void;
    },
  ) {}

  async createUploadIntent(
    principal: AuthPrincipal,
    input: CreateUploadIntentInput,
  ): Promise<{ intentId: string; upload: UploadGrant }> {
    requireCapability(principal, "documents.upload");
    validateIntentMetadata(input);
    if (input.caseId) await requireCaseAccess(principal, input.caseId, this.authorization);
    if (input.parentDocumentId) {
      await requireDocumentAccess(principal, input.parentDocumentId, this.authorization);
    }
    const now = this.now();
    const id = randomUUID();
    const safeName = sanitizeFileName(input.fileName);
    const quarantineKey = `quarantine/${principal.firmId}/${id}/${safeName}`;
    const intent: UploadIntentRecord = {
      id,
      firmId: principal.firmId,
      createdBy: principal.user.id,
      caseId: input.caseId ?? null,
      parentDocumentId: input.parentDocumentId ?? null,
      documentId: null,
      originalFileName: safeName,
      declaredMimeType: input.mimeType.toLowerCase(),
      declaredSizeBytes: input.sizeBytes,
      expectedSha256: input.sha256?.toLowerCase() ?? null,
      actualSha256: null,
      quarantineKey,
      protectedKey: null,
      status: "pending",
      expiresAt: new Date(now.getTime() + this.options.uploadTtlSeconds * 1000),
    };
    await this.repository.createIntent(intent);
    const upload = await this.storage.createUploadGrant({
      key: quarantineKey,
      contentType: intent.declaredMimeType,
      maxBytes: intent.declaredSizeBytes,
      intentId: id,
      expiresInSeconds: this.options.uploadUrlTtlSeconds,
    });
    return { intentId: id, upload };
  }

  async completeUpload(
    principal: AuthPrincipal,
    intentId: string,
  ): Promise<{ status: "scanning" }> {
    requireCapability(principal, "documents.upload");
    const intent = await this.requireIntent(intentId);
    requireSameFirm(principal, intent.firmId);
    if (intent.createdBy !== principal.user.id && principal.user.role !== "admin") {
      throw new AppError("FORBIDDEN", "Only the upload owner can complete this intent", 403);
    }
    const now = this.now();
    if (intent.status !== "pending")
      throw new AppError("CONFLICT", "Upload intent is not pending", 409);
    if (intent.expiresAt <= now) {
      await this.repository.markExpired(intent.id, now);
      throw new AppError("CONFLICT", "Upload intent has expired", 409);
    }
    try {
      const validated = await this.readAndValidate(intent);
      await this.repository.markUploadedAndEnqueue(intent.id, validated.sha256, now);
      this.observe("document.upload.queued", {
        intentId,
        firmId: intent.firmId,
        sizeBytes: validated.sizeBytes,
      });
      return { status: "scanning" };
    } catch (error) {
      if (error instanceof FileValidationError) {
        await this.rejectAndQuarantine(intent, error.code, error.message, undefined);
        throw new AppError("VALIDATION_FAILED", error.message, 422, { reason: error.code });
      }
      throw error;
    }
  }

  async processNextScan(
    workerId: string,
    uploadIntentId?: string,
  ): Promise<"idle" | "clean" | "infected" | "retry" | "dead_letter"> {
    const now = this.now();
    const job = await this.repository.claimScanJob(workerId, now, uploadIntentId);
    if (!job) return "idle";
    const intent = await this.requireIntent(job.uploadIntentId);
    try {
      const validated = await this.readAndValidate(intent);
      const scan = await this.scanner.scan(validated.bytes, validated.mimeType);
      if (scan.verdict === "infected") {
        await this.rejectAndQuarantine(
          intent,
          "MALWARE_DETECTED",
          scan.details,
          job.id,
          scan.provider,
        );
        return "infected";
      }
      const finalFile = scan.sanitizedBytes
        ? validateUploadedFile({
            bytes: scan.sanitizedBytes,
            declaredMimeType: validated.mimeType,
            declaredSizeBytes: scan.sanitizedBytes.byteLength,
            storedMimeType: validated.mimeType,
            storedSizeBytes: scan.sanitizedBytes.byteLength,
          })
        : validated;
      const protectedKey = `protected/${intent.firmId}/${intent.id}/${finalFile.sha256}`;
      if (scan.sanitizedBytes) {
        await this.storage.putObject(protectedKey, finalFile.bytes, finalFile.mimeType, {
          "upload-intent-id": intent.id,
          sha256: finalFile.sha256,
        });
      } else {
        await this.storage.copyObject(intent.quarantineKey, protectedKey, {
          "upload-intent-id": intent.id,
          sha256: finalFile.sha256,
          "content-type": finalFile.mimeType,
        });
      }
      await this.repository.markPromoted({
        intentId: intent.id,
        jobId: job.id,
        protectedKey,
        sha256: finalFile.sha256,
        provider: scan.provider,
        details: scan.details,
        at: this.now(),
      });
      await this.storage.deleteObject(intent.quarantineKey);
      this.observe("document.scan.clean", {
        intentId: intent.id,
        jobId: job.id,
        provider: scan.provider,
      });
      return "clean";
    } catch (error) {
      if (error instanceof FileValidationError) {
        await this.rejectAndQuarantine(intent, error.code, error.message, job.id);
        return "infected";
      }
      const attemptsAfterFailure = job.attempts;
      const deadLetter = attemptsAfterFailure >= job.maxAttempts;
      const delayMs = Math.min(60 * 60_000, 60_000 * 2 ** Math.max(0, attemptsAfterFailure - 1));
      const message = error instanceof Error ? error.message : "Unknown scanning failure";
      await this.repository.retryScanJob({
        jobId: job.id,
        error: message,
        availableAt: new Date(now.getTime() + delayMs),
        deadLetter,
        at: this.now(),
      });
      this.observe(deadLetter ? "document.scan.dead_letter" : "document.scan.retry", {
        intentId: intent.id,
        jobId: job.id,
        attempts: attemptsAfterFailure,
        error: message,
        retryable: error instanceof RetryableScanError,
      });
      return deadLetter ? "dead_letter" : "retry";
    }
  }

  async getUploadIntentStatus(intentId: string): Promise<UploadIntentStatus | null> {
    return (await this.repository.getIntent(intentId))?.status ?? null;
  }

  async cleanup(limit = 100): Promise<{ expired: number; deleted: number }> {
    const now = this.now();
    const candidates = await this.repository.listCleanupCandidates(now, limit);
    let expired = 0;
    let deleted = 0;
    for (const intent of candidates) {
      const cleanupKey =
        intent.status === "rejected"
          ? `rejected/${intent.firmId}/${intent.id}/${intent.originalFileName}`
          : intent.quarantineKey;
      await this.storage.deleteObject(cleanupKey);
      deleted += 1;
      if (intent.status !== "rejected") {
        await this.repository.markExpired(intent.id, now);
        expired += 1;
      }
    }
    this.observe("document.cleanup.completed", { expired, deleted });
    return { expired, deleted };
  }

  private async readAndValidate(intent: UploadIntentRecord) {
    const object = await this.storage.headObject(intent.quarantineKey);
    if (!object)
      throw new FileValidationError("EMPTY_FILE", "The quarantined upload does not exist");
    if (object.metadata["upload-intent-id"] && object.metadata["upload-intent-id"] !== intent.id) {
      throw new FileValidationError(
        "MIME_MISMATCH",
        "Stored upload metadata does not match the intent",
      );
    }
    const bytes = await this.storage.readObject(intent.quarantineKey);
    return validateUploadedFile({
      bytes,
      declaredMimeType: intent.declaredMimeType,
      declaredSizeBytes: intent.declaredSizeBytes,
      storedMimeType: object.contentType,
      storedSizeBytes: object.sizeBytes,
      expectedSha256: intent.expectedSha256,
    });
  }

  private async rejectAndQuarantine(
    intent: UploadIntentRecord,
    code: string,
    details: string,
    jobId?: string,
    provider?: string,
  ): Promise<void> {
    const rejectedKey = `rejected/${intent.firmId}/${intent.id}/${intent.originalFileName}`;
    if (await this.storage.headObject(intent.quarantineKey)) {
      await this.storage.copyObject(intent.quarantineKey, rejectedKey, { "rejection-code": code });
      await this.storage.deleteObject(intent.quarantineKey);
    }
    await this.repository.markRejected({
      intentId: intent.id,
      jobId,
      code,
      details,
      provider,
      at: this.now(),
    });
    this.observe("document.scan.rejected", { intentId: intent.id, jobId, code, provider });
  }

  private async requireIntent(intentId: string): Promise<UploadIntentRecord> {
    const intent = await this.repository.getIntent(intentId);
    if (!intent) throw new AppError("NOT_FOUND", "Upload intent was not found", 404);
    return intent;
  }

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  private observe(event: string, attributes: Record<string, unknown>): void {
    this.options.observe?.(event, attributes);
  }
}

function validateIntentMetadata(input: CreateUploadIntentInput): void {
  if (!input.fileName.trim() || input.fileName.length > 240) {
    throw new AppError("VALIDATION_FAILED", "File name must be between 1 and 240 characters", 422);
  }
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(input.mimeType.toLowerCase())) {
    throw new AppError("VALIDATION_FAILED", "Unsupported document MIME type", 422);
  }
  if (
    !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > MAX_DOCUMENT_BYTES
  ) {
    throw new AppError("VALIDATION_FAILED", "Document size must be between 1 byte and 50 MB", 422);
  }
  if (input.sha256 && !/^[0-9a-f]{64}$/i.test(input.sha256)) {
    throw new AppError("VALIDATION_FAILED", "SHA-256 must contain 64 hexadecimal characters", 422);
  }
}

function sanitizeFileName(value: string): string {
  const leaf = value.replace(/\\/g, "/").split("/").pop()?.trim() ?? "document";
  return leaf.replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 240) || "document";
}
