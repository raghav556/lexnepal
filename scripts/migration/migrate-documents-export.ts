import {
  migrateDocuments,
  migrateDocumentShares,
} from "../../src/server/services/document-migration";
import * as path from "path";

async function main() {
  const documentsPath = path.join(process.cwd(), "exports", "documents.jsonl");
  await migrateDocuments(documentsPath);

  const sharesPath = path.join(process.cwd(), "exports", "documentShares.jsonl");
  await migrateDocumentShares(sharesPath);

  console.log("Documents migration completed successfully.");
}

main().catch(console.error);
