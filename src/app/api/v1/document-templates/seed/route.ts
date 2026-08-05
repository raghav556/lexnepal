import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDocumentTemplateService } from "@/server/services/document-template-service";

export const POST = withApiHandler("/api/v1/document-templates/seed", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getDocumentTemplateService().seed(principal) });
});
