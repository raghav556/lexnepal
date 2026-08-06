import { z } from "zod";

export const conflictHitSeveritySchema = z.enum(["high", "medium", "low"]);
export type ConflictHitSeverity = z.infer<typeof conflictHitSeveritySchema>;

export const conflictHitTypeSchema = z.enum([
  "Existing Client",
  "Existing Case",
  "Opposing Counsel",
  "Lead / Inquiry",
  "Consultation Request",
  "KYC Identity",
]);
export type ConflictHitType = z.infer<typeof conflictHitTypeSchema>;

export const conflictSearchScopeSchema = z.object({
  clients: z.boolean().default(true),
  cases: z.boolean().default(true),
  leads: z.boolean().default(true),
  appointments: z.boolean().default(true),
});

export const conflictPreviewSchema = z.object({
  query: z.string().trim().min(2).max(250),
  scope: conflictSearchScopeSchema.optional(),
});

export const conflictOfficialSearchSchema = conflictPreviewSchema.extend({
  matterContext: z
    .object({
      clientName: z.string().trim().max(250).optional(),
      opposingCounsel: z.string().trim().max(500).optional(),
      caseNumber: z.string().trim().max(100).optional(),
    })
    .optional(),
});

export const conflictDecisionSchema = z.object({
  status: z.enum(["cleared", "conflict"]),
  notes: z.string().trim().max(5_000).optional().nullable(),
});

export const caseConflictDecisionSchema = z.object({
  cleared: z.boolean(),
  notes: z.string().trim().max(5_000).optional().nullable(),
});

export type ConflictPreviewInput = z.infer<typeof conflictPreviewSchema>;
export type ConflictOfficialSearchInput = z.infer<typeof conflictOfficialSearchSchema>;
export type ConflictSearchScope = z.infer<typeof conflictSearchScopeSchema>;

export interface ConflictHitDto {
  type: ConflictHitType | string;
  id: string;
  name: string;
  reason: string;
  matchedField: string;
  severity: ConflictHitSeverity;
  caseId?: string;
  caseNumber?: string;
  clientId?: string;
  href?: string;
  recordStatus?: string;
  relatedCaseCount?: number;
}

export interface ConflictSearchResultDto {
  hits: ConflictHitDto[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
  query: string;
  searchedAt: string;
}

export interface ConflictOfficialResultDto extends ConflictSearchResultDto {
  checkId: string;
}

export interface ConflictCheckStatsDto {
  totalChecks: number;
  pendingReviews: number;
  clearedCount: number;
  conflictCount: number;
  checksThisMonth: number;
}
