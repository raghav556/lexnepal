import { describe, expect, it } from "vitest";
import {
  normalizeShadowPayload,
  shadowPayloadsMatch,
  shouldNormalizeShadowKey,
} from "../../src/shared/shadow/normalize";
import { resolveBackendFlags } from "../../src/client/data/backend-config";

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
    const convex = {
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
    expect(shadowPayloadsMatch(convex, next)).toBe(true);
    expect(normalizeShadowPayload(convex)).toContain("[NORMALIZED]");
    expect(shadowPayloadsMatch(convex, { ...next, title: "Case B" })).toBe(false);
  });
});

describe("Shadow backend flag routing", () => {
  it("accepts shadow without treating it as next authority", () => {
    const flags = resolveBackendFlags({
      VITE_BACKEND_CASES: "shadow",
      VITE_BACKEND_DOCUMENTS: "next",
      VITE_BACKEND_FINANCE: "convex",
    });
    expect(flags.cases).toBe("shadow");
    expect(flags.documents).toBe("next");
    expect(flags.finance).toBe("convex");
  });
});
