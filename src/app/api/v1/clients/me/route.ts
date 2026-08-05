import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getMattersService } from "@/server/services/matters-service";
import { clientSelfUpdateSchema } from "@/shared/contracts/matters";

export const GET = withApiHandler("/api/v1/clients/me", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getMattersService().getMyClient(principal) });
});
export const PATCH = withApiHandler("/api/v1/clients/me", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = clientSelfUpdateSchema.parse(await request.json());
  return jsonResponse({
    data: await getMattersService().updateMyClient(
      principal,
      input,
      buildAuditContext(request, requestId, principal),
    ),
  });
});
