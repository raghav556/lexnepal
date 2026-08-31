import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getWorkManagementService } from "@/server/services/work-management-service";
import { researchUpdateSchema, uuidSchema } from "@/shared/contracts/work-management";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-1));
}

export const GET = withApiHandler("/api/v1/research/:id", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({
    data: await getWorkManagementService().getResearchNote(principal, idFrom(request)),
  });
});

export const PATCH = withApiHandler("/api/v1/research/:id", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = researchUpdateSchema.parse(await request.json());
  return jsonResponse({
    data: await getWorkManagementService().updateResearchNote(
      principal,
      idFrom(request),
      input,
      buildAuditContext(request, requestId, principal),
    ),
  });
});

export const DELETE = withApiHandler("/api/v1/research/:id", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  return jsonResponse({
    data: await getWorkManagementService().deleteResearchNote(
      principal,
      idFrom(request),
      buildAuditContext(request, requestId, principal),
    ),
  });
});
