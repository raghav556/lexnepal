import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getKycService } from "@/server/services/kyc-service";
import { uuidSchema } from "@/shared/contracts/matters";

export const GET = withApiHandler("/api/v1/clients/:id/kyc-files", async ({ request }) => {
  const principal = await requireSession(request);
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const clientId = uuidSchema.parse(segments.at(-2));
  return jsonResponse({ data: await getKycService().listFiles(principal, clientId) });
});
