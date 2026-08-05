import { describe, expect, it } from "vitest";
import { PermanentJobError, RetryableJobError } from "@/server/jobs/errors";
import { DurableJobWorker, type JobWorkerRepository } from "@/server/jobs/job-worker";
import type { DurableJobRecord, JobHandler } from "@/server/jobs/types";

const now = new Date("2026-08-02T00:00:00.000Z");

function job(overrides: Partial<DurableJobRecord> = {}): DurableJobRecord {
  return {
    id: "job-1",
    firmId: "firm-1",
    type: "analytics.aggregate",
    idempotencyKey: "aggregate-1",
    payload: {},
    status: "processing",
    priority: 100,
    attempts: 1,
    totalAttempts: 1,
    maxAttempts: 3,
    timeoutSeconds: 30,
    availableAt: now,
    lockedAt: now,
    lockedBy: "worker-1",
    leaseExpiresAt: new Date(now.getTime() + 60_000),
    actorUserId: "user-1",
    correlationId: null,
    lastError: null,
    result: null,
    completedAt: null,
    deadLetteredAt: null,
    manualRetryCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

class MemoryRepository implements JobWorkerRepository {
  claimed: DurableJobRecord | null = job();
  completed = 0;
  failed: Array<{ permanent: boolean; error: string }> = [];

  async claim(): Promise<DurableJobRecord | null> {
    const claimed = this.claimed;
    this.claimed = null;
    return claimed;
  }
  async heartbeat(): Promise<boolean> {
    return true;
  }
  async complete(): Promise<void> {
    this.completed += 1;
  }
  async fail(
    _job: DurableJobRecord,
    _workerId: string,
    error: string,
    permanent: boolean,
  ): Promise<"retry" | "dead_letter"> {
    this.failed.push({ permanent, error });
    return permanent ? "dead_letter" : "retry";
  }
}

describe("durable PostgreSQL job worker", () => {
  it("completes a claimed job through its registered handler", async () => {
    const repository = new MemoryRepository();
    const handler: JobHandler = async () => ({ aggregated: true });
    const worker = new DurableJobWorker(
      repository,
      new Map([["analytics.aggregate", handler]]),
      "worker-1",
    );
    await expect(worker.runOnce()).resolves.toBe("completed");
    expect(repository.completed).toBe(1);
    expect(repository.failed).toEqual([]);
  });

  it("schedules retryable failures without acknowledging completion", async () => {
    const repository = new MemoryRepository();
    const handler: JobHandler = async () => {
      throw new RetryableJobError("temporary outage");
    };
    const worker = new DurableJobWorker(
      repository,
      new Map([["analytics.aggregate", handler]]),
      "worker-1",
    );
    await expect(worker.runOnce()).resolves.toBe("retry");
    expect(repository.completed).toBe(0);
    expect(repository.failed).toEqual([{ permanent: false, error: "temporary outage" }]);
  });

  it("dead-letters permanent failures and unknown handlers", async () => {
    const repository = new MemoryRepository();
    const handler: JobHandler = async () => {
      throw new PermanentJobError("provider not configured");
    };
    const worker = new DurableJobWorker(
      repository,
      new Map([["analytics.aggregate", handler]]),
      "worker-1",
    );
    await expect(worker.runOnce()).resolves.toBe("dead_letter");
    expect(repository.failed[0]).toEqual({ permanent: true, error: "provider not configured" });

    const unknownRepository = new MemoryRepository();
    const unknownWorker = new DurableJobWorker(unknownRepository, new Map(), "worker-1");
    await expect(unknownWorker.runOnce()).resolves.toBe("dead_letter");
    expect(unknownRepository.failed[0].permanent).toBe(true);
  });

  it("returns idle without invoking handlers when no work is claimable", async () => {
    const repository = new MemoryRepository();
    repository.claimed = null;
    const worker = new DurableJobWorker(repository, new Map(), "worker-1");
    await expect(worker.runOnce()).resolves.toBe("idle");
  });

  it("does not complete when a handler fails, so side effects stay unacknowledged", async () => {
    const repository = new MemoryRepository();
    const handler: JobHandler = async () => {
      throw new RetryableJobError("before side effect");
    };
    const worker = new DurableJobWorker(
      repository,
      new Map([["analytics.aggregate", handler]]),
      "worker-1",
    );
    await expect(worker.runOnce()).resolves.toBe("retry");
    expect(repository.completed).toBe(0);
  });
});
