import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getMattersService } from "@/server/services/matters-service";
import { caseConflictDecisionSchema, uuidSchema } from "@/shared/contracts/matters";

export const POST = withApiHandler(
  "/api/v1/cases/:id/conflict-decision",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const segments = new URL(request.url).pathname.split("/").filter(Boolean);
    const caseId = uuidSchema.parse(segments.at(-2));
    const input = caseConflictDecisionSchema.parse(await request.json());
    return jsonResponse({
      data: await getMattersService().markCaseConflict(
        principal,
        caseId,
        input.cleared,
        buildAuditContext(request, requestId, principal),
      ),
    });
  },
);
