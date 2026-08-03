import { z } from "zod";
import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getCmsService } from "@/server/services/cms-service";
import { applicationStatusSchema, cmsIdSchema } from "@/shared/contracts/cms";
const bodySchema = z.object({ status: applicationStatusSchema });
type Context = { params: Promise<{ id: string }> };
export const PATCH = (request: Request, context: Context) =>
  withApiHandler("/api/v1/cms/applications/:id", async ({ request: handled, requestId }) => {
    const principal = await requireSession(handled);
    const { status } = await parseJson(handled, bodySchema);
    return jsonResponse({
      data: await getCmsService().updateApplicationStatus(
        principal,
        cmsIdSchema.parse((await context.params).id),
        status,
        buildAuditContext(handled, requestId, principal),
      ),
    });
  })(request);
