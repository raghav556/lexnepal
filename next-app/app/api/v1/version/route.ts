import { API_VERSION, APPLICATION_NAME } from "@/shared/constants/application";
import type { VersionResponse } from "@/shared/contracts/operations";
import { getServerEnvironment } from "@/server/env";
import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";

export const dynamic = "force-dynamic";

export const GET = withApiHandler("/api/v1/version", () => {
  const environment = getServerEnvironment();
  const body: VersionResponse = {
    service: APPLICATION_NAME,
    apiVersion: API_VERSION,
    applicationVersion: environment.APP_VERSION,
    gitSha: environment.GIT_SHA,
  };
  return jsonResponse(body);
});
