import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getIdentityService } from "@/server/services/identity-service";
import { userIdSchema } from "@/shared/contracts/identity";

type Context = { params: Promise<{ userId: string }> };
export const POST = (request: Request, context: Context) =>
  withApiHandler(
    "/api/v1/users/:userId/password-reset",
    async ({ request: handled, requestId }) => {
      const principal = await requireSession(handled);
      const userId = userIdSchema.parse((await context.params).userId);
      await getIdentityService().sendPasswordReset(
        principal,
        userId,
        buildAuditContext(handled, requestId, principal),
      );
      return jsonResponse({ data: { accepted: true } }, { status: 202 });
    },
  )(request);
