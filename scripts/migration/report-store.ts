import fs from "node:fs/promises";
import path from "node:path";
import type { DomainMigrationReport } from "./types";
import { REPORTS_DIR } from "./types";

export async function saveDomainReport(domain: string, report: DomainMigrationReport) {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const filePath = path.join(REPORTS_DIR, `${domain}.json`);
  await fs.writeFile(
    filePath,
    JSON.stringify({ domain, savedAt: new Date().toISOString(), report }, null, 2),
    "utf8",
  );
  return filePath;
}

export async function loadDomainReport(domain: string): Promise<DomainMigrationReport | null> {
  const filePath = path.join(REPORTS_DIR, `${domain}.json`);
  try {
    const raw = JSON.parse(await fs.readFile(filePath, "utf8")) as {
      report: DomainMigrationReport;
    };
    return raw.report;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw error;
  }
}
