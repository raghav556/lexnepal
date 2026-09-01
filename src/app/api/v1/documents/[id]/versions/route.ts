import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDocumentService } from "@/server/services/document-service";
import { uuidSchema } from "@/shared/contracts/documents";

export const GET = withApiHandler("/api/v1/documents/:id/versions", async ({ request }) => {
  const principal = await requireSession(request);
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const documentId = uuidSchema.parse(segments.at(-2));
  return jsonResponse({ data: await getDocumentService().listVersions(principal, documentId) });
});
