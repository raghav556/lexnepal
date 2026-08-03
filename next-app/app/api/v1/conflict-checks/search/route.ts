import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getMattersService } from "@/server/services/matters-service";
import { conflictSearchSchema } from "@/shared/contracts/matters";

export const POST = withApiHandler(
  "/api/v1/conflict-checks/search",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const input = conflictSearchSchema.parse(await request.json());
    return jsonResponse(
      {
        data: await getMattersService().searchConflicts(
          principal,
          input.query,
          buildAuditContext(request, requestId, principal),
        ),
      },
      { status: 201 },
    );
  },
);
