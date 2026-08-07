import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getHrService } from "@/server/services/hr-service";
import { uuidSchema } from "@/shared/contracts/hr";

function runIdFrom(request: Request) {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  // .../payroll/runs/:id
  const runsIdx = parts.lastIndexOf("runs");
  return uuidSchema.parse(parts[runsIdx + 1]);
}

export const GET = withApiHandler("/api/v1/hr/payroll/runs/:id", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getHrService().getPayrollRun(principal, runIdFrom(request)) });
});
