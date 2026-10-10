import { describe, expect, it } from "vitest";
import { visualRoutes, visualViewports, visualStates } from "../visual/support/catalog";
import { createVisualData } from "../visual/support/scenarios";
import { compareRgbPixels } from "../visual/support/pixel-comparison";
import path from "node:path";
import { root, validateVisualArtifactPath } from "../../scripts/qa/client-visual-paths.mjs";

describe("CUI-19 artifact write containment", () => {
  it("accepts a dedicated ignored QA run", () => {
    const destination = path.join(root, ".local/qa/cui-19/unit-synthetic-run");
    expect(validateVisualArtifactPath(destination)).toBe(destination);
  });
  it("rejects application and preview directories", () => {
    expect(() => validateVisualArtifactPath(root)).toThrow("dedicated run");
    expect(() => validateVisualArtifactPath(path.join(root, "src"))).toThrow("dedicated run");
  });
  it("rejects traversal and the evidence root itself", () => {
    expect(() => validateVisualArtifactPath(path.join(root, ".local/qa/cui-19"))).toThrow();
    expect(() =>
      validateVisualArtifactPath(path.join(root, ".local/qa/cui-19/../preview")),
    ).toThrow();
  });
});

describe("CUI-19 deterministic synthetic visual inputs", () => {
  it("covers twelve unique Client routes at six locked widths", () => {
    expect(new Set(visualRoutes.map((screen) => screen.route)).size).toBe(12);
    expect(visualViewports.map((viewport) => viewport.width)).toEqual([
      1440, 1280, 1024, 768, 390, 360,
    ]);
    expect(visualViewports.every((viewport) => viewport.height > 0)).toBe(true);
  });
  it.each(visualStates)("generates independent, repeatable %s inputs", (state) => {
    const first = createVisualData(state);
    const second = createVisualData(state);
    expect(first).toEqual(second);
    expect(first.cases).not.toBe(second.cases);
    first.client.fullName = "Changed only in this fixture";
    expect(second.client.fullName).toBe("Ravi Sharma");
  });
  it("keeps empty results distinct from no-upcoming records", () => {
    expect(createVisualData("empty").hearings).toEqual([]);
    const data = createVisualData("no-upcoming");
    expect(data.hearings).toHaveLength(1);
    expect(data.hearings[0].status).toBe("completed");
    expect(data.appointments[0].status).toBe("completed");
  });
  it("provides long unbroken filenames and large collections without writes", () => {
    expect(createVisualData("long-text").documents[0].title.length).toBeGreaterThan(180);
    expect(createVisualData("long-text").files[0].fileName.length).toBeGreaterThan(180);
    expect(createVisualData("high-volume").cases).toHaveLength(120);
    expect(createVisualData("high-volume").messages.page).toHaveLength(120);
  });
  it("represents completed signing records without pending requests", () => {
    const data = createVisualData("complete");
    expect(data.inbox.pendingDirect).toEqual([]);
    expect(data.inbox.recentlySigned[0].document.signedAt).toBeTruthy();
  });
});

describe("CUI-19 pixel regression comparison", () => {
  it("passes identical pixels", () => {
    expect(
      compareRgbPixels(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]), 1, 1).changedPixels,
    ).toBe(0);
  });
  it("detects a changed pixel even when only one channel changes", () => {
    const result = compareRgbPixels(
      new Uint8Array([1, 2, 4, 5, 6, 7]),
      new Uint8Array([1, 2, 3, 5, 6, 7]),
      2,
      1,
    );
    expect(result.changedPixels).toBe(1);
    expect(result.changedRatio).toBe(0.5);
  });
  it("rejects differently scaled or incomplete images", () => {
    expect(() => compareRgbPixels(new Uint8Array(3), new Uint8Array(6), 1, 1)).toThrow(
      "identical unscaled",
    );
    expect(() => compareRgbPixels(new Uint8Array(0), new Uint8Array(0), 0, 0)).toThrow();
  });
});
