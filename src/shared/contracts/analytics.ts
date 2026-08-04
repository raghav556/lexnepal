import { z } from "zod";

export const analyticsDashboardSchema = z.object({
  totalRevenue: z.number(),
  realizationRate: z.number(),
  avgCaseValue: z.number(),
  totalCases: z.number(),
  totalClients: z.number(),
  retentionRate: z.number(),
  outstanding: z.number(),
  totalExpenses: z.number(),
  openLeads: z.number(),
  revenueByPractice: z.record(z.string(), z.number()),
  hoursByAssociate: z.record(z.string(), z.number()),
  monthlyRevenue: z.array(
    z.object({
      month: z.string(),
      revenue: z.number(),
    }),
  ),
  casesByStatus: z.record(z.string(), z.number()),
  kpis: z.object({
    activeCases: z.number(),
    totalClients: z.number(),
    revenue: z.number(),
    outstanding: z.number(),
    totalExpenses: z.number(),
  }),
});

export type AnalyticsDashboardDto = z.infer<typeof analyticsDashboardSchema>;
