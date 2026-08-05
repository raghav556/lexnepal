import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getEnvelopeService } from "@/server/services/envelope-service";
import { uuidSchema } from "@/shared/contracts/envelopes";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-2));
}

export const POST = withApiHandler("/api/v1/envelopes/:id/send", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getEnvelopeService().send(principal, idFrom(request)) });
});
