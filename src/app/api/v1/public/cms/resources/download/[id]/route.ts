import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getCmsService } from "@/server/services/cms-service";
import { cmsIdSchema, resourceDownloadRequestSchema } from "@/shared/contracts/cms";

type Context = { params: Promise<{ id: string }> };

export const POST = (request: Request, context: Context) =>
  withApiHandler("/api/v1/public/cms/resources/download/:id", async ({ request: handled }) => {
    const id = cmsIdSchema.parse((await context.params).id);
    let body: { fullName?: string; email?: string } = {};
    const contentType = handled.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        body = await parseJson(handled, resourceDownloadRequestSchema);
      } catch {
        body = {};
      }
    }
    return jsonResponse({
      data: await getCmsService().requestResourceDownload(id, body),
    });
  })(request);
