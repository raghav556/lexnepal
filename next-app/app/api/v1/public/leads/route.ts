import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCrmService } from "@/server/services/crm-service";
import { leadCreateSchema } from "@/shared/contracts/crm";

export const POST = withApiHandler("/api/v1/public/leads", async ({ request }) => {
  const input = leadCreateSchema.parse(await request.json());
  return jsonResponse({ data: await getCrmService().createLeadPublic(input) }, { status: 201 });
});
