import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCommunicationService } from "@/server/services/communication-service";

export const GET = withApiHandler("/api/v1/notifications", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getCommunicationService().listNotifications(principal) });
});

export const PATCH = withApiHandler("/api/v1/notifications", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({
    data: await getCommunicationService().markAllNotificationsRead(principal),
  });
});
