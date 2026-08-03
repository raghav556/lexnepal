import "server-only";
import { getServerEnvironment } from "@/server/env";
import { HerculesOidcVerifier } from "@/server/auth/hercules-oidc";
import { SessionService } from "@/server/auth/session-service";
import type { AuthPrincipal } from "@/server/auth/types";
import { PostgresSecurityRepository } from "@/server/repositories/security-repository";
import { BetterAuthSessionService } from "@/server/auth/better-auth-session-service";

type SessionAuthority = Pick<SessionService, "requireSession">;
let service: SessionAuthority | undefined;

export function getSessionService(): SessionAuthority {
  if (service) return service;
  const environment = getServerEnvironment();
  if (environment.AUTH_PROVIDER === "local") {
    service = new BetterAuthSessionService();
    return service;
  }
  if (!environment.HERCULES_OIDC_AUTHORITY || !environment.HERCULES_OIDC_CLIENT_ID) {
    throw new Error(
      "HERCULES_OIDC_AUTHORITY and HERCULES_OIDC_CLIENT_ID are required for authentication",
    );
  }
  service = new SessionService(
    new PostgresSecurityRepository(),
    new HerculesOidcVerifier(
      environment.HERCULES_OIDC_AUTHORITY,
      environment.HERCULES_OIDC_CLIENT_ID,
    ),
    {
      cookieName: environment.AUTH_SESSION_COOKIE_NAME,
      ttlSeconds: environment.AUTH_SESSION_TTL_SECONDS,
    },
  );
  return service;
}

export async function requireSession(request: Request): Promise<AuthPrincipal> {
  return getSessionService().requireSession(request);
}
