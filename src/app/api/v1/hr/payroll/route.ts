import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getHrService } from "@/server/services/hr-service";

export const GET = withApiHandler("/api/v1/hr/payroll", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  return jsonResponse({
    data: await getHrService().generatePayroll(
      principal,
      buildAuditContext(request, requestId, principal),
    ),
  });
});
