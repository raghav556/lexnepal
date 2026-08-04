import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import readline from "node:readline";
import JSZip from "jszip";

export interface MigrationEngineConfig {
  domain: string;
  exportPath?: string;
  batchSize?: number;
}

export type RecordValue = Record<string, unknown>;

export class MigrationEngine {
  public domain: string;
  public exportPath: string;
  public batchSize: number;
  private stateFilePath: string;
  private state: Record<string, number> = {};

  constructor(config: MigrationEngineConfig) {
    this.domain = config.domain;
    this.exportPath = config.exportPath || path.resolve(process.cwd(), "exports");
    this.batchSize = config.batchSize || 1000;
    this.stateFilePath = path.resolve(process.cwd(), ".migration-state.json");
  }

  async init() {
    try {
      const data = await fs.readFile(this.stateFilePath, "utf8");
      this.state = JSON.parse(data);
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
      this.state = {};
    }
  }

  async saveState() {
    await fs.writeFile(this.stateFilePath, JSON.stringify(this.state, null, 2), "utf8");
  }

  private getStateKey(tableName: string) {
    return `${this.domain}:${tableName}:offset`;
  }

  getOffset(tableName: string): number {
    return this.state[this.getStateKey(tableName)] || 0;
  }

  setOffset(tableName: string, offset: number) {
    this.state[this.getStateKey(tableName)] = offset;
  }

  resetOffset(tableName: string) {
    delete this.state[this.getStateKey(tableName)];
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

  async processTable(
    tableName: string,
    processor: (batch: RecordValue[], isDryRun: boolean) => Promise<void>,
    isDryRun: boolean = false
  ) {
    let offset = isDryRun ? 0 : this.getOffset(tableName);
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
        if (currentLine <= offset) continue; // Skip already processed

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

      // Process remaining
      if (batch.length > 0) {
        await processor(batch, isDryRun);
        if (!isDryRun) {
          this.setOffset(tableName, currentLine);
          await this.saveState();
        }
      }

      await this.log(`Finished processing for table ${tableName}. Total processed: ${currentLine - offset}`);
    } catch (e: any) {
      await this.log(`Error processing table ${tableName}: ${e.message}`);
      throw e;
    }
  }

  private async getReadlineInterface(tableName: string) {
    const resolved = path.resolve(this.exportPath);
    const stat = await fs.stat(resolved).catch(() => null);

    if (!stat) {
      // Maybe it's a direct reference to a zip
      if (resolved.endsWith(".zip")) {
        throw new Error("Direct zip streaming not implemented yet. Please extract to exports/ dir first.");
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
