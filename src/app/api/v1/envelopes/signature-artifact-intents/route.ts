import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getEnvelopeService } from "@/server/services/envelope-service";
import { signatureArtifactIntentSchema } from "@/shared/contracts/envelopes";

export const POST = withApiHandler(
  "/api/v1/envelopes/signature-artifact-intents",
  async ({ request }) => {
    const principal = await requireSession(request);
    const input = signatureArtifactIntentSchema.parse(await request.json());
    return jsonResponse(
      { data: await getEnvelopeService().createSignatureArtifactIntent(principal, input) },
      { status: 201 },
    );
  },
);
