import "server-only";
import type { AuthPrincipal } from "@/server/auth/types";
import type { AuditContext } from "@/server/audit/context";
import {
  requireCapability,
  requireFirmContext,
  requireSameFirm,
} from "@/server/policies/authorization";
import { PostgresIdentityRepository } from "@/server/repositories/identity-repository";
import { DEFAULT_ROLE_PERMISSIONS } from "@/server/auth/capabilities";
import type {
  CreateUserInput,
  StaffDirectoryEntryDto,
  UpdateOwnProfileInput,
  UpdateSystemSettingsInput,
  UpdateUserInput,
} from "@/shared/contracts/identity";
import { rolePermissionMatrixSchema, type RolePermissionMatrix } from "@/shared/contracts/identity";
import { AppError } from "@/shared/errors/api-error";
import {
  provisionLocalIdentity,
  requestLocalPasswordResetForLexUser,
} from "@/server/auth/local-auth";

export class IdentityService {
  constructor(private readonly repository = new PostgresIdentityRepository()) {}

  async getFirm(principal: AuthPrincipal) {
    const firm = await this.repository.getFirm(requireFirmContext(principal).firmId);
    if (!firm || !firm.isActive) throw new AppError("FORBIDDEN", "Firm is unavailable", 403);
    return firm;
  }
  async getRolePermissions(principal: AuthPrincipal) {
    requireCapability(principal, "settings.manage");
    const stored = rolePermissionMatrixSchema.safeParse(
      await this.repository.getRolePermissions(requireFirmContext(principal).firmId),
    );
    return stored.success
      ? { ...DEFAULT_ROLE_PERMISSIONS, ...stored.data }
      : DEFAULT_ROLE_PERMISSIONS;
  }
  async updateRolePermissions(
    principal: AuthPrincipal,
    matrix: RolePermissionMatrix,
    audit: AuditContext,
  ) {
    requireCapability(principal, "settings.manage");
    const overrides = { ...matrix };
    delete overrides.admin;
    await this.repository.updateRolePermissions(
      requireFirmContext(principal).firmId,
      overrides,
      audit,
    );
    return this.getRolePermissions(principal);
  }

  listUsers(principal: AuthPrincipal, role?: string) {
    requireCapability(principal, "users.manage");
    return this.repository.listUsers(requireFirmContext(principal).firmId, role);
  }
  listDirectory(principal: AuthPrincipal): Promise<StaffDirectoryEntryDto[]> {
    requireCapability(principal, "users.view_directory");
    return this.repository
      .listUsers(requireFirmContext(principal).firmId)
      .then((rows) =>
        rows
          .filter((user) => user.role !== "client" && user.isActive && !user.isPending)
          // `_id` mirrors `id` because directory consumers still match on the legacy key.
          .map(({ id, name, email, role, avatar }) => ({ id, _id: id, name, email, role, avatar })),
      );
  }
  async getUser(principal: AuthPrincipal, userId: string) {
    if (principal.user.id !== userId) requireCapability(principal, "users.manage");
    const user = await this.repository.getUser(requireFirmContext(principal).firmId, userId);
    if (!user) throw new AppError("NOT_FOUND", "User was not found", 404);
    requireSameFirm(principal, user.firmId);
    return user;
  }
  async createUser(principal: AuthPrincipal, input: CreateUserInput, audit: AuditContext) {
    requireCapability(principal, "users.manage");
    try {
      const firmId = requireFirmContext(principal).firmId;
      const user = await this.repository.createUser(firmId, input, audit);
      if (input.invite) {
        if (!input.email)
          throw new AppError("VALIDATION_FAILED", "Email is required for an invitation", 400);
        await provisionLocalIdentity({
          lexnepalUserId: user.id,
          name: user.name ?? input.name,
          email: input.email,
        });
      }
      if (user.role === "client") {
        const { PostgresMattersRepository } = await import(
          "@/server/repositories/matters-repository"
        );
        await new PostgresMattersRepository().ensureClientForPortalUser(
          firmId,
          {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: input.phone ?? null,
          },
          audit,
        );
      }
      return user;
    } catch (error) {
      if (error instanceof Error && error.message === "USER_EMAIL_CONFLICT")
        throw new AppError("CONFLICT", "A user with this email already exists in this firm", 409);
      throw error;
    }
  }

  /**
   * Invite or reuse a client-role identity for CRM portal grant.
   * Allowed with `clients.manage` (staff client ops) or `users.manage`.
   */
  async inviteOrGetClientIdentity(
    principal: AuthPrincipal,
    input: { name: string; email: string; phone?: string | null },
    audit: AuditContext,
  ) {
    if (
      !principal.capabilities.has("clients.manage") &&
      !principal.capabilities.has("users.manage")
    ) {
      throw new AppError("FORBIDDEN", "Access denied: missing permission clients.manage", 403);
    }
    const firmId = requireFirmContext(principal).firmId;
    const existing = await this.repository.getUserByEmail(firmId, input.email);
    if (existing) {
      if (existing.role !== "client") {
        throw new AppError(
          "CONFLICT",
          "That email already belongs to a non-client account — use a different email",
          409,
        );
      }
      return { user: existing, created: false as const };
    }
    try {
      const user = await this.repository.createUser(
        firmId,
        {
          name: input.name,
          email: input.email,
          role: "client",
          isPublicFacing: false,
          invite: true,
          phone: input.phone ?? undefined,
        },
        audit,
      );
      await provisionLocalIdentity({
        lexnepalUserId: user.id,
        name: user.name ?? input.name,
        email: input.email,
      });
      return { user, created: true as const };
    } catch (error) {
      if (error instanceof Error && error.message === "USER_EMAIL_CONFLICT")
        throw new AppError("CONFLICT", "A user with this email already exists in this firm", 409);
      throw error;
    }
  }
  async updateUser(
    principal: AuthPrincipal,
    userId: string,
    input: UpdateUserInput,
    audit: AuditContext,
  ) {
    requireCapability(principal, "users.manage");
    if (principal.user.id === userId && input.isActive === false)
      throw new AppError("CONFLICT", "You cannot suspend your own account", 409);
    const user = await this.repository.updateUser(
      requireFirmContext(principal).firmId,
      userId,
      input,
      audit,
    );
    if (!user) throw new AppError("NOT_FOUND", "User was not found", 404);
    return user;
  }
  async sendPasswordReset(principal: AuthPrincipal, userId: string, audit: AuditContext) {
    const user = await this.repository.getUser(requireFirmContext(principal).firmId, userId);
    if (!user) throw new AppError("NOT_FOUND", "User was not found", 404);
    const canManageUsers = principal.capabilities.has("users.manage");
    const canInviteClients =
      principal.capabilities.has("clients.manage") && user.role === "client";
    if (!canManageUsers && !canInviteClients) {
      throw new AppError("FORBIDDEN", "Access denied: missing permission users.manage", 403);
    }
    if (!user.email) throw new AppError("CONFLICT", "User has no email address", 409);
    const redirectPath = user.isPending ? "/setup-account" : "/reset-password";
    try {
      await requestLocalPasswordResetForLexUser(userId, { redirectPath });
    } catch (error) {
      if (error instanceof Error && error.message === "LOCAL_IDENTITY_NOT_PROVISIONED") {
        await provisionLocalIdentity({
          lexnepalUserId: user.id,
          name: user.name ?? user.email,
          email: user.email,
        });
      } else throw error;
    }
    await this.repository.recordSecurityAction(
      audit,
      user.isPending ? "users.invite_resent" : "users.password_reset_requested",
      userId,
    );
  }
  async resetMfa(principal: AuthPrincipal, userId: string, audit: AuditContext) {
    requireCapability(principal, "users.manage");
    if (principal.user.id === userId)
      throw new AppError("CONFLICT", "Administrators cannot reset their own MFA", 409);
    if (!(await this.repository.resetMfa(requireFirmContext(principal).firmId, userId, audit)))
      throw new AppError("NOT_FOUND", "User was not found", 404);
  }
  async updateOwnProfile(
    principal: AuthPrincipal,
    input: UpdateOwnProfileInput,
    audit: AuditContext,
  ) {
    const user = await this.repository.updateOwnProfile(
      requireFirmContext(principal).firmId,
      principal.user.id,
      input,
      audit,
    );
    if (!user) throw new AppError("NOT_FOUND", "User was not found", 404);
    return user;
  }
  async archiveUser(principal: AuthPrincipal, userId: string, audit: AuditContext) {
    requireCapability(principal, "users.manage");
    if (principal.user.id === userId)
      throw new AppError("CONFLICT", "You cannot archive your own account", 409);
    if (!(await this.repository.archiveUser(requireFirmContext(principal).firmId, userId, audit)))
      throw new AppError("NOT_FOUND", "User was not found", 404);
  }
  getSettings(principal: AuthPrincipal) {
    return this.repository.getSettings(requireFirmContext(principal).firmId);
  }
  updateSettings(principal: AuthPrincipal, input: UpdateSystemSettingsInput, audit: AuditContext) {
    requireCapability(principal, "settings.manage");
    return this.repository.updateSettings(requireFirmContext(principal).firmId, input, audit);
  }
  listSessions(principal: AuthPrincipal, userId: string) {
    if (principal.user.id !== userId) requireCapability(principal, "users.manage");
    return this.repository.listSessions(
      requireFirmContext(principal).firmId,
      userId,
      principal.sessionId,
    );
  }
  revokeSessions(principal: AuthPrincipal, userId: string, audit: AuditContext) {
    if (principal.user.id !== userId) requireCapability(principal, "users.manage");
    return this.repository.revokeUserSessions(
      requireFirmContext(principal).firmId,
      userId,
      audit,
      principal.user.id === userId ? principal.sessionId : null,
    );
  }
  async revokeSession(principal: AuthPrincipal, sessionId: string, audit: AuditContext) {
    if (sessionId === principal.sessionId)
      throw new AppError("CONFLICT", "Use sign out to revoke the current session", 409);
    if (
      !(await this.repository.revokeSession(
        requireFirmContext(principal).firmId,
        principal.user.id,
        sessionId,
        audit,
      ))
    )
      throw new AppError("NOT_FOUND", "Session was not found", 404);
  }
  listOwnAudit(principal: AuthPrincipal, limit = 30) {
    return this.repository.listAudit(requireFirmContext(principal).firmId, {
      userId: principal.user.id,
      limit,
    });
  }
  listAudit(
    principal: AuthPrincipal,
    filters: { userId?: string; resource?: string; action?: string; limit: number },
  ) {
    requireCapability(principal, "audit.view");
    return this.repository.listAudit(requireFirmContext(principal).firmId, filters);
  }
}

let service: IdentityService | undefined;
export function getIdentityService() {
  service ??= new IdentityService();
  return service;
}
