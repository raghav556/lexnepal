import { z } from "zod";
import { withApiHandler } from "@/server/http/handler";
import { getCmsAssetService } from "@/server/services/cms-asset-service";

type Context = { params: Promise<{ assetId: string }> };

export const GET = (request: Request, context: Context) =>
  withApiHandler("/api/v1/public/cms/assets/:assetId", async () => {
    const assetId = z
      .string()
      .uuid()
      .parse((await context.params).assetId);
    return Response.redirect(await getCmsAssetService().createPublicDownload(assetId), 307);
  })(request);
