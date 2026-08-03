import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCmsService } from "@/server/services/cms-service";
export const GET = withApiHandler("/api/v1/cms/applications", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({
    data: await getCmsService().listApplications(principal, new URL(request.url).searchParams),
  });
});
