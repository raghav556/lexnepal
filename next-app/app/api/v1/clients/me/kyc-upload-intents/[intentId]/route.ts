import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getKycService } from "@/server/services/kyc-service";
import { uuidSchema } from "@/shared/contracts/matters";

export const GET = withApiHandler(
  "/api/v1/clients/me/kyc-upload-intents/:intentId",
  async ({ request }) => {
    const principal = await requireSession(request);
    const intentId = uuidSchema.parse(
      new URL(request.url).pathname.split("/").filter(Boolean).at(-1),
    );
    return jsonResponse({ data: await getKycService().getIntentStatus(principal, intentId) });
  },
);
