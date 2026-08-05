/**
 * Local write-freeze markers for R6 dress rehearsal.
 * Production enforcement is DEFER_PROD; localhost uses an operator marker under `.local/`.
 */
import fs from "node:fs/promises";
import path from "node:path";

const FREEZE_DIR = path.resolve(process.cwd(), ".local", "write-freeze");

export type WriteFreezeRecord = {
  domain: string;
  frozenAt: string;
  reason: string;
};

async function freezePath(domain: string) {
  return path.join(FREEZE_DIR, `${domain}.json`);
}

export async function enableWriteFreeze(
  domain: string,
  reason = "R6 local cutover dress rehearsal",
): Promise<WriteFreezeRecord> {
  await fs.mkdir(FREEZE_DIR, { recursive: true });
  const record: WriteFreezeRecord = {
    domain,
    frozenAt: new Date().toISOString(),
    reason,
  };
  await fs.writeFile(await freezePath(domain), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return record;
}

export async function disableWriteFreeze(domain: string): Promise<void> {
  await fs.rm(await freezePath(domain), { force: true });
}

export async function isWriteFrozen(domain: string): Promise<boolean> {
  try {
    await fs.access(await freezePath(domain));
    return true;
  } catch {
    return false;
  }
}

export async function readWriteFreeze(domain: string): Promise<WriteFreezeRecord | null> {
  try {
    const raw = await fs.readFile(await freezePath(domain), "utf8");
    return JSON.parse(raw) as WriteFreezeRecord;
  } catch {
    return null;
  }
}
