import "server-only";
import { resolveCapabilities } from "@/server/auth/capabilities";
import { getLocalAuth } from "@/server/auth/local-auth";
import type { AuthPrincipal } from "@/server/auth/types";
import { PostgresSecurityRepository } from "@/server/repositories/security-repository";
import { AppError } from "@/shared/errors/api-error";

export class BetterAuthSessionService {
  constructor(private readonly repository = new PostgresSecurityRepository()) {}
  async requireSession(request: Request): Promise<AuthPrincipal> {
    const session = await getLocalAuth().api.getSession({ headers: request.headers });
    if (!session) throw new AppError("UNAUTHENTICATED", "Authentication is required", 401);
    const linkedId = (session.user as typeof session.user & { lexnepalUserId?: string })
      .lexnepalUserId;
    if (!linkedId)
      throw new AppError("UNAUTHENTICATED", "The identity is not linked to Srimar Law", 401);
    const user = await this.repository.findUserById(linkedId);
    if (!user || !user.isActive || user.isPending)
      throw new AppError("FORBIDDEN", "Account is unavailable", 403);
    const betterAuthUser = session.user as typeof session.user & { twoFactorEnabled?: boolean };
    if (user.twoFactorEnabled !== (betterAuthUser.twoFactorEnabled === true))
      await this.repository.setTwoFactorEnabled(user.id, betterAuthUser.twoFactorEnabled === true);
    if (user.twoFactorRequired && betterAuthUser.twoFactorEnabled !== true)
      throw new AppError("FORBIDDEN", "Multi-factor authentication enrollment is required", 403, {
        reason: "MFA_ENROLLMENT_REQUIRED",
      });
    const capabilities = resolveCapabilities(
      user.role,
      await this.repository.getRolePermissions(user.firmId),
    );
    return {
      user,
      firmId: user.firmId,
      capabilities,
      sessionId: session.session.id,
      authenticationMethod: "session_cookie",
    };
  }
}
