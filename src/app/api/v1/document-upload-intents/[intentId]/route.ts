import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDocumentStorageRuntime } from "@/server/storage/runtime";
import { uuidSchema } from "@/shared/contracts/documents";

export const GET = withApiHandler(
  "/api/v1/document-upload-intents/:intentId",
  async ({ request }) => {
    const principal = await requireSession(request);
    const intentId = uuidSchema.parse(
      new URL(request.url).pathname.split("/").filter(Boolean).at(-1),
    );
    return jsonResponse({
      data: await getDocumentStorageRuntime().pipeline.describeUploadIntent(principal, intentId),
    });
  },
);
