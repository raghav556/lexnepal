import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getWorkManagementService } from "@/server/services/work-management-service";
import { taskUpdateSchema, uuidSchema } from "@/shared/contracts/work-management";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-1));
}

export const GET = withApiHandler("/api/v1/tasks/:id", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getWorkManagementService().getTask(principal, idFrom(request)) });
});

export const PATCH = withApiHandler("/api/v1/tasks/:id", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = taskUpdateSchema.parse(await request.json());
  return jsonResponse({
    data: await getWorkManagementService().updateTask(principal, idFrom(request), input, buildAuditContext(request, requestId, principal)),
  });
});

export const DELETE = withApiHandler("/api/v1/tasks/:id", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  return jsonResponse({
    data: await getWorkManagementService().deleteTask(principal, idFrom(request), buildAuditContext(request, requestId, principal)),
  });
});
