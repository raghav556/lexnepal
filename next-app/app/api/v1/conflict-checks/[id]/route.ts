import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getMattersService } from "@/server/services/matters-service";
import { conflictDecisionSchema, uuidSchema } from "@/shared/contracts/matters";

export const PATCH = withApiHandler(
  "/api/v1/conflict-checks/:id",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const id = uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-1));
    const input = conflictDecisionSchema.parse(await request.json());
    return jsonResponse({
      data: await getMattersService().decideConflict(
        principal,
        id,
        input,
        buildAuditContext(request, requestId, principal),
      ),
    });
  },
);
