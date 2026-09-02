import { returningInsert } from "@/server/db/mysql-returning";
import { randomUUID } from "node:crypto";
import { and, count, eq, sql } from "drizzle-orm";
import {
  auditLog,
  durableJobAttempts,
  durableJobEffects,
  durableJobs,
  durableSchedules,
  firms,
  users,
} from "../../src/server/db/schema";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { RetryableJobError } from "../../src/server/jobs/errors";
import { createJobHandlers } from "../../src/server/jobs/handlers";
import { MySqlJobRepository } from "../../src/server/jobs/job-repository";
import { DurableJobWorker } from "../../src/server/jobs/job-worker";

const firmId = "61000000-0000-4000-8000-000000000001";
const actorUserId = "62000000-0000-4000-8000-000000000001";
const database = getDatabase();
const repository = new MySqlJobRepository();
const suffix = randomUUID();

await database
  .insert(firms)
  .values({ id: firmId, name: "Phase 6 Firm A", slug: "phase-6-firm-a" })
  .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } });
await database
  .insert(users)
  .values({
    id: actorUserId,
    firmId,
    tokenIdentifier: "phase6:user-a",
    name: "Phase 6 User A",
    email: "phase6-a@example.invalid",
    role: "admin",
    isActive: true,
    isPending: false,
  })
  .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } });

// Isolate this proof from leftover due schedules / pending jobs in the local DB.
await database
  .update(durableSchedules)
  .set({ nextRunAt: new Date(Date.now() + 86_400_000), updatedAt: new Date() });
await database
  .update(durableJobs)
  .set({ availableAt: new Date(Date.now() + 86_400_000), updatedAt: new Date() })
  .where(sql`${durableJobs.status} in ('pending', 'retry', 'processing')`);

const evidence = {
  idempotentEnqueue: false,
  retryBackoff: false,
  deadLetter: false,
  manualRetryRecoverable: false,
  noDuplicateSideEffects: false,
  leaseRecovery: false,
  scheduleExactlyOnce: false,
  sideEffectRuns: 0,
};

const first = await repository.enqueue({
  firmId,
  actorUserId,
  type: "analytics.aggregate",
  idempotencyKey: `phase7-idempotency-${suffix}`,
});
const duplicate = await repository.enqueue({
  firmId,
  actorUserId,
  type: "analytics.aggregate",
  idempotencyKey: `phase7-idempotency-${suffix}`,
});
if (!first.created || duplicate.created || first.job.id !== duplicate.job.id) {
  throw new Error("Queue idempotency verification failed");
}
evidence.idempotentEnqueue = true;

const productionWorker = new DurableJobWorker(
  repository,
  createJobHandlers(),
  `phase7-production-${suffix}`,
);
if ((await productionWorker.runOnce()) !== "completed") {
  throw new Error("Analytics job did not complete");
}
{
  const completed = await repository.get(firmId, first.job.id);
  if (completed?.status !== "completed") {
    throw new Error("Idempotent analytics job was not the completed job");
  }
}

const retryJob = await repository.enqueue({
  firmId,
  actorUserId,
  type: "communication.sms",
  idempotencyKey: `phase7-retry-${suffix}`,
  maxAttempts: 2,
});
const retryWorker = new DurableJobWorker(
  repository,
  new Map([
    [
      "communication.sms",
      async () => {
        throw new RetryableJobError("simulated transient SMS outage");
      },
    ],
  ]),
  `phase7-retry-${suffix}`,
);
if ((await retryWorker.runOnce()) !== "retry") throw new Error("Retryable job was not retried");
evidence.retryBackoff = true;
await database
  .update(durableJobs)
  .set({ availableAt: new Date() })
  .where(eq(durableJobs.id, retryJob.job.id));
if ((await retryWorker.runOnce()) !== "dead_letter") {
  throw new Error("Exhausted retryable job was not dead-lettered");
}
evidence.deadLetter = true;

const manuallyRetried = await repository.manualRetry({
  firmId,
  jobId: retryJob.job.id,
  actorUserId,
  reason: "Phase 7 manual recovery verification",
});
if (manuallyRetried.status !== "retry" || manuallyRetried.manualRetryCount !== 1) {
  throw new Error("Manual dead-letter retry verification failed");
}
await database
  .update(durableJobs)
  .set({ availableAt: new Date() })
  .where(eq(durableJobs.id, retryJob.job.id));
if (
  (await new DurableJobWorker(
    repository,
    createJobHandlers(),
    `phase7-blocked-${suffix}`,
  ).runOnce()) !== "dead_letter"
) {
  throw new Error("Unconfigured SMS provider did not fail closed");
}

// R4.7: dead-letter → manual retry → successful completion with a single durable effect.
const effectKey = `r47-side-effect-${suffix}`;
let handlerPasses = 0;
const recovery = await repository.enqueue({
  firmId,
  actorUserId,
  type: "reminder.task",
  idempotencyKey: `phase7-recover-${suffix}`,
  maxAttempts: 2,
  payload: { marker: suffix },
});
const recoveryWorker = new DurableJobWorker(
  repository,
  new Map([
    [
      "reminder.task",
      async ({ job }) => {
        handlerPasses += 1;
        if (handlerPasses <= 2) {
          throw new RetryableJobError("simulated recovery failure");
        }
        const [effect] = await returningInsert(
          database
            .insert(durableJobEffects)
            .values({
              firmId: job.firmId,
              jobId: job.id,
              effectKey,
              details: { pass: handlerPasses },
            })
            .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } })
            .$returningId(),
          (id) =>
            database.select().from(durableJobEffects).where(eq(durableJobEffects.id, id)).limit(1),
        );
        // Re-run after recovery must not insert a second effect row.
        await database
          .insert(durableJobEffects)
          .values({
            firmId: job.firmId,
            jobId: job.id,
            effectKey,
            details: { pass: handlerPasses, replay: true },
          })
          .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } });
        return { recovered: true, effectInserted: Boolean(effect) };
      },
    ],
  ]),
  `phase7-recover-${suffix}`,
);
if ((await recoveryWorker.runOnce()) !== "retry") {
  throw new Error("Recovery job first failure was not retried");
}
await database
  .update(durableJobs)
  .set({ availableAt: new Date() })
  .where(eq(durableJobs.id, recovery.job.id));
if ((await recoveryWorker.runOnce()) !== "dead_letter") {
  throw new Error("Recovery job was not dead-lettered before manual retry");
}
await repository.manualRetry({
  firmId,
  jobId: recovery.job.id,
  actorUserId,
  reason: "R4.7 dead-letter recovery with single side effect",
});
await database
  .update(durableJobs)
  .set({ availableAt: new Date() })
  .where(eq(durableJobs.id, recovery.job.id));
if ((await recoveryWorker.runOnce()) !== "completed") {
  throw new Error("Dead-letter job did not complete after manual retry");
}
const [effectRows] = await database
  .select({ value: count() })
  .from(durableJobEffects)
  .where(
    and(eq(durableJobEffects.jobId, recovery.job.id), eq(durableJobEffects.effectKey, effectKey)),
  );
evidence.sideEffectRuns = effectRows.value;
if (effectRows.value !== 1) {
  throw new Error(`Expected exactly one durable side effect, got ${effectRows.value}`);
}
evidence.manualRetryRecoverable = true;
evidence.noDuplicateSideEffects = true;

const leaseJob = await repository.enqueue({
  firmId,
  actorUserId,
  type: "analytics.aggregate",
  idempotencyKey: `phase7-lease-${suffix}`,
  maxAttempts: 2,
});
const abandoned = await repository.claim(`phase7-abandoned-${suffix}`);
if (abandoned?.id !== leaseJob.job.id) throw new Error("Lease verification claimed the wrong job");
await database
  .update(durableJobs)
  .set({ leaseExpiresAt: new Date(Date.now() - 1000) })
  .where(eq(durableJobs.id, leaseJob.job.id));
if (
  (await new DurableJobWorker(
    repository,
    createJobHandlers(),
    `phase7-recovery-${suffix}`,
  ).runOnce()) !== "completed"
) {
  throw new Error("Expired lease was not recovered");
}
const leaseAttempts = await database
  .select({ outcome: durableJobAttempts.outcome })
  .from(durableJobAttempts)
  .where(eq(durableJobAttempts.jobId, leaseJob.job.id));
if (!leaseAttempts.some((attempt) => attempt.outcome === "lease_expired")) {
  throw new Error("Expired lease attempt was not recorded");
}
evidence.leaseRecovery = true;

const scheduleName = `phase7-verification-${suffix}`;
await database.insert(durableSchedules).values({
  firmId,
  actorUserId,
  name: scheduleName,
  jobType: "analytics.aggregate",
  intervalSeconds: 3600,
  nextRunAt: new Date(Date.now() - 1000),
});
if ((await repository.enqueueDueSchedules()) !== 1) {
  throw new Error("Due schedule did not enqueue exactly once");
}
if ((await repository.enqueueDueSchedules()) !== 0) {
  throw new Error("Schedule was enqueued twice for the same due time");
}
evidence.scheduleExactlyOnce = true;
if (
  (await new DurableJobWorker(
    repository,
    createJobHandlers(),
    `phase7-schedule-${suffix}`,
  ).runOnce()) !== "completed"
) {
  throw new Error("Scheduled analytics job did not complete");
}

const finalRetryJob = await repository.get(firmId, retryJob.job.id);
const auditCount = await database
  .select({ value: sql<number>`cast(count(*) as signed)` })
  .from(auditLog)
  .where(and(eq(auditLog.firmId, firmId), eq(auditLog.resource, "durable_jobs")));

const passed =
  evidence.idempotentEnqueue &&
  evidence.retryBackoff &&
  evidence.deadLetter &&
  evidence.manualRetryRecoverable &&
  evidence.noDuplicateSideEffects &&
  evidence.leaseRecovery &&
  evidence.scheduleExactlyOnce;

if (!passed) throw new Error(`R4.7 evidence incomplete: ${JSON.stringify(evidence)}`);

process.stdout.write(
  `${JSON.stringify({
    r47: evidence,
    deadLetter: finalRetryJob?.status === "dead_letter",
    manualRetry: finalRetryJob?.manualRetryCount === 1,
    auditEvents: auditCount[0]?.value ?? 0,
  })}\n`,
);
await closeDatabase();
