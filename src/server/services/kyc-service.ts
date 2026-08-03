import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, lte } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  auditLog,
  clientKycFiles,
  clientKycUploadIntents,
  clients,
  durableJobs,
  notifications,
} from "@/server/db/schema";
import type { AuditContext } from "@/server/audit/context";
import type { AuthPrincipal } from "@/server/auth/types";
import { requireCapability, requireFirmContext } from "@/server/policies/authorization";
import { getServerEnvironment } from "@/server/env";
import { getDocumentStorageRuntime } from "@/server/storage/runtime";
import { FileValidationError, validateUploadedFile } from "@/server/storage/file-validation";
import type { KycReviewInput, KycSubmitInput } from "@/shared/contracts/matters";
import { AppError } from "@/shared/errors/api-error";

const database = getDatabase();
const KYC_CONSENT_VERSION = "kyc-consent-v1";

export class KycService {
  async createIntent(
    principal: AuthPrincipal,
    input: {
      fileName: string;
      mimeType: "application/pdf" | "image/jpeg" | "image/png";
      sizeBytes: number;
      sha256?: string;
      documentType: "government_id" | "proof_of_address" | "other";
    },
    audit: AuditContext,
  ) {
    const { firmId, actorId } = requireFirmContext(principal);
    const client = await requireOwnClient(firmId, actorId);
    if (client.kycStatus === "verified")
      throw new AppError("CONFLICT", "Verified KYC must be reopened by the firm", 409);
    const id = randomUUID();
    const safeName = sanitizeFileName(input.fileName);
    const key = `quarantine/${firmId}/kyc/${client.id}/${id}/${safeName}`;
    const expiresAt = new Date(Date.now() + 3_600_000);
    await database.transaction(async (tx) => {
      await tx.insert(clientKycUploadIntents).values({
        id,
        firmId,
        clientId: client.id,
        userId: actorId,
        documentType: input.documentType,
        originalFileName: safeName,
        declaredMimeType: input.mimeType,
        declaredSizeBytes: input.sizeBytes,
        expectedSha256: input.sha256?.toLowerCase(),
        quarantineKey: key,
        expiresAt,
      });
      await writeAudit(
        tx,
        audit,
        "kyc.upload_intent_created",
        "clients",
        client.id,
        input.documentType,
      );
    });
    const upload = await getDocumentStorageRuntime().storage.createUploadGrant({
      key,
      contentType: input.mimeType,
      maxBytes: input.sizeBytes,
      intentId: id,
      expiresInSeconds: 600,
    });
    return { intentId: id, upload };
  }

  async completeIntent(principal: AuthPrincipal, intentId: string, audit: AuditContext) {
    const { firmId, actorId } = requireFirmContext(principal);
    const intent = await getIntent(firmId, intentId);
    if (!intent || intent.userId !== actorId)
      throw new AppError("NOT_FOUND", "KYC upload was not found", 404);
    if (intent.status !== "pending" || intent.expiresAt <= new Date())
      throw new AppError("CONFLICT", "KYC upload is not completable", 409);
    const object = await getDocumentStorageRuntime().storage.headObject(intent.quarantineKey);
    if (!object || object.metadata["upload-intent-id"] !== intent.id)
      throw new AppError("VALIDATION_FAILED", "Uploaded object does not match the intent", 400);
    await database.transaction(async (tx) => {
      const now = new Date();
      await tx
        .update(clientKycUploadIntents)
        .set({ status: "uploaded", uploadedAt: now, updatedAt: now })
        .where(
          and(
            eq(clientKycUploadIntents.id, intent.id),
            eq(clientKycUploadIntents.status, "pending"),
          ),
        );
      await tx
        .insert(durableJobs)
        .values({
          firmId,
          type: "kyc.malware_scan",
          idempotencyKey: `kyc:${intent.id}`,
          payload: { kycIntentId: intent.id },
          actorUserId: actorId,
          timeoutSeconds: 300,
        })
        .onConflictDoNothing();
      await writeAudit(
        tx,
        audit,
        "kyc.upload_completed",
        "clients",
        intent.clientId,
        inputDetails(intent),
      );
    });
    return { status: "uploaded" as const };
  }

  async getIntentStatus(principal: AuthPrincipal, intentId: string) {
    const { firmId, actorId } = requireFirmContext(principal);
    const intent = await getIntent(firmId, intentId);
    if (!intent || (intent.userId !== actorId && !principal.capabilities.has("kyc.review")))
      throw new AppError("NOT_FOUND", "KYC upload was not found", 404);
    return { status: intent.status, failureCode: intent.failureCode };
  }

  async process(intentId: string, firmId: string) {
    const intent = await getIntent(firmId, intentId);
    if (!intent) throw new Error("KYC upload intent was not found");
    if (intent.status === "promoted" || intent.status === "rejected")
      return { status: intent.status };
    if (intent.status !== "uploaded" && intent.status !== "scanning")
      throw new Error("KYC upload is not ready for scanning");
    const runtime = getDocumentStorageRuntime();
    const object = await runtime.storage.headObject(intent.quarantineKey);
    if (!object) throw new Error("KYC quarantine object is missing");
    const bytes = await runtime.storage.readObject(intent.quarantineKey);
    await database
      .update(clientKycUploadIntents)
      .set({ status: "scanning", updatedAt: new Date() })
      .where(eq(clientKycUploadIntents.id, intent.id));
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
      if (scan.verdict === "infected")
        return this.reject(intent.id, intent.quarantineKey, "MALWARE_DETECTED", scan.details);
      const protectedKey = `protected/${firmId}/kyc/${intent.clientId}/${intent.id}/${valid.sha256}`;
      await runtime.storage.putObject(
        protectedKey,
        scan.sanitizedBytes ?? valid.bytes,
        valid.mimeType,
        { sha256: valid.sha256, "scan-provider": scan.provider, "kyc-intent-id": intent.id },
      );
      await database
        .update(clientKycUploadIntents)
        .set({
          status: "promoted",
          protectedKey,
          actualSha256: valid.sha256,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(clientKycUploadIntents.id, intent.id));
      await runtime.storage.deleteObject(intent.quarantineKey);
      return { status: "promoted" as const };
    } catch (error) {
      if (error instanceof FileValidationError)
        return this.reject(intent.id, intent.quarantineKey, error.code, error.message);
      throw error;
    }
  }

  async submit(principal: AuthPrincipal, input: KycSubmitInput, audit: AuditContext) {
    const { firmId, actorId } = requireFirmContext(principal);
    const client = await requireOwnClient(firmId, actorId);
    if (client.kycStatus === "verified")
      throw new AppError("CONFLICT", "KYC is already verified", 409);
    const intents = await database
      .select()
      .from(clientKycUploadIntents)
      .where(
        and(
          eq(clientKycUploadIntents.firmId, firmId),
          eq(clientKycUploadIntents.clientId, client.id),
          eq(clientKycUploadIntents.userId, actorId),
          inArray(clientKycUploadIntents.id, input.uploadIntentIds),
          isNull(clientKycUploadIntents.deletedAt),
        ),
      );
    if (
      intents.length !== new Set(input.uploadIntentIds).size ||
      intents.some(
        (intent) => intent.status !== "promoted" || !intent.protectedKey || !intent.actualSha256,
      )
    )
      throw new AppError(
        "VALIDATION_FAILED",
        "Every KYC file must finish malware scanning before submission",
        400,
      );
    if (
      !intents.some((intent) => intent.documentType === "government_id") ||
      !intents.some((intent) => intent.documentType === "proof_of_address")
    )
      throw new AppError(
        "VALIDATION_FAILED",
        "Government ID and proof of address are both required",
        400,
      );
    await database.transaction(async (tx) => {
      for (const intent of intents)
        await tx
          .insert(clientKycFiles)
          .values({
            firmId,
            clientId: client.id,
            storageId: intent.protectedKey!,
            documentType: intent.documentType,
            fileName: intent.originalFileName,
            mimeType: intent.declaredMimeType,
            sha256: intent.actualSha256,
          })
          .onConflictDoNothing({ target: [clientKycFiles.firmId, clientKycFiles.storageId] });
      await tx
        .update(clients)
        .set({
          kycStatus: "submitted",
          address: input.address,
          kycIdNumber: input.idNumber,
          kycConsentAt: audit.occurredAt,
          kycConsentVersion: KYC_CONSENT_VERSION,
          kycSubmittedAt: audit.occurredAt,
          kycRejectionReason: null,
          kycReviewedAt: null,
          kycReviewedBy: null,
          updatedAt: audit.occurredAt,
        })
        .where(and(eq(clients.id, client.id), eq(clients.firmId, firmId)));
      await writeAudit(
        tx,
        audit,
        "kyc.submitted",
        "clients",
        client.id,
        `files=${intents.length}; consent=${KYC_CONSENT_VERSION}`,
      );
      await tx.insert(notifications).values({
        firmId,
        userId: actorId,
        title: "KYC submitted",
        body: "Your identity documents are awaiting firm review.",
        type: "system",
        relatedId: client.id,
        link: "/client/kyc",
      });
    });
    return { success: true };
  }

  async review(
    principal: AuthPrincipal,
    clientId: string,
    input: KycReviewInput,
    audit: AuditContext,
  ) {
    requireCapability(principal, "kyc.review");
    const { firmId } = requireFirmContext(principal);
    const [client] = await database
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.firmId, firmId), isNull(clients.deletedAt)))
      .limit(1);
    if (!client) throw new AppError("NOT_FOUND", "Client was not found", 404);
    if (client.kycStatus !== "submitted")
      throw new AppError("CONFLICT", "Only submitted KYC can be reviewed", 409);
    await database.transaction(async (tx) => {
      await tx
        .update(clients)
        .set({
          kycStatus: input.decision,
          kycRejectionReason: input.decision === "rejected" ? input.rejectionReason : null,
          kycReviewedAt: audit.occurredAt,
          kycReviewedBy: audit.actorId,
          updatedAt: audit.occurredAt,
        })
        .where(and(eq(clients.id, clientId), eq(clients.firmId, firmId)));
      await writeAudit(
        tx,
        audit,
        input.decision === "verified" ? "kyc.verified" : "kyc.rejected",
        "clients",
        clientId,
        input.rejectionReason ?? null,
      );
      if (client.userId)
        await tx.insert(notifications).values({
          firmId,
          userId: client.userId,
          title: input.decision === "verified" ? "KYC verified" : "KYC needs attention",
          body:
            input.decision === "verified"
              ? "Your identity verification was approved."
              : `Your KYC was rejected: ${input.rejectionReason}`,
          type: "system",
          relatedId: clientId,
          link: "/client/kyc",
        });
    });
    return { success: true };
  }

  async listFiles(principal: AuthPrincipal, clientId: string) {
    requireCapability(principal, "kyc.review");
    const { firmId } = requireFirmContext(principal);
    const [client] = await database
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.firmId, firmId), isNull(clients.deletedAt)))
      .limit(1);
    if (!client) throw new AppError("NOT_FOUND", "Client was not found", 404);
    const files = await database
      .select()
      .from(clientKycFiles)
      .where(
        and(
          eq(clientKycFiles.firmId, firmId),
          eq(clientKycFiles.clientId, clientId),
          isNull(clientKycFiles.deletedAt),
        ),
      );
    return Promise.all(
      files.map(async (file) => ({
        _id: file.id,
        docType: file.documentType,
        fileName: file.fileName,
        mimeType: file.mimeType,
        sha256: file.sha256,
        url: await getDocumentStorageRuntime().storage.createDownloadUrl(
          file.storageId,
          getServerEnvironment().DOWNLOAD_URL_TTL_SECONDS,
        ),
      })),
    );
  }

  async cleanupExpired(limit = 200) {
    const now = new Date();
    const expired = await database
      .select({
        id: clientKycUploadIntents.id,
        quarantineKey: clientKycUploadIntents.quarantineKey,
      })
      .from(clientKycUploadIntents)
      .where(
        and(
          eq(clientKycUploadIntents.status, "pending"),
          lte(clientKycUploadIntents.expiresAt, now),
          isNull(clientKycUploadIntents.deletedAt),
        ),
      )
      .limit(limit);
    for (const intent of expired) {
      await getDocumentStorageRuntime().storage.deleteObject(intent.quarantineKey);
      await database
        .update(clientKycUploadIntents)
        .set({ status: "expired", completedAt: now, updatedAt: now })
        .where(
          and(
            eq(clientKycUploadIntents.id, intent.id),
            eq(clientKycUploadIntents.status, "pending"),
          ),
        );
    }
    return { expired: expired.length };
  }

  private async reject(intentId: string, quarantineKey: string, code: string, details: string) {
    await database
      .update(clientKycUploadIntents)
      .set({
        status: "rejected",
        failureCode: code,
        failureDetails: details,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(clientKycUploadIntents.id, intentId));
    await getDocumentStorageRuntime().storage.deleteObject(quarantineKey);
    return { status: "rejected" as const };
  }
}

async function requireOwnClient(firmId: string, userId: string) {
  const [client] = await database
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.firmId, firmId),
        eq(clients.userId, userId),
        eq(clients.isActive, true),
        isNull(clients.deletedAt),
      ),
    )
    .limit(1);
  if (!client)
    throw new AppError("NOT_FOUND", "No active client profile is linked to this account", 404);
  return client;
}
async function getIntent(firmId: string, id: string) {
  const [intent] = await database
    .select()
    .from(clientKycUploadIntents)
    .where(
      and(
        eq(clientKycUploadIntents.id, id),
        eq(clientKycUploadIntents.firmId, firmId),
        isNull(clientKycUploadIntents.deletedAt),
      ),
    )
    .limit(1);
  return intent ?? null;
}
type Transaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];
async function writeAudit(
  tx: Transaction,
  audit: AuditContext,
  action: string,
  resource: string,
  resourceId: string,
  details: string | null,
) {
  await tx.insert(auditLog).values({
    firmId: audit.firmId,
    userId: audit.actorId,
    action,
    resource,
    resourceId,
    details,
    ipAddress: audit.ipAddress,
    requestId: audit.requestId,
    createdAt: audit.occurredAt,
    updatedAt: audit.occurredAt,
  });
}
function sanitizeFileName(value: string) {
  const name = value
    .split(/[\\/]/)
    .at(-1)
    ?.normalize("NFKC")
    .replace(/[^A-Za-z0-9._ -]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return (name || "kyc-file").slice(0, 180);
}
function inputDetails(intent: typeof clientKycUploadIntents.$inferSelect) {
  return `${intent.documentType}:${intent.originalFileName}`;
}

let service: KycService | undefined;
export function getKycService() {
  service ??= new KycService();
  return service;
}
