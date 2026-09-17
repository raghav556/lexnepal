import { isLifecycleClosed } from "@/shared/contracts/case-status";

/** Lifecycle values Staff/Admin Case views write and filter. API still accepts closed_won/lost aliases. */
export const CASE_LIFECYCLE_STATUSES = ["inquiry", "active", "on_hold", "closed"] as const;
export type CaseLifecycleStatus = (typeof CASE_LIFECYCLE_STATUSES)[number];

export const CASE_CLOSURE_OUTCOMES = ["won", "lost", "settled", "withdrawn", "other"] as const;
export type CaseClosureOutcome = (typeof CASE_CLOSURE_OUTCOMES)[number];

export const CASE_STATUS_FILTERS = ["all", ...CASE_LIFECYCLE_STATUSES] as const;
export type CaseStatusFilter = (typeof CASE_STATUS_FILTERS)[number];

export const CASE_LIFECYCLE_LABELS: Record<CaseLifecycleStatus, string> = {
  inquiry: "Inquiry",
  active: "Active",
  on_hold: "On hold",
  closed: "Closed",
};

export const CASE_OUTCOME_LABELS: Record<CaseClosureOutcome, string> = {
  won: "Won",
  lost: "Lost",
  settled: "Settled",
  withdrawn: "Withdrawn",
  other: "Other",
};

export const CASE_PARTY_SIDES = ["our_side", "opposing", "other"] as const;
export type CasePartySide = (typeof CASE_PARTY_SIDES)[number];

export const CASE_PARTY_TYPES = ["person", "organisation"] as const;
export type CasePartyType = (typeof CASE_PARTY_TYPES)[number];

export const CASE_PARTY_SIDE_LABELS: Record<CasePartySide, string> = {
  our_side: "Our side",
  opposing: "Opposing",
  other: "Other",
};

export const CASE_PARTY_TYPE_LABELS: Record<CasePartyType, string> = {
  person: "Person",
  organisation: "Organisation",
};

export const CASE_WORKSPACE_BASE_PATHS = ["/staff/cases", "/admin/cases"] as const;
export type CaseWorkspaceBasePath = (typeof CASE_WORKSPACE_BASE_PATHS)[number];

export function isCaseStatusValue(status: string | null | undefined): boolean {
  return (
    status === "inquiry" ||
    status === "active" ||
    status === "on_hold" ||
    status === "closed" ||
    status === "closed_won" ||
    status === "closed_lost"
  );
}

/** Compact list hero: chips stay on sm+, description is screen-reader-only on narrow. */
export const CASE_LIST_HERO_CLASS =
  "p-3 sm:p-4 xl:p-5 [&_h1]:text-xl sm:[&_h1]:text-2xl xl:[&_h1]:text-3xl max-sm:[&_[data-hero-chips]]:hidden max-sm:[&_p]:sr-only";

/** Detail hero stays readable on 390 without pushing tabs below the fold. */
export const CASE_DETAIL_HERO_CLASS =
  "p-3 sm:p-5 [&_h1]:text-xl sm:[&_h1]:text-2xl xl:[&_h1]:text-3xl max-sm:[&_[data-hero-chips]]:hidden max-sm:[&_p]:sr-only";

/** Horizontal scroll instead of wrap so Case section tabs stay usable at 390. */
export const CASE_DETAIL_TABS_LIST_CLASS =
  "overflow-x-auto flex-nowrap w-full justify-start h-auto min-h-10 p-1.5 max-sm:[&_svg]:hidden [scrollbar-width:thin] [&_[data-slot=tabs-trigger]]:shrink-0";

export function caseDetailPath(basePath: string, caseId: string): string {
  return `${basePath.replace(/\/$/, "")}/${caseId}`;
}

export function toLifecycleStatus(status: string | null | undefined): CaseLifecycleStatus {
  if (isLifecycleClosed(status)) return "closed";
  if (status === "inquiry" || status === "active" || status === "on_hold") return status;
  return "inquiry";
}

export function inferredClosureOutcome(
  status: string | null | undefined,
  closureOutcome?: string | null,
): CaseClosureOutcome | null {
  if (
    closureOutcome === "won" ||
    closureOutcome === "lost" ||
    closureOutcome === "settled" ||
    closureOutcome === "withdrawn" ||
    closureOutcome === "other"
  ) {
    return closureOutcome;
  }
  if (status === "closed_won") return "won";
  if (status === "closed_lost") return "lost";
  return null;
}

export function matchesCaseStatusFilter(
  status: string | null | undefined,
  filter: CaseStatusFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "closed") return isLifecycleClosed(status);
  return toLifecycleStatus(status) === filter;
}

/** Stage C writes: never persist closed_won / closed_lost from Case UI. */
export function caseStatusWritePayload(
  status: string,
  closureOutcome?: string | null,
): { status: CaseLifecycleStatus; closureOutcome: CaseClosureOutcome | null } {
  const lifecycle = toLifecycleStatus(status);
  if (lifecycle !== "closed") {
    return { status: lifecycle, closureOutcome: null };
  }
  return {
    status: "closed",
    closureOutcome: inferredClosureOutcome(status, closureOutcome),
  };
}

const INACTIVE_HEARING_STATUSES = new Set([
  "completed",
  "cancelled",
  "archived",
  "dismissed",
  "settled",
  "final_judgment",
]);

export type NextRequiredAction = { kind: "hearing" | "task"; iso: string };

/** C-DATE-001: next required action is the earlier of next hearing or incomplete task due. */
export function nextRequiredAction(
  nextHearing: string | null | undefined,
  nextTaskDue: string | null | undefined,
): NextRequiredAction | null {
  const hearing = nextHearing?.trim() || null;
  const task = nextTaskDue?.trim() || null;
  if (hearing && task) {
    return Date.parse(hearing) <= Date.parse(task)
      ? { kind: "hearing", iso: hearing }
      : { kind: "task", iso: task };
  }
  if (hearing) return { kind: "hearing", iso: hearing };
  if (task) return { kind: "task", iso: task };
  return null;
}

export function nextScheduledHearingIso(
  hearings: ReadonlyArray<{ status?: string; dateGregorian?: string | null }>,
  fallback?: string | null,
): string | null {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = hearings
    .filter(
      (hearing) =>
        !INACTIVE_HEARING_STATUSES.has(String(hearing.status ?? "")) &&
        Boolean(hearing.dateGregorian) &&
        String(hearing.dateGregorian) >= today,
    )
    .map((hearing) => String(hearing.dateGregorian))
    .sort();
  return upcoming[0] ?? fallback?.trim() ?? null;
}

export function earliestIncompleteTaskDueIso(
  tasks: ReadonlyArray<{
    status?: string;
    dueDate?: string | null;
    archivedAt?: string | null;
  }>,
): string | null {
  const dates = tasks
    .filter(
      (task) =>
        (task.status === "todo" || task.status === "in_progress") &&
        !task.archivedAt &&
        Boolean(task.dueDate),
    )
    .map((task) => String(task.dueDate))
    .sort();
  return dates[0] ?? null;
}

/** Digital Misl binders group documents by `documents.type` — no filename heuristics. */
export const CASE_MISL_BINDERS = [
  { id: "pleadings", label: "Pleadings (Firad/Pratiuttar)" },
  { id: "evidence", label: "Evidence (Praman)" },
  { id: "orders", label: "Court Orders (Aadesh)" },
  { id: "annexure", label: "Annexures & Exhibits" },
  { id: "misc", label: "Miscellaneous (Others)" },
] as const;
export type CaseMislBinderId = (typeof CASE_MISL_BINDERS)[number]["id"];

export const CASE_MISL_DOCUMENT_TYPES = [
  { value: "pleading", label: "Pleading", binder: "pleadings" },
  { value: "affidavit", label: "Affidavit", binder: "pleadings" },
  { value: "evidence", label: "Evidence", binder: "evidence" },
  { value: "court_filing", label: "Court filing / order", binder: "orders" },
  { value: "notice", label: "Notice", binder: "orders" },
  { value: "contract", label: "Contract", binder: "annexure" },
  { value: "poa", label: "Power of attorney", binder: "annexure" },
  { value: "correspondence", label: "Correspondence", binder: "misc" },
  { value: "other", label: "Other", binder: "misc" },
] as const;

export function mislBinderForType(type: string | undefined): CaseMislBinderId {
  const match = CASE_MISL_DOCUMENT_TYPES.find((entry) => entry.value === type);
  return match?.binder ?? "misc";
}
