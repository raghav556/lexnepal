import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getDmService } from "@/server/services/dm-service";
import { dmThreadCreateSchema } from "@/shared/contracts/dm";

export const GET = withApiHandler("/api/v1/dm/threads", async ({ request }) => {
  const principal = await requireSession(request);
  return jsonResponse({ data: await getDmService().listThreads(principal) });
});

export const POST = withApiHandler("/api/v1/dm/threads", async ({ request }) => {
  const principal = await requireSession(request);
  const input = dmThreadCreateSchema.parse(await request.json());
  return jsonResponse(
    { data: await getDmService().getOrCreateThread(principal, input) },
    { status: 201 },
  );
});
