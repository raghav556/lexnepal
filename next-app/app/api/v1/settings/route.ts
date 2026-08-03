import { requireSession } from "@/server/auth/runtime";
import { buildAuditContext } from "@/server/audit/context";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { parseJson } from "@/server/http/validation";
import { getIdentityService } from "@/server/services/identity-service";
import { updateSystemSettingsSchema } from "@/shared/contracts/identity";
export const GET = withApiHandler("/api/v1/settings", async ({ request }) =>
  jsonResponse({ data: await getIdentityService().getSettings(await requireSession(request)) }),
);
export const PATCH = withApiHandler("/api/v1/settings", async ({ request, requestId }) => {
  const principal = await requireSession(request);
  return jsonResponse({
    data: await getIdentityService().updateSettings(
      principal,
      await parseJson(request, updateSystemSettingsSchema),
      buildAuditContext(request, requestId, principal),
    ),
  });
});
