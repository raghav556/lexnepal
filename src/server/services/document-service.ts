import "server-only";
import { randomUUID } from "node:crypto";
import type { AuthPrincipal } from "@/server/auth/types";
import type { AuditContext } from "@/server/audit/context";
import {
  requireCapability,
  requireCaseAccess,
  requireDocumentAccess,
  requireFirmContext,
} from "@/server/policies/authorization";
import { DocumentRepository } from "@/server/repositories/document-repository";
import { PostgresSecurityRepository } from "@/server/repositories/security-repository";
import type {
  DocumentListInput,
  DocumentSearchInput,
  DocumentShareCreateInput,
  DocumentUpdateInput,
} from "@/shared/contracts/documents";
import { AppError } from "@/shared/errors/api-error";

const security = new PostgresSecurityRepository();

export class DocumentService {
  async list(principal: AuthPrincipal, filters: DocumentListInput) {
    requireCapability(principal, "documents.read");
    const { firmId } = requireFirmContext(principal);
    if (filters.caseId) await requireCaseAccess(principal, filters.caseId, security);

    if (principal.user.role === "client") {
      const client = await security.getClientByUser(principal.user.id);
      if (!client || client.firmId !== firmId) return [];
      const caseIds = await security.listCaseIdsForClient(firmId, client.id);
      return DocumentRepository.listDocuments(
        firmId,
        {
          caseId: filters.caseId,
          caseIds: filters.caseId ? undefined : caseIds,
          isTemplate: filters.isTemplate ?? false,
          inTrash: filters.inTrash ?? false,
          clientUserId: principal.user.id,
        },
        200,
      );
    }

    return DocumentRepository.listDocuments(firmId, {
      caseId: filters.caseId,
      isTemplate: filters.isTemplate,
      inTrash: filters.inTrash ?? false,
    });
  }

  async search(principal: AuthPrincipal, filters: DocumentSearchInput) {
    requireCapability(principal, "documents.read");
    const { firmId } = requireFirmContext(principal);
    if (filters.caseId) await requireCaseAccess(principal, filters.caseId, security);

    const rows = await DocumentRepository.searchDocuments(firmId, filters);
    if (principal.user.role !== "client") return rows;

    const client = await security.getClientByUser(principal.user.id);
    if (!client || client.firmId !== firmId) return [];
    const caseIds = new Set(await security.listCaseIdsForClient(firmId, client.id));
    return rows.filter((doc) => {
      if (doc.isTemplate || doc.isPrivileged) return false;
      const level = String(doc.confidentialityLevel || "");
      if (level === "internal" || level === "privileged") return false;
      if (doc.uploadedBy === principal.user.id) return true;
      if (doc.caseId && caseIds.has(doc.caseId)) return true;
      return false;
    });
  }

  async recent(principal: AuthPrincipal, limit: number) {
    requireCapability(principal, "documents.read");
    const { firmId } = requireFirmContext(principal);
    if (principal.user.role === "client") {
      return this.list(principal, { isTemplate: false, inTrash: false }).then((rows) =>
        rows.slice(0, limit),
      );
    }
    return DocumentRepository.listRecent(firmId, limit);
  }

  async get(principal: AuthPrincipal, documentId: string) {
    requireCapability(principal, "documents.read");
    await requireDocumentAccess(principal, documentId, security);
    const { firmId } = requireFirmContext(principal);
    const row = await DocumentRepository.getDocumentById(firmId, documentId);
    if (!row) throw new AppError("NOT_FOUND", "Document was not found", 404);
    return row;
  }

  async listVersions(principal: AuthPrincipal, documentId: string) {
    requireCapability(principal, "documents.read");
    await requireDocumentAccess(principal, documentId, security);
    const { firmId } = requireFirmContext(principal);
    return DocumentRepository.listVersionHistory(firmId, documentId);
  }

  async restoreVersion(
    principal: AuthPrincipal,
    documentId: string,
    sourceVersionId: string,
    audit: AuditContext,
  ) {
    requireCapability(principal, "documents.upload");
    await requireDocumentAccess(principal, documentId, security);
    await requireDocumentAccess(principal, sourceVersionId, security);
    const { firmId } = requireFirmContext(principal);
    const history = await DocumentRepository.listVersionHistory(firmId, documentId);
    if (!history.some((version) => version._id === sourceVersionId)) {
      throw new AppError(
        "VALIDATION_FAILED",
        "The selected document is not in this version history",
        422,
      );
    }
    const source = history.find((version) => version._id === sourceVersionId)!;
    const head = history[0];
    if (!head) throw new AppError("NOT_FOUND", "Document version history was not found", 404);
    if (source._id === head._id) {
      throw new AppError("CONFLICT", "The selected version is already current", 409);
    }
    if (source.uploadStatus !== "clean") {
      throw new AppError("CONFLICT", "Only a clean document version can be restored", 409);
    }
    const sourceKey = String(source.storageId || "");
    if (!sourceKey.startsWith(`protected/${firmId}/`)) {
      throw new AppError("FORBIDDEN", "Document storage boundary is invalid", 403);
    }

    const { storage } = await import("@/server/storage/runtime").then((module) =>
      module.getDocumentStorageRuntime(),
    );
    const stored = await storage.headObject(sourceKey);
    if (!stored) throw new AppError("CONFLICT", "The selected version content is unavailable", 409);
    const restoredId = randomUUID();
    const destinationKey = `protected/${firmId}/${restoredId}/${source.sha256 || randomUUID()}`;
    await storage.copyObject(sourceKey, destinationKey, {
      "restored-from-document-id": sourceVersionId,
      "restored-by-user-id": principal.user.id,
      ...(source.sha256 ? { sha256: source.sha256 } : {}),
      "content-type": source.mimeType,
    });
    try {
      return await DocumentRepository.createRestoredVersion({
        firmId,
        id: restoredId,
        sourceDocumentId: sourceVersionId,
        parentDocumentId: head._id,
        destinationStorageKey: destinationKey,
        version: Number(head.version || 1) + 1,
        uploadedBy: principal.user.id,
        audit,
      });
    } catch (error) {
      await storage.deleteObject(destinationKey).catch(() => undefined);
      throw error;
    }
  }

  async update(principal: AuthPrincipal, documentId: string, input: DocumentUpdateInput) {
    requireCapability(principal, "documents.upload");
    await requireDocumentAccess(principal, documentId, security);
    const { firmId } = requireFirmContext(principal);
    if (input.isOnLegalHold === true) {
      requireCapability(principal, "legalHold.manage");
      return DocumentRepository.setLegalHold(
        firmId,
        documentId,
        input.legalHoldReason || "Legal hold",
        principal.user.id,
      );
    }
    if (input.isOnLegalHold === false) {
      requireCapability(principal, "legalHold.manage");
      return DocumentRepository.releaseLegalHold(firmId, documentId);
    }
    const [row] = await DocumentRepository.updateDocumentMetadata(firmId, documentId, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.isPrivileged !== undefined ? { isPrivileged: input.isPrivileged } : {}),
      ...(input.confidentialityLevel !== undefined
        ? { confidentialityLevel: input.confidentialityLevel }
        : {}),
      ...(input.retentionPolicy !== undefined ? { retentionPolicy: input.retentionPolicy } : {}),
      ...(input.deletedAt !== undefined
        ? {
            deletedAt: input.deletedAt === null ? null : new Date(input.deletedAt),
            deletedBy: input.deletedAt === null ? null : principal.user.id,
          }
        : {}),
    });
    if (!row) throw new AppError("NOT_FOUND", "Document was not found", 404);
    return DocumentRepository.getDocumentById(firmId, documentId);
  }

  async trash(principal: AuthPrincipal, documentId: string) {
    return this.update(principal, documentId, { deletedAt: new Date().toISOString() });
  }

  async restore(principal: AuthPrincipal, documentId: string) {
    return this.update(principal, documentId, { deletedAt: null });
  }

  async hardDelete(principal: AuthPrincipal, documentId: string) {
    requireCapability(principal, "documents.delete");
    await requireDocumentAccess(principal, documentId, security);
    const { firmId } = requireFirmContext(principal);
    const doc = await DocumentRepository.getDocumentById(firmId, documentId);
    if (!doc) throw new AppError("NOT_FOUND", "Document was not found", 404);
    if ((doc as { isOnLegalHold?: boolean }).isOnLegalHold) {
      throw new AppError("CONFLICT", "Documents on legal hold cannot be permanently deleted", 409);
    }
    await DocumentRepository.hardDelete(firmId, documentId);
    return { success: true as const };
  }

  /**
   * Queues text extraction for a document. Extraction runs in the `document.ocr` durable job so a
   * slow scan never blocks the request; the caller polls the document for `searchableText`.
   */
  async requestTextExtraction(principal: AuthPrincipal, documentId: string) {
    requireCapability(principal, "documents.upload");
    await requireDocumentAccess(principal, documentId, security);
    const { firmId } = requireFirmContext(principal);
    const doc = await DocumentRepository.getDocumentById(firmId, documentId);
    if (!doc) throw new AppError("NOT_FOUND", "Document was not found", 404);
    if ((doc as { uploadStatus?: string }).uploadStatus !== "clean") {
      throw new AppError("CONFLICT", "Document is not available for text extraction", 409);
    }

    // Imported lazily so document reads do not pull the job handler graph (OCR engine, SMTP).
    const { getJobRepository } = await import("@/server/jobs/runtime");
    const { job, created } = await getJobRepository().enqueue({
      firmId,
      actorUserId: principal.user.id,
      type: "document.ocr",
      // Re-running against the same stored bytes is a no-op, so the version pins the key.
      idempotencyKey: `document.ocr:${documentId}:${(doc as { version?: number }).version ?? 1}`,
      payload: { documentId },
      maxAttempts: 3,
      timeoutSeconds: 600,
    });
    return { jobId: job.id, status: job.status, queued: created };
  }

  async createShare(principal: AuthPrincipal, documentId: string, input: DocumentShareCreateInput) {
    requireCapability(principal, "documents.share");
    await requireDocumentAccess(principal, documentId, security);
    const { firmId } = requireFirmContext(principal);
    return DocumentRepository.createShare(firmId, documentId, input, principal.user.id);
  }

  async listShares(principal: AuthPrincipal, documentId: string) {
    requireCapability(principal, "documents.share");
    await requireDocumentAccess(principal, documentId, security);
    const { firmId } = requireFirmContext(principal);
    return DocumentRepository.listShares(firmId, documentId);
  }

  async revokeShare(principal: AuthPrincipal, documentId: string, shareId: string) {
    requireCapability(principal, "documents.share");
    await requireDocumentAccess(principal, documentId, security);
    const { firmId } = requireFirmContext(principal);
    return DocumentRepository.revokeShare(firmId, documentId, shareId, principal.user.id);
  }

  async getPublicShare(token: string, password?: string | null) {
    return resolvePublicShare(token, password);
  }

  async downloadPublicShare(token: string, password?: string | null) {
    const resolved = await resolvePublicShare(token, password);
    if (resolved.isPasswordRequired) return resolved;
    if (!resolved.allowDownload) {
      throw new AppError("FORBIDDEN", "Downloads are disabled for this share", 403);
    }
    if (resolved.uploadStatus !== "clean" || !resolved.storageKey) {
      throw new AppError("FORBIDDEN", "Document is not available for download", 403);
    }
    if (!resolved.storageKey.startsWith(`protected/${resolved.firmId}/`)) {
      throw new AppError("FORBIDDEN", "Document storage boundary is invalid", 403);
    }
    const { getDocumentStorageRuntime } = await import("@/server/storage/runtime");
    await DocumentRepository.patchShare(resolved.shareId, {
      downloadsCount: resolved.downloadsCount + 1,
    });
    const url = await getDocumentStorageRuntime().storage.createDownloadUrl(
      resolved.storageKey,
      300,
    );
    return { isPasswordRequired: false as const, url };
  }
}

async function resolvePublicShare(token: string, password?: string | null) {
  const { verifySharePassword } = await import("@/server/security/share-password");
  const share = await DocumentRepository.findShareByToken(token);
  if (!share || !share.isActive) {
    throw new AppError("NOT_FOUND", "This share link is invalid or revoked", 404);
  }
  if (share.lockedUntil && share.lockedUntil.getTime() > Date.now()) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Try again later", 429);
  }
  if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) {
    throw new AppError("CONFLICT", "This share link has expired", 410);
  }
  if (share.maxDownloads !== null && share.downloadsCount >= share.maxDownloads) {
    throw new AppError("CONFLICT", "This share link has reached its download limit", 410);
  }
  if (share.passwordHash) {
    const valid = !!password && verifySharePassword(password, share.passwordHash);
    if (!valid) {
      const failedAttempts = (share.failedAttempts || 0) + 1;
      await DocumentRepository.patchShare(share.id, {
        failedAttempts,
        lockedUntil: failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
      });
      return { isPasswordRequired: true as const };
    }
  }
  await DocumentRepository.patchShare(share.id, {
    failedAttempts: 0,
    lockedUntil: null,
    lastAccessAt: new Date(),
  });
  const doc = await DocumentRepository.getDocumentById(share.firmId, share.documentId);
  if (!doc || (doc as { deletedAt?: Date | null }).deletedAt) {
    throw new AppError("NOT_FOUND", "Document is unavailable", 404);
  }
  return {
    isPasswordRequired: false as const,
    shareId: share.id,
    firmId: share.firmId,
    downloadsCount: share.downloadsCount,
    allowDownload: share.allowDownload !== false,
    title: (doc as { title: string }).title,
    type: (doc as { type: string }).type,
    mimeType: (doc as { mimeType: string }).mimeType,
    sizeBytes: (doc as { sizeBytes: number }).sizeBytes,
    uploadStatus: (doc as { uploadStatus?: string }).uploadStatus ?? "clean",
    storageKey: String((doc as { storageId: string }).storageId),
  };
}

let service: DocumentService | undefined;
export function getDocumentService() {
  service ??= new DocumentService();
  return service;
}
