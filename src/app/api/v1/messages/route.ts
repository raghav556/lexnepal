import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCommunicationService } from "@/server/services/communication-service";
import { messageCreateSchema, messageListSchema } from "@/shared/contracts/communication";

export const GET = withApiHandler("/api/v1/messages", async ({ request }) => {
  const principal = await requireSession(request);
  const input = messageListSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return jsonResponse({ data: await getCommunicationService().listMessages(principal, input) });
});

export const POST = withApiHandler("/api/v1/messages", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  const input = messageCreateSchema.parse(await request.json());
  return jsonResponse(
    {
      data: await getCommunicationService().sendMessage(
        principal,
        input,
        buildAuditContext(request, requestId, principal),
      ),
    },
    { status: 201 },
  );
});
