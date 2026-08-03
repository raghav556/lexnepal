import { z } from "zod";
import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getAvatarService } from "@/server/services/avatar-service";
type Context = { params: Promise<{ intentId: string }> };
export const POST = (request: Request, context: Context) =>
  withApiHandler(
    "/api/v1/users/me/avatar-upload-intents/:intentId/complete",
    async ({ request: handled, requestId }) => {
      const principal = await requireSession(handled);
      const intentId = z
        .string()
        .uuid()
        .parse((await context.params).intentId);
      return jsonResponse({
        data: await getAvatarService().completeIntent(
          principal,
          intentId,
          buildAuditContext(handled, requestId, principal),
        ),
      });
    },
  )(request);
