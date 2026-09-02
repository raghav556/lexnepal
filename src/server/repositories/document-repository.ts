import { returningInsert, returningMutation } from "@/server/db/mysql-returning";
import "server-only";
import { and, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { getDatabase } from "../db/client";
import {
  auditLog,
  documents,
  documentTags,
  documentTagAssignments,
  documentShares,
} from "../db/schema";
import type { AuditContext } from "@/server/audit/context";
import { AppError } from "@/shared/errors/api-error";
import type { DocumentDto } from "@/shared/contracts/domains";
import type { DocumentSearchInput, DocumentShareCreateInput } from "@/shared/contracts/documents";

function toDocumentDto(
  row: {
    id: string;
    firmId: string;
    caseId: string | null;
    title: string;
    description: string | null;
    type: string;
    storageId: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: string | null;
    isTemplate: boolean;
    isPrivileged: boolean;
    confidentialityLevel: string;
    deletedAt: Date | null;
    status: string;
    sha256: string | null;
    version: number;
    parentDocumentId: string | null;
    uploadStatus: string;
    createdAt: Date;
    updatedAt: Date;
    legacyConvexId: string | null;
    isOnLegalHold?: boolean;
    legalHoldReason?: string | null;
    retentionPolicy?: string | null;
  },
  tags: string[] = [],
): DocumentDto {
  return {
    _id: row.id,
    id: row.id,
    firmId: row.firmId,
    caseId: row.caseId || undefined,
    title: row.title,
    description: row.description || undefined,
    type: row.type,
    storageId: row.storageId,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedBy: row.uploadedBy || "",
    isTemplate: row.isTemplate,
    isPrivileged: row.isPrivileged,
    confidentialityLevel: row.confidentialityLevel,
    isDeleted: !!row.deletedAt,
    tags,
    status: row.status,
    sha256: row.sha256,
    version: row.version,
    parentDocumentId: row.parentDocumentId,
    uploadStatus: row.uploadStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    _creationTime: row.createdAt.getTime(),
    legacyConvexId: row.legacyConvexId || undefined,
    isOnLegalHold: row.isOnLegalHold,
    legalHoldReason: row.legalHoldReason,
    retentionPolicy: row.retentionPolicy,
  };
}

export class DocumentRepository {
  static async listDocuments(
    firmId: string,
    filters: {
      caseId?: string;
      caseIds?: string[];
      isTemplate?: boolean;
      inTrash?: boolean;
      /** When set, also include docs the user uploaded or was asked to sign (client portal). */
      clientUserId?: string;
    },
    limit = 50,
  ) {
    const db = getDatabase();
    const conditions = [eq(documents.firmId, firmId)];
    if (filters.caseId && !filters.clientUserId) {
      conditions.push(eq(documents.caseId, filters.caseId));
    } else if (filters.caseIds && filters.caseIds.length > 0 && !filters.clientUserId) {
      conditions.push(inArray(documents.caseId, filters.caseIds));
    }
    if (filters.isTemplate !== undefined && !filters.clientUserId) {
      conditions.push(eq(documents.isTemplate, filters.isTemplate));
    }
    if (filters.inTrash) conditions.push(sql`${documents.deletedAt} IS NOT NULL`);
    else {
      conditions.push(isNull(documents.deletedAt));
      conditions.push(sql`NOT EXISTS (
        SELECT 1 FROM documents AS child_version
        WHERE child_version.firm_id = ${firmId}
          AND child_version.parent_document_id = ${documents.id}
          AND child_version.deleted_at IS NULL
      )`);
    }

    if (filters.clientUserId) {
      conditions.push(eq(documents.isTemplate, false));
      conditions.push(eq(documents.isPrivileged, false));
      conditions.push(sql`${documents.confidentialityLevel} NOT IN ('internal', 'privileged')`);

      const ownershipOrCase = [
        eq(documents.uploadedBy, filters.clientUserId),
        eq(documents.intendedSignerUserId, filters.clientUserId),
      ];
      if (filters.caseId) {
        ownershipOrCase.push(eq(documents.caseId, filters.caseId));
      } else if (filters.caseIds && filters.caseIds.length > 0) {
        ownershipOrCase.push(inArray(documents.caseId, filters.caseIds));
      }
      conditions.push(or(...ownershipOrCase)!);
    }

    const results = await db
      .select()
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt))
      .limit(limit);

    if (results.length === 0) return [];
    const tagsByDoc = await this.loadTags(results.map((row) => row.id));
    return results.map((row) => toDocumentDto(row, tagsByDoc[row.id] || []));
  }

  static async listRecent(firmId: string, limit = 5) {
    return this.listDocuments(firmId, { isTemplate: false, inTrash: false }, limit);
  }

  static async searchDocuments(firmId: string, filters: DocumentSearchInput) {
    const db = getDatabase();
    const conditions = [
      eq(documents.firmId, firmId),
      isNull(documents.deletedAt),
      like(documents.title, `%${filters.query}%`),
      sql`NOT EXISTS (
        SELECT 1 FROM documents AS child_version
        WHERE child_version.firm_id = ${firmId}
          AND child_version.parent_document_id = ${documents.id}
          AND child_version.deleted_at IS NULL
      )`,
    ];
    if (filters.caseId) conditions.push(eq(documents.caseId, filters.caseId));
    if (filters.type) conditions.push(eq(documents.type, filters.type));
    if (filters.generalOnly) conditions.push(sql`${documents.caseId} IS NULL`);

    const results = await db
      .select()
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt))
      .limit(100);

    const tagsByDoc = await this.loadTags(results.map((row) => row.id));
    let rows = results;
    if (filters.tag) {
      const needle = filters.tag.toLowerCase();
      rows = results.filter((row) =>
        (tagsByDoc[row.id] || []).some((tag) => tag.toLowerCase() === needle),
      );
    }
    return rows.map((row) => toDocumentDto(row, tagsByDoc[row.id] || []));
  }

  static async getDocumentById(firmId: string, id: string) {
    const db = getDatabase();
    const isUuid = /^[0-9a-f-]{36}$/i.test(id);
    const whereClause = isUuid
      ? and(eq(documents.firmId, firmId), eq(documents.id, id))
      : and(eq(documents.firmId, firmId), eq(documents.legacyConvexId, id));
    const [row] = await db.select().from(documents).where(whereClause);
    if (!row) return null;
    const tagsByDoc = await this.loadTags([row.id]);
    return toDocumentDto(row, tagsByDoc[row.id] || []);
  }

  static async listVersionHistory(firmId: string, documentId: string) {
    const db = getDatabase();
    const initial = await this.getDocumentRow(firmId, documentId);
    if (!initial) return [];

    const seen = new Set<string>();
    let root = initial;
    while (root.parentDocumentId && !seen.has(root.id)) {
      seen.add(root.id);
      const parent = await this.getDocumentRow(firmId, root.parentDocumentId);
      if (!parent) break;
      root = parent;
    }

    const rows = [root];
    const queued = [root.id];
    seen.clear();
    seen.add(root.id);
    while (queued.length > 0) {
      const parentIds = queued.splice(0, queued.length);
      const children = await db
        .select()
        .from(documents)
        .where(and(eq(documents.firmId, firmId), inArray(documents.parentDocumentId, parentIds)));
      for (const child of children) {
        if (seen.has(child.id)) continue;
        seen.add(child.id);
        rows.push(child);
        queued.push(child.id);
      }
    }

    const tagsByDoc = await this.loadTags(rows.map((row) => row.id));
    return rows
      .sort(
        (left, right) =>
          right.version - left.version || right.createdAt.getTime() - left.createdAt.getTime(),
      )
      .map((row) => toDocumentDto(row, tagsByDoc[row.id] || []));
  }

  static async createRestoredVersion(input: {
    firmId: string;
    id: string;
    sourceDocumentId: string;
    parentDocumentId: string;
    destinationStorageKey: string;
    version: number;
    uploadedBy: string;
    audit: AuditContext;
  }) {
    const db = getDatabase();
    return db.transaction(async (transaction) => {
      const [source] = await transaction
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.firmId, input.firmId),
            eq(documents.id, input.sourceDocumentId),
            isNull(documents.deletedAt),
          ),
        )
        .limit(1);
      const [parent] = await transaction
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.firmId, input.firmId),
            eq(documents.id, input.parentDocumentId),
            isNull(documents.deletedAt),
          ),
        )
        .limit(1);
      if (!source || !parent)
        throw new AppError("NOT_FOUND", "Document version was not found", 404);
      if (source.uploadStatus !== "clean") {
        throw new AppError("CONFLICT", "Only a clean document version can be restored", 409);
      }
      if (input.version !== parent.version + 1) {
        throw new AppError("CONFLICT", "Document history changed; refresh and try again", 409);
      }

      const [created] = await returningInsert(
        transaction
          .insert(documents)
          .values({
            id: input.id,
            firmId: input.firmId,
            caseId: parent.caseId,
            documentNumber: `DOC-RESTORE-${input.id}`,
            title: source.title,
            description: source.description,
            type: source.type,
            storageId: input.destinationStorageKey,
            mimeType: source.mimeType,
            sizeBytes: source.sizeBytes,
            sha256: source.sha256,
            version: input.version,
            parentDocumentId: input.parentDocumentId,
            uploadedBy: input.uploadedBy,
            isTemplate: parent.isTemplate,
            isPrivileged: parent.isPrivileged,
            searchableText: source.searchableText,
            status: "draft",
            retentionPolicy: parent.retentionPolicy,
            retentionUntil: parent.retentionUntil,
            confidentialityLevel: parent.confidentialityLevel,
            isOnLegalHold: parent.isOnLegalHold,
            legalHoldReason: parent.legalHoldReason,
            legalHoldSetAt: parent.legalHoldSetAt,
            legalHoldSetBy: parent.legalHoldSetBy,
            uploadStatus: "clean",
            scanProvider: "version-restore",
            scanCompletedAt: input.audit.occurredAt,
            scanDetails: `Restored from version ${source.version} (${source.id})`,
          })
          .$returningId(),
        (id) => transaction.select().from(documents).where(eq(documents.id, id)).limit(1),
      );

      const sourceTags = await transaction
        .select({ tagId: documentTagAssignments.tagId })
        .from(documentTagAssignments)
        .where(
          and(
            eq(documentTagAssignments.firmId, input.firmId),
            eq(documentTagAssignments.documentId, source.id),
            isNull(documentTagAssignments.deletedAt),
          ),
        );
      if (sourceTags.length > 0) {
        await transaction.insert(documentTagAssignments).values(
          sourceTags.map(({ tagId }) => ({
            firmId: input.firmId,
            documentId: created.id,
            tagId,
          })),
        );
      }

      await transaction.insert(auditLog).values({
        firmId: input.firmId,
        userId: input.uploadedBy,
        action: "document.version_restored",
        resource: "documents",
        resourceId: created.id,
        details: `source=${source.id}; sourceVersion=${source.version}; parent=${parent.id}; newVersion=${input.version}`,
        ipAddress: input.audit.ipAddress,
        requestId: input.audit.requestId,
        createdAt: input.audit.occurredAt,
        updatedAt: input.audit.occurredAt,
      });
      return toDocumentDto(created);
    });
  }

  static async updateDocumentMetadata(
    firmId: string,
    id: string,
    updates: Partial<typeof documents.$inferInsert>,
  ) {
    const db = getDatabase();
    const isUuid = /^[0-9a-f-]{36}$/i.test(id);
    const whereClause = isUuid
      ? and(eq(documents.firmId, firmId), eq(documents.id, id))
      : and(eq(documents.firmId, firmId), eq(documents.legacyConvexId, id));
    return await returningMutation(
      db
        .update(documents)
        .set({ ...updates, updatedAt: new Date() })
        .where(whereClause),
      () => db.select().from(documents).where(whereClause),
    );
  }

  static async setLegalHold(firmId: string, id: string, reason: string, userId: string) {
    const [row] = await this.updateDocumentMetadata(firmId, id, {
      isOnLegalHold: true,
      legalHoldReason: reason,
      legalHoldSetAt: new Date(),
      legalHoldSetBy: userId,
    });
    return row ? this.getDocumentById(firmId, row.id) : null;
  }

  static async releaseLegalHold(firmId: string, id: string) {
    const [row] = await this.updateDocumentMetadata(firmId, id, {
      isOnLegalHold: false,
      legalHoldReason: null,
      legalHoldSetAt: null,
      legalHoldSetBy: null,
    });
    return row ? this.getDocumentById(firmId, row.id) : null;
  }

  static async hardDelete(firmId: string, id: string) {
    const db = getDatabase();
    const isUuid = /^[0-9a-f-]{36}$/i.test(id);
    const whereClause = isUuid
      ? and(eq(documents.firmId, firmId), eq(documents.id, id))
      : and(eq(documents.firmId, firmId), eq(documents.legacyConvexId, id));
    await db.delete(documents).where(whereClause);
  }

  static async createShare(
    firmId: string,
    documentId: string,
    shareData: DocumentShareCreateInput,
    createdBy: string,
  ) {
    const { hashSharePassword } = await import("@/server/security/share-password");
    const db = getDatabase();
    const doc = await this.getDocumentById(firmId, documentId);
    if (!doc) throw new AppError("NOT_FOUND", "Document not found", 404);
    if ((doc as { isPrivileged?: boolean }).isPrivileged) {
      throw new AppError(
        "FORBIDDEN",
        "Privileged documents cannot be shared through public links",
        403,
      );
    }
    if ((doc as { isOnLegalHold?: boolean }).isOnLegalHold) {
      throw new AppError("FORBIDDEN", "Documents on legal hold cannot be publicly shared", 403);
    }
    if ((doc as { deletedAt?: Date | null }).deletedAt) {
      throw new AppError("CONFLICT", "Deleted documents cannot be shared", 409);
    }
    const token = crypto.randomUUID();
    const password = typeof shareData.password === "string" ? shareData.password : undefined;
    const [share] = await returningInsert(
      db
        .insert(documentShares)
        .values({
          firmId,
          documentId: String(doc.id ?? doc._id),
          token,
          passwordHash: password ? hashSharePassword(password) : null,
          expiresAt: shareData.expiresAt ? new Date(shareData.expiresAt) : null,
          allowDownload: shareData.allowDownload !== false,
          maxDownloads: shareData.maxDownloads ?? null,
          createdBy,
          isActive: true,
          downloadsCount: 0,
          failedAttempts: 0,
        })
        .$returningId(),
      (id) => db.select().from(documentShares).where(eq(documentShares.id, id)).limit(1),
    );
    return { ...share, _id: share!.id, token, url: `/share/${token}` };
  }

  static async listShares(firmId: string, documentId: string) {
    const db = getDatabase();
    const doc = await this.getDocumentById(firmId, documentId);
    if (!doc) return [];
    const rows = await db
      .select()
      .from(documentShares)
      .where(
        and(
          eq(documentShares.firmId, firmId),
          eq(documentShares.documentId, String(doc.id ?? doc._id)),
        ),
      )
      .orderBy(desc(documentShares.createdAt));
    return rows.map((row) => ({
      ...row,
      _id: row.id,
      url: `/share/${row.token}`,
    }));
  }

  static async revokeShare(
    firmId: string,
    documentId: string,
    shareId: string,
    revokedBy?: string,
  ) {
    const db = getDatabase();
    const doc = await this.getDocumentById(firmId, documentId);
    if (!doc) throw new AppError("NOT_FOUND", "Document not found", 404);
    const [row] = await returningMutation(
      db
        .update(documentShares)
        .set({
          isActive: false,
          revokedAt: new Date(),
          revokedBy: revokedBy ?? null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(documentShares.firmId, firmId),
            eq(documentShares.documentId, String(doc.id ?? doc._id)),
            eq(documentShares.id, shareId),
          ),
        ),
      () => db.select().from(documentShares).where(eq(documentShares.id, shareId)),
    );
    if (!row) throw new AppError("NOT_FOUND", "Share not found", 404);
    return { success: true as const };
  }

  static async findShareByToken(token: string) {
    const db = getDatabase();
    const [share] = await db
      .select()
      .from(documentShares)
      .where(eq(documentShares.token, token))
      .limit(1);
    return share ?? null;
  }

  static async patchShare(
    shareId: string,
    patch: Partial<{
      failedAttempts: number;
      lockedUntil: Date | null;
      lastAccessAt: Date;
      downloadsCount: number;
    }>,
  ) {
    const db = getDatabase();
    await db
      .update(documentShares)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(documentShares.id, shareId));
  }

  private static async loadTags(docIds: string[]) {
    if (docIds.length === 0) return {} as Record<string, string[]>;
    const db = getDatabase();
    const tagsAssignments = await db
      .select({
        documentId: documentTagAssignments.documentId,
        tagName: documentTags.name,
      })
      .from(documentTagAssignments)
      .innerJoin(documentTags, eq(documentTags.id, documentTagAssignments.tagId))
      .where(inArray(documentTagAssignments.documentId, docIds));
    return tagsAssignments.reduce(
      (acc, row) => {
        if (!acc[row.documentId]) acc[row.documentId] = [];
        acc[row.documentId].push(row.tagName);
        return acc;
      },
      {} as Record<string, string[]>,
    );
  }

  private static async getDocumentRow(firmId: string, id: string) {
    const db = getDatabase();
    const [row] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.firmId, firmId), eq(documents.id, id)))
      .limit(1);
    return row ?? null;
  }
}
