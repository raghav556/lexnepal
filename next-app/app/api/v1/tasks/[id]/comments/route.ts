import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getWorkManagementService } from "@/server/services/work-management-service";
import { taskCommentCreateSchema, uuidSchema } from "@/shared/contracts/work-management";

function idFrom(request: Request) {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  return uuidSchema.parse(parts.at(-2));
}

export const GET = withApiHandler("/api/v1/tasks/:id/comments", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getWorkManagementService().listComments(principal, idFrom(request)) });
});

export const POST = withApiHandler("/api/v1/tasks/:id/comments", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const taskId = idFrom(request);
  const body = await request.json();
  const input = taskCommentCreateSchema.parse({ ...body, taskId });
  return jsonResponse(
    { data: await getWorkManagementService().addComment(principal, input, buildAuditContext(request, requestId, principal)) },
    { status: 201 },
  );
});
