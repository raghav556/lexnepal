import { getDocumentStorageRuntime } from "../../src/server/storage/runtime";

const result = await getDocumentStorageRuntime().pipeline.cleanup();
process.stdout.write(`${JSON.stringify(result)}\n`);
