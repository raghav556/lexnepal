import "server-only";
import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { documents, documentTags, documentTagAssignments, documentShares } from "../db/schema";
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
    else conditions.push(isNull(documents.deletedAt));

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
      ilike(documents.title, `%${filters.query}%`),
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
    return await db
      .update(documents)
      .set({ ...updates, updatedAt: new Date() })
      .where(whereClause)
      .returning();
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
    const [share] = await db
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
      .returning();
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
    const [row] = await db
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
      )
      .returning();
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
}
