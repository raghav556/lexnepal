import { randomUUID } from "node:crypto";
import { closeDatabase } from "../../src/server/db/client";
import { getServerEnvironment } from "../../src/server/env";
import { createJobWorker } from "../../src/server/jobs/runtime";

const environment = getServerEnvironment();
const worker = createJobWorker(`local-${randomUUID()}`);
let stopping = false;
process.on("SIGINT", () => (stopping = true));
process.on("SIGTERM", () => (stopping = true));

try {
  while (!stopping) {
    const result = await worker.runOnce();
    if (result === "idle") await delay(environment.JOB_WORKER_POLL_MS);
  }
} finally {
  await closeDatabase();
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
