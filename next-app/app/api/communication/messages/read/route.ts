import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCommunicationService } from "@/server/services/communication-service";
import { messageMarkReadSchema } from "@/shared/contracts/communication";

export const POST = withApiHandler("/api/communication/messages/read", async ({ request }) => {
  const principal = await requireSession(request);
  const input = messageMarkReadSchema.parse(await request.json());
  return jsonResponse(await getCommunicationService().markMessagesRead(principal, input));
});
