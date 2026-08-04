import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getEnvelopeService } from "@/server/services/envelope-service";
import { envelopeVoidSchema, uuidSchema } from "@/shared/contracts/envelopes";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-2));
}

export const POST = withApiHandler("/api/v1/envelopes/:id/void", async ({ request }) => {
  const principal = await requireSession(request);
  const input = envelopeVoidSchema.parse(await request.json().catch(() => ({})));
  return jsonResponse({
    data: await getEnvelopeService().void(principal, idFrom(request), input),
  });
});
