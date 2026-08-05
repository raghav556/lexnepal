import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDocumentStorageRuntime } from "@/server/storage/runtime";

export const POST = withApiHandler(
  "/api/v1/document-upload-intents/:intentId/complete",
  async ({ request }) => {
    const principal = await requireSession(request);
    const segments = new URL(request.url).pathname.split("/").filter(Boolean);
    const intentId = segments.at(-2) ?? "";
    const result = await getDocumentStorageRuntime().pipeline.completeUpload(principal, intentId);
    return jsonResponse({ data: result }, { status: 202 });
  },
);
