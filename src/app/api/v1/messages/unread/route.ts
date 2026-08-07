import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCommunicationService } from "@/server/services/communication-service";
import { messageUnreadSchema } from "@/shared/contracts/communication";

export const GET = withApiHandler("/api/v1/messages/unread", async ({ request }) => {
  const principal = await requireSession(request);
  const input = messageUnreadSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return jsonResponse({ data: await getCommunicationService().unreadCounts(principal, input) });
});
