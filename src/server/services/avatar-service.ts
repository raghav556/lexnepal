import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { auditLog, avatarUploadIntents, durableJobs, users } from "@/server/db/schema";
import { getServerEnvironment } from "@/server/env";
import type { AuthPrincipal } from "@/server/auth/types";
import type { AuditContext } from "@/server/audit/context";
import { requireFirmContext } from "@/server/policies/authorization";
import { getDocumentStorageRuntime } from "@/server/storage/runtime";
import { validateUploadedFile, FileValidationError } from "@/server/storage/file-validation";
import { AppError } from "@/shared/errors/api-error";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const database = getDatabase();

export class AvatarService {
  async removeAvatar(principal: AuthPrincipal, audit: AuditContext) {
    const { firmId, actorId } = requireFirmContext(principal);
    const [user] = await database
      .select({ avatar: users.avatar })
      .from(users)
      .where(and(eq(users.id, actorId), eq(users.firmId, firmId)))
      .limit(1);
    if (!user) throw new AppError("NOT_FOUND", "User was not found", 404);
    await database.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ avatar: null, updatedAt: audit.occurredAt })
        .where(and(eq(users.id, actorId), eq(users.firmId, firmId)));
      await tx.insert(auditLog).values({
        firmId,
        userId: actorId,
        action: "avatar.removed",
        resource: "users",
        resourceId: actorId,
        ipAddress: audit.ipAddress,
        requestId: audit.requestId,
      });
    });
    if (user.avatar) await getDocumentStorageRuntime().storage.deleteObject(user.avatar);
  }

  async createIntent(
    principal: AuthPrincipal,
    input: { fileName: string; mimeType: string; sizeBytes: number; sha256?: string },
    audit: AuditContext,
  ) {
    const { firmId, actorId } = requireFirmContext(principal);
    const mimeType = input.mimeType.toLowerCase();
    if (!MIME_TYPES.has(mimeType))
      throw new AppError("VALIDATION_FAILED", "Avatar must be JPEG or PNG", 400);
    if (input.sizeBytes < 1 || input.sizeBytes > MAX_AVATAR_BYTES)
      throw new AppError("VALIDATION_FAILED", "Avatar must not exceed 5 MB", 400);
    const id = randomUUID();
    const extension = mimeType === "image/png" ? "png" : "jpg";
    const key = `quarantine/${firmId}/avatars/${id}/avatar.${extension}`;
    const expiresAt = new Date(Date.now() + 3_600_000);
    await database.transaction(async (tx) => {
      await tx.insert(avatarUploadIntents).values({
        id,
        firmId,
        userId: actorId,
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
        action: "avatar.upload_intent_created",
        resource: "users",
        resourceId: actorId,
        ipAddress: audit.ipAddress,
        requestId: audit.requestId,
      });
    });
    const grant = await getDocumentStorageRuntime().storage.createUploadGrant({
      key,
      contentType: mimeType,
      maxBytes: MAX_AVATAR_BYTES,
      intentId: id,
      expiresInSeconds: 600,
    });
    return { intentId: id, upload: grant };
  }

  async completeIntent(principal: AuthPrincipal, intentId: string, audit: AuditContext) {
    const { firmId, actorId } = requireFirmContext(principal);
    const [intent] = await database
      .select()
      .from(avatarUploadIntents)
      .where(
        and(
          eq(avatarUploadIntents.id, intentId),
          eq(avatarUploadIntents.firmId, firmId),
          eq(avatarUploadIntents.userId, actorId),
          isNull(avatarUploadIntents.deletedAt),
        ),
      )
      .limit(1);
    if (!intent) throw new AppError("NOT_FOUND", "Avatar upload was not found", 404);
    if (intent.status !== "pending" || intent.expiresAt <= new Date())
      throw new AppError("CONFLICT", "Avatar upload is not completable", 409);
    const object = await getDocumentStorageRuntime().storage.headObject(intent.quarantineKey);
    if (!object || object.metadata["upload-intent-id"] !== intent.id)
      throw new AppError("VALIDATION_FAILED", "Uploaded object does not match the intent", 400);
    await database.transaction(async (tx) => {
      const now = new Date();
      await tx
        .update(avatarUploadIntents)
        .set({ status: "uploaded", uploadedAt: now, updatedAt: now })
        .where(eq(avatarUploadIntents.id, intent.id));
      await tx
        .insert(durableJobs)
        .values({
          firmId,
          type: "identity.avatar_scan",
          idempotencyKey: `avatar:${intent.id}`,
          payload: { avatarIntentId: intent.id },
          actorUserId: actorId,
          timeoutSeconds: 120,
        })
        .onConflictDoNothing();
      await tx.insert(auditLog).values({
        firmId,
        userId: actorId,
        action: "avatar.upload_completed",
        resource: "users",
        resourceId: actorId,
        ipAddress: audit.ipAddress,
        requestId: audit.requestId,
      });
    });
    return { status: "uploaded" as const };
  }

  async process(intentId: string, firmId: string) {
    const [intent] = await database
      .select()
      .from(avatarUploadIntents)
      .where(and(eq(avatarUploadIntents.id, intentId), eq(avatarUploadIntents.firmId, firmId)))
      .limit(1);
    if (!intent) throw new Error("Avatar intent was not found");
    if (intent.status === "promoted" || intent.status === "rejected")
      return { status: intent.status };
    const runtime = getDocumentStorageRuntime();
    const object = await runtime.storage.headObject(intent.quarantineKey);
    if (!object) throw new Error("Avatar quarantine object is missing");
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
          .update(avatarUploadIntents)
          .set({
            status: "rejected",
            failureCode: "MALWARE_DETECTED",
            failureDetails: scan.details,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(avatarUploadIntents.id, intent.id));
        await runtime.storage.deleteObject(intent.quarantineKey);
        return { status: "rejected" as const };
      }
      const extension = valid.mimeType === "image/png" ? "png" : "jpg";
      const protectedKey = `protected/${firmId}/avatars/${intent.userId}/${valid.sha256}.${extension}`;
      await runtime.storage.putObject(
        protectedKey,
        scan.sanitizedBytes ?? valid.bytes,
        valid.mimeType,
        { sha256: valid.sha256, "scan-provider": scan.provider },
      );
      await database.transaction(async (tx) => {
        const now = new Date();
        await tx
          .update(avatarUploadIntents)
          .set({
            status: "promoted",
            protectedKey,
            actualSha256: valid.sha256,
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(avatarUploadIntents.id, intent.id));
        await tx
          .update(users)
          .set({ avatar: protectedKey, updatedAt: now })
          .where(and(eq(users.id, intent.userId), eq(users.firmId, firmId)));
      });
      await runtime.storage.deleteObject(intent.quarantineKey);
      return { status: "promoted" as const };
    } catch (error) {
      if (error instanceof FileValidationError) {
        await database
          .update(avatarUploadIntents)
          .set({
            status: "rejected",
            failureCode: error.code,
            failureDetails: error.message,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(avatarUploadIntents.id, intent.id));
        await runtime.storage.deleteObject(intent.quarantineKey);
        return { status: "rejected" as const };
      }
      throw error;
    }
  }

  async createAvatarDownload(userId: string, principal?: AuthPrincipal) {
    const [user] = await database
      .select({ firmId: users.firmId, avatar: users.avatar, isPublicFacing: users.isPublicFacing })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!user?.avatar) throw new AppError("NOT_FOUND", "Avatar was not found", 404);
    if (!user.isPublicFacing && (!principal || principal.firmId !== user.firmId))
      throw new AppError("FORBIDDEN", "Avatar access is denied", 403);
    return getDocumentStorageRuntime().storage.createDownloadUrl(
      user.avatar,
      getServerEnvironment().DOWNLOAD_URL_TTL_SECONDS,
    );
  }
}

let service: AvatarService | undefined;
export function getAvatarService() {
  service ??= new AvatarService();
  return service;
}
