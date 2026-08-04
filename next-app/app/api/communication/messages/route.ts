/* Legacy unversioned paths — thin proxies onto CommunicationService.
 * Prefer /api/v1/messages and /api/v1/notifications from new clients. */
import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCommunicationService } from "@/server/services/communication-service";
import { messageCreateSchema, messageListSchema } from "@/shared/contracts/communication";

export const GET = withApiHandler("/api/communication/messages", async ({ request }) => {
  const principal = await requireSession(request);
  const input = messageListSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const data = await getCommunicationService().listMessages(principal, input);
  return jsonResponse(data.page);
});

export const POST = withApiHandler("/api/communication/messages", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = messageCreateSchema.parse(await request.json());
  const row = await getCommunicationService().sendMessage(
    principal,
    input,
    buildAuditContext(request, requestId, principal),
  );
  return jsonResponse({ id: row._id }, { status: 201 });
});
