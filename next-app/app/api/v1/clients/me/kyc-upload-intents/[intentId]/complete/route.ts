import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getKycService } from "@/server/services/kyc-service";
import { uuidSchema } from "@/shared/contracts/matters";

export const POST = withApiHandler(
  "/api/v1/clients/me/kyc-upload-intents/:intentId/complete",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const segments = new URL(request.url).pathname.split("/").filter(Boolean);
    const intentId = uuidSchema.parse(segments.at(-2));
    return jsonResponse(
      {
        data: await getKycService().completeIntent(
          principal,
          intentId,
          buildAuditContext(request, requestId, principal),
        ),
      },
      { status: 202 },
    );
  },
);
