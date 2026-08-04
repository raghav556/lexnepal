import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCrmService } from "@/server/services/crm-service";
import { leadConvertSchema, uuidSchema } from "@/shared/contracts/crm";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-2));
}

export const POST = withApiHandler("/api/v1/leads/:id/convert", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = leadConvertSchema.parse(await request.json().catch(() => ({})));
  return jsonResponse({
    data: await getCrmService().convertToClient(
      principal,
      idFrom(request),
      input,
      buildAuditContext(request, requestId, principal),
    ),
  });
});
