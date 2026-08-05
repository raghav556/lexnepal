import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCommunicationService } from "@/server/services/communication-service";
import { emailSendSchema } from "@/shared/contracts/communication";

export const POST = withApiHandler("/api/v1/communications/email", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = emailSendSchema.parse(await request.json());
  return jsonResponse({
    data: await getCommunicationService().sendEmail(
      principal,
      input,
      buildAuditContext(request, requestId, principal),
    ),
  });
});
