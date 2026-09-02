import { returningInsert } from "@/server/db/mysql-returning";
import { returningMutation } from "@/server/db/mysql-returning";
import "server-only";
import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { auditLog, durableJobAttempts, durableJobs, durableSchedules } from "@/server/db/schema";
import type { DurableJobRecord, EnqueueJobInput, JobStatus, JobType } from "@/server/jobs/types";

export class MySqlJobRepository {
  private readonly database = getDatabase();

  async enqueue(input: EnqueueJobInput): Promise<{ job: DurableJobRecord; created: boolean }> {
    return this.database.transaction(async (transaction) => {
      const [created] = await returningInsert(
        transaction
          .insert(durableJobs)
          .values({
            firmId: input.firmId,
            type: input.type,
            idempotencyKey: input.idempotencyKey,
            payload: input.payload ?? {},
            actorUserId: input.actorUserId,
            correlationId: input.correlationId,
            priority: input.priority ?? 100,
            maxAttempts: input.maxAttempts ?? 5,
            timeoutSeconds: input.timeoutSeconds ?? 300,
            availableAt: input.availableAt ?? new Date(),
          })
          .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } })
          .$returningId(),
        (id) => transaction.select().from(durableJobs).where(eq(durableJobs.id, id)).limit(1),
      );
      if (created) {
        await writeAudit(transaction, {
          firmId: created.firmId,
          actorUserId: created.actorUserId,
          action: "job.enqueued",
          jobId: created.id,
          details: `type=${created.type}; idempotency=${created.idempotencyKey}`,
        });
        return { job: mapJob(created), created: true };
      }
      const [existing] = await transaction
        .select()
        .from(durableJobs)
        .where(
          and(
            eq(durableJobs.firmId, input.firmId),
            eq(durableJobs.type, input.type),
            eq(durableJobs.idempotencyKey, input.idempotencyKey),
            isNull(durableJobs.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new Error("Idempotent job exists but could not be loaded");
      return { job: mapJob(existing), created: false };
    });
  }

  async claim(workerId: string, at = new Date()): Promise<DurableJobRecord | null> {
    return this.database.transaction(async (transaction) => {
      const exhausted = await transaction
        .select()
        .from(durableJobs)
        .where(
          and(
            eq(durableJobs.status, "processing"),
            lte(durableJobs.leaseExpiresAt, at),
            sql`${durableJobs.attempts} >= ${durableJobs.maxAttempts}`,
            isNull(durableJobs.deletedAt),
          ),
        )
        .for("update", { skipLocked: true });
      if (exhausted.length > 0) {
        await transaction
          .update(durableJobs)
          .set({
            status: "dead_letter",
            deadLetteredAt: at,
            lastError: "Worker lease expired after final attempt",
            lockedAt: null,
            lockedBy: null,
            leaseExpiresAt: null,
            updatedAt: at,
          })
          .where(
            inArray(
              durableJobs.id,
              exhausted.map((job) => job.id),
            ),
          );
      }
      for (const job of exhausted) {
        await transaction
          .update(durableJobAttempts)
          .set({
            outcome: "lease_expired",
            completedAt: at,
            error: "Worker lease expired",
            updatedAt: at,
          })
          .where(
            and(
              eq(durableJobAttempts.jobId, job.id),
              eq(durableJobAttempts.attemptNumber, job.totalAttempts),
              eq(durableJobAttempts.outcome, "processing"),
            ),
          );
        await writeAudit(transaction, {
          firmId: job.firmId,
          actorUserId: job.actorUserId,
          action: "job.dead_lettered",
          jobId: job.id,
          details: "lease expired after final attempt",
        });
      }

      const [candidate] = await transaction
        .select()
        .from(durableJobs)
        .where(
          and(
            or(
              and(
                inArray(durableJobs.status, ["pending", "retry"]),
                lte(durableJobs.availableAt, at),
              ),
              and(eq(durableJobs.status, "processing"), lte(durableJobs.leaseExpiresAt, at)),
            ),
            sql`${durableJobs.attempts} < ${durableJobs.maxAttempts}`,
            isNull(durableJobs.deletedAt),
          ),
        )
        .orderBy(durableJobs.priority, durableJobs.availableAt, durableJobs.createdAt)
        .limit(1)
        .for("update", { skipLocked: true });
      if (!candidate) return null;
      const claimedRow = {
        ...candidate,
        status: "processing" as const,
        attempts: candidate.attempts + 1,
        totalAttempts: candidate.totalAttempts + 1,
        lockedAt: at,
        lockedBy: workerId,
        leaseExpiresAt: new Date(at.getTime() + (candidate.timeoutSeconds + 30) * 1000),
        updatedAt: at,
      };
      await transaction.update(durableJobs).set(claimedRow).where(eq(durableJobs.id, candidate.id));
      const claimed = mapJob(claimedRow);
      await transaction
        .update(durableJobAttempts)
        .set({
          outcome: "lease_expired",
          completedAt: at,
          error: "Worker lease expired",
          updatedAt: at,
        })
        .where(
          and(
            eq(durableJobAttempts.jobId, claimed.id),
            eq(durableJobAttempts.outcome, "processing"),
          ),
        );
      await transaction.insert(durableJobAttempts).values({
        firmId: claimed.firmId,
        jobId: claimed.id,
        attemptNumber: claimed.totalAttempts,
        workerId,
        outcome: "processing",
        startedAt: at,
      });
      return claimed;
    });
  }

  async heartbeat(job: DurableJobRecord, workerId: string, at = new Date()): Promise<boolean> {
    const [updated] = await returningMutation(
      this.database
        .update(durableJobs)
        .set({
          leaseExpiresAt: new Date(at.getTime() + (job.timeoutSeconds + 30) * 1000),
          updatedAt: at,
        })
        .where(
          and(
            eq(durableJobs.id, job.id),
            eq(durableJobs.firmId, job.firmId),
            eq(durableJobs.status, "processing"),
            eq(durableJobs.lockedBy, workerId),
          ),
        ),
      () => this.database.select().from(durableJobs).where(eq(durableJobs.id, job.id)),
    );
    return Boolean(updated);
  }

  async complete(
    job: DurableJobRecord,
    workerId: string,
    result: Record<string, unknown>,
    at = new Date(),
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      const [completed] = await returningMutation(
        transaction
          .update(durableJobs)
          .set({
            status: "completed",
            result,
            completedAt: at,
            lastError: null,
            lockedAt: null,
            lockedBy: null,
            leaseExpiresAt: null,
            updatedAt: at,
          })
          .where(
            and(
              eq(durableJobs.id, job.id),
              eq(durableJobs.firmId, job.firmId),
              eq(durableJobs.status, "processing"),
              eq(durableJobs.lockedBy, workerId),
            ),
          ),
        () => transaction.select().from(durableJobs).where(eq(durableJobs.id, job.id)),
      );
      if (!completed) throw new Error("Job lease was lost before completion");
      await transaction
        .update(durableJobAttempts)
        .set({
          outcome: "completed",
          completedAt: at,
          durationMs: Math.max(0, at.getTime() - (job.lockedAt?.getTime() ?? at.getTime())),
          updatedAt: at,
        })
        .where(
          and(
            eq(durableJobAttempts.jobId, job.id),
            eq(durableJobAttempts.attemptNumber, job.totalAttempts),
          ),
        );
      await writeAudit(transaction, {
        firmId: job.firmId,
        actorUserId: job.actorUserId,
        action: "job.completed",
        jobId: job.id,
        details: `type=${job.type}; attempt=${job.attempts}`,
      });
    });
  }

  async fail(
    job: DurableJobRecord,
    workerId: string,
    error: string,
    permanent: boolean,
    at = new Date(),
  ): Promise<"retry" | "dead_letter"> {
    const deadLetter = permanent || job.attempts >= job.maxAttempts;
    const delayMs = Math.min(60 * 60_000, 30_000 * 2 ** Math.max(0, job.attempts - 1));
    const outcome = deadLetter ? "dead_letter" : "retry";
    await this.database.transaction(async (transaction) => {
      const [updated] = await returningMutation(
        transaction
          .update(durableJobs)
          .set({
            status: outcome,
            availableAt: deadLetter ? at : new Date(at.getTime() + delayMs),
            deadLetteredAt: deadLetter ? at : null,
            lastError: error.slice(0, 8_000),
            lockedAt: null,
            lockedBy: null,
            leaseExpiresAt: null,
            updatedAt: at,
          })
          .where(
            and(
              eq(durableJobs.id, job.id),
              eq(durableJobs.firmId, job.firmId),
              eq(durableJobs.status, "processing"),
              eq(durableJobs.lockedBy, workerId),
            ),
          ),
        () => transaction.select().from(durableJobs).where(eq(durableJobs.id, job.id)),
      );
      if (!updated) throw new Error("Job lease was lost before failure handling");
      await transaction
        .update(durableJobAttempts)
        .set({
          outcome,
          completedAt: at,
          durationMs: Math.max(0, at.getTime() - (job.lockedAt?.getTime() ?? at.getTime())),
          error: error.slice(0, 8_000),
          updatedAt: at,
        })
        .where(
          and(
            eq(durableJobAttempts.jobId, job.id),
            eq(durableJobAttempts.attemptNumber, job.totalAttempts),
          ),
        );
      await writeAudit(transaction, {
        firmId: job.firmId,
        actorUserId: job.actorUserId,
        action: deadLetter ? "job.dead_lettered" : "job.retry_scheduled",
        jobId: job.id,
        details: `type=${job.type}; attempt=${job.attempts}; error=${error.slice(0, 500)}`,
      });
    });
    return outcome;
  }

  async get(firmId: string, jobId: string): Promise<DurableJobRecord | null> {
    const [job] = await this.database
      .select()
      .from(durableJobs)
      .where(
        and(
          eq(durableJobs.id, jobId),
          eq(durableJobs.firmId, firmId),
          isNull(durableJobs.deletedAt),
        ),
      )
      .limit(1);
    return job ? mapJob(job) : null;
  }

  async list(firmId: string, statuses?: JobStatus[], limit = 50): Promise<DurableJobRecord[]> {
    const rows = await this.database
      .select()
      .from(durableJobs)
      .where(
        and(
          eq(durableJobs.firmId, firmId),
          isNull(durableJobs.deletedAt),
          statuses?.length ? inArray(durableJobs.status, statuses) : undefined,
        ),
      )
      .orderBy(asc(durableJobs.createdAt))
      .limit(Math.min(200, Math.max(1, limit)));
    return rows.map(mapJob);
  }

  async manualRetry(input: {
    firmId: string;
    jobId: string;
    actorUserId: string;
    reason: string;
  }): Promise<DurableJobRecord> {
    return this.database.transaction(async (transaction) => {
      const [job] = await transaction
        .select()
        .from(durableJobs)
        .where(and(eq(durableJobs.id, input.jobId), eq(durableJobs.firmId, input.firmId)))
        .limit(1);
      if (!job) throw new Error("Job was not found");
      if (job.status !== "dead_letter")
        throw new Error("Only dead-letter jobs can be retried manually");
      const at = new Date();
      const [updated] = await returningMutation(
        transaction
          .update(durableJobs)
          .set({
            status: "retry",
            attempts: 0,
            availableAt: at,
            lockedAt: null,
            lockedBy: null,
            leaseExpiresAt: null,
            deadLetteredAt: null,
            lastError: null,
            manualRetryCount: job.manualRetryCount + 1,
            lastManualRetryAt: at,
            lastManualRetryBy: input.actorUserId,
            updatedAt: at,
          })
          .where(eq(durableJobs.id, job.id)),
        () => transaction.select().from(durableJobs).where(eq(durableJobs.id, job.id)),
      );
      await writeAudit(transaction, {
        firmId: input.firmId,
        actorUserId: input.actorUserId,
        action: "job.manual_retry",
        jobId: job.id,
        details: input.reason.slice(0, 500),
      });
      return mapJob(updated);
    });
  }

  async enqueueDueSchedules(at = new Date(), limit = 100): Promise<number> {
    return this.database.transaction(async (transaction) => {
      const due = await transaction
        .select()
        .from(durableSchedules)
        .where(
          and(
            eq(durableSchedules.isActive, true),
            lte(durableSchedules.nextRunAt, at),
            isNull(durableSchedules.deletedAt),
          ),
        )
        .orderBy(durableSchedules.nextRunAt)
        .limit(limit)
        .for("update", { skipLocked: true });
      for (const schedule of due) {
        const dueAt = schedule.nextRunAt;
        const idempotencyKey = `schedule:${schedule.id}:${dueAt.toISOString()}`;
        const [created] = await returningInsert(
          transaction
            .insert(durableJobs)
            .values({
              firmId: schedule.firmId,
              type: schedule.jobType as JobType,
              idempotencyKey,
              payload: schedule.payload ?? {},
              actorUserId: schedule.actorUserId,
              maxAttempts: schedule.maxAttempts,
              timeoutSeconds: schedule.timeoutSeconds,
              availableAt: at,
            })
            .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } })
            .$returningId(),
          (id) => transaction.select().from(durableJobs).where(eq(durableJobs.id, id)).limit(1),
        );
        const nextRunAt = new Date(
          Math.max(dueAt.getTime() + schedule.intervalSeconds * 1000, at.getTime() + 1000),
        );
        await transaction
          .update(durableSchedules)
          .set({ nextRunAt, lastEnqueuedAt: at, updatedAt: at })
          .where(eq(durableSchedules.id, schedule.id));
        if (created) {
          await writeAudit(transaction, {
            firmId: schedule.firmId,
            actorUserId: schedule.actorUserId,
            action: "job.enqueued",
            jobId: created.id,
            details: `schedule=${schedule.id}; type=${schedule.jobType}`,
          });
        }
      }
      return due.length;
    });
  }
}

type Transaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];

async function writeAudit(
  transaction: Transaction,
  input: { firmId: string; actorUserId: string; action: string; jobId: string; details: string },
) {
  await transaction.insert(auditLog).values({
    firmId: input.firmId,
    userId: input.actorUserId,
    action: input.action,
    resource: "durable_jobs",
    resourceId: input.jobId,
    details: input.details,
    ipAddress: "background-worker",
  });
}

function mapJob(row: typeof durableJobs.$inferSelect): DurableJobRecord {
  return {
    id: row.id,
    firmId: row.firmId,
    type: row.type as JobType,
    idempotencyKey: row.idempotencyKey,
    payload: row.payload,
    status: row.status,
    priority: row.priority,
    attempts: row.attempts,
    totalAttempts: row.totalAttempts,
    maxAttempts: row.maxAttempts,
    timeoutSeconds: row.timeoutSeconds,
    availableAt: row.availableAt,
    lockedAt: row.lockedAt,
    lockedBy: row.lockedBy,
    leaseExpiresAt: row.leaseExpiresAt,
    actorUserId: row.actorUserId,
    correlationId: row.correlationId,
    lastError: row.lastError,
    result: row.result,
    completedAt: row.completedAt,
    deadLetteredAt: row.deadLetteredAt,
    manualRetryCount: row.manualRetryCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
