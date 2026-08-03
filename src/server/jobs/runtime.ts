import "server-only";
import { randomUUID } from "node:crypto";
import { createJobHandlers } from "@/server/jobs/handlers";
import { PostgresJobRepository } from "@/server/jobs/job-repository";
import { DurableJobWorker } from "@/server/jobs/job-worker";

let repository: PostgresJobRepository | undefined;

export function getJobRepository(): PostgresJobRepository {
  repository ??= new PostgresJobRepository();
  return repository;
}

export function createJobWorker(workerId = `worker-${randomUUID()}`): DurableJobWorker {
  return new DurableJobWorker(getJobRepository(), createJobHandlers(), workerId);
}
