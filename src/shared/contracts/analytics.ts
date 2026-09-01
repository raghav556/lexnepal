import { z } from "zod";

export const analyticsDashboardSchema = z.object({
  activeCases: z.number().int().nonnegative(),
  totalCases: z.number().int().nonnegative(),
  activeClients: z.number().int().nonnegative(),
  activeStaff: z.number().int().nonnegative(),
  openLeads: z.number().int().nonnegative(),
  openTasks: z.number().int().nonnegative(),
  upcomingHearings: z.number().int().nonnegative(),
  mattersByPractice: z.record(z.string(), z.number().int().nonnegative()),
  casesByStatus: z.record(z.string(), z.number().int().nonnegative()),
  tasksByStatus: z.record(z.string(), z.number().int().nonnegative()),
  hearingsByMonth: z.array(
    z.object({
      month: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
});

export type AnalyticsDashboardDto = z.infer<typeof analyticsDashboardSchema>;
