import { returningInsert, returningMutation } from "@/server/db/mysql-returning";
import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  auditLog,
  authSessions,
  authTwoFactors,
  authUsers,
  firmSettings,
  firms,
  sessions,
  users,
} from "@/server/db/schema";
import type { AuditContext } from "@/server/audit/context";
import type {
  AuditEventDto,
  CreateUserInput,
  FirmDto,
  RolePermissionMatrix,
  SessionDto,
  SystemSettings,
  UpdateOwnProfileInput,
  UpdateSystemSettingsInput,
  UpdateUserInput,
  UserDto,
} from "@/shared/contracts/identity";

const DEFAULT_SETTINGS: SystemSettings = {
  defaultLanguage: "en",
  clientPortalEnabled: true,
  onlineBookingEnabled: true,
  defaultMeetingPlatform: "manual",
};

export class MySqlIdentityRepository {
  private readonly database = getDatabase();

  async getFirm(firmId: string): Promise<FirmDto | null> {
    const [firm] = await this.database
      .select({ id: firms.id, name: firms.name, slug: firms.slug, isActive: firms.isActive })
      .from(firms)
      .where(and(eq(firms.id, firmId), isNull(firms.deletedAt)))
      .limit(1);
    return firm ?? null;
  }

  async getRolePermissions(firmId: string): Promise<unknown> {
    const [row] = await this.database
      .select({ value: firmSettings.value })
      .from(firmSettings)
      .where(
        and(
          eq(firmSettings.firmId, firmId),
          eq(firmSettings.key, "rolePermissions"),
          isNull(firmSettings.deletedAt),
        ),
      )
      .limit(1);
    return row?.value;
  }

  async updateRolePermissions(
    firmId: string,
    matrix: RolePermissionMatrix,
    audit: AuditContext,
  ): Promise<void> {
    await this.database.transaction(async (tx) => {
      await tx
        .insert(firmSettings)
        .values({ firmId, key: "rolePermissions", value: matrix })
        .onDuplicateKeyUpdate({
          set: { value: matrix, deletedAt: null, updatedAt: audit.occurredAt },
        });
      await writeAudit(
        tx,
        audit,
        "users.permissions_updated",
        "firm_settings",
        "rolePermissions",
        Object.keys(matrix).sort().join(","),
      );
    });
  }

  async listUsers(firmId: string, role?: string): Promise<UserDto[]> {
    const rows = await this.database
      .select()
      .from(users)
      .where(
        and(
          eq(users.firmId, firmId),
          role ? eq(users.role, role as (typeof users.role.enumValues)[number]) : undefined,
          isNull(users.deletedAt),
        ),
      )
      .orderBy(users.name);
    return rows.map(toUserDto);
  }

  async getUser(firmId: string, userId: string): Promise<UserDto | null> {
    const [row] = await this.database
      .select()
      .from(users)
      .where(and(eq(users.firmId, firmId), eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    return row ? toUserDto(row) : null;
  }

  async getUserByEmail(firmId: string, email: string): Promise<UserDto | null> {
    const normalized = email.trim().toLowerCase();
    const [row] = await this.database
      .select()
      .from(users)
      .where(
        and(
          eq(users.firmId, firmId),
          sql`lower(${users.email}) = ${normalized}`,
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    return row ? toUserDto(row) : null;
  }

  async createUser(firmId: string, input: CreateUserInput, audit: AuditContext): Promise<UserDto> {
    return this.database.transaction(async (tx) => {
      if (input.email) {
        const [duplicate] = await tx
          .select({ id: users.id })
          .from(users)
          .where(
            and(eq(users.firmId, firmId), eq(users.email, input.email), isNull(users.deletedAt)),
          )
          .limit(1);
        if (duplicate) throw new Error("USER_EMAIL_CONFLICT");
      }
      const now = audit.occurredAt;
      const [created] = await returningInsert(
        tx
          .insert(users)
          .values({
            firmId,
            tokenIdentifier: `pending:${randomUUID()}`,
            activationToken: null,
            name: input.name,
            email: input.email,
            role: input.role,
            phone: input.phone,
            barCouncilNumber: input.barCouncilNumber,
            barCouncilExpiry: input.barCouncilExpiry,
            isPublicFacing: input.isPublicFacing,
            isActive: !input.invite,
            isPending: input.invite,
            invitedAt: input.invite ? now : null,
            invitedBy: input.invite ? audit.actorId : null,
            inviteExpiresAt: input.invite ? new Date(now.getTime() + 7 * 86_400_000) : null,
            twoFactorRequired: input.role === "admin" || input.role === "partner",
          })
          .$returningId(),
        (id) => tx.select().from(users).where(eq(users.id, id)).limit(1),
      );
      await writeAudit(
        tx,
        audit,
        input.invite ? "users.invite_created" : "users.created",
        "users",
        created.id,
        `role=${created.role}`,
      );
      return toUserDto(created);
    });
  }

  async updateUser(
    firmId: string,
    userId: string,
    input: UpdateUserInput,
    audit: AuditContext,
  ): Promise<UserDto | null> {
    return this.database.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(users)
        .where(and(eq(users.firmId, firmId), eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);
      if (!current) return null;
      const now = audit.occurredAt;
      const [updated] = await returningMutation(
        tx
          .update(users)
          .set({
            ...input,
            deactivatedAt:
              input.isActive === false
                ? now
                : input.isActive === true
                  ? null
                  : current.deactivatedAt,
            deactivatedBy:
              input.isActive === false
                ? audit.actorId
                : input.isActive === true
                  ? null
                  : current.deactivatedBy,
            updatedAt: now,
          })
          .where(and(eq(users.firmId, firmId), eq(users.id, userId))),
        () => tx.select().from(users).where(eq(users.id, userId)),
      );
      if (input.isActive === false) {
        await tx
          .update(sessions)
          .set({
            revokedAt: now,
            revokedBy: audit.actorId,
            revocationReason: "Account suspended",
            isCurrent: false,
            updatedAt: now,
          })
          .where(
            and(
              eq(sessions.firmId, firmId),
              eq(sessions.userId, userId),
              isNull(sessions.revokedAt),
            ),
          );
        const linkedAuthUsers = await tx
          .select({ id: authUsers.id })
          .from(authUsers)
          .where(eq(authUsers.lexnepalUserId, userId));
        if (linkedAuthUsers.length)
          await tx.delete(authSessions).where(
            inArray(
              authSessions.userId,
              linkedAuthUsers.map((row) => row.id),
            ),
          );
      }
      await writeAudit(
        tx,
        audit,
        "users.updated",
        "users",
        userId,
        Object.keys(input).sort().join(","),
      );
      return toUserDto(updated);
    });
  }

  async updateOwnProfile(
    firmId: string,
    userId: string,
    input: UpdateOwnProfileInput,
    audit: AuditContext,
  ): Promise<UserDto | null> {
    return this.database.transaction(async (tx) => {
      const [updated] = await returningMutation(
        tx
          .update(users)
          .set({ ...input, updatedAt: audit.occurredAt })
          .where(and(eq(users.firmId, firmId), eq(users.id, userId), isNull(users.deletedAt))),
        () => tx.select().from(users).where(eq(users.id, userId)),
      );
      if (!updated) return null;
      await writeAudit(
        tx,
        audit,
        "users.profile_updated",
        "users",
        userId,
        Object.keys(input).sort().join(","),
      );
      return toUserDto(updated);
    });
  }

  async archiveUser(firmId: string, userId: string, audit: AuditContext): Promise<boolean> {
    if (userId === audit.actorId) return false;
    const result = await this.updateUser(firmId, userId, { isActive: false }, audit);
    return Boolean(result);
  }

  async getSettings(firmId: string): Promise<SystemSettings> {
    const rows = await this.database
      .select({ key: firmSettings.key, value: firmSettings.value })
      .from(firmSettings)
      .where(and(eq(firmSettings.firmId, firmId), isNull(firmSettings.deletedAt)));
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      ...DEFAULT_SETTINGS,
      ...Object.fromEntries(
        Object.keys(DEFAULT_SETTINGS)
          .filter((key) => key in values)
          .map((key) => [key, values[key]]),
      ),
    } as SystemSettings;
  }

  async updateSettings(
    firmId: string,
    input: UpdateSystemSettingsInput,
    audit: AuditContext,
  ): Promise<SystemSettings> {
    await this.database.transaction(async (tx) => {
      for (const [key, value] of Object.entries(input))
        await tx
          .insert(firmSettings)
          .values({ firmId, key, value })
          .onDuplicateKeyUpdate({ set: { value, updatedAt: audit.occurredAt, deletedAt: null } });
      await writeAudit(
        tx,
        audit,
        "settings.updated",
        "firm_settings",
        null,
        Object.keys(input).sort().join(","),
      );
    });
    return this.getSettings(firmId);
  }

  async listSessions(
    firmId: string,
    userId: string,
    currentSessionId?: string | null,
  ): Promise<SessionDto[]> {
    const rows = await this.database
      .select({ session: authSessions })
      .from(authSessions)
      .innerJoin(authUsers, eq(authUsers.id, authSessions.userId))
      .innerJoin(users, eq(users.id, authUsers.lexnepalUserId))
      .where(and(eq(users.firmId, firmId), eq(users.id, userId)))
      .orderBy(desc(authSessions.updatedAt));
    return rows.map((row) => ({
      id: row.session.id,
      device: "web",
      browser: "local-auth",
      ipAddress: row.session.ipAddress ?? "unknown",
      userAgent: row.session.userAgent,
      lastActive: row.session.updatedAt.toISOString(),
      expiresAt: row.session.expiresAt.toISOString(),
      revokedAt: null,
      isCurrent: row.session.id === currentSessionId,
    }));
  }

  async revokeUserSessions(
    firmId: string,
    userId: string,
    audit: AuditContext,
    exceptSessionId?: string | null,
  ): Promise<number> {
    const rows = await this.database.transaction(async (tx) => {
      const revoked = await tx
        .select({ id: authSessions.id })
        .from(authSessions)
        .innerJoin(authUsers, eq(authUsers.id, authSessions.userId))
        .innerJoin(users, eq(users.id, authUsers.lexnepalUserId))
        .where(
          and(
            eq(users.firmId, firmId),
            eq(users.id, userId),
            exceptSessionId ? sql`${authSessions.id} <> ${exceptSessionId}` : undefined,
          ),
        );
      if (revoked.length)
        await tx.delete(authSessions).where(
          inArray(
            authSessions.id,
            revoked.map((row) => row.id),
          ),
        );
      await writeAudit(
        tx,
        audit,
        "sessions.revoked",
        "sessions",
        userId,
        `count=${revoked.length}`,
      );
      return revoked;
    });
    return rows.length;
  }

  async revokeSession(
    firmId: string,
    userId: string,
    sessionId: string,
    audit: AuditContext,
  ): Promise<boolean> {
    return this.database.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: authSessions.id })
        .from(authSessions)
        .innerJoin(authUsers, eq(authUsers.id, authSessions.userId))
        .innerJoin(users, eq(users.id, authUsers.lexnepalUserId))
        .where(and(eq(authSessions.id, sessionId), eq(users.firmId, firmId), eq(users.id, userId)))
        .limit(1);
      if (!target) return false;
      await tx.delete(authSessions).where(eq(authSessions.id, sessionId));
      await writeAudit(tx, audit, "sessions.revoked", "sessions", sessionId, null);
      return true;
    });
  }

  async listAudit(
    firmId: string,
    filters: { userId?: string; resource?: string; action?: string; limit: number },
  ): Promise<AuditEventDto[]> {
    const rows = await this.database
      .select({ event: auditLog, actorName: users.name, actorRole: users.role })
      .from(auditLog)
      .innerJoin(users, and(eq(users.id, auditLog.userId), eq(users.firmId, auditLog.firmId)))
      .where(
        and(
          eq(auditLog.firmId, firmId),
          filters.userId ? eq(auditLog.userId, filters.userId) : undefined,
          filters.resource ? eq(auditLog.resource, filters.resource) : undefined,
          filters.action ? eq(auditLog.action, filters.action) : undefined,
          isNull(auditLog.deletedAt),
        ),
      )
      .orderBy(desc(auditLog.createdAt))
      .limit(filters.limit);
    return rows.map(({ event, actorName, actorRole }) => ({
      id: event.id,
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId,
      details: event.details,
      ipAddress: event.ipAddress,
      requestId: event.requestId,
      createdAt: event.createdAt.toISOString(),
      actorName,
      actorRole,
    }));
  }

  async recordSecurityAction(audit: AuditContext, action: string, userId: string): Promise<void> {
    await this.database.transaction((tx) => writeAudit(tx, audit, action, "users", userId, null));
  }

  async resetMfa(firmId: string, userId: string, audit: AuditContext): Promise<boolean> {
    return this.database.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.firmId, firmId), isNull(users.deletedAt)))
        .limit(1);
      if (!target) return false;
      const linked = await tx
        .select({ id: authUsers.id })
        .from(authUsers)
        .where(eq(authUsers.lexnepalUserId, userId));
      if (linked.length) {
        const ids = linked.map((row) => row.id);
        await tx.delete(authSessions).where(inArray(authSessions.userId, ids));
        await tx.delete(authTwoFactors).where(inArray(authTwoFactors.userId, ids));
        await tx
          .update(authUsers)
          .set({ twoFactorEnabled: false, updatedAt: audit.occurredAt })
          .where(inArray(authUsers.id, ids));
      }
      await tx
        .update(users)
        .set({ twoFactorEnabled: false, updatedAt: audit.occurredAt })
        .where(and(eq(users.id, userId), eq(users.firmId, firmId)));
      await writeAudit(tx, audit, "users.mfa_reset", "users", userId, "sessions_revoked=true");
      return true;
    });
  }
}

type Transaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];
async function writeAudit(
  tx: Transaction,
  context: AuditContext,
  action: string,
  resource: string,
  resourceId: string | null,
  details: string | null,
) {
  await tx.insert(auditLog).values({
    firmId: context.firmId,
    userId: context.actorId,
    action,
    resource,
    resourceId,
    details,
    ipAddress: context.ipAddress,
    requestId: context.requestId,
    createdAt: context.occurredAt,
    updatedAt: context.occurredAt,
  });
}
function toUserDto(user: typeof users.$inferSelect): UserDto {
  return {
    id: user.id,
    _id: user.id,
    firmId: user.firmId,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar ? `/api/v1/users/${user.id}/avatar` : null,
    phone: user.phone,
    bio: user.bio,
    leadershipTitle: user.leadershipTitle,
    barCouncilNumber: user.barCouncilNumber,
    barCouncilExpiry: user.barCouncilExpiry,
    isActive: user.isActive,
    isPending: user.isPending,
    isPublicFacing: user.isPublicFacing,
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorRequired: user.twoFactorRequired,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    baseSalary: user.baseSalary != null ? Number(user.baseSalary) : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
