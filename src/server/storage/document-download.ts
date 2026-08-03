import "server-only";
import { AppError } from "@/shared/errors/api-error";
import type { AuthPrincipal } from "@/server/auth/types";
import {
  requireDocumentAccess,
  type AuthorizationDataSource,
} from "@/server/policies/authorization";
import type { ObjectStorage } from "@/server/storage/object-storage";

export interface DownloadableDocument {
  id: string;
  firmId: string;
  storageKey: string;
  uploadStatus: "quarantined" | "scanning" | "clean" | "rejected";
}

export interface DownloadDocumentRepository {
  getDownloadableDocument(documentId: string): Promise<DownloadableDocument | null>;
}

export class DocumentDownloadService {
  constructor(
    private readonly authorization: AuthorizationDataSource,
    private readonly repository: DownloadDocumentRepository,
    private readonly storage: ObjectStorage,
    private readonly expiresInSeconds = 300,
  ) {}

  async createAuthorizedDownload(
    principal: AuthPrincipal,
    documentId: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    await requireDocumentAccess(principal, documentId, this.authorization);
    const document = await this.repository.getDownloadableDocument(documentId);
    if (!document || document.firmId !== principal.firmId) {
      throw new AppError("NOT_FOUND", "Document was not found", 404);
    }
    if (document.uploadStatus !== "clean") {
      throw new AppError("FORBIDDEN", "Document is not available for download", 403);
    }
    if (!document.storageKey.startsWith(`protected/${principal.firmId}/`)) {
      throw new AppError("FORBIDDEN", "Document storage boundary is invalid", 403);
    }
    return {
      url: await this.storage.createDownloadUrl(document.storageKey, this.expiresInSeconds),
      expiresInSeconds: this.expiresInSeconds,
    };
  }
}
