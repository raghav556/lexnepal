import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getEnvelopeService } from "@/server/services/envelope-service";

export const GET = withApiHandler("/api/v1/envelopes/pending", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getEnvelopeService().listMyPending(principal) });
});
