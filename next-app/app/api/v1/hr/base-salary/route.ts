import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getHrService } from "@/server/services/hr-service";
import { setBaseSalarySchema } from "@/shared/contracts/hr";

export const POST = withApiHandler("/api/v1/hr/base-salary", async ({ request }) => {
  const principal = await requireSession(request);
  const input = setBaseSalarySchema.parse(await request.json());
  return jsonResponse({ data: await getHrService().setBaseSalary(principal, input) });
});
