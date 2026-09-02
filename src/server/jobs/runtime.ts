import "server-only";
import { randomUUID } from "node:crypto";
import { createJobHandlers } from "@/server/jobs/handlers";
import { MySqlJobRepository } from "@/server/jobs/job-repository";
import { DurableJobWorker } from "@/server/jobs/job-worker";

let repository: MySqlJobRepository | undefined;

export function getJobRepository(): MySqlJobRepository {
  repository ??= new MySqlJobRepository();
  return repository;
}

export function createJobWorker(workerId = `worker-${randomUUID()}`): DurableJobWorker {
  return new DurableJobWorker(getJobRepository(), createJobHandlers(), workerId);
}
