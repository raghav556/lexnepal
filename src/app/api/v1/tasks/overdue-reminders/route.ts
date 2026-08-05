import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getWorkManagementService } from "@/server/services/work-management-service";

export const POST = withApiHandler("/api/v1/tasks/overdue-reminders", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  return jsonResponse({
    data: await getWorkManagementService().scanOverdueReminders(
      principal,
      buildAuditContext(request, requestId, principal),
    ),
  });
});
