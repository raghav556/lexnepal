import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  cases,
  caseTeamMembers,
  clients,
  documents,
  firmSettings,
  sessions,
  users,
} from "@/server/db/schema";
import type { AuthUser, NewSession, SessionRepository, StoredSession } from "@/server/auth/types";
import type {
  AuthorizationDataSource,
  CaseAccessRecord,
  ClientAccessRecord,
  DocumentAccessRecord,
} from "@/server/policies/authorization";

export class PostgresSecurityRepository implements SessionRepository, AuthorizationDataSource {
  private readonly database = getDatabase();

  async findUserById(userId: string): Promise<AuthUser | null> {
    const [user] = await this.database
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    return user ? mapAuthUser(user) : null;
  }

  async setTwoFactorEnabled(userId: string, enabled: boolean): Promise<void> {
    await this.database
      .update(users)
      .set({ twoFactorEnabled: enabled, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async findUserByTokenIdentifiers(tokenIdentifiers: readonly string[]): Promise<AuthUser | null> {
    if (tokenIdentifiers.length === 0) return null;
    const rows = await this.database
      .select()
      .from(users)
      .where(and(inArray(users.tokenIdentifier, [...tokenIdentifiers]), isNull(users.deletedAt)))
      .limit(2);
    if (rows.length !== 1) return null;
    return mapAuthUser(rows[0]);
  }

  async findSessionByTokenHash(tokenHash: string): Promise<StoredSession | null> {
    const rows = await this.database
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(eq(sessions.tokenHash, tokenHash), isNull(sessions.deletedAt), isNull(users.deletedAt)),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.session.id,
      firmId: row.session.firmId,
      userId: row.session.userId,
      identitySubject: row.session.identitySubject,
      expiresAt: row.session.expiresAt,
      revokedAt: row.session.revokedAt,
      user: mapAuthUser(row.user),
    };
  }

  async createSession(session: NewSession): Promise<{ id: string }> {
    const [created] = await this.database
      .insert(sessions)
      .values({
        ...session,
        device: "web",
        browser: "oidc",
        lastActive: new Date(),
        isCurrent: true,
      })
      .returning({ id: sessions.id });
    return created;
  }

  async touchSession(sessionId: string, at: Date): Promise<void> {
    await this.database
      .update(sessions)
      .set({ lastActive: at, updatedAt: at })
      .where(eq(sessions.id, sessionId));
  }

  async revokeSession(sessionId: string, actorId: string, reason: string, at: Date): Promise<void> {
    await this.database
      .update(sessions)
      .set({
        revokedAt: at,
        revokedBy: actorId,
        revocationReason: reason,
        isCurrent: false,
        updatedAt: at,
      })
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
  }

  async getRolePermissions(firmId: string): Promise<unknown> {
    const [setting] = await this.database
      .select({ value: firmSettings.value })
      .from(firmSettings)
      .where(and(eq(firmSettings.firmId, firmId), eq(firmSettings.key, "rolePermissions")))
      .limit(1);
    return setting?.value;
  }

  async getCase(caseId: string): Promise<CaseAccessRecord | null> {
    const [matter] = await this.database
      .select()
      .from(cases)
      .where(and(eq(cases.id, caseId), isNull(cases.deletedAt)))
      .limit(1);
    if (!matter) return null;
    const members = await this.database
      .select({ userId: caseTeamMembers.userId })
      .from(caseTeamMembers)
      .where(and(eq(caseTeamMembers.caseId, matter.id), eq(caseTeamMembers.firmId, matter.firmId)));
    return { ...matter, teamMemberIds: members.map((member) => member.userId) };
  }

  async getClient(clientId: string): Promise<ClientAccessRecord | null> {
    const [client] = await this.database
      .select({ id: clients.id, firmId: clients.firmId, userId: clients.userId })
      .from(clients)
      .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
      .limit(1);
    return client ?? null;
  }

  async getClientByUser(userId: string): Promise<ClientAccessRecord | null> {
    const [client] = await this.database
      .select({ id: clients.id, firmId: clients.firmId, userId: clients.userId })
      .from(clients)
      .where(and(eq(clients.userId, userId), isNull(clients.deletedAt)))
      .limit(1);
    return client ?? null;
  }

  /** Case IDs owned by a CRM client within the firm (portal scoping). */
  async listCaseIdsForClient(firmId: string, clientId: string): Promise<string[]> {
    const rows = await this.database
      .select({ id: cases.id })
      .from(cases)
      .where(and(eq(cases.firmId, firmId), eq(cases.clientId, clientId), isNull(cases.deletedAt)));
    return rows.map((row) => row.id);
  }

  async getDocument(documentId: string): Promise<DocumentAccessRecord | null> {
    const [document] = await this.database
      .select({
        id: documents.id,
        firmId: documents.firmId,
        caseId: documents.caseId,
        uploadedBy: documents.uploadedBy,
        intendedSignerUserId: documents.intendedSignerUserId,
        isTemplate: documents.isTemplate,
        isPrivileged: documents.isPrivileged,
        confidentialityLevel: documents.confidentialityLevel,
        deletedAt: documents.deletedAt,
      })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    return document ?? null;
  }
}

function mapAuthUser(user: typeof users.$inferSelect): AuthUser {
  return {
    id: user.id,
    firmId: user.firmId,
    tokenIdentifier: user.tokenIdentifier,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    isPending: user.isPending,
    avatar: user.avatar ? `/api/v1/users/${user.id}/avatar` : null,
    phone: user.phone,
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorRequired: user.twoFactorRequired,
    activationToken: user.activationToken,
    passwordHash: user.passwordHash,
    totpSecret: user.totpSecret,
  };
}
