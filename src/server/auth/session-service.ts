import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { AppError } from "@/shared/errors/api-error";
import { resolveCapabilities } from "@/server/auth/capabilities";
import type {
  AuthPrincipal,
  AuthUser,
  IdentityVerifier,
  SessionRepository,
  VerifiedIdentity,
} from "@/server/auth/types";

export interface RequestSecurityContext {
  requestId: string;
  ipAddress: string;
  userAgent: string;
}

export interface SessionServiceOptions {
  cookieName: string;
  ttlSeconds: number;
  now?: () => Date;
}

export class SessionService {
  private readonly now: () => Date;

  constructor(
    private readonly repository: SessionRepository,
    private readonly identityVerifier: IdentityVerifier,
    private readonly options: SessionServiceOptions,
  ) {
    this.now = options.now ?? (() => new Date());
  }

  async requireSession(request: Request): Promise<AuthPrincipal> {
    const bearer = readBearerToken(request.headers.get("authorization"));
    if (bearer) {
      const identity = await this.identityVerifier.verifyAccessToken(bearer);
      const user = await this.findIdentityUser(identity);
      return this.buildPrincipal(user, null, "hercules_bearer");
    }

    const rawToken = readCookie(request.headers.get("cookie"), this.options.cookieName);
    if (!rawToken) throw new AppError("UNAUTHENTICATED", "Authentication is required", 401);
    const stored = await this.repository.findSessionByTokenHash(hashToken(rawToken));
    const now = this.now();
    if (!stored || !stored.expiresAt || stored.revokedAt || stored.expiresAt <= now) {
      throw new AppError("UNAUTHENTICATED", "The session is invalid, expired or revoked", 401);
    }
    if (stored.firmId !== stored.user.firmId || stored.userId !== stored.user.id) {
      throw new AppError("UNAUTHENTICATED", "The session tenant binding is invalid", 401);
    }
    await this.repository.touchSession(stored.id, now);
    return this.buildPrincipal(stored.user, stored.id, "session_cookie");
  }

  async issueSession(
    request: Request,
    context: RequestSecurityContext,
  ): Promise<{ principal: AuthPrincipal; token: string; expiresAt: Date }> {
    const bearer = readBearerToken(request.headers.get("authorization"));
    if (!bearer) throw new AppError("UNAUTHENTICATED", "A Hercules bearer token is required", 401);
    const identity = await this.identityVerifier.verifyAccessToken(bearer);
    const user = await this.findIdentityUser(identity);
    assertEnabledUser(user);
    const now = this.now();
    const expiresAt = new Date(now.getTime() + this.options.ttlSeconds * 1000);
    const token = randomBytes(32).toString("base64url");
    const created = await this.repository.createSession({
      firmId: user.firmId,
      userId: user.id,
      identitySubject: identity.subject,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });
    return {
      principal: await this.buildPrincipal(user, created.id, "session_cookie"),
      token,
      expiresAt,
    };
  }

  async revokeCurrentSession(principal: AuthPrincipal): Promise<void> {
    if (!principal.sessionId) {
      throw new AppError("BAD_REQUEST", "Only a local browser session can be revoked", 400);
    }
    await this.repository.revokeSession(
      principal.sessionId,
      principal.user.id,
      "user_signout",
      this.now(),
    );
  }

  private async findIdentityUser(identity: VerifiedIdentity): Promise<AuthUser> {
    const candidates = [
      identity.tokenIdentifier,
      `${identity.issuer}|${identity.subject}`,
      identity.subject,
    ];
    const user = await this.repository.findUserByTokenIdentifiers([...new Set(candidates)]);
    if (!user)
      throw new AppError("UNAUTHENTICATED", "No LexNepal account is linked to this identity", 401);
    assertEnabledUser(user);
    return user;
  }

  private async buildPrincipal(
    user: AuthUser,
    sessionId: string | null,
    authenticationMethod: AuthPrincipal["authenticationMethod"],
  ): Promise<AuthPrincipal> {
    assertEnabledUser(user);
    if (!user.firmId) throw new AppError("FORBIDDEN", "The user is not assigned to a firm", 403);
    const matrix = await this.repository.getRolePermissions(user.firmId);
    return {
      user,
      firmId: user.firmId,
      capabilities: resolveCapabilities(user.role, matrix),
      sessionId,
      authenticationMethod,
    };
  }
}

export function assertEnabledUser(user: AuthUser): void {
  if (!user.isActive) throw new AppError("FORBIDDEN", "Account is suspended", 403);
  if (user.isPending) throw new AppError("FORBIDDEN", "Account activation is pending", 403);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function readBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(header);
  if (!match) throw new AppError("UNAUTHENTICATED", "The Authorization header is malformed", 401);
  return match[1];
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const segment of header.split(";")) {
    const separator = segment.indexOf("=");
    if (separator < 0) continue;
    if (segment.slice(0, separator).trim() === name) {
      return decodeURIComponent(segment.slice(separator + 1).trim());
    }
  }
  return null;
}
