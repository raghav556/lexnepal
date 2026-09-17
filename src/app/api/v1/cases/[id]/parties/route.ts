import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getMattersService } from "@/server/services/matters-service";
import { casePartyCreateSchema, uuidSchema } from "@/shared/contracts/matters";

function caseIdFrom(request: Request) {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  return uuidSchema.parse(segments.at(-2));
}

export const GET = withApiHandler("/api/v1/cases/:id/parties", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({
    data: await getMattersService().listParties(principal, caseIdFrom(request)),
  });
});

export const POST = withApiHandler("/api/v1/cases/:id/parties", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = casePartyCreateSchema.parse(await request.json());
  return jsonResponse(
    {
      data: await getMattersService().createParty(
        principal,
        caseIdFrom(request),
        input,
        buildAuditContext(request, requestId, principal),
      ),
    },
    { status: 201 },
  );
});
