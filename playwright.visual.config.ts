import path from "node:path";
import { defineConfig } from "@playwright/test";
import { resolveVisualArtifacts } from "./scripts/qa/client-visual-paths.mjs";

const artifacts = resolveVisualArtifacts();
export default defineConfig({
  testDir: "./tests/visual",
  testMatch: "client-visual.spec.ts",
  globalSetup: "./scripts/qa/build-client-visual-fixture.mjs",
  outputDir: path.join(artifacts, "playwright"),
  reporter: [["list"], ["json", { outputFile: path.join(artifacts, "playwright-results.json") }]],
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 120_000,
  forbidOnly: !!process.env.CI,
  use: {
    browserName: "chromium",
    headless: true,
    locale: "en-GB",
    timezoneId: "Asia/Kathmandu",
    colorScheme: "light",
    contextOptions: { reducedMotion: "reduce" },
    deviceScaleFactor: 1,
    serviceWorkers: "block",
    storageState: { cookies: [], origins: [] },
  },
  // Intentionally no baseURL or webServer. Never inherits localhost:3001.
});
