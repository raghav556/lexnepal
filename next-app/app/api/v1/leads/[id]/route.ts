import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCrmService } from "@/server/services/crm-service";
import { leadUpdateSchema, uuidSchema } from "@/shared/contracts/crm";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-1));
}

export const PATCH = withApiHandler("/api/v1/leads/:id", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = leadUpdateSchema.parse(await request.json());
  return jsonResponse({
    data: await getCrmService().updateLead(
      principal,
      idFrom(request),
      input,
      buildAuditContext(request, requestId, principal),
    ),
  });
});
