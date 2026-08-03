import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getMattersService } from "@/server/services/matters-service";
import { caseCreateSchema, caseListSchema } from "@/shared/contracts/matters";

export const GET = withApiHandler("/api/v1/cases", async ({ request }) => {
  const principal = await requireSession(request);
  const url = new URL(request.url);
  const input = caseListSchema.parse(Object.fromEntries(url.searchParams));
  return jsonResponse({ data: await getMattersService().listCases(principal, input) });
});
export const POST = withApiHandler("/api/v1/cases", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = caseCreateSchema.parse(await request.json());
  return jsonResponse(
    {
      data: await getMattersService().createCase(
        principal,
        input,
        buildAuditContext(request, requestId, principal),
      ),
    },
    { status: 201 },
  );
});
