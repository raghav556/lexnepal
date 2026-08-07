import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getCmsService } from "@/server/services/cms-service";
import { cmsIdSchema, newsInputSchema } from "@/shared/contracts/cms";

type Context = { params: Promise<{ id: string }> };

export const PATCH = (request: Request, context: Context) =>
  withApiHandler("/api/v1/staff/content/news/:id", async ({ request: handled, requestId }) => {
    const principal = await requireSession(handled);
    const id = cmsIdSchema.parse((await context.params).id);
    const input = await parseJson(handled, newsInputSchema.partial());
    return jsonResponse({
      data: await getCmsService().updateStaffNews(
        principal,
        id,
        input,
        buildAuditContext(handled, requestId, principal),
      ),
    });
  })(request);
