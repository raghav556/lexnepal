import { MigrationEngine } from "../engine";
import { Reconciler } from "../reconcile";

export interface DomainCommandOptions {
  exportPath: string;
  firmMapPath?: string;
  orphanFirmId?: string;
  targetFirmId?: string;
  storageManifestPath?: string;
  storageOutputDir?: string;
  /** Skip import when checkpoint matches export fingerprint. */
  resume?: boolean;
  /** Ignore checkpoint and re-run import (still idempotent via legacyConvexId). */
  force?: boolean;
}

export interface MigrationDomain {
  name: string;

  import: (
    engine: MigrationEngine,
    isDryRun: boolean,
    options: DomainCommandOptions,
  ) => Promise<void>;

  reconcile: (
    engine: MigrationEngine,
    reconciler: Reconciler,
    options: DomainCommandOptions,
  ) => Promise<void>;

  verify: (engine: MigrationEngine, options: DomainCommandOptions) => Promise<boolean>;

  rollback: (
    engine: MigrationEngine,
    isDryRun: boolean,
    options: DomainCommandOptions,
  ) => Promise<void>;
}

export const registeredDomains = new Map<string, MigrationDomain>();

export function registerDomain(domain: MigrationDomain) {
  if (registeredDomains.has(domain.name)) {
    throw new Error(`Domain ${domain.name} is already registered`);
  }
  registeredDomains.set(domain.name, domain);
}

export function getDomain(name: string): MigrationDomain {
  const domain = registeredDomains.get(name);
  if (!domain) {
    throw new Error(`Domain ${name} not found. Available domains: ${listDomainNames().join(", ")}`);
  }
  return domain;
}

export function listDomainNames(): string[] {
  return [...registeredDomains.keys()].sort();
}
