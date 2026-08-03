import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { getAvatarService } from "@/server/services/avatar-service";

export const DELETE = withApiHandler("/api/v1/users/me/avatar", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  await getAvatarService().removeAvatar(
    principal,
    buildAuditContext(request, requestId, principal),
  );
  return new Response(null, { status: 204 });
});
