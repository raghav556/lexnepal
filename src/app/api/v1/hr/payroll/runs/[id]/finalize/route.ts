import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getHrService } from "@/server/services/hr-service";
import { uuidSchema } from "@/shared/contracts/hr";

function runIdFrom(request: Request) {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  // .../payroll/runs/:id/finalize
  const runsIdx = parts.lastIndexOf("runs");
  return uuidSchema.parse(parts[runsIdx + 1]);
}

export const POST = withApiHandler(
  "/api/v1/hr/payroll/runs/:id/finalize",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    return jsonResponse({
      data: await getHrService().finalizePayrollRun(
        principal,
        runIdFrom(request),
        buildAuditContext(request, requestId, principal),
      ),
    });
  },
);
