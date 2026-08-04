import { migrateEnvelopes, migrateSignatureRecipients } from "../../src/server/services/envelope-migration";
import path from "node:path";
import fs from "node:fs";

async function main() {
  const exportsDir = path.join(process.cwd(), "exports");
  
  const envPath = path.join(exportsDir, "signatureEnvelopes.jsonl");
  if (fs.existsSync(envPath)) {
    await migrateEnvelopes(envPath);
  } else {
    console.log("signatureEnvelopes.jsonl not found in exports");
  }

  const recPath = path.join(exportsDir, "signatureRecipients.jsonl");
  if (fs.existsSync(recPath)) {
    await migrateSignatureRecipients(recPath);
  } else {
    console.log("signatureRecipients.jsonl not found in exports");
  }

  console.log("Envelopes migration completed successfully!");
}

main().catch(console.error);
