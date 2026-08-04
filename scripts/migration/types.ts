import path from "node:path";

import type { ReconciliationDetails } from "./reconciliation-details";

/** Shared shape returned by domain `migrate*Export` services. */
export interface DomainMigrationReport {
  source: Record<string, number>;
  migrated: Record<string, number>;
  exceptions: Array<{ table: string; id?: string; reason: string }>;
  reconciliation: {
    passed: boolean;
    checks: Record<string, { source: number; target: number }>;
  };
  /** Optional R3.5 structured dimensions (filled by CLI enrichers, not importers). */
  details?: ReconciliationDetails;
  [key: string]: unknown;
}

export interface CliPaths {
  exportPath: string;
  firmMapPath?: string;
  orphanFirmId?: string;
  targetFirmId?: string;
  storageManifestPath?: string;
  storageOutputDir?: string;
}

export const DOC_MIGRATION_DIR = path.resolve(process.cwd(), "doc", "migration");
export const EXCEPTIONS_CSV = path.join(DOC_MIGRATION_DIR, "data-exceptions.csv");
export const APPROVED_EXCEPTIONS_CSV = path.join(DOC_MIGRATION_DIR, "approved-exceptions.csv");
export const RECONCILIATION_REPORT = path.join(DOC_MIGRATION_DIR, "reconciliation-report.md");
export const REPORTS_DIR = path.resolve(process.cwd(), ".migration-reports");
export const STATE_FILE = path.resolve(process.cwd(), ".migration-state.json");
