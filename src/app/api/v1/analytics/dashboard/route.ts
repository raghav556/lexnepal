import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getAnalyticsService } from "@/server/services/analytics-service";

export const GET = withApiHandler("/api/v1/analytics/dashboard", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getAnalyticsService().getDashboard(principal) });
});
