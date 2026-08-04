import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDocumentService } from "@/server/services/document-service";
import { documentListSchema } from "@/shared/contracts/documents";

export const GET = withApiHandler("/api/v1/documents", async ({ request }) => {
  const principal = await requireSession(request);
  const input = documentListSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return jsonResponse({ data: await getDocumentService().list(principal, input) });
});
