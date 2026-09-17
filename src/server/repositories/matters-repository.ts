import { returningInsert, returningMutation } from "@/server/db/mysql-returning";
import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, like, notInArray } from "drizzle-orm";
import { writeAuditLog } from "@/server/audit/write-audit";
import { getDatabase } from "@/server/db/client";
import {
  caseParties,
  cases,
  caseTeamMembers,
  clients,
  hearings,
  notifications,
  tasks,
  users,
} from "@/server/db/schema";
import type { AuditContext } from "@/server/audit/context";
import type {
  CaseCreateInput,
  CaseListInput,
  CasePartyCreateInput,
  CasePartyUpdateInput,
  CaseUpdateInput,
  ClientCreateInput,
  ClientStaffUpdateInput,
} from "@/shared/contracts/matters";
import { AppError } from "@/shared/errors/api-error";
import type { CaseDto } from "@/shared/contracts/domains";
import {
  isLifecycleClosed,
  applyCaseStatusAliases,
  toPersistedCaseStatus,
} from "@/shared/contracts/case-status";
import { syncCaseTeamMembers } from "@/shared/contracts/case-team-sync";
import { toStaffCaseDto, toStaffPartyDto } from "@/shared/contracts/staff-case";

const database = getDatabase();

export class MySqlMattersRepository {
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
      const [row] = await returningInsert(
        tx
          .insert(clients)
          .values({ firmId, ...normalizeEmpty(input), kycStatus: "pending", isActive: true })
          .$returningId(),
        (id) => tx.select().from(clients).where(eq(clients.id, id)).limit(1),
      );
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
      const [row] = await returningMutation(
        tx
          .update(clients)
          .set({ ...normalizeEmpty(input), updatedAt: audit.occurredAt })
          .where(
            and(eq(clients.id, clientId), eq(clients.firmId, firmId), isNull(clients.deletedAt)),
          ),
        () => tx.select().from(clients).where(eq(clients.id, clientId)),
      );
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
      const [row] = await returningMutation(
        tx
          .update(clients)
          .set({ ...normalizeEmpty(input), updatedAt: audit.occurredAt })
          .where(
            and(eq(clients.firmId, firmId), eq(clients.userId, userId), isNull(clients.deletedAt)),
          ),
        () =>
          tx
            .select()
            .from(clients)
            .where(
              and(
                eq(clients.firmId, firmId),
                eq(clients.userId, userId),
                isNull(clients.deletedAt),
              ),
            ),
      );
      if (!row) throw new AppError("NOT_FOUND", "Client profile was not found", 404);
      await writeAudit(tx, audit, "client.self_updated", "clients", row.id, null);
      return clientDto(row, true);
    });
  }

  async listCases(firmId: string, filters: CaseListInput): Promise<CaseDto[]> {
    const predicates = [eq(cases.firmId, firmId), isNull(cases.deletedAt)];
    if (filters.status && isLifecycleClosed(filters.status)) {
      predicates.push(eq(cases.status, "closed"));
    } else if (filters.status) {
      predicates.push(eq(cases.status, toPersistedCaseStatus(filters.status)));
    }
    if (filters.clientId) predicates.push(eq(cases.clientId, filters.clientId));
    if (filters.lawyerId) predicates.push(eq(cases.assignedLawyerId, filters.lawyerId));
    const rows = await database
      .select()
      .from(cases)
      .where(and(...predicates))
      .orderBy(desc(cases.createdAt));
    return this.hydrateStaffCases(firmId, await this.attachTeam(rows));
  }

  async getCase(firmId: string, caseId: string, withDetails = false) {
    const [row] = await database
      .select()
      .from(cases)
      .where(and(eq(cases.id, caseId), eq(cases.firmId, firmId), isNull(cases.deletedAt)))
      .limit(1);
    if (!row) return null;
    const [matter] = await this.hydrateStaffCases(firmId, await this.attachTeam([row]));
    if (!withDetails) return matter;
    const [client, lawyer] = await Promise.all([
      this.getClient(firmId, row.clientId, false),
      database
        .select({ id: users.id, name: users.name, email: users.email, role: users.role })
        .from(users)
        .where(and(eq(users.id, row.assignedLawyerId), eq(users.firmId, firmId)))
        .limit(1),
    ]);
    return {
      ...matter,
      client,
      lawyer: lawyer[0] ? { ...lawyer[0], _id: lawyer[0].id } : null,
    };
  }

  /** Minimal staff projection for client portal matter team. */
  async listStaffSummaries(firmId: string, userIds: string[]) {
    if (userIds.length === 0) return [];
    const rows = await database
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatar: users.avatar,
      })
      .from(users)
      .where(
        and(
          eq(users.firmId, firmId),
          inArray(users.id, userIds),
          isNull(users.deletedAt),
          eq(users.isActive, true),
        ),
      );
    return rows.map((row) => ({
      id: row.id,
      _id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      avatar: row.avatar ? `/api/v1/users/${row.id}/avatar` : null,
    }));
  }

  async createCase(firmId: string, input: CaseCreateInput, audit: AuditContext) {
    const synced = requireSyncedTeam({
      currentLeadId: input.assignedLawyerId,
      nextLeadId: input.assignedLawyerId,
      existingTeamIds: [],
      requestedTeamIds: input.teamMemberIds,
    });
    await this.validateCaseRelationships(firmId, input.clientId, input.assignedLawyerId, synced);
    const created = await database.transaction(async (tx) => {
      const { teamMemberIds: _requestedTeam, status, closureOutcome, ...matter } = input;
      const aliases = applyCaseStatusAliases({
        status: status ?? "active",
        closureOutcome,
      });
      const [row] = await returningInsert(
        tx
          .insert(cases)
          .values({
            firmId,
            ...normalizeEmpty(matter),
            status: toPersistedCaseStatus(String(aliases.status ?? "active")),
            closureOutcome:
              aliases.closureOutcome === undefined
                ? null
                : (aliases.closureOutcome as typeof cases.$inferInsert.closureOutcome),
          })
          .$returningId(),
        (id) => tx.select().from(cases).where(eq(cases.id, id)).limit(1),
      );
      await replaceCaseTeam(tx, firmId, row.id, synced);
      await writeAudit(tx, audit, "case.created", "cases", row.id, row.caseNumber);
      return caseDto(row, synced);
    });
    const [hydrated] = await this.hydrateStaffCases(firmId, [created]);
    return hydrated;
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
    const synced = requireSyncedTeam({
      currentLeadId: existing.assignedLawyerId,
      nextLeadId: nextLawyer,
      existingTeamIds: existingMembers.map((member) => member.userId),
      requestedTeamIds: input.teamMemberIds,
    });
    await this.validateCaseRelationships(firmId, existing.clientId, nextLawyer, synced);
    const { teamMemberIds: _requestedTeam, ...changes } = input;
    const aliases = applyCaseStatusAliases(changes);
    const { status: aliasStatus, ...aliasRest } = aliases;
    const nextStatus = (aliasStatus as string | undefined) ?? existing.status;
    if (changes.status !== undefined && changes.closedDate === undefined) {
      if (isLifecycleClosed(nextStatus) && !isLifecycleClosed(existing.status)) {
        aliasRest.closedDate = new Date().toISOString().slice(0, 10);
      } else if (!isLifecycleClosed(nextStatus) && isLifecycleClosed(existing.status)) {
        aliasRest.closedDate = null;
      }
    }
    const persisted = {
      ...aliasRest,
      ...(aliasStatus !== undefined ? { status: toPersistedCaseStatus(String(aliasStatus)) } : {}),
    };
    const updated = await database.transaction(async (tx) => {
      const [row] = await returningMutation(
        tx
          .update(cases)
          .set({ ...normalizeEmpty(persisted), updatedAt: audit.occurredAt })
          .where(and(eq(cases.id, caseId), eq(cases.firmId, firmId), isNull(cases.deletedAt))),
        () => tx.select().from(cases).where(eq(cases.id, caseId)),
      );
      if (!row) throw new AppError("NOT_FOUND", "Case was not found", 404);
      await replaceCaseTeam(tx, firmId, caseId, synced);
      await writeAudit(tx, audit, "case.updated", "cases", row.id, null);
      return caseDto(row, synced);
    });
    const [hydrated] = await this.hydrateStaffCases(firmId, [updated]);
    return hydrated;
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

  async listParties(firmId: string, caseId: string, clientVisibleOnly = false) {
    const predicates = [
      eq(caseParties.firmId, firmId),
      eq(caseParties.caseId, caseId),
      isNull(caseParties.deletedAt),
    ];
    if (clientVisibleOnly) predicates.push(eq(caseParties.clientVisible, true));
    const rows = await database
      .select()
      .from(caseParties)
      .where(and(...predicates))
      .orderBy(asc(caseParties.sortOrder), asc(caseParties.createdAt));
    return rows.map((row) => toStaffPartyDto(row as unknown as Record<string, unknown>));
  }

  async createParty(
    firmId: string,
    caseId: string,
    input: CasePartyCreateInput,
    audit: AuditContext,
  ) {
    await this.assertCaseExists(firmId, caseId);
    await this.validatePartyClient(firmId, input.clientId);
    return database.transaction(async (tx) => {
      const [row] = await returningInsert(
        tx
          .insert(caseParties)
          .values({
            firmId,
            caseId,
            name: input.name,
            side: input.side,
            roleLabel: input.roleLabel ?? null,
            partyType: input.partyType,
            clientId: input.clientId ?? null,
            sortOrder: input.sortOrder ?? 0,
            clientVisible: input.clientVisible ?? false,
          })
          .$returningId(),
        (id) => tx.select().from(caseParties).where(eq(caseParties.id, id)).limit(1),
      );
      await writeAudit(tx, audit, "case_party.created", "case_parties", row.id, row.name);
      return toStaffPartyDto(row as unknown as Record<string, unknown>);
    });
  }

  async updateParty(
    firmId: string,
    caseId: string,
    partyId: string,
    input: CasePartyUpdateInput,
    audit: AuditContext,
  ) {
    const existing = await this.getPartyRow(firmId, caseId, partyId);
    if (!existing) throw new AppError("NOT_FOUND", "Party was not found", 404);
    if (input.clientId !== undefined) await this.validatePartyClient(firmId, input.clientId);
    return database.transaction(async (tx) => {
      const [row] = await returningMutation(
        tx
          .update(caseParties)
          .set({ ...normalizeEmpty(input), updatedAt: audit.occurredAt })
          .where(
            and(
              eq(caseParties.id, partyId),
              eq(caseParties.firmId, firmId),
              eq(caseParties.caseId, caseId),
              isNull(caseParties.deletedAt),
            ),
          ),
        () => tx.select().from(caseParties).where(eq(caseParties.id, partyId)).limit(1),
      );
      if (!row) throw new AppError("NOT_FOUND", "Party was not found", 404);
      await writeAudit(tx, audit, "case_party.updated", "case_parties", row.id, null);
      return toStaffPartyDto(row as unknown as Record<string, unknown>);
    });
  }

  async deleteParty(firmId: string, caseId: string, partyId: string, audit: AuditContext) {
    const existing = await this.getPartyRow(firmId, caseId, partyId);
    if (!existing) throw new AppError("NOT_FOUND", "Party was not found", 404);
    return database.transaction(async (tx) => {
      await tx
        .update(caseParties)
        .set({ deletedAt: audit.occurredAt, updatedAt: audit.occurredAt })
        .where(
          and(
            eq(caseParties.id, partyId),
            eq(caseParties.firmId, firmId),
            eq(caseParties.caseId, caseId),
            isNull(caseParties.deletedAt),
          ),
        );
      await writeAudit(tx, audit, "case_party.deleted", "case_parties", partyId, existing.name);
      return { id: partyId, deleted: true as const };
    });
  }

  private async getPartyRow(firmId: string, caseId: string, partyId: string) {
    const [row] = await database
      .select()
      .from(caseParties)
      .where(
        and(
          eq(caseParties.id, partyId),
          eq(caseParties.firmId, firmId),
          eq(caseParties.caseId, caseId),
          isNull(caseParties.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  private async assertCaseExists(firmId: string, caseId: string) {
    const [row] = await database
      .select({ id: cases.id })
      .from(cases)
      .where(and(eq(cases.id, caseId), eq(cases.firmId, firmId), isNull(cases.deletedAt)))
      .limit(1);
    if (!row) throw new AppError("NOT_FOUND", "Case was not found", 404);
  }

  private async validatePartyClient(firmId: string, clientId: string | null | undefined) {
    if (!clientId) return;
    const [row] = await database
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.firmId, firmId), isNull(clients.deletedAt)))
      .limit(1);
    if (!row) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Linked CRM client must belong to the same firm",
        400,
      );
    }
  }

  private async hydrateStaffCases(firmId: string, matters: CaseDto[]): Promise<CaseDto[]> {
    if (!matters.length) return [];
    const ids = matters.map((matter) => String(matter._id ?? matter.id));
    const [partyRows, nextHearings, nextTasks] = await Promise.all([
      this.listPartiesForCases(firmId, ids, false),
      this.nextHearingByCase(firmId, ids),
      this.nextTaskDueByCase(firmId, ids),
    ]);
    return matters.map((matter) => {
      const id = String(matter._id ?? matter.id);
      return toStaffCaseDto(matter as unknown as Record<string, unknown>, {
        teamMemberIds: matter.teamMemberIds,
        parties: partyRows.get(id) ?? [],
        nextHearing: nextHearings.get(id) ?? null,
        nextTaskDue: nextTasks.get(id) ?? null,
        client: matter.client,
        lawyer: matter.lawyer,
      });
    });
  }

  private async listPartiesForCases(firmId: string, caseIds: string[], clientVisibleOnly: boolean) {
    const grouped = new Map<string, ReturnType<typeof toStaffPartyDto>[]>();
    if (!caseIds.length) return grouped;
    const predicates = [
      eq(caseParties.firmId, firmId),
      inArray(caseParties.caseId, caseIds),
      isNull(caseParties.deletedAt),
    ];
    if (clientVisibleOnly) predicates.push(eq(caseParties.clientVisible, true));
    const rows = await database
      .select()
      .from(caseParties)
      .where(and(...predicates))
      .orderBy(asc(caseParties.sortOrder), asc(caseParties.createdAt));
    for (const row of rows) {
      const dto = toStaffPartyDto(row as unknown as Record<string, unknown>);
      grouped.set(dto.caseId, [...(grouped.get(dto.caseId) ?? []), dto]);
    }
    return grouped;
  }

  async listVisiblePartiesForCases(firmId: string, caseIds: string[]) {
    return this.listPartiesForCases(firmId, caseIds, true);
  }

  private async nextHearingByCase(firmId: string, caseIds: string[]) {
    const next = new Map<string, string | null>();
    if (!caseIds.length) return next;
    const today = new Date().toISOString().slice(0, 10);
    const rows = await database
      .select({
        caseId: hearings.caseId,
        dateGregorian: hearings.dateGregorian,
      })
      .from(hearings)
      .where(
        and(
          eq(hearings.firmId, firmId),
          inArray(hearings.caseId, caseIds),
          isNull(hearings.deletedAt),
          gte(hearings.dateGregorian, today),
          notInArray(hearings.status, [
            "completed",
            "cancelled",
            "archived",
            "dismissed",
            "settled",
            "final_judgment",
          ]),
        ),
      )
      .orderBy(asc(hearings.dateGregorian));
    for (const row of rows) {
      if (!next.has(row.caseId)) next.set(row.caseId, row.dateGregorian);
    }
    return next;
  }

  private async nextTaskDueByCase(firmId: string, caseIds: string[]) {
    const next = new Map<string, string | null>();
    if (!caseIds.length) return next;
    const rows = await database
      .select({
        caseId: tasks.caseId,
        dueDate: tasks.dueDate,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.firmId, firmId),
          inArray(tasks.caseId, caseIds),
          isNull(tasks.deletedAt),
          isNull(tasks.archivedAt),
          isNotNull(tasks.dueDate),
          inArray(tasks.status, ["todo", "in_progress"]),
        ),
      )
      .orderBy(asc(tasks.dueDate));
    for (const row of rows) {
      if (!row.caseId || next.has(row.caseId)) continue;
      next.set(row.caseId, row.dueDate ? row.dueDate.toISOString() : null);
    }
    return next;
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
        and(eq(clients.firmId, firmId), like(clients.email, normalized), isNull(clients.deletedAt)),
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
function requireSyncedTeam(input: Parameters<typeof syncCaseTeamMembers>[0]): string[] {
  const synced = syncCaseTeamMembers(input);
  if (!synced.ok) throw new AppError("VALIDATION_FAILED", synced.message, 400);
  return synced.teamMemberIds;
}
async function replaceCaseTeam(
  tx: Transaction,
  firmId: string,
  caseId: string,
  teamMemberIds: string[],
) {
  await tx
    .delete(caseTeamMembers)
    .where(and(eq(caseTeamMembers.firmId, firmId), eq(caseTeamMembers.caseId, caseId)));
  if (!teamMemberIds.length) return;
  await tx
    .insert(caseTeamMembers)
    .values(teamMemberIds.map((userId) => ({ firmId, caseId, userId })));
}
async function writeAudit(
  tx: Transaction,
  audit: AuditContext,
  action: string,
  resource: string,
  resourceId: string | null,
  details: string | null,
) {
  await writeAuditLog(tx, audit, action, resource, resourceId, details);
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
  return toStaffCaseDto(row as unknown as Record<string, unknown>, { teamMemberIds });
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
