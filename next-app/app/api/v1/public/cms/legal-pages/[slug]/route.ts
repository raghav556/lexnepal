import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCmsService } from "@/server/services/cms-service";
import { legalSlugSchema } from "@/shared/contracts/cms";
type Context = { params: Promise<{ slug: string }> };
export const GET = (request: Request, context: Context) =>
  withApiHandler("/api/v1/public/cms/legal-pages/:slug", async () =>
    jsonResponse({
      data: await getCmsService().getLegalPage(legalSlugSchema.parse((await context.params).slug)),
    }),
  )(request);
