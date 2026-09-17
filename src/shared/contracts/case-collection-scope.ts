/** Staff collection visibility for hearings/tasks (not Client portal rules). */

export function staffMayAccessHearing(
  hearing: { caseId?: string | null },
  accessibleCaseIds: ReadonlySet<string>,
): boolean {
  return Boolean(hearing.caseId && accessibleCaseIds.has(String(hearing.caseId)));
}

export function staffMayAccessTask(
  task: {
    assignedTo?: string | null;
    watchers?: string[] | null;
    caseId?: string | null;
  },
  userId: string,
  accessibleCaseIds: ReadonlySet<string>,
): boolean {
  if (task.assignedTo === userId) return true;
  if ((task.watchers ?? []).includes(userId)) return true;
  return Boolean(task.caseId && accessibleCaseIds.has(String(task.caseId)));
}
