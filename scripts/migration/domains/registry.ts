import { MigrationEngine } from "../engine";
import { Reconciler } from "../reconcile";

export interface MigrationDomain {
  name: string;
  
  import: (engine: MigrationEngine, isDryRun: boolean) => Promise<void>;
  
  reconcile: (engine: MigrationEngine, reconciler: Reconciler) => Promise<void>;
  
  verify: (engine: MigrationEngine) => Promise<boolean>;
  
  rollback: (engine: MigrationEngine, isDryRun: boolean) => Promise<void>;
}

export const registeredDomains = new Map<string, MigrationDomain>();

export function registerDomain(domain: MigrationDomain) {
  registeredDomains.set(domain.name, domain);
}

export function getDomain(name: string): MigrationDomain {
  const domain = registeredDomains.get(name);
  if (!domain) {
    throw new Error(`Domain ${name} not found. Available domains: ${Array.from(registeredDomains.keys()).join(", ")}`);
  }
  return domain;
}
