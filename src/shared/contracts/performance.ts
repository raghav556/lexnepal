import { z } from "zod";

/** Representative localhost volume for R4.8 list/search smoke (not a load test). */
export const PERFORMANCE_SMOKE_VOLUME = {
  clients: 120,
  cases: 250,
  documents: 500,
  tasks: 200,
} as const;

/**
 * Per-request budgets (ms) after a warm call. Local MySQL should stay
 * interactive for staff list/search pages at the volume above.
 */
export const PERFORMANCE_SMOKE_BUDGETS_MS = {
  clientsList: 2000,
  casesList: 2000,
  documentsList: 2000,
  documentsSearch: 2000,
  conflictSearch: 2000,
  tasksList: 2000,
} as const;

export const performanceSmokeVolumeSchema = z.object({
  clients: z.number().int().min(50).max(5_000),
  cases: z.number().int().min(50).max(10_000),
  documents: z.number().int().min(50).max(20_000),
  tasks: z.number().int().min(50).max(10_000),
});

export const performanceSmokeBudgetsSchema = z.object({
  clientsList: z.number().int().positive().max(30_000),
  casesList: z.number().int().positive().max(30_000),
  documentsList: z.number().int().positive().max(30_000),
  documentsSearch: z.number().int().positive().max(30_000),
  conflictSearch: z.number().int().positive().max(30_000),
  tasksList: z.number().int().positive().max(30_000),
});

export const performanceSmokeResultSchema = z.object({
  name: z.string().min(1),
  ms: z.number().nonnegative(),
  budgetMs: z.number().positive(),
  passed: z.boolean(),
  rows: z.number().int().nonnegative().optional(),
});

export type PerformanceSmokeVolume = z.infer<typeof performanceSmokeVolumeSchema>;
export type PerformanceSmokeBudgets = z.infer<typeof performanceSmokeBudgetsSchema>;
export type PerformanceSmokeResult = z.infer<typeof performanceSmokeResultSchema>;
