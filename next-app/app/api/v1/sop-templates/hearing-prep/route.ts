import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getWorkManagementService } from "@/server/services/work-management-service";
import { hearingPrepSchema } from "@/shared/contracts/work-management";

export const POST = withApiHandler("/api/v1/sop-templates/hearing-prep", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = hearingPrepSchema.parse(await request.json());
  return jsonResponse(
    { data: await getWorkManagementService().createHearingPrepTasks(principal, input, buildAuditContext(request, requestId, principal)) },
    { status: 201 },
  );
});
