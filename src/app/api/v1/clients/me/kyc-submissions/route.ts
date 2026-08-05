import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getKycService } from "@/server/services/kyc-service";
import { kycSubmitSchema } from "@/shared/contracts/matters";

export const POST = withApiHandler(
  "/api/v1/clients/me/kyc-submissions",
  async ({ request, requestId }) => {
    const principal = await requireSession(request);
    const input = kycSubmitSchema.parse(await request.json());
    return jsonResponse(
      {
        data: await getKycService().submit(
          principal,
          input,
          buildAuditContext(request, requestId, principal),
        ),
      },
      { status: 201 },
    );
  },
);
