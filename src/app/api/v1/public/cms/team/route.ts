import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCmsService } from "@/server/services/cms-service";

export const GET = withApiHandler("/api/v1/public/cms/team", async ({ request }) => {
  const url = new URL(request.url);
  const practiceArea = url.searchParams.get("practiceArea") || undefined;
  const role = url.searchParams.get("role") || undefined;
  const search = url.searchParams.get("search") || undefined;
  return jsonResponse({
    data: await getCmsService().listPublicTeam({ practiceArea, role, search }),
  });
});
