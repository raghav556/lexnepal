import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getEnvelopeService } from "@/server/services/envelope-service";
import { documentRequestSignatureSchema } from "@/shared/contracts/envelopes";

export const POST = withApiHandler("/api/v1/envelopes/request-signature", async ({ request }) => {
  const principal = await requireSession(request);
  const input = documentRequestSignatureSchema.parse(await request.json());
  return jsonResponse({
    data: await getEnvelopeService().requestSignature(principal, input),
  });
});
