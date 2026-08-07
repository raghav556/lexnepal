import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  auditLog,
  cases,
  caseTeamMembers,
  clients,
  conflictChecks,
  notifications,
  users,
} from "@/server/db/schema";
import type { AuditContext } from "@/server/audit/context";
import type {
  CaseCreateInput,
  CaseListInput,
  CaseUpdateInput,
  ClientCreateInput,
  ClientStaffUpdateInput,
} from "@/shared/contracts/matters";
import { AppError } from "@/shared/errors/api-error";
import type { CaseDto } from "@/shared/contracts/domains";
import type {
  ConflictOfficialSearchInput,
  ConflictPreviewInput,
  ConflictSearchScope,
} from "@/shared/contracts/conflicts";
import {
  runConflictSearch,
  runMatterBundleSearch,
} from "@/server/services/conflict-search";

const database = getDatabase();

export class PostgresMattersRepository {
  async listClients(firmId: string) {
    const rows = await database
      .select()
      .from(clients)
      .where(and(eq(clients.firmId, firmId), isNull(clients.deletedAt)))
      .orderBy(asc(clients.fullName));
    return rows.map((row) => clientDto(row, false));
  }

  async getClient(firmId: string, clientId: string, includeSensitive = false) {
    const [row] = await database
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.firmId, firmId), isNull(clients.deletedAt)))
      .limit(1);
    return row ? clientDto(row, includeSensitive) : null;
  }

  async getClientRow(firmId: string, clientId: string) {
    const [row] = await database
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.firmId, firmId), isNull(clients.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async getClientByUser(firmId: string, userId: string, includeSensitive = true) {
    const [row] = await database
      .select()
      .from(clients)
      .where(and(eq(clients.firmId, firmId), eq(clients.userId, userId), isNull(clients.deletedAt)))
      .limit(1);
    return row ? clientDto(row, includeSensitive) : null;
  }

  async createClient(firmId: string, input: ClientCreateInput, audit: AuditContext) {
    await this.validateLinkedUser(firmId, input.userId ?? null);
    return database.transaction(async (tx) => {
      const [row] = await tx
        .insert(clients)
        .values({ firmId, ...normalizeEmpty(input), kycStatus: "pending", isActive: true })
        .returning();
      await writeAudit(tx, audit, "client.created", "clients", row.id, row.fullName);
      return clientDto(row, false);
    });
  }

  async updateClient(
    firmId: string,
    clientId: string,
    input: ClientStaffUpdateInput,
    audit: AuditContext,
  ) {
    if (input.userId !== undefined) await this.validateLinkedUser(firmId, input.userId);
    return database.transaction(async (tx) => {
      const [row] = await tx
        .update(clients)
        .set({ ...normalizeEmpty(input), updatedAt: audit.occurredAt })
        .where(and(eq(clients.id, clientId), eq(clients.firmId, firmId), isNull(clients.deletedAt)))
        .returning();
      if (!row) throw new AppError("NOT_FOUND", "Client was not found", 404);
      await writeAudit(tx, audit, "client.updated", "clients", row.id, null);
      return clientDto(row, false);
    });
  }

  async updateOwnClient(
    firmId: string,
    userId: string,
    input: { phone?: string | null; address?: string | null },
    audit: AuditContext,
  ) {
    return database.transaction(async (tx) => {
      const [row] = await tx
        .update(clients)
        .set({ ...normalizeEmpty(input), updatedAt: audit.occurredAt })
        .where(
          and(eq(clients.firmId, firmId), eq(clients.userId, userId), isNull(clients.deletedAt)),
        )
        .returning();
      if (!row) throw new AppError("NOT_FOUND", "Client profile was not found", 404);
      await writeAudit(tx, audit, "client.self_updated", "clients", row.id, null);
      return clientDto(row, true);
    });
  }

  async listCases(firmId: string, filters: CaseListInput): Promise<CaseDto[]> {
    const predicates = [eq(cases.firmId, firmId), isNull(cases.deletedAt)];
    if (filters.status) predicates.push(eq(cases.status, filters.status));
    if (filters.clientId) predicates.push(eq(cases.clientId, filters.clientId));
    if (filters.lawyerId) predicates.push(eq(cases.assignedLawyerId, filters.lawyerId));
    const rows = await database
      .select()
      .from(cases)
      .where(and(...predicates))
      .orderBy(desc(cases.createdAt));
    return this.attachTeam(rows);
  }

  async getCase(firmId: string, caseId: string, withDetails = false) {
    const [row] = await database
      .select()
      .from(cases)
      .where(and(eq(cases.id, caseId), eq(cases.firmId, firmId), isNull(cases.deletedAt)))
      .limit(1);
    if (!row) return null;
    const [matter] = await this.attachTeam([row]);
    if (!withDetails) return matter;
    const [client, lawyer] = await Promise.all([
      this.getClient(firmId, row.clientId, false),
      database
        .select({ id: users.id, name: users.name, email: users.email, role: users.role })
        .from(users)
        .where(and(eq(users.id, row.assignedLawyerId), eq(users.firmId, firmId)))
        .limit(1),
    ]);
    return { ...matter, client, lawyer: lawyer[0] ? { ...lawyer[0], _id: lawyer[0].id } : null };
  }

  async createCase(firmId: string, input: CaseCreateInput, audit: AuditContext) {
    await this.validateCaseRelationships(
      firmId,
      input.clientId,
      input.assignedLawyerId,
      input.teamMemberIds,
    );
    return database.transaction(async (tx) => {
      const { teamMemberIds, ...matter } = input;
      const [row] = await tx
        .insert(cases)
        .values({ firmId, ...normalizeEmpty(matter), status: "active", conflictChecked: false })
        .returning();
      if (teamMemberIds.length)
        await tx
          .insert(caseTeamMembers)
          .values(
            [...new Set(teamMemberIds)].map((userId) => ({ firmId, caseId: row.id, userId })),
          );
      await writeAudit(tx, audit, "case.created", "cases", row.id, row.caseNumber);
      return caseDto(row, [...new Set(teamMemberIds)]);
    });
  }

  async updateCase(firmId: string, caseId: string, input: CaseUpdateInput, audit: AuditContext) {
    const [existing] = await database
      .select()
      .from(cases)
      .where(and(eq(cases.id, caseId), eq(cases.firmId, firmId), isNull(cases.deletedAt)))
      .limit(1);
    if (!existing) throw new AppError("NOT_FOUND", "Case was not found", 404);
    const existingMembers = await database
      .select({ userId: caseTeamMembers.userId })
      .from(caseTeamMembers)
      .where(and(eq(caseTeamMembers.firmId, firmId), eq(caseTeamMembers.caseId, caseId)));
    const nextLawyer = input.assignedLawyerId ?? existing.assignedLawyerId;
    const nextTeam = input.teamMemberIds ?? existingMembers.map((member) => member.userId);
    await this.validateCaseRelationships(firmId, existing.clientId, nextLawyer, nextTeam);
    return database.transaction(async (tx) => {
      const { teamMemberIds, ...changes } = input;
      const [row] = await tx
        .update(cases)
        .set({ ...normalizeEmpty(changes), updatedAt: audit.occurredAt })
        .where(and(eq(cases.id, caseId), eq(cases.firmId, firmId), isNull(cases.deletedAt)))
        .returning();
      if (!row) throw new AppError("NOT_FOUND", "Case was not found", 404);
      if (teamMemberIds) {
        await tx
          .delete(caseTeamMembers)
          .where(and(eq(caseTeamMembers.firmId, firmId), eq(caseTeamMembers.caseId, caseId)));
        const uniqueMembers = [...new Set(teamMemberIds)];
        if (uniqueMembers.length)
          await tx
            .insert(caseTeamMembers)
            .values(uniqueMembers.map((userId) => ({ firmId, caseId, userId })));
      }
      await writeAudit(tx, audit, "case.updated", "cases", row.id, null);
      return caseDto(row, teamMemberIds ?? existingMembers.map((member) => member.userId));
    });
  }

  async previewConflicts(firmId: string, query: string, scope?: Partial<ConflictSearchScope>) {
    return runConflictSearch(firmId, query, scope);
  }

  async searchAndLogConflicts(
    firmId: string,
    query: string,
    audit: AuditContext,
    options?: {
      runByName?: string;
      scope?: Partial<ConflictSearchScope>;
      matterContext?: { clientName?: string; opposingCounsel?: string; caseNumber?: string };
    },
  ) {
    const outcome = options?.matterContext
      ? await runMatterBundleSearch(firmId, query, options.matterContext, options.scope)
      : await runConflictSearch(firmId, query, options?.scope);
    const hits = outcome.hits;

    const [check] = await database.transaction(async (tx) => {
      const inserted = await tx
        .insert(conflictChecks)
        .values({
          firmId,
          searchQuery: outcome.query,
          hitsCount: hits.length,
          status: hits.length ? "pending" : "cleared",
          runBy: audit.actorId,
          runByName: options?.runByName?.trim() || "Authorized user",
          checkedAt: audit.occurredAt,
        })
        .returning();
      await writeAudit(
        tx,
        audit,
        "conflict.search_run",
        "conflict_checks",
        inserted[0].id,
        `hits=${hits.length};high=${outcome.summary.high}`,
      );
      return inserted;
    });
    return { checkId: check.id, ...outcome };
  }

  async getConflictStats(firmId: string) {
    const rows = await database
      .select({
        status: conflictChecks.status,
        checkedAt: conflictChecks.checkedAt,
      })
      .from(conflictChecks)
      .where(and(eq(conflictChecks.firmId, firmId), isNull(conflictChecks.deletedAt)));

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    return {
      totalChecks: rows.length,
      pendingReviews: rows.filter((r) => r.status === "pending").length,
      clearedCount: rows.filter((r) => r.status === "cleared").length,
      conflictCount: rows.filter((r) => r.status === "conflict").length,
      checksThisMonth: rows.filter((r) => r.checkedAt >= monthStart).length,
    };
  }

  async listConflictChecks(firmId: string) {
    const rows = await database
      .select()
      .from(conflictChecks)
      .where(and(eq(conflictChecks.firmId, firmId), isNull(conflictChecks.deletedAt)))
      .orderBy(desc(conflictChecks.checkedAt))
      .limit(50);
    return rows.map((row) => {
      const dto = toDto(row);
      dto.timestamp = row.checkedAt.toISOString();
      return dto;
    });
  }

  async decideConflictCheck(
    firmId: string,
    checkId: string,
    status: "cleared" | "conflict",
    notes: string | null | undefined,
    audit: AuditContext,
  ) {
    return database.transaction(async (tx) => {
      const [row] = await tx
        .update(conflictChecks)
        .set({ status, notes: notes || null, updatedAt: audit.occurredAt })
        .where(
          and(
            eq(conflictChecks.id, checkId),
            eq(conflictChecks.firmId, firmId),
            isNull(conflictChecks.deletedAt),
          ),
        )
        .returning();
      if (!row) throw new AppError("NOT_FOUND", "Conflict check was not found", 404);
      await writeAudit(tx, audit, "conflict.decision_recorded", "conflict_checks", row.id, status);
      return toDto(row);
    });
  }

  async markCaseConflict(firmId: string, caseId: string, cleared: boolean, audit: AuditContext) {
    return database.transaction(async (tx) => {
      const [row] = await tx
        .update(cases)
        .set({
          conflictChecked: true,
          conflictClearedBy: cleared ? audit.actorId : null,
          updatedAt: audit.occurredAt,
        })
        .where(and(eq(cases.id, caseId), eq(cases.firmId, firmId), isNull(cases.deletedAt)))
        .returning();
      if (!row) throw new AppError("NOT_FOUND", "Case was not found", 404);
      await writeAudit(
        tx,
        audit,
        cleared ? "case.conflict_cleared" : "case.conflict_flagged",
        "cases",
        row.id,
        null,
      );
      return { success: true };
    });
  }

  async notifyClient(
    tx: Transaction,
    firmId: string,
    userId: string | null,
    title: string,
    body: string,
    relatedId: string,
  ) {
    if (!userId) return;
    await tx
      .insert(notifications)
      .values({ firmId, userId, title, body, type: "system", relatedId, link: "/client/kyc" });
  }

  private async attachTeam<T extends typeof cases.$inferSelect>(rows: T[]): Promise<CaseDto[]> {
    if (!rows.length) return [];
    const members = await database
      .select({ caseId: caseTeamMembers.caseId, userId: caseTeamMembers.userId })
      .from(caseTeamMembers)
      .where(
        inArray(
          caseTeamMembers.caseId,
          rows.map((row) => row.id),
        ),
      );
    const byCase = new Map<string, string[]>();
    for (const member of members)
      byCase.set(member.caseId, [...(byCase.get(member.caseId) ?? []), member.userId]);
    return rows.map((row) => caseDto(row, byCase.get(row.id) ?? []));
  }

  private async validateLinkedUser(firmId: string, userId: string | null | undefined) {
    if (!userId) return;
    const [user] = await database
      .select({ role: users.role, isActive: users.isActive, isPending: users.isPending })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.firmId, firmId), isNull(users.deletedAt)))
      .limit(1);
    // Pending invites are inactive until activation — still valid portal links.
    if (!user || user.role !== "client" || (!user.isActive && !user.isPending))
      throw new AppError(
        "VALIDATION_FAILED",
        "Linked user must be a client account in the same firm (active or awaiting activation)",
        400,
      );
  }

  /** Returns another CRM client already linked to this portal user, if any. */
  async findOtherClientLinkedToUser(firmId: string, userId: string, excludeClientId?: string) {
    const rows = await database
      .select({ id: clients.id, fullName: clients.fullName })
      .from(clients)
      .where(and(eq(clients.firmId, firmId), eq(clients.userId, userId), isNull(clients.deletedAt)))
      .limit(5);
    return rows.find((row) => row.id !== excludeClientId) ?? null;
  }

  async findClientByEmail(firmId: string, email: string) {
    const normalized = email.trim().toLowerCase();
    const [row] = await database
      .select()
      .from(clients)
      .where(
        and(eq(clients.firmId, firmId), ilike(clients.email, normalized), isNull(clients.deletedAt)),
      )
      .limit(1);
    return row ? clientDto(row, false) : null;
  }

  /**
   * When inviting a client-role identity from Users: link an unlinked CRM row by email,
   * or create a minimal individual client so `/client` has a record.
   */
  async ensureClientForPortalUser(
    firmId: string,
    user: { id: string; email: string | null; name: string | null; phone?: string | null },
    audit: AuditContext,
  ) {
    if (!user.email) return null;
    const existingByUser = await this.getClientByUser(firmId, user.id, false);
    if (existingByUser) return existingByUser;

    const byEmail = await this.findClientByEmail(firmId, user.email);
    if (byEmail) {
      const linkedUserId = typeof byEmail.userId === "string" ? byEmail.userId : null;
      if (linkedUserId && linkedUserId !== user.id) {
        throw new AppError(
          "CONFLICT",
          "A CRM client with this email is already linked to another portal account",
          409,
        );
      }
      if (!linkedUserId) {
        return this.updateClient(firmId, String(byEmail._id), { userId: user.id }, audit);
      }
      return byEmail;
    }

    return this.createClient(
      firmId,
      {
        type: "individual",
        fullName: (user.name?.trim() || user.email) as string,
        email: user.email,
        phone: user.phone ?? null,
        userId: user.id,
      },
      audit,
    );
  }

  private async validateCaseRelationships(
    firmId: string,
    clientId: string,
    lawyerId: string,
    team: string[],
  ) {
    const [client, staff] = await Promise.all([
      this.getClientRow(firmId, clientId),
      database
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(
          and(
            eq(users.firmId, firmId),
            inArray(users.id, [...new Set([lawyerId, ...team])]),
            eq(users.isActive, true),
            isNull(users.deletedAt),
          ),
        ),
    ]);
    if (!client || !client.isActive)
      throw new AppError(
        "VALIDATION_FAILED",
        "Case client must be active and belong to the same firm",
        400,
      );
    const required = new Set([lawyerId, ...team]);
    if (staff.length !== required.size || staff.some((user) => user.role === "client"))
      throw new AppError(
        "VALIDATION_FAILED",
        "Assigned lawyer and team must be active staff in the same firm",
        400,
      );
  }
}

type Transaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];
async function writeAudit(
  tx: Transaction,
  audit: AuditContext,
  action: string,
  resource: string,
  resourceId: string | null,
  details: string | null,
) {
  await tx.insert(auditLog).values({
    firmId: audit.firmId,
    userId: audit.actorId,
    action,
    resource,
    resourceId,
    details,
    ipAddress: audit.ipAddress,
    requestId: audit.requestId,
    createdAt: audit.occurredAt,
    updatedAt: audit.occurredAt,
  });
}
function normalizeEmpty<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value === "" ? null : value]),
  ) as T;
}
function clientDto(row: typeof clients.$inferSelect, includeSensitive: boolean) {
  const dto = toDto(row);
  if (!includeSensitive) {
    delete dto.kycIdNumber;
    delete dto.kycConsentVersion;
  }
  return dto;
}
function caseDto(row: typeof cases.$inferSelect, teamMemberIds: string[]): CaseDto {
  return { ...toDto(row), teamMemberIds } as unknown as CaseDto;
}
function toDto(row: Record<string, unknown>) {
  const output: Record<string, unknown> = { ...row, _id: row.id };
  for (const [key, value] of Object.entries(output))
    if (value instanceof Date) output[key] = value.toISOString();
  delete output.firmId;
  delete output.legacyConvexId;
  delete output.deletedAt;
  return output;
}
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
