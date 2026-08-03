import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getCmsService } from "@/server/services/cms-service";
import { newsletterInputSchema } from "@/shared/contracts/cms";
export const POST = withApiHandler("/api/v1/public/cms/newsletter", async ({ request }) => {
  const { email } = await parseJson(request, newsletterInputSchema);
  return jsonResponse(
    { data: await getCmsService().subscribe(email.toLowerCase()) },
    { status: 201 },
  );
});
