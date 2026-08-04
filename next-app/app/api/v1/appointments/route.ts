import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCrmService } from "@/server/services/crm-service";
import { appointmentCreateSchema, appointmentListSchema } from "@/shared/contracts/crm";

export const GET = withApiHandler("/api/v1/appointments", async ({ request }) => {
  const principal = await requireSession(request);
  const input = appointmentListSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return jsonResponse({ data: await getCrmService().listAppointments(principal, input) });
});

export const POST = withApiHandler("/api/v1/appointments", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = appointmentCreateSchema.parse(await request.json());
  return jsonResponse(
    {
      data: await getCrmService().createAppointment(
        principal,
        input,
        buildAuditContext(request, requestId, principal),
      ),
    },
    { status: 201 },
  );
});
