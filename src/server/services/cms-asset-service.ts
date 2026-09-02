import { sql } from "drizzle-orm";
import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { auditLog, cmsAssetUploadIntents, durableJobs } from "@/server/db/schema";
import { getServerEnvironment } from "@/server/env";
import type { AuthPrincipal } from "@/server/auth/types";
import type { AuditContext } from "@/server/audit/context";
import { requireCapability, requireFirmContext } from "@/server/policies/authorization";
import { getDocumentStorageRuntime } from "@/server/storage/runtime";
import { validateUploadedFile, FileValidationError } from "@/server/storage/file-validation";
import { AppError } from "@/shared/errors/api-error";
import { publicCmsAssetUrl, type CmsAssetPurpose } from "@/shared/cms-assets";
import { getCmsService } from "@/server/services/cms-service";

const MAX_CMS_ASSET_BYTES = 5 * 1024 * 1024;
const MAX_CMS_RESOURCE_FILE_BYTES = 25 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const RESOURCE_FILE_MIME_TYPES = new Set(["application/pdf"]);
const database = getDatabase();

function isResourceFilePurpose(purpose: CmsAssetPurpose) {
  return purpose === "resource_file";
}

function extensionForMime(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "application/pdf") return "pdf";
  return "jpg";
}

export class CmsAssetService {
  private requireManager(principal: AuthPrincipal) {
    requireCapability(principal, "cms.manage");
    return requireFirmContext(principal);
  }

  async createIntent(
    principal: AuthPrincipal,
    input: {
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      sha256?: string;
      purpose: CmsAssetPurpose;
    },
    audit: AuditContext,
  ) {
    const { firmId, actorId } = this.requireManager(principal);
    const mimeType = input.mimeType.toLowerCase();
    const allowPdf = isResourceFilePurpose(input.purpose);
    const allowed = allowPdf ? RESOURCE_FILE_MIME_TYPES : IMAGE_MIME_TYPES;
    const maxBytes = allowPdf ? MAX_CMS_RESOURCE_FILE_BYTES : MAX_CMS_ASSET_BYTES;
    if (!allowed.has(mimeType))
      throw new AppError(
        "VALIDATION_FAILED",
        allowPdf ? "Resource file must be a PDF" : "CMS asset must be JPEG or PNG",
        400,
      );
    if (input.sizeBytes < 1 || input.sizeBytes > maxBytes)
      throw new AppError(
        "VALIDATION_FAILED",
        allowPdf ? "Resource file must not exceed 25 MB" : "CMS asset must not exceed 5 MB",
        400,
      );
    const id = randomUUID();
    const extension = extensionForMime(mimeType);
    const key = `quarantine/${firmId}/cms/${id}/asset.${extension}`;
    const expiresAt = new Date(Date.now() + 3_600_000);
    await database.transaction(async (tx) => {
      await tx.insert(cmsAssetUploadIntents).values({
        id,
        firmId,
        createdBy: actorId,
        purpose: input.purpose,
        originalFileName: input.fileName,
        declaredMimeType: mimeType,
        declaredSizeBytes: input.sizeBytes,
        expectedSha256: input.sha256,
        quarantineKey: key,
        expiresAt,
      });
      await tx.insert(auditLog).values({
        firmId,
        userId: actorId,
        action: "cms.asset_upload_intent_created",
        resource: "cms_assets",
        resourceId: id,
        ipAddress: audit.ipAddress,
        requestId: audit.requestId,
      });
    });
    const grant = await getDocumentStorageRuntime().storage.createUploadGrant({
      key,
      contentType: mimeType,
      maxBytes,
      intentId: id,
      expiresInSeconds: 600,
    });
    return { intentId: id, upload: grant };
  }

  async completeIntent(principal: AuthPrincipal, intentId: string, audit: AuditContext) {
    const { firmId, actorId } = this.requireManager(principal);
    const [intent] = await database
      .select()
      .from(cmsAssetUploadIntents)
      .where(
        and(
          eq(cmsAssetUploadIntents.id, intentId),
          eq(cmsAssetUploadIntents.firmId, firmId),
          isNull(cmsAssetUploadIntents.deletedAt),
        ),
      )
      .limit(1);
    if (!intent) throw new AppError("NOT_FOUND", "CMS asset upload was not found", 404);
    if (intent.status !== "pending" || intent.expiresAt <= new Date())
      throw new AppError("CONFLICT", "CMS asset upload is not completable", 409);
    const object = await getDocumentStorageRuntime().storage.headObject(intent.quarantineKey);
    if (!object || object.metadata["upload-intent-id"] !== intent.id)
      throw new AppError("VALIDATION_FAILED", "Uploaded object does not match the intent", 400);
    await database.transaction(async (tx) => {
      const now = new Date();
      await tx
        .update(cmsAssetUploadIntents)
        .set({ status: "uploaded", uploadedAt: now, updatedAt: now })
        .where(eq(cmsAssetUploadIntents.id, intent.id));
      await tx
        .insert(durableJobs)
        .values({
          firmId,
          type: "cms.asset_scan",
          idempotencyKey: `cms-asset:${intent.id}`,
          payload: { cmsAssetIntentId: intent.id },
          actorUserId: actorId,
          timeoutSeconds: 120,
        })
        .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } });
      await tx.insert(auditLog).values({
        firmId,
        userId: actorId,
        action: "cms.asset_upload_completed",
        resource: "cms_assets",
        resourceId: intent.id,
        ipAddress: audit.ipAddress,
        requestId: audit.requestId,
      });
    });
    await this.process(intent.id, firmId);
    return this.getIntentStatus(principal, intent.id);
  }

  async getIntentStatus(principal: AuthPrincipal, intentId: string) {
    const { firmId } = this.requireManager(principal);
    const [intent] = await database
      .select()
      .from(cmsAssetUploadIntents)
      .where(
        and(
          eq(cmsAssetUploadIntents.id, intentId),
          eq(cmsAssetUploadIntents.firmId, firmId),
          isNull(cmsAssetUploadIntents.deletedAt),
        ),
      )
      .limit(1);
    if (!intent) throw new AppError("NOT_FOUND", "CMS asset upload was not found", 404);
    return {
      intentId: intent.id,
      status: intent.status,
      purpose: intent.purpose,
      publicUrl: intent.status === "promoted" ? publicCmsAssetUrl(intent.id) : null,
      failureCode: intent.failureCode,
      failureDetails: intent.failureDetails,
    };
  }

  async process(intentId: string, firmId: string) {
    const [intent] = await database
      .select()
      .from(cmsAssetUploadIntents)
      .where(and(eq(cmsAssetUploadIntents.id, intentId), eq(cmsAssetUploadIntents.firmId, firmId)))
      .limit(1);
    if (!intent) throw new Error("CMS asset intent was not found");
    if (intent.status === "promoted" || intent.status === "rejected")
      return { status: intent.status };
    const runtime = getDocumentStorageRuntime();
    const object = await runtime.storage.headObject(intent.quarantineKey);
    if (!object) throw new Error("CMS asset quarantine object is missing");
    const bytes = await runtime.storage.readObject(intent.quarantineKey);
    try {
      const valid = validateUploadedFile({
        bytes,
        declaredMimeType: intent.declaredMimeType,
        declaredSizeBytes: intent.declaredSizeBytes,
        storedMimeType: object.contentType,
        storedSizeBytes: object.sizeBytes,
        expectedSha256: intent.expectedSha256,
      });
      const scan = await runtime.scanner.scan(valid.bytes, valid.mimeType);
      if (scan.verdict === "infected") {
        await database
          .update(cmsAssetUploadIntents)
          .set({
            status: "rejected",
            failureCode: "MALWARE_DETECTED",
            failureDetails: scan.details,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(cmsAssetUploadIntents.id, intent.id));
        await runtime.storage.deleteObject(intent.quarantineKey);
        return { status: "rejected" as const };
      }
      const extension = extensionForMime(valid.mimeType);
      const protectedKey = `protected/${firmId}/cms/${intent.id}/${valid.sha256}.${extension}`;
      await runtime.storage.putObject(
        protectedKey,
        scan.sanitizedBytes ?? valid.bytes,
        valid.mimeType,
        { sha256: valid.sha256, "scan-provider": scan.provider },
      );
      await database
        .update(cmsAssetUploadIntents)
        .set({
          status: "promoted",
          protectedKey,
          actualSha256: valid.sha256,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(cmsAssetUploadIntents.id, intent.id));
      await runtime.storage.deleteObject(intent.quarantineKey);
      return { status: "promoted" as const };
    } catch (error) {
      if (error instanceof FileValidationError) {
        await database
          .update(cmsAssetUploadIntents)
          .set({
            status: "rejected",
            failureCode: error.code,
            failureDetails: error.message,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(cmsAssetUploadIntents.id, intent.id));
        await runtime.storage.deleteObject(intent.quarantineKey);
        return { status: "rejected" as const };
      }
      throw error;
    }
  }

  async getPublicAssetDelivery(assetId: string) {
    const publicFirmId = await getCmsService().publicFirmId();
    const [intent] = await database
      .select({
        protectedKey: cmsAssetUploadIntents.protectedKey,
        status: cmsAssetUploadIntents.status,
        declaredMimeType: cmsAssetUploadIntents.declaredMimeType,
        actualSha256: cmsAssetUploadIntents.actualSha256,
      })
      .from(cmsAssetUploadIntents)
      .where(
        and(
          eq(cmsAssetUploadIntents.id, assetId),
          eq(cmsAssetUploadIntents.firmId, publicFirmId),
          eq(cmsAssetUploadIntents.status, "promoted"),
          isNull(cmsAssetUploadIntents.deletedAt),
        ),
      )
      .limit(1);
    if (!intent?.protectedKey) throw new AppError("NOT_FOUND", "CMS asset was not found", 404);
    const storage = getDocumentStorageRuntime().storage;
    const object = await storage.headObject(intent.protectedKey);
    if (!object) throw new AppError("NOT_FOUND", "CMS asset object was not found", 404);
    const contentType = object.contentType || intent.declaredMimeType;
    if (!contentType.startsWith("image/")) {
      return {
        kind: "redirect" as const,
        url: await storage.createDownloadUrl(
          intent.protectedKey,
          getServerEnvironment().DOWNLOAD_URL_TTL_SECONDS,
        ),
      };
    }
    return {
      kind: "inline" as const,
      bytes: await storage.readObject(intent.protectedKey),
      contentType,
      sha256: intent.actualSha256,
    };
  }
}

let service: CmsAssetService | undefined;
export function getCmsAssetService() {
  service ??= new CmsAssetService();
  return service;
}
