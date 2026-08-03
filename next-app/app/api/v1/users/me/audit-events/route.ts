import { z } from "zod";
import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getIdentityService } from "@/server/services/identity-service";
export const GET = withApiHandler("/api/v1/users/me/audit-events", async ({ request }) => {
  const principal = await requireSession(request);
  const limit = z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .catch(30)
    .parse(new URL(request.url).searchParams.get("limit"));
  return jsonResponse({ data: await getIdentityService().listOwnAudit(principal, limit) });
});
