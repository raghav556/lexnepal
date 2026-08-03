import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCmsService } from "@/server/services/cms-service";
import { slugSchema } from "@/shared/contracts/cms";
type Context = { params: Promise<{ slug: string }> };
export const GET = (request: Request, context: Context) =>
  withApiHandler("/api/v1/public/cms/blog-posts/:slug", async () =>
    jsonResponse({
      data: await getCmsService().getPublishedPost(slugSchema.parse((await context.params).slug)),
    }),
  )(request);
