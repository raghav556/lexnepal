import { getServerEnvironment } from "../../src/server/env";
import { closeDatabase } from "../../src/server/db/client";
import { getJobRepository } from "../../src/server/jobs/runtime";

const environment = getServerEnvironment();
const repository = getJobRepository();
let stopping = false;
process.on("SIGINT", () => (stopping = true));
process.on("SIGTERM", () => (stopping = true));

try {
  while (!stopping) {
    await repository.enqueueDueSchedules();
    await delay(environment.JOB_SCHEDULER_POLL_MS);
  }
} finally {
  await closeDatabase();
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
