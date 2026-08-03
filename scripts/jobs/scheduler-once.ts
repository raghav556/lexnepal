import { getJobRepository } from "../../src/server/jobs/runtime";
import { closeDatabase } from "../../src/server/db/client";

try {
  const enqueued = await getJobRepository().enqueueDueSchedules();
  process.stdout.write(`${JSON.stringify({ enqueued })}\n`);
} finally {
  await closeDatabase();
}
