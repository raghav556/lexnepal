import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getIdentityService } from "@/server/services/identity-service";
import { updateUserSchema, userIdSchema } from "@/shared/contracts/identity";
type Context = { params: Promise<{ userId: string }> };
export const GET = (request: Request, context: Context) =>
  withApiHandler("/api/v1/users/:userId", async () => {
    const principal = await requireSession(request);
    const { userId } = await context.params;
    return jsonResponse({
      data: await getIdentityService().getUser(principal, userIdSchema.parse(userId)),
    });
  })(request);
export const PATCH = (request: Request, context: Context) =>
  withApiHandler("/api/v1/users/:userId", async ({ request: handled, requestId }) => {
    const principal = await requireSession(handled);
    const { userId } = await context.params;
    return jsonResponse({
      data: await getIdentityService().updateUser(
        principal,
        userIdSchema.parse(userId),
        await parseJson(handled, updateUserSchema),
        buildAuditContext(handled, requestId, principal),
      ),
    });
  })(request);
export const DELETE = (request: Request, context: Context) =>
  withApiHandler("/api/v1/users/:userId", async ({ request: handled, requestId }) => {
    const principal = await requireSession(handled);
    const { userId } = await context.params;
    await getIdentityService().archiveUser(
      principal,
      userIdSchema.parse(userId),
      buildAuditContext(handled, requestId, principal),
    );
    return new Response(null, { status: 204 });
  })(request);
