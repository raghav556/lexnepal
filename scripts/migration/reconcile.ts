import fs from "node:fs/promises";
import path from "node:path";

export interface ReconcileException {
  domain: string;
  table: string;
  id?: string;
  type: "MISSING_ID" | "EXTRA_ID" | "ROW_COUNT_MISMATCH" | "FK_VIOLATION" | "FIRM_MISSING" | "NULLABILITY_VIOLATION" | "UNIQUE_VIOLATION" | "FINANCIAL_MISMATCH" | "OTHER";
  reason: string;
  sourceValue?: any;
  targetValue?: any;
}

export class Reconciler {
  private exceptions: ReconcileException[] = [];
  public domain: string;

  constructor(domain: string) {
    this.domain = domain;
  }

  addException(exception: Omit<ReconcileException, "domain">) {
    this.exceptions.push({
      ...exception,
      domain: this.domain,
    });
  }

  getExceptions() {
    return this.exceptions;
  }

  async writeExceptions() {
    if (this.exceptions.length === 0) return;

    const csvPath = path.resolve(process.cwd(), "data-exceptions.csv");
    let content = "";
    
    // Write header if file doesn't exist
    const exists = await fs.access(csvPath).then(() => true).catch(() => false);
    if (!exists) {
      content += "domain,table,id,type,reason,sourceValue,targetValue\n";
    }

    for (const ex of this.exceptions) {
      content += `"${ex.domain}","${ex.table}","${ex.id || ""}","${ex.type}","${ex.reason.replace(/"/g, '""')}","${JSON.stringify(ex.sourceValue || "").replace(/"/g, '""')}","${JSON.stringify(ex.targetValue || "").replace(/"/g, '""')}"\n`;
    }

    await fs.appendFile(csvPath, content);
  }

  checkRowCount(table: string, sourceCount: number, targetCount: number) {
    if (sourceCount !== targetCount) {
      this.addException({
        table,
        type: "ROW_COUNT_MISMATCH",
        reason: "Source and target row counts do not match",
        sourceValue: sourceCount,
        targetValue: targetCount,
      });
    }
  }
}
