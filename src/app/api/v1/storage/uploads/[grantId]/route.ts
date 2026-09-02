import { z } from "zod";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { AppError } from "@/shared/errors/api-error";
import { getObjectStorageRuntime } from "@/server/storage/runtime";

type Context = { params: Promise<{ grantId: string }> };

/**
 * App-controlled replacement for S3 presigned POST uploads. The grant is minted by the
 * existing intent services (which already ran capability/case/firm authorization) and is
 * single-use, size-bounded, and expiring. There is deliberately no session requirement
 * here: the grant itself is the bearer capability, exactly like an S3 presigned POST —
 * but the bytes land on the local filesystem inside the configured storage root.
 */
export const POST = (request: Request, context: Context) =>
  withApiHandler("/api/v1/storage/uploads/:grantId", async ({ request: handled }) => {
    const grantId = z
      .string()
      .uuid()
      .parse((await context.params).grantId);
    const contentType = handled.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new AppError("VALIDATION_FAILED", "Upload must be multipart/form-data", 422);
    }
    const form = await handled.formData().catch(() => null);
    if (!form) throw new AppError("VALIDATION_FAILED", "Upload form is invalid", 422);
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new AppError("VALIDATION_FAILED", "Upload form is missing the file field", 422);
    }
    const storage = getObjectStorageRuntime();
    const grant = await storage.consumeUploadGrant(grantId).catch(() => null);
    if (!grant) throw new AppError("NOT_FOUND", "Upload grant is invalid or expired", 404);
    if (file.type && file.type !== grant.contentType) {
      throw new AppError("VALIDATION_FAILED", "Upload MIME type does not match the intent", 422);
    }
    if (file.size < 1 || file.size > grant.maxBytes) {
      throw new AppError("VALIDATION_FAILED", "Upload size does not match the intent", 422);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      const stored = await storage.storeGrantedUpload(grantId, bytes);
      return jsonResponse(
        { data: { key: stored.key, sizeBytes: stored.sizeBytes } },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("VALIDATION_FAILED", "Upload was rejected by storage", 422, {
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  })(request);
