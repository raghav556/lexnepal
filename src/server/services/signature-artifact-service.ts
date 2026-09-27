import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { AuthPrincipal } from "@/server/auth/types";
import { getDatabase } from "@/server/db/client";
import { durableJobs, signatureArtifactUploadIntents } from "@/server/db/schema";
import { requireFirmContext } from "@/server/policies/authorization";
import { EnvelopeRepository } from "@/server/repositories/envelope-repository";
import { FileValidationError, validateUploadedFile } from "@/server/storage/file-validation";
import { getDocumentStorageRuntime } from "@/server/storage/runtime";
import type { SignatureArtifactIntentInput } from "@/shared/contracts/envelopes";
import { AppError } from "@/shared/errors/api-error";

const database = getDatabase();

export class SignatureArtifactService {
  async createIntent(principal: AuthPrincipal, input: SignatureArtifactIntentInput) {
    const { firmId, actorId } = requireFirmContext(principal);
    await EnvelopeRepository.assertSigningContext(
      firmId,
      actorId,
      input.documentId,
      input.envelopeId,
    );
    const id = randomUUID();
    const name = sanitizeFileName(input.fileName);
    const quarantineKey = `quarantine/${firmId}/signature-artifacts/${actorId}/${input.documentId}/${id}/${name}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await database.insert(signatureArtifactUploadIntents).values({
      id,
      firmId,
      userId: actorId,
      documentId: input.documentId,
      envelopeId: input.envelopeId ?? null,
      originalFileName: name,
      declaredMimeType: input.mimeType,
      declaredSizeBytes: input.sizeBytes,
      expectedSha256: input.sha256?.toLowerCase(),
      quarantineKey,
      expiresAt,
    });
    const upload = await getDocumentStorageRuntime().storage.createUploadGrant({
      key: quarantineKey,
      contentType: input.mimeType,
      maxBytes: input.sizeBytes,
      intentId: id,
      expiresInSeconds: 600,
    });
    return { intentId: id, upload };
  }

  async completeIntent(principal: AuthPrincipal, intentId: string) {
    const { firmId, actorId } = requireFirmContext(principal);
    const intent = await getIntent(firmId, intentId);
    if (!intent || intent.userId !== actorId)
      throw new AppError("NOT_FOUND", "Signature upload was not found", 404);
    if (intent.status !== "pending" || intent.expiresAt <= new Date())
      throw new AppError("CONFLICT", "Signature upload is not completable", 409);
    const object = await getDocumentStorageRuntime().storage.headObject(intent.quarantineKey);
    if (!object || object.metadata["upload-intent-id"] !== intent.id)
      throw new AppError("VALIDATION_FAILED", "Uploaded signature does not match the intent", 400);
    await database.transaction(async (tx) => {
      await tx
        .update(signatureArtifactUploadIntents)
        .set({ status: "uploaded", uploadedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(signatureArtifactUploadIntents.id, intent.id),
            eq(signatureArtifactUploadIntents.status, "pending"),
          ),
        );
      await tx.insert(durableJobs).values({
        firmId,
        type: "signature_artifact.malware_scan",
        idempotencyKey: `signature-artifact:${intent.id}`,
        payload: { intentId: intent.id },
        actorUserId: actorId,
        timeoutSeconds: 300,
      });
    });
    return this.process(intent.id, firmId);
  }

  async getIntentStatus(principal: AuthPrincipal, intentId: string) {
    const { firmId, actorId } = requireFirmContext(principal);
    const intent = await getIntent(firmId, intentId);
    if (!intent || intent.userId !== actorId)
      throw new AppError("NOT_FOUND", "Signature upload was not found", 404);
    return { status: intent.status, failureCode: intent.failureCode };
  }

  async process(intentId: string, firmId: string) {
    const intent = await getIntent(firmId, intentId);
    if (!intent) throw new Error("Signature upload intent was not found");
    if (intent.status === "promoted" || intent.status === "rejected")
      return { status: intent.status };
    if (intent.status !== "uploaded" && intent.status !== "scanning")
      throw new Error("Signature upload is not ready for scanning");
    const runtime = getDocumentStorageRuntime();
    const object = await runtime.storage.headObject(intent.quarantineKey);
    if (!object) throw new Error("Signature quarantine object is missing");
    const bytes = await runtime.storage.readObject(intent.quarantineKey);
    await database
      .update(signatureArtifactUploadIntents)
      .set({ status: "scanning", updatedAt: new Date() })
      .where(eq(signatureArtifactUploadIntents.id, intent.id));
    try {
      const valid = validateUploadedFile({
        bytes,
        declaredMimeType: intent.declaredMimeType,
        declaredSizeBytes: intent.declaredSizeBytes,
        storedMimeType: object.contentType,
        storedSizeBytes: object.sizeBytes,
        expectedSha256: intent.expectedSha256,
      });
      if (valid.mimeType !== "image/png" && valid.mimeType !== "image/jpeg")
        return this.reject(intent, "UNSUPPORTED_MIME", "Signature images must be PNG or JPEG");
      const scan = await runtime.scanner.scan(valid.bytes, valid.mimeType);
      if (scan.verdict === "infected") return this.reject(intent, "MALWARE_DETECTED", scan.details);
      const protectedKey = `protected/${firmId}/signature-artifacts/${intent.userId}/${intent.documentId}/${intent.id}/${valid.sha256}`;
      await runtime.storage.putObject(
        protectedKey,
        scan.sanitizedBytes ?? valid.bytes,
        valid.mimeType,
        {
          sha256: valid.sha256,
          "signature-artifact-intent-id": intent.id,
          "document-id": intent.documentId,
          "user-id": intent.userId,
        },
      );
      await database
        .update(signatureArtifactUploadIntents)
        .set({
          status: "promoted",
          protectedKey,
          actualSha256: valid.sha256,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(signatureArtifactUploadIntents.id, intent.id));
      await runtime.storage.deleteObject(intent.quarantineKey);
      return { status: "promoted" as const };
    } catch (error) {
      if (error instanceof FileValidationError)
        return this.reject(intent, error.code, error.message);
      throw error;
    }
  }

  private async reject(
    intent: typeof signatureArtifactUploadIntents.$inferSelect,
    code: string,
    details: string,
  ) {
    await database
      .update(signatureArtifactUploadIntents)
      .set({
        status: "rejected",
        failureCode: code,
        failureDetails: details,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(signatureArtifactUploadIntents.id, intent.id));
    await getDocumentStorageRuntime().storage.deleteObject(intent.quarantineKey);
    return { status: "rejected" as const };
  }
}
async function getIntent(firmId: string, id: string) {
  const [intent] = await database
    .select()
    .from(signatureArtifactUploadIntents)
    .where(
      and(
        eq(signatureArtifactUploadIntents.id, id),
        eq(signatureArtifactUploadIntents.firmId, firmId),
      ),
    )
    .limit(1);
  return intent ?? null;
}
function sanitizeFileName(value: string) {
  return (
    value
      .split(/[\\/]/)
      .at(-1)
      ?.normalize("NFKC")
      .replace(/[^A-Za-z0-9._ -]/g, "_")
      .trim() || "signature.png"
  ).slice(0, 180);
}
let service: SignatureArtifactService | undefined;
export function getSignatureArtifactService() {
  service ??= new SignatureArtifactService();
  return service;
}
