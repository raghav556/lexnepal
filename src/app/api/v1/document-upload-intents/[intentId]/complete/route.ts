import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDocumentStorageRuntime } from "@/server/storage/runtime";

export const POST = withApiHandler(
  "/api/v1/document-upload-intents/:intentId/complete",
  async ({ request, logger }) => {
    const principal = await requireSession(request);
    const segments = new URL(request.url).pathname.split("/").filter(Boolean);
    const intentId = segments.at(-2) ?? "";
    const pipeline = getDocumentStorageRuntime().pipeline;
    await pipeline.completeUpload(principal, intentId);
    try {
      await pipeline.processNextScan(`complete-${intentId}`, intentId);
    } catch (error) {
      logger.warn("document.complete.inline_scan_failed", {
        intentId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
    const result = await pipeline.describeUploadIntent(principal, intentId);
    return jsonResponse({ data: result }, { status: result.status === "scanning" ? 202 : 200 });
  },
);
