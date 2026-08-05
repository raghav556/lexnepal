import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getFinancialService } from "@/server/services/financial-service";
import { timeEntryCreateSchema, timeEntryListSchema } from "@/shared/contracts/financial";

export const GET = withApiHandler("/api/v1/financial/time-entries", async ({ request }) => {
  const principal = await requireSession(request);
  const input = timeEntryListSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return jsonResponse({ data: await getFinancialService().listTimeEntries(principal, input) });
});

export const POST = withApiHandler("/api/v1/financial/time-entries", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = timeEntryCreateSchema.parse(await request.json());
  return jsonResponse(
    {
      data: await getFinancialService().createTimeEntry(
        principal,
        input,
        buildAuditContext(request, requestId, principal),
      ),
    },
    { status: 201 },
  );
});
