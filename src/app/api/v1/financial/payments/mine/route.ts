import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getFinancialService } from "@/server/services/financial-service";

export const GET = withApiHandler("/api/v1/financial/payments/mine", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getFinancialService().listMyPayments(principal) });
});
