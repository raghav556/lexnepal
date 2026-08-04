import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCommunicationService } from "@/server/services/communication-service";
import { uuidSchema } from "@/shared/contracts/communication";

function idFrom(request: Request) {
  return uuidSchema.parse(new URL(request.url).pathname.split("/").filter(Boolean).at(-1));
}

export const PATCH = withApiHandler("/api/v1/notifications/:id", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({
    data: await getCommunicationService().markNotificationRead(principal, idFrom(request)),
  });
});
