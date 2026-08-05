import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCmsService } from "@/server/services/cms-service";
import { cmsIdSchema } from "@/shared/contracts/cms";
type Context = { params: Promise<{ id: string }> };
export const POST = (request: Request, context: Context) =>
  withApiHandler("/api/v1/public/cms/resources/:id/downloads", async () =>
    jsonResponse({
      data: await getCmsService().incrementDownload(cmsIdSchema.parse((await context.params).id)),
    }),
  )(request);
