import "server-only";
import { createLogger, type Logger } from "@/server/observability/logger";
import { PermanentJobError, RetryableJobError } from "@/server/jobs/errors";
import type { DurableJobRecord, JobHandler, JobType } from "@/server/jobs/types";

export interface JobWorkerRepository {
  claim(workerId: string, at?: Date): Promise<DurableJobRecord | null>;
  heartbeat(job: DurableJobRecord, workerId: string, at?: Date): Promise<boolean>;
  complete(
    job: DurableJobRecord,
    workerId: string,
    result: Record<string, unknown>,
    at?: Date,
  ): Promise<void>;
  fail(
    job: DurableJobRecord,
    workerId: string,
    error: string,
    permanent: boolean,
    at?: Date,
  ): Promise<"retry" | "dead_letter">;
}

export class DurableJobWorker {
  private readonly logger: Logger;

  constructor(
    private readonly repository: JobWorkerRepository,
    private readonly handlers: ReadonlyMap<JobType, JobHandler>,
    private readonly workerId: string,
    logger = createLogger({ component: "durable-job-worker", workerId }),
  ) {
    this.logger = logger;
  }

  async runOnce(): Promise<"idle" | "completed" | "retry" | "dead_letter"> {
    const job = await this.repository.claim(this.workerId);
    if (!job) return "idle";
    const handler = this.handlers.get(job.type);
    if (!handler) {
      return this.fail(job, new PermanentJobError(`No handler is registered for ${job.type}`));
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new RetryableJobError(`Job timed out after ${job.timeoutSeconds}s`)),
      job.timeoutSeconds * 1000,
    );
    const heartbeat = setInterval(
      () =>
        void this.repository.heartbeat(job, this.workerId).catch((error) => {
          this.logger.error("job.heartbeat_failed", {
            jobId: job.id,
            type: job.type,
            error: error instanceof Error ? error.message : "Unknown heartbeat error",
          });
          controller.abort(new RetryableJobError("Job lease heartbeat failed"));
        }),
      Math.max(1_000, Math.min(30_000, Math.floor(job.timeoutSeconds * 1000 * 0.25))),
    );

    this.logger.info("job.started", {
      jobId: job.id,
      firmId: job.firmId,
      type: job.type,
      attempt: job.attempts,
      totalAttempt: job.totalAttempts,
      correlationId: job.correlationId,
    });
    try {
      const result = await Promise.race([
        handler({ job, signal: controller.signal }),
        aborted(controller.signal),
      ]);
      await this.repository.complete(job, this.workerId, result);
      this.logger.info("job.completed", { jobId: job.id, firmId: job.firmId, type: job.type });
      return "completed";
    } catch (error) {
      return this.fail(job, error);
    } finally {
      clearTimeout(timeout);
      clearInterval(heartbeat);
    }
  }

  private async fail(job: DurableJobRecord, error: unknown): Promise<"retry" | "dead_letter"> {
    const message = error instanceof Error ? error.message : "Unknown job failure";
    const outcome = await this.repository.fail(
      job,
      this.workerId,
      message,
      error instanceof PermanentJobError,
    );
    const fields = {
      jobId: job.id,
      firmId: job.firmId,
      type: job.type,
      attempt: job.attempts,
      error: message,
    };
    if (outcome === "dead_letter") this.logger.error("job.dead_lettered", fields);
    else this.logger.warn("job.retry_scheduled", fields);
    return outcome;
  }
}

function aborted(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
}
