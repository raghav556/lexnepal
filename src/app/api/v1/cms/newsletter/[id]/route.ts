import { z } from "zod";
import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getCmsService } from "@/server/services/cms-service";
import { cmsIdSchema } from "@/shared/contracts/cms";
const schema = z.object({ isActive: z.boolean() });
type Context = { params: Promise<{ id: string }> };
export const PATCH = (request: Request, context: Context) =>
  withApiHandler("/api/v1/cms/newsletter/:id", async ({ request: handled, requestId }) => {
    const principal = await requireSession(handled);
    const { isActive } = await parseJson(handled, schema);
    return jsonResponse({
      data: await getCmsService().updateNewsletterSubscriber(
        principal,
        cmsIdSchema.parse((await context.params).id),
        isActive,
        buildAuditContext(handled, requestId, principal),
      ),
    });
  })(request);
