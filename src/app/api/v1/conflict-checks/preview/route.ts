import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getMattersService } from "@/server/services/matters-service";
import { conflictPreviewSchema } from "@/shared/contracts/conflicts";

export const POST = withApiHandler("/api/v1/conflict-checks/preview", async ({ request }) => {
  const principal = await requireSession(request);
  const input = conflictPreviewSchema.parse(await request.json());
  return jsonResponse({ data: await getMattersService().previewConflicts(principal, input) });
});
