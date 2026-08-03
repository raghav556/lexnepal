import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getIdentityService } from "@/server/services/identity-service";
import { auditQuerySchema } from "@/shared/contracts/identity";
export const GET = withApiHandler("/api/v1/audit-events", async ({ request }) => {
  const principal = await requireSession(request);
  const filters = auditQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return jsonResponse({ data: await getIdentityService().listAudit(principal, filters) });
});
