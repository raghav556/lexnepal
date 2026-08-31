import { describe, expect, it } from "vitest";
import {
  hearingCreateSchema,
  taskCreateSchema,
  taskListSchema,
  researchCreateSchema,
} from "../../src/shared/contracts/work-management";

describe("Work Management input contracts", () => {
  it("validates hearing creation rules", () => {
    const validHearing = {
      caseId: "123e4567-e89b-12d3-a456-426614174000",
      court: "Supreme Court",
      dateGregorian: "2026-10-10",
      dateBs: "2083-06-24",
      hearingTime: "10:30",
    };

    expect(hearingCreateSchema.safeParse(validHearing).success).toBe(true);

    // Invalid time format
    expect(hearingCreateSchema.safeParse({ ...validHearing, hearingTime: "10-30" }).success).toBe(
      false,
    );
    expect(
      hearingCreateSchema.safeParse({ ...validHearing, hearingTime: "10:30 AM" }).success,
    ).toBe(false);
  });

  it("validates task creation limits and date-only due dates", () => {
    const validTask = {
      title: "File appeal",
      assignedTo: "123e4567-e89b-12d3-a456-426614174000",
      priority: "high",
      category: "court",
      dueDate: "2026-10-10",
    };

    const parsed = taskCreateSchema.safeParse(validTask);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.dueDate).toBe("2026-10-10T00:00:00.000Z");
    }

    // Invalid priority
    expect(taskCreateSchema.safeParse({ ...validTask, priority: "very-high" }).success).toBe(false);
  });

  it("accepts parentTaskId on task list filters", () => {
    const parsed = taskListSchema.safeParse({
      parentTaskId: "123e4567-e89b-12d3-a456-426614174000",
      includeArchived: "true",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.includeArchived).toBe(true);
    }
  });

  it("validates research tags limit", () => {
    const validResearch = {
      title: "Precedent 1",
      category: "supreme_court",
      content: "Details",
      tags: ["tag1", "tag2"],
    };

    expect(researchCreateSchema.safeParse(validResearch).success).toBe(true);

    // Too many tags
    const manyTags = Array.from({ length: 25 }, (_, i) => `tag${i}`);
    expect(researchCreateSchema.safeParse({ ...validResearch, tags: manyTags }).success).toBe(
      false,
    );
  });
});
