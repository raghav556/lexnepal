import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getWorkManagementService } from "@/server/services/work-management-service";
import { sopRunSchema } from "@/shared/contracts/work-management";

export const POST = withApiHandler("/api/v1/sop-templates/run", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = sopRunSchema.parse(await request.json());
  return jsonResponse(
    { data: await getWorkManagementService().runSop(principal, input, buildAuditContext(request, requestId, principal)) },
    { status: 201 },
  );
});
