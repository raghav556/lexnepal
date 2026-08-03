import { z } from "zod";
import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getCmsService } from "@/server/services/cms-service";
import { cmsIdSchema } from "@/shared/contracts/cms";
const schema = z.object({
  id1: cmsIdSchema,
  order1: z.number().int().min(0),
  id2: cmsIdSchema,
  order2: z.number().int().min(0),
});
export const POST = withApiHandler(
  "/api/v1/cms/navigation/reorder",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    return jsonResponse({
      data: {
        success: await getCmsService().reorderNavigation(
          principal,
          await parseJson(request, schema),
          buildAuditContext(request, requestId, principal),
        ),
      },
    });
  },
);
