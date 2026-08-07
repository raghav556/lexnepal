import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCmsService } from "@/server/services/cms-service";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = (request: Request, context: RouteContext) =>
  withApiHandler("/api/v1/public/cms/team/:id", async () => {
    const { id } = await context.params;
    return jsonResponse({ data: await getCmsService().getPublicTeamMember(id) });
  })(request);
