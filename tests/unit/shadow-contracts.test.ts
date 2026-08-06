import { describe, expect, it } from "vitest";
import {
  normalizeShadowPayload,
  shadowPayloadsMatch,
  shouldNormalizeShadowKey,
} from "../../src/shared/shadow/normalize";

describe("Shadow read normalization", () => {
  it("normalizes ids and timestamp-like keys", () => {
    expect(shouldNormalizeShadowKey("id")).toBe(true);
    expect(shouldNormalizeShadowKey("_id")).toBe(true);
    expect(shouldNormalizeShadowKey("createdAt")).toBe(true);
    expect(shouldNormalizeShadowKey("updatedAt")).toBe(true);
    expect(shouldNormalizeShadowKey("filingDate")).toBe(true);
    expect(shouldNormalizeShadowKey("title")).toBe(false);
  });

  it("compares payloads with timestamps stripped", () => {
    const exported = {
      id: "convex_1",
      title: "Case A",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const next = {
      id: "uuid-1",
      title: "Case A",
      status: "active",
      createdAt: "2026-08-05T12:00:00.000Z",
    };
    expect(shadowPayloadsMatch(exported, next)).toBe(true);
    expect(normalizeShadowPayload(exported)).toContain("[NORMALIZED]");
    expect(shadowPayloadsMatch(exported, { ...next, title: "Case B" })).toBe(false);
  });
});
