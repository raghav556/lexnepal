import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getIdentityService } from "@/server/services/identity-service";
export const GET = withApiHandler("/api/v1/users/directory", async ({ request }) =>
  jsonResponse({ data: await getIdentityService().listDirectory(await requireSession(request)) }),
);
