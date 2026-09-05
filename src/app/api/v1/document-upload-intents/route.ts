import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { AppError } from "@/shared/errors/api-error";
import { getDocumentStorageRuntime } from "@/server/storage/runtime";
import { documentUploadIntentSchema } from "@/shared/contracts/documents";

export const POST = withApiHandler("/api/v1/document-upload-intents", async ({ request }) => {
  const principal = await requireSession(request);
  const parsed = documentUploadIntentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new AppError("VALIDATION_FAILED", "Upload intent request is invalid", 422, {
      fields: parsed.error.flatten().fieldErrors,
    });
  }
  const result = await getDocumentStorageRuntime().pipeline.createUploadIntent(
    principal,
    parsed.data,
  );
  return jsonResponse({ data: result }, { status: 201 });
});
