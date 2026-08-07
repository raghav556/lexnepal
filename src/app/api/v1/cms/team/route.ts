import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCmsService } from "@/server/services/cms-service";

export const GET = withApiHandler("/api/v1/cms/team", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getCmsService().listAdminTeam(principal) });
});
