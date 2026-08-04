import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCrmService } from "@/server/services/crm-service";
import { appointmentAssignSchema, uuidSchema } from "@/shared/contracts/crm";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-2));
}

export const POST = withApiHandler(
  "/api/v1/appointments/:id/assign",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const body = await request.json();
    const input = appointmentAssignSchema.parse({
      assignedLawyerId: body.assignedLawyerId ?? body.lawyerId,
    });
    return jsonResponse({
      data: await getCrmService().assignLawyer(
        principal,
        idFrom(request),
        input,
        buildAuditContext(request, requestId, principal),
      ),
    });
  },
);
