import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getHrService } from "@/server/services/hr-service";

export const GET = withApiHandler("/api/v1/hr/payroll/payslips", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getHrService().listPayslips(principal) });
});
