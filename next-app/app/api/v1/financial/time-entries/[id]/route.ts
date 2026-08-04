import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getFinancialService } from "@/server/services/financial-service";
import { uuidSchema } from "@/shared/contracts/financial";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-1));
}

export const DELETE = withApiHandler(
  "/api/v1/financial/time-entries/:id",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    return jsonResponse({
      data: await getFinancialService().deleteTimeEntry(
        principal,
        idFrom(request),
        buildAuditContext(request, requestId, principal),
      ),
    });
  },
);
