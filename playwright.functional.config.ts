import path from "node:path";
import { defineConfig } from "@playwright/test";
import { resolveFunctionalArtifacts } from "./scripts/qa/client-functional-paths.mjs";

const artifacts = resolveFunctionalArtifacts();
export default defineConfig({
  testDir: "./tests/functional",
  testMatch: "client-functional.spec.ts",
  globalSetup: "./scripts/qa/build-client-functional-fixture.mjs",
  outputDir: path.join(artifacts, "playwright"),
  reporter: [["list"], ["json", { outputFile: path.join(artifacts, "results.json") }]],
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5000 },
  forbidOnly: !!process.env.CI,
  use: {
    browserName: "chromium",
    headless: true,
    viewport: { width: 1440, height: 900 },
    locale: "en-GB",
    timezoneId: "Asia/Kathmandu",
    contextOptions: { reducedMotion: "reduce" },
    serviceWorkers: "block",
    storageState: { cookies: [], origins: [] },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  // No baseURL, webServer, environment file, or shared authentication state.
});
