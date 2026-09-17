export const LIFECYCLE_CLOSED_STATUSES = ["closed", "closed_won", "closed_lost"] as const;
export const PERSISTED_CASE_STATUSES = ["inquiry", "active", "on_hold", "closed"] as const;
export type PersistedCaseStatus = (typeof PERSISTED_CASE_STATUSES)[number];

export function isLifecycleClosed(status: string | null | undefined): boolean {
  return status === "closed" || status === "closed_won" || status === "closed_lost";
}

export function isPersistedCaseStatus(
  status: string | null | undefined,
): status is PersistedCaseStatus {
  return status === "inquiry" || status === "active" || status === "on_hold" || status === "closed";
}

/** Map API aliases onto the MySQL enum after Stage E. */
export function toPersistedCaseStatus(status: string | null | undefined): PersistedCaseStatus {
  const next = String(applyCaseStatusAliases({ status: status ?? "active" }).status);
  return isPersistedCaseStatus(next) ? next : "active";
}

export function normalizeClientCaseStatus(status: string): string {
  return isLifecycleClosed(status) ? "closed" : status;
}

export function applyCaseStatusAliases<T extends { status?: unknown; closureOutcome?: unknown }>(
  value: T,
): T {
  if (value.status === "closed_won") {
    return {
      ...value,
      status: "closed",
      closureOutcome: value.closureOutcome === undefined ? "won" : value.closureOutcome,
    };
  }
  if (value.status === "closed_lost") {
    return {
      ...value,
      status: "closed",
      closureOutcome: value.closureOutcome === undefined ? "lost" : value.closureOutcome,
    };
  }
  return value;
}
