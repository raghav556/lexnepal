import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getWorkManagementService } from "@/server/services/work-management-service";
import { hearingUpdateSchema, uuidSchema } from "@/shared/contracts/work-management";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-1));
}

export const GET = withApiHandler("/api/v1/hearings/:id", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({
    data: await getWorkManagementService().getHearing(principal, idFrom(request)),
  });
});

export const PATCH = withApiHandler("/api/v1/hearings/:id", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = hearingUpdateSchema.parse(await request.json());
  return jsonResponse({
    data: await getWorkManagementService().updateHearing(
      principal,
      idFrom(request),
      input,
      buildAuditContext(request, requestId, principal),
    ),
  });
});
