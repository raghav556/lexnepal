import { migrateCommunicationExport } from "../../src/server/services/communication-migration";
import * as fs from "fs";
import * as path from "path";
import JSZip from "jszip";

async function main() {
  const exportZipPath = process.argv[2];
  if (!exportZipPath) {
    console.error("Usage: npm run migration:communication <path-to-export.zip>");
    process.exit(1);
  }

  const zipFile = fs.readFileSync(path.resolve(exportZipPath));
  const zip = await JSZip.loadAsync(zipFile);

  const messagesFile = zip.file("messages.jsonl");
  const notificationsFile = zip.file("notifications.jsonl");

  const messagesJsonl = messagesFile ? await messagesFile.async("string") : "";
  const notificationsJsonl = notificationsFile ? await notificationsFile.async("string") : "";

  console.log("Starting communication migration (messages & notifications)...");
  try {
    const results = await migrateCommunicationExport(messagesJsonl, notificationsJsonl);
    console.log(`Migration complete. Messages: ${results.messages}, Notifications: ${results.notifications}`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
