import { randomUUID } from "node:crypto";
import { getDocumentStorageRuntime } from "../../src/server/storage/runtime";

const result = await getDocumentStorageRuntime().pipeline.processNextScan(`manual-${randomUUID()}`);
process.stdout.write(`${JSON.stringify({ result })}\n`);
