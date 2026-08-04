import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCrmService } from "@/server/services/crm-service";
import { appointmentBookSchema } from "@/shared/contracts/crm";

export const POST = withApiHandler("/api/v1/appointments/book", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = appointmentBookSchema.parse(await request.json());
  return jsonResponse(
    {
      data: await getCrmService().bookConsultation(
        principal,
        input,
        buildAuditContext(request, requestId, principal),
      ),
    },
    { status: 201 },
  );
});
