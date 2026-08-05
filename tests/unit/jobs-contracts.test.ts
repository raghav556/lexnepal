import { describe, expect, it } from "vitest";
import {
  jobListQuerySchema,
  jobManualRetrySchema,
  jobStatusSchema,
} from "../../src/shared/contracts/jobs";

describe("Durable jobs input contracts", () => {
  it("validates manual retry reason bounds", () => {
    expect(jobManualRetrySchema.safeParse({ reason: "Fixed SMTP config" }).success).toBe(true);
    expect(jobManualRetrySchema.safeParse({ reason: "ab" }).success).toBe(false);
    expect(jobManualRetrySchema.safeParse({ reason: "   " }).success).toBe(false);
    expect(jobManualRetrySchema.safeParse({}).success).toBe(false);
  });

  it("validates job status enum and list query", () => {
    expect(jobStatusSchema.safeParse("dead_letter").success).toBe(true);
    expect(jobStatusSchema.safeParse("unknown").success).toBe(false);
    expect(jobListQuerySchema.safeParse({ status: "retry", limit: "50" }).success).toBe(true);
    expect(jobListQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(jobListQuerySchema.safeParse({ limit: 201 }).success).toBe(false);
  });
});
