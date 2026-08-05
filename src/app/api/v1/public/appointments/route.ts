import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCrmService } from "@/server/services/crm-service";
import { appointmentCreateSchema } from "@/shared/contracts/crm";

export const POST = withApiHandler("/api/v1/public/appointments", async ({ request }) => {
  const input = appointmentCreateSchema.parse(await request.json());
  return jsonResponse(
    { data: await getCrmService().createAppointmentPublic(input) },
    { status: 201 },
  );
});
