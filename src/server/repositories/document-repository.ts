import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { documents, documentTags, documentTagAssignments, documentShares, users } from "../db/schema";
import { AppError } from "@/shared/errors/api-error";
import type { DocumentDto } from "@/shared/contracts/domains";

export class DocumentRepository {
  static async listDocuments(firmId: string, filters: { caseId?: string; isTemplate?: boolean; inTrash?: boolean }, limit = 50) {
    const db = getDatabase();
    
    const conditions = [eq(documents.firmId, firmId)];
    
    if (filters.caseId) {
      conditions.push(eq(documents.caseId, filters.caseId));
    }
    
    if (filters.isTemplate !== undefined) {
      conditions.push(eq(documents.isTemplate, filters.isTemplate));
    }

    if (filters.inTrash) {
      conditions.push(sql`${documents.deletedAt} IS NOT NULL`);
    } else {
      conditions.push(isNull(documents.deletedAt));
    }

    const results = await db.select({
      id: documents.id,
      firmId: documents.firmId,
      caseId: documents.caseId,
      title: documents.title,
      description: documents.description,
      type: documents.type,
      storageId: documents.storageId,
      mimeType: documents.mimeType,
      sizeBytes: documents.sizeBytes,
      uploadedBy: documents.uploadedBy,
      isTemplate: documents.isTemplate,
      isPrivileged: documents.isPrivileged,
      confidentialityLevel: documents.confidentialityLevel,
      deletedAt: documents.deletedAt,
      status: documents.status,
      legacyConvexId: documents.legacyConvexId,
    }).from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt))
      .limit(limit);

    // Fetch tags for these documents
    if (results.length === 0) return [];
    
    const docIds = results.map(r => r.id);
    const tagsAssignments = await db.select({
      documentId: documentTagAssignments.documentId,
      tagId: documentTags.id,
      tagName: documentTags.name
    }).from(documentTagAssignments)
      .innerJoin(documentTags, eq(documentTags.id, documentTagAssignments.tagId))
      .where(inArray(documentTagAssignments.documentId, docIds));
      
    const tagsByDoc = tagsAssignments.reduce((acc, row) => {
      if (!acc[row.documentId]) acc[row.documentId] = [];
      acc[row.documentId].push(row.tagName);
      return acc;
    }, {} as Record<string, string[]>);

    return results.map(row => ({
      _id: row.legacyConvexId || row.id,
      firmId: row.firmId,
      caseId: row.caseId || undefined,
      title: row.title,
      description: row.description || undefined,
      type: row.type,
      storageId: row.storageId,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      uploadedBy: row.uploadedBy,
      isTemplate: row.isTemplate,
      isPrivileged: row.isPrivileged,
      confidentialityLevel: row.confidentialityLevel,
      isDeleted: !!row.deletedAt,
      tags: tagsByDoc[row.id] || [],
      status: row.status,
    } as DocumentDto));
  }

  static async getDocumentById(firmId: string, id: string) {
    const db = getDatabase();
    
    // Support querying by either native UUID or legacy convex ID
    const isLegacy = !id.includes("-");
    const whereClause = isLegacy 
      ? and(eq(documents.firmId, firmId), eq(documents.legacyConvexId, id))
      : and(eq(documents.firmId, firmId), eq(documents.id, id));

    const [row] = await db.select().from(documents).where(whereClause);
    if (!row) return null;

    const tagsAssignments = await db.select({
      tagName: documentTags.name
    }).from(documentTagAssignments)
      .innerJoin(documentTags, eq(documentTags.id, documentTagAssignments.tagId))
      .where(eq(documentTagAssignments.documentId, row.id));

    return {
      _id: row.legacyConvexId || row.id,
      firmId: row.firmId,
      caseId: row.caseId || undefined,
      title: row.title,
      description: row.description || undefined,
      type: row.type,
      storageId: row.storageId,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      uploadedBy: row.uploadedBy,
      isTemplate: row.isTemplate,
      isPrivileged: row.isPrivileged,
      confidentialityLevel: row.confidentialityLevel,
      isDeleted: !!row.deletedAt,
      tags: tagsAssignments.map(t => t.tagName),
      status: row.status,
      // specific fields for legal hold
      isOnLegalHold: row.isOnLegalHold,
      legalHoldReason: row.legalHoldReason,
      retentionPolicy: row.retentionPolicy,
    } as DocumentDto;
  }

  static async createDocument(firmId: string, data: any, userId: string) {
    const db = getDatabase();
    
    // In a real flow, this would take the upload intent and move it to a document.
    // For migration parity, we insert directly here.
    
    // Use transaction if we need to add tags
    return await db.transaction(async (tx) => {
      // 1. Insert document
      const [newDoc] = await tx.insert(documents).values({
        firmId,
        caseId: data.caseId || null,
        title: data.title,
        documentNumber: `DOC-${Date.now()}`,
        description: data.description || null,
        type: data.type || "other",
        storageId: data.storageId,
        mimeType: data.mimeType || "application/octet-stream",
        sizeBytes: data.sizeBytes || 0,
        uploadedBy: userId,
        isTemplate: data.isTemplate || false,
        isPrivileged: data.isPrivileged || false,
        confidentialityLevel: data.confidentialityLevel || "internal",
        status: "active",
      } as any).returning();

      // 2. Add tags if any
      if (data.tags && data.tags.length > 0) {
        for (const tagName of data.tags) {
          // Find or create tag
          let [tag] = await tx.select().from(documentTags).where(and(eq(documentTags.firmId, firmId), eq(documentTags.name, tagName)));
          if (!tag) {
            [tag] = await tx.insert(documentTags).values({
              firmId,
              name: tagName,
              color: "#cccccc",
            }).returning();
          }
          await tx.insert(documentTagAssignments).values({
            firmId,
            documentId: newDoc!.id,
            tagId: tag!.id,
          });
        }
      }

      return newDoc;
    });
  }

  static async updateDocumentMetadata(firmId: string, id: string, updates: any) {
    const db = getDatabase();
    const isLegacy = !id.includes("-");
    const whereClause = isLegacy 
      ? and(eq(documents.firmId, firmId), eq(documents.legacyConvexId, id))
      : and(eq(documents.firmId, firmId), eq(documents.id, id));

    return await db.update(documents).set({
      ...updates,
      updatedAt: new Date(),
    }).where(whereClause).returning();
  }

  static async setLegalHold(firmId: string, id: string, reason: string, userId: string) {
    const db = getDatabase();
    const isLegacy = !id.includes("-");
    const whereClause = isLegacy 
      ? and(eq(documents.firmId, firmId), eq(documents.legacyConvexId, id))
      : and(eq(documents.firmId, firmId), eq(documents.id, id));

    return await db.update(documents).set({
      isOnLegalHold: true,
      legalHoldReason: reason,
      legalHoldSetAt: new Date(),
      legalHoldSetBy: userId,
      updatedAt: new Date(),
    }).where(whereClause).returning();
  }

  static async releaseLegalHold(firmId: string, id: string) {
    const db = getDatabase();
    const isLegacy = !id.includes("-");
    const whereClause = isLegacy 
      ? and(eq(documents.firmId, firmId), eq(documents.legacyConvexId, id))
      : and(eq(documents.firmId, firmId), eq(documents.id, id));

    return await db.update(documents).set({
      isOnLegalHold: false,
      legalHoldReason: null,
      legalHoldSetAt: null,
      legalHoldSetBy: null,
      updatedAt: new Date(),
    }).where(whereClause).returning();
  }

  static async createShare(firmId: string, documentId: string, shareData: any, createdBy: string) {
    const db = getDatabase();
    
    const isLegacy = !documentId.includes("-");
    let docIdToUse = documentId;
    if (isLegacy) {
      const [doc] = await db.select().from(documents).where(and(eq(documents.firmId, firmId), eq(documents.legacyConvexId, documentId)));
      if (!doc) throw new AppError("NOT_FOUND", "Document not found", 404);
      docIdToUse = doc.id;
    }

    const token = crypto.randomUUID();

    const [share] = await db.insert(documentShares).values({
      firmId,
      documentId: docIdToUse,
      token,
      expiresAt: shareData.expiresAt ? new Date(shareData.expiresAt) : null,
      createdBy,
    }).returning();
    
    return share;
  }
}
