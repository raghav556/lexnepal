import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCrmService } from "@/server/services/crm-service";
import { appointmentRescheduleSchema, uuidSchema } from "@/shared/contracts/crm";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-2));
}

export const POST = withApiHandler(
  "/api/v1/appointments/:id/reschedule",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const input = appointmentRescheduleSchema.parse(await request.json());
    return jsonResponse({
      data: await getCrmService().rescheduleAppointment(
        principal,
        idFrom(request),
        input,
        buildAuditContext(request, requestId, principal),
      ),
    });
  },
);
