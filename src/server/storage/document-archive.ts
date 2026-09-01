import "server-only";
import JSZip from "jszip";
import type { AuthPrincipal } from "@/server/auth/types";
import {
  requireDocumentAccess,
  type AuthorizationDataSource,
} from "@/server/policies/authorization";
import type {
  DownloadableDocument,
  DownloadDocumentRepository,
} from "@/server/storage/document-download";
import type { ObjectStorage } from "@/server/storage/object-storage";
import { AppError } from "@/shared/errors/api-error";

const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;

type ArchiveDocument = DownloadableDocument & {
  title: string;
  mimeType: string;
  sizeBytes: number;
};

export interface DocumentArchiveRepository extends DownloadDocumentRepository {
  getArchiveDocument(documentId: string): Promise<ArchiveDocument | null>;
}

export class DocumentArchiveService {
  constructor(
    private readonly authorization: AuthorizationDataSource,
    private readonly repository: DocumentArchiveRepository,
    private readonly storage: ObjectStorage,
  ) {}

  async createAuthorizedArchive(principal: AuthPrincipal, documentIds: string[]) {
    const uniqueIds = [...new Set(documentIds)];
    const documents: ArchiveDocument[] = [];
    for (const documentId of uniqueIds) {
      await requireDocumentAccess(principal, documentId, this.authorization);
      const document = await this.repository.getArchiveDocument(documentId);
      if (!document || document.firmId !== principal.firmId) {
        throw new AppError("NOT_FOUND", "Document was not found", 404);
      }
      if (document.uploadStatus !== "clean") {
        throw new AppError("CONFLICT", `${document.title} is not ready for download`, 409);
      }
      if (!document.storageKey.startsWith(`protected/${principal.firmId}/`)) {
        throw new AppError("FORBIDDEN", "Document storage boundary is invalid", 403);
      }
      documents.push(document);
    }

    const totalBytes = documents.reduce((total, document) => total + document.sizeBytes, 0);
    if (totalBytes > MAX_ARCHIVE_BYTES) {
      throw new AppError(
        "VALIDATION_FAILED",
        "The selected documents exceed the 100 MB archive limit",
        422,
      );
    }

    const archive = new JSZip();
    const usedNames = new Set<string>();
    for (const document of documents) {
      const stored = await this.storage.headObject(document.storageKey);
      if (!stored) throw new AppError("CONFLICT", `${document.title} is unavailable`, 409);
      const bytes = await this.storage.readObject(document.storageKey);
      archive.file(uniqueArchiveName(document.title, document.mimeType, usedNames), bytes);
    }
    const bytes = await archive.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    return {
      bytes,
      fileName: `lexnepal-documents-${new Date().toISOString().slice(0, 10)}.zip`,
      documentCount: documents.length,
    };
  }
}

function uniqueArchiveName(title: string, mimeType: string, used: Set<string>) {
  const leaf = title.replace(/\\/g, "/").split("/").pop()?.trim() || "document";
  const cleaned = leaf.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").slice(0, 180) || "document";
  const extension = cleaned.includes(".") ? "" : extensionForMimeType(mimeType);
  const candidate = `${cleaned}${extension}`;
  if (!used.has(candidate.toLowerCase())) {
    used.add(candidate.toLowerCase());
    return candidate;
  }
  const dot = candidate.lastIndexOf(".");
  const stem = dot > 0 ? candidate.slice(0, dot) : candidate;
  const suffix = dot > 0 ? candidate.slice(dot) : "";
  let sequence = 2;
  while (used.has(`${stem} (${sequence})${suffix}`.toLowerCase())) sequence += 1;
  const unique = `${stem} (${sequence})${suffix}`;
  used.add(unique.toLowerCase());
  return unique;
}

function extensionForMimeType(mimeType: string) {
  const extensions: Record<string, string> = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "text/plain": ".txt",
  };
  return extensions[mimeType.toLowerCase()] || "";
}

export { MAX_ARCHIVE_BYTES };
