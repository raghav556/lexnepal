import "server-only";
import { CAPABILITIES, type Capability, type UserRole } from "@/server/auth/types";

export const DEFAULT_ROLE_PERMISSIONS: Readonly<Record<UserRole, readonly Capability[]>> = {
  admin: CAPABILITIES,
  partner: [
    "users.view_directory",
    "clients.view_all",
    "clients.manage",
    "kyc.review",
    "cases.view_all",
    "cases.manage",
    "conflicts.manage",
    "finance.manage",
    "hr.manage",
    "audit.view",
    "documents.read",
    "documents.upload",
    "documents.share",
    "documents.delete",
    "records.dispose",
    "legalHold.manage",
  ],
  senior_associate: [
    "users.view_directory",
    "clients.view_all",
    "clients.manage",
    "kyc.review",
    "cases.view_all",
    "cases.manage",
    "conflicts.manage",
    "documents.read",
    "documents.upload",
    "documents.share",
    "documents.delete",
  ],
  associate: [
    "users.view_directory",
    "clients.view_all",
    "clients.manage",
    "cases.manage",
    "documents.read",
    "documents.upload",
    "documents.share",
  ],
  paralegal: [
    "users.view_directory",
    "clients.view_all",
    "cases.manage",
    "documents.read",
    "documents.upload",
  ],
  intern: ["users.view_directory", "documents.read"],
  client: ["documents.read", "documents.upload"],
};

const capabilitySet = new Set<string>(CAPABILITIES);

export function resolveCapabilities(
  role: UserRole,
  storedMatrix: unknown,
): ReadonlySet<Capability> {
  if (role === "admin") return new Set(DEFAULT_ROLE_PERMISSIONS.admin);
  if (!storedMatrix || typeof storedMatrix !== "object" || Array.isArray(storedMatrix)) {
    return new Set(DEFAULT_ROLE_PERMISSIONS[role]);
  }
  const candidate = (storedMatrix as Record<string, unknown>)[role];
  if (!Array.isArray(candidate)) return new Set(DEFAULT_ROLE_PERMISSIONS[role]);
  return new Set(
    candidate.filter(
      (value): value is Capability => typeof value === "string" && capabilitySet.has(value),
    ),
  );
}
