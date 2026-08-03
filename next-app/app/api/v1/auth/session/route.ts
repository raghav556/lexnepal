import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getServerEnvironment } from "@/server/env";
import { getSessionService } from "@/server/auth/runtime";
import { toCurrentSessionDto } from "@/server/auth/dto";
import { getClientIp } from "@/server/audit/context";
import { getLocalAuth } from "@/server/auth/local-auth";
import { AppError } from "@/shared/errors/api-error";
import type { SessionService } from "@/server/auth/session-service";

const route = "/api/v1/auth/session";

export const GET = withApiHandler(route, async ({ request }) => {
  const principal = await getSessionService().requireSession(request);
  return jsonResponse({ data: toCurrentSessionDto(principal) });
});

export const POST = withApiHandler(route, async ({ request, requestId }) => {
  const environment = getServerEnvironment();
  if (environment.AUTH_PROVIDER === "local") {
    throw new AppError("BAD_REQUEST", "Use /api/auth/sign-in/email for local authentication", 400);
  }
  const issued = await (getSessionService() as SessionService).issueSession(request, {
    requestId,
    ipAddress: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent") ?? "unknown",
  });
  const response = jsonResponse(
    { data: toCurrentSessionDto(issued.principal), expiresAt: issued.expiresAt.toISOString() },
    { status: 201 },
  );
  response.headers.append(
    "set-cookie",
    serializeSessionCookie(
      environment.AUTH_SESSION_COOKIE_NAME,
      issued.token,
      environment.AUTH_SESSION_TTL_SECONDS,
      environment.NODE_ENV === "production",
    ),
  );
  return response;
});

export const DELETE = withApiHandler(route, async ({ request }) => {
  const environment = getServerEnvironment();
  if (environment.AUTH_PROVIDER === "local") {
    return getLocalAuth().api.signOut({ headers: request.headers, asResponse: true });
  }
  const service = getSessionService() as SessionService;
  const principal = await service.requireSession(request);
  await service.revokeCurrentSession(principal);
  const response = new Response(null, { status: 204 });
  response.headers.append(
    "set-cookie",
    serializeSessionCookie(
      environment.AUTH_SESSION_COOKIE_NAME,
      "",
      0,
      environment.NODE_ENV === "production",
    ),
  );
  return response;
});

function serializeSessionCookie(
  name: string,
  value: string,
  maxAge: number,
  secure: boolean,
): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}
