import { z } from "zod";
import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCmsAssetService } from "@/server/services/cms-asset-service";

type Context = { params: Promise<{ intentId: string }> };

export const GET = (request: Request, context: Context) =>
  withApiHandler("/api/v1/cms/asset-upload-intents/:intentId", async ({ request: handled }) => {
    const principal = await requireSession(handled);
    const intentId = z
      .string()
      .uuid()
      .parse((await context.params).intentId);
    return jsonResponse({ data: await getCmsAssetService().getIntentStatus(principal, intentId) });
  })(request);
