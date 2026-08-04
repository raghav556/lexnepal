import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getEnvelopeService } from "@/server/services/envelope-service";
import { envelopeOtpIssueSchema } from "@/shared/contracts/envelopes";

export const POST = withApiHandler("/api/v1/envelopes/otp/issue", async ({ request }) => {
  const principal = await requireSession(request);
  const input = envelopeOtpIssueSchema.parse(await request.json());
  return jsonResponse({ data: await getEnvelopeService().issueOtp(principal, input) });
});
