import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { getIdentityService } from "@/server/services/identity-service";
import { userIdSchema } from "@/shared/contracts/identity";

type Context = { params: Promise<{ userId: string }> };
export const DELETE = (request: Request, context: Context) =>
  withApiHandler("/api/v1/users/:userId/mfa", async ({ request: handled, requestId }) => {
    const principal = await requireSession(handled);
    await getIdentityService().resetMfa(
      principal,
      userIdSchema.parse((await context.params).userId),
      buildAuditContext(handled, requestId, principal),
    );
    return new Response(null, { status: 204 });
  })(request);
