import { APPLICATION_NAME } from "@/shared/constants/application";
import type { HealthResponse } from "@/shared/contracts/operations";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";

export const dynamic = "force-dynamic";

export const GET = withApiHandler("/api/v1/health", () => {
  const body: HealthResponse = {
    status: "ok",
    service: APPLICATION_NAME,
    timestamp: new Date().toISOString(),
  };
  return jsonResponse(body);
});
