import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCrmService } from "@/server/services/crm-service";
import { appointmentSlotsSchema } from "@/shared/contracts/crm";

export const GET = withApiHandler("/api/v1/appointments/slots", async ({ request }) => {
  const input = appointmentSlotsSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return jsonResponse({ data: await getCrmService().listAvailableSlots(input) });
});
