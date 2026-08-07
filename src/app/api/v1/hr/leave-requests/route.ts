import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getHrService } from "@/server/services/hr-service";
import { leaveCreateSchema, leaveListSchema } from "@/shared/contracts/hr";

export const GET = withApiHandler("/api/v1/hr/leave-requests", async ({ request }) => {
  const principal = await requireSession(request);
  const input = leaveListSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return jsonResponse({ data: await getHrService().listLeaveRequests(principal, input) });
});

export const POST = withApiHandler("/api/v1/hr/leave-requests", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = leaveCreateSchema.parse(await request.json());
  return jsonResponse(
    {
      data: await getHrService().createLeaveRequest(
        principal,
        input,
        buildAuditContext(request, requestId, principal),
      ),
    },
    { status: 201 },
  );
});
