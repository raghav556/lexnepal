import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getWorkManagementService } from "@/server/services/work-management-service";
import { researchCreateSchema } from "@/shared/contracts/work-management";

export const GET = withApiHandler("/api/v1/research", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getWorkManagementService().listResearchNotes(principal) });
});

export const POST = withApiHandler("/api/v1/research", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = researchCreateSchema.parse(await request.json());
  return jsonResponse(
    { data: await getWorkManagementService().createResearchNote(principal, input, buildAuditContext(request, requestId, principal)) },
    { status: 201 },
  );
});
