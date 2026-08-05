import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getMattersService } from "@/server/services/matters-service";
import { clientStaffUpdateSchema, uuidSchema } from "@/shared/contracts/matters";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-1));
}
export const GET = withApiHandler("/api/v1/clients/:id", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getMattersService().getClient(principal, idFrom(request)) });
});
export const PATCH = withApiHandler("/api/v1/clients/:id", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = clientStaffUpdateSchema.parse(await request.json());
  return jsonResponse({
    data: await getMattersService().updateClient(
      principal,
      idFrom(request),
      input,
      buildAuditContext(request, requestId, principal),
    ),
  });
});
