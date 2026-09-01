import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { cases, clients, hearings, leads, tasks, users } from "../db/schema";
import type { AnalyticsDashboardDto } from "@/shared/contracts/analytics";

function countBy<T>(rows: T[], key: (row: T) => string) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const value = key(row) || "Unspecified";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

export class AnalyticsRepository {
  static async getDashboardData(firmId: string): Promise<AnalyticsDashboardDto> {
    const db = getDatabase();
    const [allCases, allClients, allLeads, allTasks, allHearings, allUsers] = await Promise.all([
      db
        .select()
        .from(cases)
        .where(and(eq(cases.firmId, firmId), isNull(cases.deletedAt))),
      db
        .select()
        .from(clients)
        .where(and(eq(clients.firmId, firmId), isNull(clients.deletedAt))),
      db
        .select()
        .from(leads)
        .where(and(eq(leads.firmId, firmId), isNull(leads.deletedAt))),
      db
        .select()
        .from(tasks)
        .where(and(eq(tasks.firmId, firmId), isNull(tasks.deletedAt), isNull(tasks.archivedAt))),
      db
        .select()
        .from(hearings)
        .where(and(eq(hearings.firmId, firmId), isNull(hearings.deletedAt))),
      db
        .select()
        .from(users)
        .where(and(eq(users.firmId, firmId), isNull(users.deletedAt), eq(users.isActive, true))),
    ]);

    const activeCases = allCases.filter((row) => row.status === "active");
    const openTasks = allTasks.filter(
      (row) => row.status === "todo" || row.status === "in_progress",
    );
    const scheduledHearings = allHearings.filter((row) => row.status === "scheduled");
    const hearingsByMonth = Object.entries(
      countBy(scheduledHearings, (row) => String(row.dateGregorian).slice(0, 7)),
    )
      .sort(([first], [second]) => first.localeCompare(second))
      .slice(0, 6)
      .map(([month, count]) => ({ month, count }));

    return {
      activeCases: activeCases.length,
      totalCases: allCases.length,
      activeClients: allClients.filter((row) => row.isActive).length,
      activeStaff: allUsers.filter((row) => row.role !== "client").length,
      openLeads: allLeads.filter((row) => row.status === "new" || row.status === "contacted")
        .length,
      openTasks: openTasks.length,
      upcomingHearings: scheduledHearings.length,
      mattersByPractice: countBy(activeCases, (row) => row.practiceArea || "Other"),
      casesByStatus: countBy(allCases, (row) => row.status || "open"),
      tasksByStatus: countBy(allTasks, (row) => row.status || "todo"),
      hearingsByMonth,
    };
  }
}
