import { returningInsert, returningMutation } from "@/server/db/mysql-returning";
import "server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  auditLog,
  hearings,
  notifications,
  researchNotes,
  researchNoteTags,
  sopTemplates,
  sopTemplateTasks,
  taskComments,
  tasks,
  taskWatchers,
  users,
} from "@/server/db/schema";
import type { AuditContext } from "@/server/audit/context";
import type {
  HearingCreateInput,
  HearingListInput,
  HearingUpdateInput,
  ResearchCitation,
  ResearchCreateInput,
  ResearchUpdateInput,
  SopCreateInput,
  TaskCommentCreateInput,
  TaskCreateInput,
  TaskListInput,
  TaskUpdateInput,
} from "@/shared/contracts/work-management";
import { AppError } from "@/shared/errors/api-error";

const database = getDatabase();

export class MySqlWorkManagementRepository {
  // ── Hearings ────────────────────────────────────────────────────────────────

  async listHearings(firmId: string, filters: HearingListInput) {
    const predicates = [eq(hearings.firmId, firmId), isNull(hearings.deletedAt)];
    if (filters.caseId) predicates.push(eq(hearings.caseId, filters.caseId));
    const rows = await database
      .select()
      .from(hearings)
      .where(and(...predicates))
      .orderBy(asc(hearings.dateGregorian));
    return rows.map(toHearingDto);
  }

  async getHearing(firmId: string, hearingId: string) {
    const [row] = await database
      .select()
      .from(hearings)
      .where(
        and(eq(hearings.id, hearingId), eq(hearings.firmId, firmId), isNull(hearings.deletedAt)),
      )
      .limit(1);
    return row ? toHearingDto(row) : null;
  }

  async createHearing(firmId: string, input: HearingCreateInput, audit: AuditContext) {
    return database.transaction(async (tx) => {
      const [row] = await returningInsert(
        tx
          .insert(hearings)
          .values({ firmId, ...normalizeEmpty(input), status: "scheduled" })
          .$returningId(),
        (id) => tx.select().from(hearings).where(eq(hearings.id, id)).limit(1),
      );
      await writeAudit(tx, audit, "hearing.created", "hearings", row.id, row.court);
      return toHearingDto(row);
    });
  }

  async updateHearing(
    firmId: string,
    hearingId: string,
    input: HearingUpdateInput,
    audit: AuditContext,
  ) {
    return database.transaction(async (tx) => {
      const [row] = await returningMutation(
        tx
          .update(hearings)
          .set({ ...normalizeEmpty(input), updatedAt: audit.occurredAt })
          .where(
            and(
              eq(hearings.id, hearingId),
              eq(hearings.firmId, firmId),
              isNull(hearings.deletedAt),
            ),
          ),
        () => tx.select().from(hearings).where(eq(hearings.id, hearingId)),
      );
      if (!row) throw new AppError("NOT_FOUND", "Hearing was not found", 404);
      await writeAudit(tx, audit, "hearing.updated", "hearings", row.id, null);
      return toHearingDto(row);
    });
  }

  // ── Tasks ───────────────────────────────────────────────────────────────────

  async listTasks(firmId: string, filters: TaskListInput) {
    const predicates = [eq(tasks.firmId, firmId), isNull(tasks.deletedAt)];
    if (filters.caseId) predicates.push(eq(tasks.caseId, filters.caseId));
    if (filters.assignedTo) predicates.push(eq(tasks.assignedTo, filters.assignedTo));
    if (filters.status) predicates.push(eq(tasks.status, filters.status));
    if (filters.hearingId) predicates.push(eq(tasks.hearingId, filters.hearingId));
    if (filters.parentTaskId) predicates.push(eq(tasks.parentTaskId, filters.parentTaskId));
    if (!filters.includeArchived) predicates.push(isNull(tasks.archivedAt));
    const rows = await database
      .select()
      .from(tasks)
      .where(and(...predicates))
      .orderBy(desc(tasks.createdAt));
    return Promise.all(rows.map((row) => this.attachWatchers(row)));
  }

  async getTask(firmId: string, taskId: string) {
    const [row] = await database
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.firmId, firmId), isNull(tasks.deletedAt)))
      .limit(1);
    if (!row) return null;
    return this.attachWatchers(row);
  }

  async createTask(firmId: string, input: TaskCreateInput, audit: AuditContext) {
    await this.validateTaskRelationships(firmId, input.assignedTo, input.caseId ?? null);
    return database.transaction(async (tx) => {
      const { watchers, ...rest } = input;
      const [row] = await returningInsert(
        tx
          .insert(tasks)
          .values({
            firmId,
            ...normalizeEmpty(rest),
            dueDate: toTimestamp(rest.dueDate),
            reminderAt: toTimestamp(rest.reminderAt),
            isRecurring: rest.isRecurring ?? false,
            clientVisible: rest.clientVisible ?? false,
            createdBy: audit.actorId,
          })
          .$returningId(),
        (id) => tx.select().from(tasks).where(eq(tasks.id, id)).limit(1),
      );
      if (watchers?.length) {
        await tx
          .insert(taskWatchers)
          .values([...new Set(watchers)].map((userId) => ({ firmId, taskId: row.id, userId })));
      }
      await writeAudit(tx, audit, "task.created", "tasks", row.id, row.title);
      await tx.insert(notifications).values({
        firmId,
        userId: row.assignedTo,
        title: "New task assigned",
        body: row.title,
        type: "task_due",
        relatedId: row.id,
        link: `/staff/tasks`,
      });
      return this.attachWatchers(row);
    });
  }

  async updateTask(firmId: string, taskId: string, input: TaskUpdateInput, audit: AuditContext) {
    const existing = await this.getTask(firmId, taskId);
    if (!existing) throw new AppError("NOT_FOUND", "Task was not found", 404);
    if (input.assignedTo && input.assignedTo !== existing.assignedTo)
      await this.validateTaskRelationships(firmId, input.assignedTo, null);
    return database.transaction(async (tx) => {
      const { watchers, ...rest } = input;
      const completedAt =
        rest.status === "done" && existing.status !== "done" ? audit.occurredAt : undefined;
      const [row] = await returningMutation(
        tx
          .update(tasks)
          .set({
            ...normalizeEmpty(rest),
            dueDate: toTimestamp(rest.dueDate),
            reminderAt: toTimestamp(rest.reminderAt),
            ...(completedAt ? { completedAt } : {}),
            updatedAt: audit.occurredAt,
          })
          .where(and(eq(tasks.id, taskId), eq(tasks.firmId, firmId), isNull(tasks.deletedAt))),
        () => tx.select().from(tasks).where(eq(tasks.id, taskId)),
      );
      if (!row) throw new AppError("NOT_FOUND", "Task was not found", 404);
      if (watchers !== undefined) {
        await tx
          .delete(taskWatchers)
          .where(and(eq(taskWatchers.firmId, firmId), eq(taskWatchers.taskId, taskId)));
        if (watchers.length)
          await tx
            .insert(taskWatchers)
            .values([...new Set(watchers)].map((userId) => ({ firmId, taskId, userId })));
      }
      await writeAudit(tx, audit, "task.updated", "tasks", row.id, null);
      return this.attachWatchers(row);
    });
  }

  async archiveTask(firmId: string, taskId: string, audit: AuditContext) {
    return database.transaction(async (tx) => {
      const [row] = await returningMutation(
        tx
          .update(tasks)
          .set({ archivedAt: audit.occurredAt, updatedAt: audit.occurredAt })
          .where(and(eq(tasks.id, taskId), eq(tasks.firmId, firmId), isNull(tasks.deletedAt))),
        () => tx.select().from(tasks).where(eq(tasks.id, taskId)),
      );
      if (!row) throw new AppError("NOT_FOUND", "Task was not found", 404);
      await writeAudit(tx, audit, "task.archived", "tasks", row.id, null);
      return { success: true };
    });
  }

  async restoreTask(firmId: string, taskId: string, audit: AuditContext) {
    return database.transaction(async (tx) => {
      const [row] = await returningMutation(
        tx
          .update(tasks)
          .set({ archivedAt: null, updatedAt: audit.occurredAt })
          .where(and(eq(tasks.id, taskId), eq(tasks.firmId, firmId), isNull(tasks.deletedAt))),
        () => tx.select().from(tasks).where(eq(tasks.id, taskId)),
      );
      if (!row) throw new AppError("NOT_FOUND", "Task was not found", 404);
      await writeAudit(tx, audit, "task.restored", "tasks", row.id, null);
      return { success: true };
    });
  }

  async deleteTask(firmId: string, taskId: string, audit: AuditContext) {
    return database.transaction(async (tx) => {
      const [row] = await returningMutation(
        tx
          .update(tasks)
          .set({ deletedAt: audit.occurredAt, updatedAt: audit.occurredAt })
          .where(and(eq(tasks.id, taskId), eq(tasks.firmId, firmId), isNull(tasks.deletedAt))),
        () => tx.select().from(tasks).where(eq(tasks.id, taskId)),
      );
      if (!row) throw new AppError("NOT_FOUND", "Task was not found", 404);
      await writeAudit(tx, audit, "task.deleted", "tasks", row.id, null);
      return { success: true };
    });
  }

  async listWorkload(firmId: string) {
    const rows = await database
      .select({
        id: tasks.id,
        assignedTo: tasks.assignedTo,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
      })
      .from(tasks)
      .where(and(eq(tasks.firmId, firmId), isNull(tasks.deletedAt), isNull(tasks.archivedAt)));
    const byAssignee = new Map<
      string,
      { assignedTo: string; total: number; urgent: number; overdue: number }
    >();
    const now = new Date();
    for (const row of rows) {
      const entry = byAssignee.get(row.assignedTo) ?? {
        assignedTo: row.assignedTo,
        total: 0,
        urgent: 0,
        overdue: 0,
      };
      entry.total += 1;
      if (row.priority === "urgent") entry.urgent += 1;
      const open = row.status === "todo" || row.status === "in_progress";
      if (open && row.dueDate && row.dueDate.getTime() < now.getTime()) entry.overdue += 1;
      byAssignee.set(row.assignedTo, entry);
    }
    return [...byAssignee.values()].sort((a, b) => b.total - a.total);
  }

  // ── SOP Templates ────────────────────────────────────────────────────────────

  async listSopTemplates(firmId: string, practiceArea?: string) {
    const predicates = [eq(sopTemplates.firmId, firmId), isNull(sopTemplates.deletedAt)];
    if (practiceArea) predicates.push(eq(sopTemplates.practiceArea, practiceArea));
    const rows = await database
      .select()
      .from(sopTemplates)
      .where(and(...predicates))
      .orderBy(asc(sopTemplates.label));
    const ids = rows.map((r) => r.id);
    const taskRows = ids.length
      ? await database
          .select()
          .from(sopTemplateTasks)
          .where(
            and(eq(sopTemplateTasks.firmId, firmId), inArray(sopTemplateTasks.sopTemplateId, ids)),
          )
          .orderBy(asc(sopTemplateTasks.position))
      : [];
    const byTemplate = new Map<string, string[]>();
    for (const t of taskRows) {
      byTemplate.set(t.sopTemplateId, [...(byTemplate.get(t.sopTemplateId) ?? []), t.title]);
    }
    return rows.map((row) => ({ ...toDto(row), taskTitles: byTemplate.get(row.id) ?? [] }));
  }

  async createSopTemplate(firmId: string, input: SopCreateInput, audit: AuditContext) {
    return database.transaction(async (tx) => {
      const [row] = await returningInsert(
        tx
          .insert(sopTemplates)
          .values({
            firmId,
            key: input.key,
            label: input.label,
            defaultPriority: input.defaultPriority,
            practiceArea: input.practiceArea ?? null,
          })
          .$returningId(),
        (id) => tx.select().from(sopTemplates).where(eq(sopTemplates.id, id)).limit(1),
      );
      await tx.insert(sopTemplateTasks).values(
        input.taskTitles.map((title, position) => ({
          firmId,
          sopTemplateId: row.id,
          title,
          position,
        })),
      );
      await writeAudit(tx, audit, "sop.created", "sop_templates", row.id, row.key);
      return { ...toDto(row), taskTitles: input.taskTitles };
    });
  }

  async runSop(
    firmId: string,
    input: { templateKey: string; caseId: string; assignedTo?: string | null },
    audit: AuditContext,
  ) {
    const [template] = await database
      .select()
      .from(sopTemplates)
      .where(
        and(
          eq(sopTemplates.firmId, firmId),
          eq(sopTemplates.key, input.templateKey),
          isNull(sopTemplates.deletedAt),
        ),
      )
      .limit(1);
    if (!template) throw new AppError("NOT_FOUND", "SOP template was not found", 404);
    const templateTasks = await database
      .select()
      .from(sopTemplateTasks)
      .where(
        and(eq(sopTemplateTasks.firmId, firmId), eq(sopTemplateTasks.sopTemplateId, template.id)),
      )
      .orderBy(asc(sopTemplateTasks.position));
    const assignedTo = input.assignedTo ?? audit.actorId;
    let created = 0;
    let skipped = 0;
    await database.transaction(async (tx) => {
      for (const t of templateTasks) {
        const existing = await tx
          .select({ id: tasks.id })
          .from(tasks)
          .where(
            and(
              eq(tasks.firmId, firmId),
              eq(tasks.caseId, input.caseId),
              eq(tasks.title, t.title),
              isNull(tasks.deletedAt),
            ),
          )
          .limit(1);
        if (existing.length) {
          skipped += 1;
          continue;
        }
        await tx.insert(tasks).values({
          firmId,
          caseId: input.caseId,
          title: t.title,
          assignedTo,
          createdBy: audit.actorId,
          priority: template.defaultPriority,
          status: "todo",
          isRecurring: false,
          clientVisible: false,
        });
        created += 1;
      }
      await writeAudit(tx, audit, "sop.run", "sop_templates", template.id, `created=${created}`);
    });
    return { created, skipped, label: template.label };
  }

  async createHearingPrepTasks(
    firmId: string,
    input: { hearingId: string; assignedTo?: string | null },
    audit: AuditContext,
  ) {
    const [hearing] = await database
      .select()
      .from(hearings)
      .where(
        and(
          eq(hearings.id, input.hearingId),
          eq(hearings.firmId, firmId),
          isNull(hearings.deletedAt),
        ),
      )
      .limit(1);
    if (!hearing) throw new AppError("NOT_FOUND", "Hearing was not found", 404);
    const prepTitles = [
      "Prepare case file",
      "Review evidence",
      "Confirm court attendance",
      "Brief client",
    ];
    const assignedTo = input.assignedTo ?? audit.actorId;
    let created = 0;
    let skipped = 0;
    await database.transaction(async (tx) => {
      for (const title of prepTitles) {
        const existing = await tx
          .select({ id: tasks.id })
          .from(tasks)
          .where(
            and(
              eq(tasks.firmId, firmId),
              eq(tasks.hearingId, input.hearingId),
              eq(tasks.title, title),
              isNull(tasks.deletedAt),
            ),
          )
          .limit(1);
        if (existing.length) {
          skipped += 1;
          continue;
        }
        await tx.insert(tasks).values({
          firmId,
          caseId: hearing.caseId,
          hearingId: input.hearingId,
          title,
          assignedTo,
          createdBy: audit.actorId,
          priority: "high",
          status: "todo",
          isRecurring: false,
          clientVisible: false,
        });
        created += 1;
      }
      await writeAudit(
        tx,
        audit,
        "hearing.prep_tasks_created",
        "hearings",
        input.hearingId,
        `created=${created}`,
      );
    });
    return { created, skipped };
  }

  // ── Task Comments ────────────────────────────────────────────────────────────

  async listComments(firmId: string, taskId: string) {
    const rows = await database
      .select()
      .from(taskComments)
      .where(
        and(
          eq(taskComments.firmId, firmId),
          eq(taskComments.taskId, taskId),
          isNull(taskComments.deletedAt),
        ),
      )
      .orderBy(asc(taskComments.createdAt));
    return rows.map(toDto);
  }

  async addComment(firmId: string, input: TaskCommentCreateInput, audit: AuditContext) {
    const [task] = await database
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, input.taskId), eq(tasks.firmId, firmId), isNull(tasks.deletedAt)))
      .limit(1);
    if (!task) throw new AppError("NOT_FOUND", "Task was not found", 404);
    return database.transaction(async (tx) => {
      const [row] = await returningInsert(
        tx
          .insert(taskComments)
          .values({ firmId, taskId: input.taskId, authorId: audit.actorId, content: input.content })
          .$returningId(),
        (id) => tx.select().from(taskComments).where(eq(taskComments.id, id)).limit(1),
      );
      await writeAudit(tx, audit, "task.comment_added", "task_comments", row.id, null);
      return toDto(row);
    });
  }

  // ── Research Notes ───────────────────────────────────────────────────────────

  async listResearchNotes(firmId: string) {
    const rows = await database
      .select()
      .from(researchNotes)
      .where(and(eq(researchNotes.firmId, firmId), isNull(researchNotes.deletedAt)))
      .orderBy(desc(researchNotes.createdAt));
    return Promise.all(rows.map((row) => this.attachTags(row)));
  }

  async getResearchNote(firmId: string, noteId: string) {
    const [row] = await database
      .select()
      .from(researchNotes)
      .where(
        and(
          eq(researchNotes.id, noteId),
          eq(researchNotes.firmId, firmId),
          isNull(researchNotes.deletedAt),
        ),
      )
      .limit(1);
    if (!row) return null;
    return this.attachTags(row);
  }

  async createResearchNote(firmId: string, input: ResearchCreateInput, audit: AuditContext) {
    return database.transaction(async (tx) => {
      const [row] = await returningInsert(
        tx
          .insert(researchNotes)
          .values({
            firmId,
            title: input.title,
            category: input.category,
            content: input.content,
            authorId: audit.actorId,
            caseId: input.caseId ?? null,
            ...citationColumns(input.citation),
          })
          .$returningId(),
        (id) => tx.select().from(researchNotes).where(eq(researchNotes.id, id)).limit(1),
      );
      if (input.tags.length)
        await tx
          .insert(researchNoteTags)
          .values(input.tags.map((tag) => ({ firmId, researchNoteId: row.id, tag })));
      await writeAudit(tx, audit, "research.created", "research_notes", row.id, row.title);
      return this.attachTags(row);
    });
  }

  async updateResearchNote(
    firmId: string,
    noteId: string,
    input: ResearchUpdateInput,
    audit: AuditContext,
  ) {
    // `tags` lives in its own table, so it is replaced after the row update rather than set on it.
    const scalars = normalizeEmpty({
      title: input.title,
      category: input.category,
      content: input.content,
      caseId: input.caseId,
    });
    return database.transaction(async (tx) => {
      const [row] = await returningMutation(
        tx
          .update(researchNotes)
          .set({
            ...scalars,
            ...(input.citation === undefined ? {} : citationColumns(input.citation)),
            updatedAt: audit.occurredAt,
          })
          .where(
            and(
              eq(researchNotes.id, noteId),
              eq(researchNotes.firmId, firmId),
              isNull(researchNotes.deletedAt),
            ),
          ),
        () => tx.select().from(researchNotes).where(eq(researchNotes.id, noteId)),
      );
      if (!row) throw new AppError("NOT_FOUND", "Research note was not found", 404);
      if (input.tags !== undefined) {
        await tx
          .delete(researchNoteTags)
          .where(
            and(eq(researchNoteTags.firmId, firmId), eq(researchNoteTags.researchNoteId, noteId)),
          );
        if (input.tags.length)
          await tx
            .insert(researchNoteTags)
            .values(input.tags.map((tag) => ({ firmId, researchNoteId: noteId, tag })));
      }
      await writeAudit(tx, audit, "research.updated", "research_notes", row.id, null);
      return this.attachTags(row);
    });
  }

  async deleteResearchNote(firmId: string, noteId: string, audit: AuditContext) {
    return database.transaction(async (tx) => {
      const [row] = await returningMutation(
        tx
          .update(researchNotes)
          .set({ deletedAt: audit.occurredAt, updatedAt: audit.occurredAt })
          .where(
            and(
              eq(researchNotes.id, noteId),
              eq(researchNotes.firmId, firmId),
              isNull(researchNotes.deletedAt),
            ),
          ),
        () => tx.select().from(researchNotes).where(eq(researchNotes.id, noteId)),
      );
      if (!row) throw new AppError("NOT_FOUND", "Research note was not found", 404);
      await writeAudit(tx, audit, "research.deleted", "research_notes", row.id, null);
      return { success: true };
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async attachWatchers(row: typeof tasks.$inferSelect) {
    const watchers = await database
      .select({ userId: taskWatchers.userId })
      .from(taskWatchers)
      .where(and(eq(taskWatchers.firmId, row.firmId), eq(taskWatchers.taskId, row.id)));
    return { ...toDto(row), watchers: watchers.map((w) => w.userId) };
  }

  private async attachTags(row: typeof researchNotes.$inferSelect) {
    const tags = await database
      .select({ tag: researchNoteTags.tag })
      .from(researchNoteTags)
      .where(
        and(eq(researchNoteTags.firmId, row.firmId), eq(researchNoteTags.researchNoteId, row.id)),
      );
    const { citationNkpNo, citationDecisionNo, citationBench, ...dto } = toDto(row);
    return {
      ...dto,
      tags: tags.map((t) => t.tag),
      citation:
        citationNkpNo || citationDecisionNo || citationBench
          ? { nkpNo: citationNkpNo, decisionNo: citationDecisionNo, bench: citationBench }
          : null,
    };
  }

  private async validateTaskRelationships(
    firmId: string,
    assignedTo: string,
    caseId: string | null,
  ) {
    const [assignee] = await database
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(
        and(
          eq(users.id, assignedTo),
          eq(users.firmId, firmId),
          eq(users.isActive, true),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    if (!assignee)
      throw new AppError(
        "VALIDATION_FAILED",
        "Assigned user must be an active member of the firm",
        400,
      );
    if (caseId) {
      const { cases } = await import("@/server/db/schema");
      const [c] = await database
        .select({ id: cases.id })
        .from(cases)
        .where(and(eq(cases.id, caseId), eq(cases.firmId, firmId), isNull(cases.deletedAt)))
        .limit(1);
      if (!c) throw new AppError("VALIDATION_FAILED", "Case must belong to the same firm", 400);
    }
  }

  async scanOverdueReminders(firmId: string, audit: AuditContext) {
    const now = audit.occurredAt;
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const due = await database
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.firmId, firmId),
          inArray(tasks.status, ["todo", "in_progress"]),
          isNull(tasks.deletedAt),
          isNull(tasks.archivedAt),
        ),
      )
      .limit(1000);
    let sent = 0;
    for (const task of due) {
      if (!task.dueDate) continue;
      const dueDateIso = task.dueDate.toISOString().slice(0, 10);
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate.getTime() > todayStart.getTime()) continue;
      if (task.lastDueReminderAt) {
        const last = new Date(task.lastDueReminderAt);
        if (!Number.isNaN(last.valueOf()) && last.toDateString() === now.toDateString()) continue;
      }
      await database.transaction(async (tx) => {
        await tx.insert(notifications).values({
          firmId,
          userId: task.assignedTo,
          title: "Task due / overdue",
          body: `"${task.title}" is due or overdue (${task.dueDateBs || dueDateIso}).`,
          type: "task_due",
          relatedId: task.id,
          link: `/staff/tasks?task=${task.id}`,
        });
        await tx
          .update(tasks)
          .set({ lastDueReminderAt: now, updatedAt: now })
          .where(eq(tasks.id, task.id));
        await writeAudit(tx, audit, "task.overdue_reminder", "tasks", task.id, null);
      });
      sent += 1;
    }
    return { sent };
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

/** Contracts carry timestamps as ISO strings; the columns are `timestamptz`. */
function toTimestamp(value: string | null | undefined) {
  if (value === undefined) return undefined;
  return value === null ? null : new Date(value);
}

function normalizeEmpty<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).map(([k, v]) => [k, v === "" ? null : v])) as T;
}

/** Shape a row takes on the wire: dates serialized and internal columns stripped. */
type RowDto<T> = Omit<
  { [K in keyof T]: Date extends T[K] ? Exclude<T[K], Date> | string : T[K] },
  "firmId" | "legacyConvexId" | "deletedAt"
> & { _id: string };

function toDto<T extends Record<string, unknown>>(row: T): RowDto<T> {
  const output: Record<string, unknown> = { ...row, _id: row.id };
  for (const [key, value] of Object.entries(output)) {
    if (value instanceof Date) {
      output[key] = value.toISOString();
    }
  }
  delete output.firmId;
  delete output.legacyConvexId;
  delete output.deletedAt;
  return output as RowDto<T>;
}

function citationColumns(citation: ResearchCitation | null | undefined) {
  return {
    citationNkpNo: citation?.nkpNo?.trim() || null,
    citationDecisionNo: citation?.decisionNo?.trim() || null,
    citationBench: citation?.bench?.trim() || null,
  };
}

function toHearingDto(row: typeof hearings.$inferSelect) {
  const dto = toDto(row);
  const rawTime = row.hearingTime == null ? null : String(row.hearingTime);
  const time = rawTime ? rawTime.slice(0, 5) : null;
  return { ...dto, hearingTime: time, time };
}
