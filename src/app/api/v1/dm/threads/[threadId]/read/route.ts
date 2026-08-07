import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDmService } from "@/server/services/dm-service";
import { uuidSchema } from "@/shared/contracts/communication";

type Context = { params: Promise<{ threadId: string }> };

export const POST = (request: Request, context: Context) =>
  withApiHandler("/api/v1/dm/threads/:threadId/read", async ({ request: handled }) => {
    const principal = await requireSession(handled);
    const threadId = uuidSchema.parse((await context.params).threadId);
    return jsonResponse({ data: await getDmService().markRead(principal, threadId) });
  })(request);
