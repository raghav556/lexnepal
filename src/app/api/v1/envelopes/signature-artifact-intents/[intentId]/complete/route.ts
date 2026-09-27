import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getEnvelopeService } from "@/server/services/envelope-service";
import { uuidSchema } from "@/shared/contracts/envelopes";

export const POST = withApiHandler(
  "/api/v1/envelopes/signature-artifact-intents/:intentId/complete",
  async ({ request }) => {
    const principal = await requireSession(request);
    const intentId = uuidSchema.parse(
      new URL(request.url).pathname.split("/").filter(Boolean).at(-2),
    );
    return jsonResponse({
      data: await getEnvelopeService().completeSignatureArtifactIntent(principal, intentId),
    });
  },
);
