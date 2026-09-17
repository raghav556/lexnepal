import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getMattersService } from "@/server/services/matters-service";
import { casePartyUpdateSchema, uuidSchema } from "@/shared/contracts/matters";

function idsFrom(request: Request) {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  return {
    caseId: uuidSchema.parse(segments.at(-3)),
    partyId: uuidSchema.parse(segments.at(-1)),
  };
}

export const PATCH = withApiHandler(
  "/api/v1/cases/:id/parties/:partyId",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const { caseId, partyId } = idsFrom(request);
    const input = casePartyUpdateSchema.parse(await request.json());
    return jsonResponse({
      data: await getMattersService().updateParty(
        principal,
        caseId,
        partyId,
        input,
        buildAuditContext(request, requestId, principal),
      ),
    });
  },
);

export const DELETE = withApiHandler(
  "/api/v1/cases/:id/parties/:partyId",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const { caseId, partyId } = idsFrom(request);
    return jsonResponse({
      data: await getMattersService().deleteParty(
        principal,
        caseId,
        partyId,
        buildAuditContext(request, requestId, principal),
      ),
    });
  },
);
