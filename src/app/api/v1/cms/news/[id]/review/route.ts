import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getCmsService } from "@/server/services/cms-service";
import { cmsIdSchema, newsReviewActionSchema } from "@/shared/contracts/cms";

type Context = { params: Promise<{ id: string }> };

export const POST = (request: Request, context: Context) =>
  withApiHandler("/api/v1/cms/news/:id/review", async ({ request: handled, requestId }) => {
    const principal = await requireSession(handled);
    const id = cmsIdSchema.parse((await context.params).id);
    const input = await parseJson(handled, newsReviewActionSchema);
    return jsonResponse({
      data: await getCmsService().reviewNewsItem(
        principal,
        id,
        input,
        buildAuditContext(handled, requestId, principal),
      ),
    });
  })(request);
