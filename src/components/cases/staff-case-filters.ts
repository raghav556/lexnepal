import type { CaseDto } from "@/shared/contracts/domains";

export type StaffCaseFilters = { lawyerId: string; clientId: string; practiceArea: string };
export const EMPTY_STAFF_CASE_FILTERS: StaffCaseFilters = {
  lawyerId: "",
  clientId: "",
  practiceArea: "",
};

type FilterableCase = Pick<CaseDto, "assignedLawyerId" | "clientId" | "practiceArea">;

/** Additional in-memory predicates; search/lifecycle filtering stays in the workspace. */
export function matchesStaffCaseFilters(matter: FilterableCase, filters: StaffCaseFilters) {
  return (
    (!filters.lawyerId ||
      (filters.lawyerId === "unassigned"
        ? !matter.assignedLawyerId
        : matter.assignedLawyerId === filters.lawyerId)) &&
    (!filters.clientId || matter.clientId === filters.clientId) &&
    (!filters.practiceArea || matter.practiceArea?.trim() === filters.practiceArea)
  );
}

/** Offer only named directory entries referenced by already-accessible cases. */
export function staffCaseFilterOptions(
  cases: readonly FilterableCase[],
  users: readonly { _id: string; name?: string | null }[],
  clients: readonly { _id: string; fullName: string }[],
) {
  const lawyerIds = new Set(cases.map((matter) => matter.assignedLawyerId));
  const clientIds = new Set(cases.map((matter) => matter.clientId));
  const named = (entries: Array<{ id: string; label: string }>) =>
    [
      ...new Map(entries.filter((entry) => entry.label).map((entry) => [entry.id, entry])).values(),
    ].sort((a, b) => a.label.localeCompare(b.label));
  return {
    lawyers: named(
      users
        .filter((user) => lawyerIds.has(user._id))
        .map((user) => ({
          id: user._id,
          label: user.name?.trim() ?? "",
        })),
    ),
    clients: named(
      clients
        .filter((client) => clientIds.has(client._id))
        .map((client) => ({
          id: client._id,
          label: client.fullName.trim(),
        })),
    ),
    practiceAreas: [
      ...new Set(
        cases
          .map((matter) => matter.practiceArea?.trim())
          .filter((area): area is string => Boolean(area)),
      ),
    ].sort((a, b) => a.localeCompare(b)),
    hasUnassigned: cases.some((matter) => !matter.assignedLawyerId),
  };
}
