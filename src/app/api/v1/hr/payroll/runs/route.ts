import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getHrService } from "@/server/services/hr-service";
import { payrollRunCreateSchema, payrollRunListSchema } from "@/shared/contracts/hr";

export const GET = withApiHandler("/api/v1/hr/payroll/runs", async ({ request }) => {
  const principal = await requireSession(request);
  const input = payrollRunListSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return jsonResponse({ data: await getHrService().listPayrollRuns(principal, input) });
});

export const POST = withApiHandler("/api/v1/hr/payroll/runs", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = payrollRunCreateSchema.parse(await request.json());
  return jsonResponse(
    {
      data: await getHrService().createPayrollRun(
        principal,
        input,
        buildAuditContext(request, requestId, principal),
      ),
    },
    { status: 201 },
  );
});
