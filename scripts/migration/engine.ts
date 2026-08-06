import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createHash } from "node:crypto";
import { STATE_FILE } from "./types";

export interface MigrationEngineConfig {
  domain: string;
  exportPath?: string;
  batchSize?: number;
}

export type RecordValue = Record<string, unknown>;

export type DomainCheckpointStatus = "dry-run" | "imported" | "failed" | "skipped-resume";

export interface DomainCheckpoint {
  domain: string;
  status: DomainCheckpointStatus;
  exportPath: string;
  fingerprint: string;
  passed: boolean;
  at: string;
  checks?: Record<string, { source: number; target: number }>;
  notes?: string;
}

export class MigrationEngine {
  public domain: string;
  public exportPath: string;
  public batchSize: number;
  private stateFilePath: string;
  private state: Record<string, unknown> = {};

  constructor(config: MigrationEngineConfig) {
    this.domain = config.domain;
    this.exportPath = config.exportPath || path.resolve(process.cwd(), "exports");
    this.batchSize = config.batchSize || 1000;
    this.stateFilePath = STATE_FILE;
  }

  async init() {
    try {
      const data = await fs.readFile(this.stateFilePath, "utf8");
      this.state = JSON.parse(data) as Record<string, unknown>;
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      this.state = {};
    }
  }

  async saveState() {
    await fs.writeFile(this.stateFilePath, JSON.stringify(this.state, null, 2), "utf8");
  }

  private getStateKey(tableName: string) {
    return `${this.domain}:${tableName}:offset`;
  }

  private checkpointKey(domain = this.domain) {
    return `checkpoint:${domain}`;
  }

  getOffset(tableName: string): number {
    const value = this.state[this.getStateKey(tableName)];
    return typeof value === "number" ? value : 0;
  }

  setOffset(tableName: string, offset: number) {
    this.state[this.getStateKey(tableName)] = offset;
  }

  resetOffset(tableName: string) {
    delete this.state[this.getStateKey(tableName)];
  }

  clearTableOffsets() {
    for (const key of Object.keys(this.state)) {
      if (key.startsWith(`${this.domain}:`) && key.endsWith(":offset")) {
        delete this.state[key];
      }
    }
  }

  getCheckpoint(domain = this.domain): DomainCheckpoint | null {
    const raw = this.state[this.checkpointKey(domain)];
    if (!raw || typeof raw !== "object") return null;
    return raw as DomainCheckpoint;
  }

  /**
   * Persist domain-level checkpoint. Dry-run must use status "dry-run" and must not
   * be treated as a successful import for --resume.
   */
  async writeCheckpoint(checkpoint: DomainCheckpoint) {
    this.state[this.checkpointKey(checkpoint.domain)] = checkpoint;
    // Back-compat keys used by earlier R3 drafts
    this.state[`${checkpoint.domain}:lastImportPassed`] = checkpoint.passed;
    this.state[`${checkpoint.domain}:lastImportAt`] = checkpoint.at;
    await this.saveState();
  }

  /**
   * Safe resume: skip real import when the same export fingerprint already imported cleanly.
   * Idempotent re-import remains available via --force.
   */
  shouldSkipImport(input: {
    fingerprint: string;
    exportPath: string;
    resume: boolean;
    force: boolean;
  }): DomainCheckpoint | null {
    if (input.force || !input.resume) return null;
    const existing = this.getCheckpoint();
    if (!existing) return null;
    if (existing.status !== "imported" || !existing.passed) return null;
    if (existing.fingerprint !== input.fingerprint) return null;
    if (path.resolve(existing.exportPath) !== path.resolve(input.exportPath)) return null;
    return existing;
  }

  /** Fingerprint export contents (path + per-table row counts) without rewriting importers. */
  async fingerprintExport(tables: string[], exportPath = this.exportPath): Promise<string> {
    const parts = [path.resolve(exportPath)];
    for (const table of tables) {
      parts.push(`${table}:${await countExportRows(exportPath, table)}`);
    }
    return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24);
  }

  /** @deprecated use writeCheckpoint — kept for call-site migration */
  markDomainComplete(domain: string, passed: boolean) {
    void this.writeCheckpoint({
      domain,
      status: passed ? "imported" : "failed",
      exportPath: this.exportPath,
      fingerprint: "legacy",
      passed,
      at: new Date().toISOString(),
      notes: "legacy markDomainComplete",
    });
  }

  async log(message: string) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${this.domain}] ${message}\n`;

    const logsDir = path.resolve(process.cwd(), "logs");
    const stat = await fs.stat(logsDir).catch(() => null);
    if (!stat) {
      await fs.mkdir(logsDir, { recursive: true });
    }

    await fs.appendFile(path.resolve(logsDir, `migration-${this.domain}.log`), logLine);
    console.log(`[${this.domain}] ${message}`);
  }

  /**
   * Streaming batch helper with line-offset checkpoints.
   * Service-backed domains use full-table idempotent migrate*Export instead;
   * this remains available for adapters that stream JSONL themselves.
   */
  async processTable(
    tableName: string,
    processor: (batch: RecordValue[], isDryRun: boolean) => Promise<void>,
    isDryRun: boolean = false,
  ) {
    const offset = isDryRun ? 0 : this.getOffset(tableName);
    let currentLine = 0;
    let batch: RecordValue[] = [];

    await this.log(`Starting processing for table ${tableName}. Offset: ${offset}`);

    try {
      const rl = await this.getReadlineInterface(tableName);
      if (!rl) {
        await this.log(`No data found for table ${tableName}`);
        return;
      }

      for await (const line of rl) {
        currentLine++;
        if (currentLine <= offset) continue;

        if (line.trim()) {
          batch.push(JSON.parse(line));
        }

        if (batch.length >= this.batchSize) {
          await processor(batch, isDryRun);
          if (!isDryRun) {
            this.setOffset(tableName, currentLine);
            await this.saveState();
          }
          batch = [];
        }
      }

      if (batch.length > 0) {
        await processor(batch, isDryRun);
        if (!isDryRun) {
          this.setOffset(tableName, currentLine);
          await this.saveState();
        }
      }

      await this.log(
        `Finished processing for table ${tableName}. Total processed: ${currentLine - offset}`,
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      await this.log(`Error processing table ${tableName}: ${message}`);
      throw e;
    }
  }

  private async getReadlineInterface(tableName: string) {
    const resolved = path.resolve(this.exportPath);
    const stat = await fs.stat(resolved).catch(() => null);

    if (!stat) {
      if (resolved.endsWith(".zip")) {
        throw new Error(
          "Direct zip streaming not implemented yet. Please extract to exports/ dir first.",
        );
      }
      return null;
    }

    if (stat.isDirectory()) {
      let filePath = path.join(resolved, tableName, "documents.jsonl");
      if (!fsSync.existsSync(filePath)) {
        filePath = path.join(resolved, `${tableName}.jsonl`);
        if (!fsSync.existsSync(filePath)) return null;
      }

      const fileStream = fsSync.createReadStream(filePath);
      return readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });
    }

    throw new Error(`Export path is not a directory: ${resolved}`);
  }
}

async function countExportRows(exportPath: string, table: string): Promise<number> {
  const candidates = [
    path.join(exportPath, table, "documents.jsonl"),
    path.join(exportPath, `${table}.jsonl`),
    path.join(exportPath, `${table}.json`),
  ];
  for (const candidate of candidates) {
    try {
      const text = await fs.readFile(candidate, "utf8");
      const trimmed = text.trim();
      if (!trimmed) return 0;
      if (trimmed.startsWith("[")) return (JSON.parse(trimmed) as unknown[]).length;
      return trimmed.split(/\r?\n/).filter(Boolean).length;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
    }
  }
  return 0;
}
