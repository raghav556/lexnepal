import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { evaluateReadiness } from "@/server/services/readiness";

export const dynamic = "force-dynamic";

export const GET = withApiHandler("/api/v1/readiness", async () => {
  const result = await evaluateReadiness();
  return jsonResponse(result.body, { status: result.ready ? 200 : 503 });
});
