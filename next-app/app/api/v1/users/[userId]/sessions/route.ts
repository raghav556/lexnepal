import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getIdentityService } from "@/server/services/identity-service";
import { userIdSchema } from "@/shared/contracts/identity";
type Context = { params: Promise<{ userId: string }> };
export const GET = (request: Request, context: Context) =>
  withApiHandler("/api/v1/users/:userId/sessions", async () => {
    const principal = await requireSession(request);
    return jsonResponse({
      data: await getIdentityService().listSessions(
        principal,
        userIdSchema.parse((await context.params).userId),
      ),
    });
  })(request);
export const DELETE = (request: Request, context: Context) =>
  withApiHandler("/api/v1/users/:userId/sessions", async ({ request: handled, requestId }) => {
    const principal = await requireSession(handled);
    const count = await getIdentityService().revokeSessions(
      principal,
      userIdSchema.parse((await context.params).userId),
      buildAuditContext(handled, requestId, principal),
    );
    return jsonResponse({ data: { revoked: count } });
  })(request);
