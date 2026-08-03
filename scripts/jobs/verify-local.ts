import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  auditLog,
  durableJobAttempts,
  durableJobs,
  durableSchedules,
} from "../../src/server/db/schema";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { RetryableJobError } from "../../src/server/jobs/errors";
import { createJobHandlers } from "../../src/server/jobs/handlers";
import { PostgresJobRepository } from "../../src/server/jobs/job-repository";
import { DurableJobWorker } from "../../src/server/jobs/job-worker";

const firmId = "61000000-0000-4000-8000-000000000001";
const actorUserId = "62000000-0000-4000-8000-000000000001";
const database = getDatabase();
const repository = new PostgresJobRepository();
const suffix = randomUUID();

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
const productionWorker = new DurableJobWorker(
  repository,
  createJobHandlers(),
  `phase7-production-${suffix}`,
);
if ((await productionWorker.runOnce()) !== "completed") {
  throw new Error("Analytics job did not complete");
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
await database
  .update(durableJobs)
  .set({ availableAt: new Date() })
  .where(eq(durableJobs.id, retryJob.job.id));
if ((await retryWorker.runOnce()) !== "dead_letter") {
  throw new Error("Exhausted retryable job was not dead-lettered");
}
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
  .select({ value: sql<number>`count(*)::int` })
  .from(auditLog)
  .where(and(eq(auditLog.firmId, firmId), eq(auditLog.resource, "durable_jobs")));
process.stdout.write(
  `${JSON.stringify({ idempotency: true, retryBackoff: true, deadLetter: finalRetryJob?.status === "dead_letter", manualRetry: finalRetryJob?.manualRetryCount === 1, leaseRecovery: true, scheduleExactlyOnce: true, observableStatus: Boolean(finalRetryJob), auditEvents: auditCount[0]?.value ?? 0 })}\n`,
);
await closeDatabase();
