import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getIdentityService } from "@/server/services/identity-service";
import { updateOwnProfileSchema } from "@/shared/contracts/identity";
export const GET = withApiHandler("/api/v1/users/me", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getIdentityService().getUser(principal, principal.user.id) });
});
export const PATCH = withApiHandler("/api/v1/users/me", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  return jsonResponse({
    data: await getIdentityService().updateOwnProfile(
      principal,
      await parseJson(request, updateOwnProfileSchema),
      buildAuditContext(request, requestId, principal),
    ),
  });
});
