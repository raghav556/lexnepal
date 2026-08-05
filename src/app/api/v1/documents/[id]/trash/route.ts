import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDocumentService } from "@/server/services/document-service";
import { uuidSchema } from "@/shared/contracts/documents";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-2));
}

export const POST = withApiHandler("/api/v1/documents/:id/trash", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getDocumentService().trash(principal, idFrom(request)) });
});
