import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getCmsService } from "@/server/services/cms-service";
import { cmsIdSchema, teamProfileInputSchema } from "@/shared/contracts/cms";
type Context = { params: Promise<{ id: string }> };
export const PATCH = (request: Request, context: Context) =>
  withApiHandler("/api/v1/cms/team/:id", async ({ request: handled, requestId }) => {
    const principal = await requireSession(handled);
    return jsonResponse({
      data: await getCmsService().updateTeamProfile(
        principal,
        cmsIdSchema.parse((await context.params).id),
        await parseJson(handled, teamProfileInputSchema),
        buildAuditContext(handled, requestId, principal),
      ),
    });
  })(request);
