import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDmService } from "@/server/services/dm-service";
import { dmMessageCreateSchema, dmMessageListSchema } from "@/shared/contracts/dm";
import { uuidSchema } from "@/shared/contracts/communication";

type Context = { params: Promise<{ threadId: string }> };

export const GET = (request: Request, context: Context) =>
  withApiHandler("/api/v1/dm/threads/:threadId/messages", async ({ request: handled }) => {
    const principal = await requireSession(handled);
    const threadId = uuidSchema.parse((await context.params).threadId);
    const input = dmMessageListSchema.parse(Object.fromEntries(new URL(handled.url).searchParams));
    return jsonResponse({ data: await getDmService().listMessages(principal, threadId, input) });
  })(request);

export const POST = (request: Request, context: Context) =>
  withApiHandler(
    "/api/v1/dm/threads/:threadId/messages",
    async ({ request: handled, requestId }) => {
      const principal = await requireSession(handled);
      const threadId = uuidSchema.parse((await context.params).threadId);
      const input = dmMessageCreateSchema.parse(await handled.json());
      return jsonResponse(
        {
          data: await getDmService().sendMessage(
            principal,
            threadId,
            input,
            buildAuditContext(handled, requestId, principal),
          ),
        },
        { status: 201 },
      );
    },
  )(request);
