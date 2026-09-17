/**
 * Responsible Lawyer vs Case Team write-path rules.
 * Auth stays assignedLawyerId OR teamMemberIds (requireCaseAccess).
 */
export function syncCaseTeamMembers(input: {
  currentLeadId: string;
  nextLeadId: string;
  existingTeamIds: readonly string[];
  requestedTeamIds?: readonly string[] | undefined;
}): { ok: true; teamMemberIds: string[] } | { ok: false; message: string } {
  const leadChanged = input.nextLeadId !== input.currentLeadId;
  if (input.requestedTeamIds) {
    const requested = [...new Set(input.requestedTeamIds)];
    if (
      !leadChanged &&
      !requested.includes(input.currentLeadId) &&
      input.existingTeamIds.length > 0
    ) {
      return {
        ok: false,
        message: "Reassign the Responsible Lawyer before removing them from the Case Team",
      };
    }
    const next = new Set(requested);
    next.add(input.nextLeadId);
    return { ok: true, teamMemberIds: [...next] };
  }
  const next = new Set(input.existingTeamIds);
  next.add(input.nextLeadId);
  if (leadChanged) next.add(input.currentLeadId);
  return { ok: true, teamMemberIds: [...next] };
}
