import "server-only";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { auditLog, durableJobAttempts, durableJobs, durableSchedules } from "@/server/db/schema";
import type { DurableJobRecord, EnqueueJobInput, JobStatus, JobType } from "@/server/jobs/types";

export class PostgresJobRepository {
  private readonly database = getDatabase();

  async enqueue(input: EnqueueJobInput): Promise<{ job: DurableJobRecord; created: boolean }> {
    return this.database.transaction(async (transaction) => {
      const [created] = await transaction
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
        .onConflictDoNothing({
          target: [durableJobs.firmId, durableJobs.type, durableJobs.idempotencyKey],
        })
        .returning();
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
    const atIso = at.toISOString();
    return this.database.transaction(async (transaction) => {
      const exhausted = await transaction.execute<{
        id: string;
        firm_id: string;
        actor_user_id: string;
        total_attempts: number;
      }>(sql`
        UPDATE durable_jobs
        SET status = 'dead_letter', dead_lettered_at = ${atIso},
            last_error = 'Worker lease expired after final attempt',
            locked_at = NULL, locked_by = NULL, lease_expires_at = NULL, updated_at = ${atIso}
        WHERE status = 'processing' AND lease_expires_at <= ${atIso}
          AND attempts >= max_attempts AND deleted_at IS NULL
        RETURNING id, firm_id, actor_user_id, total_attempts
      `);
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
              eq(durableJobAttempts.attemptNumber, job.total_attempts),
              eq(durableJobAttempts.outcome, "processing"),
            ),
          );
        await writeAudit(transaction, {
          firmId: job.firm_id,
          actorUserId: job.actor_user_id,
          action: "job.dead_lettered",
          jobId: job.id,
          details: "lease expired after final attempt",
        });
      }

      const rows = await transaction.execute<Record<string, unknown>>(sql`
        WITH candidate AS (
          SELECT id FROM durable_jobs
          WHERE (
            (status IN ('pending', 'retry') AND available_at <= ${atIso})
            OR (status = 'processing' AND lease_expires_at <= ${atIso})
          )
          AND attempts < max_attempts AND deleted_at IS NULL
          ORDER BY priority ASC, available_at ASC, created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE durable_jobs AS job
        SET status = 'processing', attempts = job.attempts + 1,
            total_attempts = job.total_attempts + 1,
            locked_at = ${atIso}, locked_by = ${workerId},
            lease_expires_at = ${atIso}::timestamptz + make_interval(secs => job.timeout_seconds + 30),
            updated_at = ${atIso}
        FROM candidate
        WHERE job.id = candidate.id
        RETURNING job.*
      `);
      const row = rows[0];
      if (!row) return null;
      const claimed = mapRawJob(row);
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
    const [updated] = await this.database
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
      )
      .returning({ id: durableJobs.id });
    return Boolean(updated);
  }

  async complete(
    job: DurableJobRecord,
    workerId: string,
    result: Record<string, unknown>,
    at = new Date(),
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      const [completed] = await transaction
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
        )
        .returning({ id: durableJobs.id });
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
      const [updated] = await transaction
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
        )
        .returning({ id: durableJobs.id });
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
      const [updated] = await transaction
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
        .where(eq(durableJobs.id, job.id))
        .returning();
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
    const atIso = at.toISOString();
    return this.database.transaction(async (transaction) => {
      const due = await transaction.execute<{
        id: string;
        firm_id: string;
        job_type: JobType;
        payload: unknown;
        interval_seconds: number;
        next_run_at: string;
        actor_user_id: string;
        max_attempts: number;
        timeout_seconds: number;
      }>(sql`
        SELECT id, firm_id, job_type, payload, interval_seconds, next_run_at,
               actor_user_id, max_attempts, timeout_seconds
        FROM durable_schedules
        WHERE is_active = true AND next_run_at <= ${atIso} AND deleted_at IS NULL
        ORDER BY next_run_at
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      `);
      for (const schedule of due) {
        const dueAt = new Date(schedule.next_run_at);
        const idempotencyKey = `schedule:${schedule.id}:${dueAt.toISOString()}`;
        const [created] = await transaction
          .insert(durableJobs)
          .values({
            firmId: schedule.firm_id,
            type: schedule.job_type,
            idempotencyKey,
            payload: schedule.payload ?? {},
            actorUserId: schedule.actor_user_id,
            maxAttempts: schedule.max_attempts,
            timeoutSeconds: schedule.timeout_seconds,
            availableAt: at,
          })
          .onConflictDoNothing({
            target: [durableJobs.firmId, durableJobs.type, durableJobs.idempotencyKey],
          })
          .returning({ id: durableJobs.id });
        const nextRunAt = new Date(
          Math.max(dueAt.getTime() + schedule.interval_seconds * 1000, at.getTime() + 1000),
        );
        await transaction
          .update(durableSchedules)
          .set({ nextRunAt, lastEnqueuedAt: at, updatedAt: at })
          .where(eq(durableSchedules.id, schedule.id));
        if (created) {
          await writeAudit(transaction, {
            firmId: schedule.firm_id,
            actorUserId: schedule.actor_user_id,
            action: "job.enqueued",
            jobId: created.id,
            details: `schedule=${schedule.id}; type=${schedule.job_type}`,
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

function mapRawJob(row: Record<string, unknown>): DurableJobRecord {
  return {
    id: String(row.id),
    firmId: String(row.firm_id),
    type: String(row.type) as JobType,
    idempotencyKey: String(row.idempotency_key),
    payload: row.payload,
    status: String(row.status) as JobStatus,
    priority: Number(row.priority),
    attempts: Number(row.attempts),
    totalAttempts: Number(row.total_attempts),
    maxAttempts: Number(row.max_attempts),
    timeoutSeconds: Number(row.timeout_seconds),
    availableAt: new Date(String(row.available_at)),
    lockedAt: row.locked_at ? new Date(String(row.locked_at)) : null,
    lockedBy: row.locked_by ? String(row.locked_by) : null,
    leaseExpiresAt: row.lease_expires_at ? new Date(String(row.lease_expires_at)) : null,
    actorUserId: String(row.actor_user_id),
    correlationId: row.correlation_id ? String(row.correlation_id) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    result: row.result,
    completedAt: row.completed_at ? new Date(String(row.completed_at)) : null,
    deadLetteredAt: row.dead_lettered_at ? new Date(String(row.dead_lettered_at)) : null,
    manualRetryCount: Number(row.manual_retry_count),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}
