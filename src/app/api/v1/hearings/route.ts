import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getWorkManagementService } from "@/server/services/work-management-service";
import { hearingCreateSchema, hearingListSchema } from "@/shared/contracts/work-management";

export const GET = withApiHandler("/api/v1/hearings", async ({ request }) => {
  const principal = await requireSession(request);
  const url = new URL(request.url);
  const input = hearingListSchema.parse(Object.fromEntries(url.searchParams));
  return jsonResponse({ data: await getWorkManagementService().listHearings(principal, input) });
});

export const POST = withApiHandler("/api/v1/hearings", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = hearingCreateSchema.parse(await request.json());
  return jsonResponse(
    {
      data: await getWorkManagementService().createHearing(
        principal,
        input,
        buildAuditContext(request, requestId, principal),
      ),
    },
    { status: 201 },
  );
});
