import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getMattersService } from "@/server/services/matters-service";
import { uuidSchema } from "@/shared/contracts/matters";

export const POST = withApiHandler(
  "/api/v1/clients/:id/portal-access",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const segments = new URL(request.url).pathname.split("/").filter(Boolean);
    const clientId = uuidSchema.parse(segments.at(-2));
    return jsonResponse({
      data: await getMattersService().grantPortalAccess(
        principal,
        clientId,
        buildAuditContext(request, requestId, principal),
      ),
    });
  },
);
