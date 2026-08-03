import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getWorkManagementService } from "@/server/services/work-management-service";
import { uuidSchema } from "@/shared/contracts/work-management";

function idFrom(request: Request) {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  return uuidSchema.parse(parts.at(-2));
}

export const POST = withApiHandler("/api/v1/tasks/:id/restore", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  return jsonResponse({
    data: await getWorkManagementService().restoreTask(principal, idFrom(request), buildAuditContext(request, requestId, principal)),
  });
});
