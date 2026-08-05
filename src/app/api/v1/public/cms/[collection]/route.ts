import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { cmsCollectionSchema } from "@/server/http/cms-validation";
import { getCmsService } from "@/server/services/cms-service";
type Context = { params: Promise<{ collection: string }> };
export const GET = (request: Request, context: Context) =>
  withApiHandler("/api/v1/public/cms/:collection", async () => {
    const collection = cmsCollectionSchema.parse((await context.params).collection);
    return jsonResponse({
      data: await getCmsService().listPublic(collection, new URL(request.url).searchParams),
    });
  })(request);
