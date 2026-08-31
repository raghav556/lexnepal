import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getHrService } from "@/server/services/hr-service";
import { leaveBalanceListSchema, leaveBalanceUpsertSchema } from "@/shared/contracts/hr";

export const GET = withApiHandler("/api/v1/hr/leave-balances", async ({ request }) => {
  const principal = await requireSession(request);
  const input = leaveBalanceListSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return jsonResponse({ data: await getHrService().listLeaveBalances(principal, input) });
});

export const POST = withApiHandler("/api/v1/hr/leave-balances", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = leaveBalanceUpsertSchema.parse(await request.json());
  return jsonResponse({
    data: await getHrService().upsertLeaveBalance(
      principal,
      input,
      buildAuditContext(request, requestId, principal),
    ),
  });
});
