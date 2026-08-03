import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getMattersService } from "@/server/services/matters-service";
import { clientCreateSchema } from "@/shared/contracts/matters";

export const GET = withApiHandler("/api/v1/clients", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getMattersService().listClients(principal) });
});
export const POST = withApiHandler("/api/v1/clients", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = clientCreateSchema.parse(await request.json());
  return jsonResponse(
    {
      data: await getMattersService().createClient(
        principal,
        input,
        buildAuditContext(request, requestId, principal),
      ),
    },
    { status: 201 },
  );
});
