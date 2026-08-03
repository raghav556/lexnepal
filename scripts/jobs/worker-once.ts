import { createJobWorker } from "../../src/server/jobs/runtime";
import { closeDatabase } from "../../src/server/db/client";

try {
  const result = await createJobWorker().runOnce();
  process.stdout.write(`${JSON.stringify({ result })}\n`);
} finally {
  await closeDatabase();
}
