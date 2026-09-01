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
    const asset = await getCmsAssetService().getPublicAssetDelivery(assetId);
    if (asset.kind === "redirect") return Response.redirect(asset.url, 307);
    return new Response(asset.bytes, {
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
        "content-length": String(asset.bytes.byteLength),
        "content-type": asset.contentType,
        "cross-origin-resource-policy": "same-origin",
        etag: asset.sha256 ? `"${asset.sha256}"` : `"${assetId}"`,
        "x-content-type-options": "nosniff",
      },
    });
  })(request);
