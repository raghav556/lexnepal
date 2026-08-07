import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getHrService } from "@/server/services/hr-service";
import { leaveReviewSchema } from "@/shared/contracts/hr";

export const POST = withApiHandler(
  "/api/v1/hr/leave-requests/review",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const input = leaveReviewSchema.parse(await request.json());
    return jsonResponse({
      data: await getHrService().reviewLeaveRequest(
        principal,
        input,
        buildAuditContext(request, requestId, principal),
      ),
    });
  },
);
