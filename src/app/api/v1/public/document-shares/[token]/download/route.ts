import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDocumentService } from "@/server/services/document-service";
import { publicDocumentShareSchema } from "@/shared/contracts/documents";

function tokenFrom(request: Request) {
  return new URL(request.url).pathname.split("/").filter(Boolean).at(-2) || "";
}

export const POST = withApiHandler(
  "/api/v1/public/document-shares/:token/download",
  async ({ request }) => {
    const token = tokenFrom(request);
    const body = await request.json().catch(() => ({}));
    const input = publicDocumentShareSchema.parse({ token, ...(body as object) });
    return jsonResponse({
      data: await getDocumentService().downloadPublicShare(input.token, input.password),
    });
  },
);
