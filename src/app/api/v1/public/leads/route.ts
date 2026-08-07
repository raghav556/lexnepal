import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCrmService } from "@/server/services/crm-service";
import { publicContactLeadSchema } from "@/shared/contracts/crm";

export const POST = withApiHandler("/api/v1/public/leads", async ({ request }) => {
  const input = publicContactLeadSchema.parse(await request.json());
  return jsonResponse(
    {
      data: await getCrmService().createLeadPublic({
        ...input,
        source: "website",
      }),
    },
    { status: 201 },
  );
});
