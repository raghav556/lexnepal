import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCmsService } from "@/server/services/cms-service";
export const GET = withApiHandler("/api/v1/public/cms/team", async () =>
  jsonResponse({ data: await getCmsService().listPublicTeam() }),
);
