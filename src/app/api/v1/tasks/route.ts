import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getWorkManagementService } from "@/server/services/work-management-service";
import { taskCreateSchema, taskListSchema } from "@/shared/contracts/work-management";

export const GET = withApiHandler("/api/v1/tasks", async ({ request }) => {
  const principal = await requireSession(request);
  const url = new URL(request.url);
  const input = taskListSchema.parse(Object.fromEntries(url.searchParams));
  return jsonResponse({ data: await getWorkManagementService().listTasks(principal, input) });
});

export const POST = withApiHandler("/api/v1/tasks", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = taskCreateSchema.parse(await request.json());
  return jsonResponse(
    {
      data: await getWorkManagementService().createTask(
        principal,
        input,
        buildAuditContext(request, requestId, principal),
      ),
    },
    { status: 201 },
  );
});
