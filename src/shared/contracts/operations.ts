import { z } from "zod";

export const serviceStatusSchema = z.enum(["ok", "degraded"]);

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  timestamp: z.string().datetime(),
});

export const readinessResponseSchema = z.object({
  status: serviceStatusSchema,
  service: z.string(),
  mode: z.enum(["foundation", "database"]),
  checks: z.record(z.string()),
  timestamp: z.string().datetime(),
});

export const versionResponseSchema = z.object({
  service: z.string(),
  apiVersion: z.string(),
  applicationVersion: z.string(),
  gitSha: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
export type VersionResponse = z.infer<typeof versionResponseSchema>;
