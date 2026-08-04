import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getEnvelopeService } from "@/server/services/envelope-service";
import { envelopeCreateSchema } from "@/shared/contracts/envelopes";

export const GET = withApiHandler("/api/v1/envelopes", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getEnvelopeService().list(principal) });
});

export const POST = withApiHandler("/api/v1/envelopes", async ({ request }) => {
  const principal = await requireSession(request);
  const input = envelopeCreateSchema.parse(await request.json());
  return jsonResponse({ data: await getEnvelopeService().create(principal, input) }, { status: 201 });
});
