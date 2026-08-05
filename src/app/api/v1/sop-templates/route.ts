import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getWorkManagementService } from "@/server/services/work-management-service";
import { sopCreateSchema } from "@/shared/contracts/work-management";

export const GET = withApiHandler("/api/v1/sop-templates", async ({ request }) => {
  const principal = await requireSession(request);
  const practiceArea = new URL(request.url).searchParams.get("practiceArea") ?? undefined;
  return jsonResponse({ data: await getWorkManagementService().listSopTemplates(principal, practiceArea) });
});

export const POST = withApiHandler("/api/v1/sop-templates", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = sopCreateSchema.parse(await request.json());
  return jsonResponse(
    { data: await getWorkManagementService().createSopTemplate(principal, input, buildAuditContext(request, requestId, principal)) },
    { status: 201 },
  );
});
