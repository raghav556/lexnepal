import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getKycService } from "@/server/services/kyc-service";
import { kycUploadIntentSchema } from "@/shared/contracts/matters";

export const POST = withApiHandler(
  "/api/v1/clients/me/kyc-upload-intents",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const input = kycUploadIntentSchema.parse(await request.json());
    return jsonResponse(
      {
        data: await getKycService().createIntent(
          principal,
          input,
          buildAuditContext(request, requestId, principal),
        ),
      },
      { status: 201 },
    );
  },
);
