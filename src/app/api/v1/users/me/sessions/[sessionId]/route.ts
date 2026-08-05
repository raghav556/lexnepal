import { z } from "zod";
import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { getIdentityService } from "@/server/services/identity-service";
type Context = { params: Promise<{ sessionId: string }> };
export const DELETE = (request: Request, context: Context) =>
  withApiHandler(
    "/api/v1/users/me/sessions/:sessionId",
    async ({ request: handled, requestId }) => {
      const principal = await requireSession(handled);
      await getIdentityService().revokeSession(
        principal,
        z
          .string()
          .min(1)
          .max(200)
          .parse((await context.params).sessionId),
        buildAuditContext(handled, requestId, principal),
      );
      return new Response(null, { status: 204 });
    },
  )(request);
