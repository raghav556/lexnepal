import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCommunicationService } from "@/server/services/communication-service";
import { messageMarkReadSchema } from "@/shared/contracts/communication";

export const POST = withApiHandler("/api/v1/messages/read", async ({ request }) => {
  const principal = await requireSession(request);
  const input = messageMarkReadSchema.parse(await request.json());
  return jsonResponse({ data: await getCommunicationService().markMessagesRead(principal, input) });
});
