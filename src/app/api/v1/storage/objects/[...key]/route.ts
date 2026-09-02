import { withApiHandler } from "@/server/http/handler";
import { AppError } from "@/shared/errors/api-error";
import { getObjectStorageRuntime } from "@/server/storage/runtime";

type Context = { params: Promise<{ key: string[] }> };

/**
 * App-controlled replacement for S3 presigned GET downloads. Every URL is minted by a
 * service that already enforced document/case/firm authorization; the embedded HMAC
 * token is bound to this exact object key and an expiry, so an old or forged token
 * (and any direct access without a token) is rejected. Bytes are streamed from the
 * local storage root — never from a public static directory.
 */
export const GET = (request: Request, context: Context) =>
  withApiHandler("/api/v1/storage/objects/*", async ({ request: handled }) => {
    const keySegments = (await context.params).key;
    const key = keySegments.join("/");
    if (!key) {
      throw new AppError("NOT_FOUND", "Object was not found", 404);
    }
    const token = new URL(handled.url).searchParams.get("token") ?? "";
    if (!token) throw new AppError("FORBIDDEN", "A download token is required", 403);
    const storage = getObjectStorageRuntime();
    if (!(await storage.resolveDownloadToken(key, token))) {
      throw new AppError("FORBIDDEN", "Download token is invalid or expired", 403);
    }
    const object = await storage.headObject(key);
    if (!object) throw new AppError("NOT_FOUND", "Object was not found", 404);
    const bytes = await storage.readObject(key);
    return new Response(bytes, {
      headers: {
        "content-disposition": "attachment",
        "content-length": String(bytes.byteLength),
        "content-type": object.contentType ?? "application/octet-stream",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  })(request);
