import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getWorkManagementService } from "@/server/services/work-management-service";

export const GET = withApiHandler("/api/v1/tasks/workload", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getWorkManagementService().listWorkload(principal) });
});
