import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getMattersService } from "@/server/services/matters-service";

export const GET = withApiHandler("/api/v1/conflict-checks", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getMattersService().listConflictChecks(principal) });
});
