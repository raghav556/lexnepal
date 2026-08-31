import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.E2E_BASE_URL ?? process.env.NEXT_PROOF_BASE_URL ?? "http://127.0.0.1:3001";

/**
 * R5.7 browser smoke against Next on :3001.
 * Prefer an already-running `npm run start` / `dev:next` (reuseExistingServer).
 * Set E2E_START_SERVER=1 to let Playwright spawn `npm run start`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "tmp/e2e-smoke-report.json" }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: process.env.E2E_START_SERVER
    ? {
        command: "npm run start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      }
    : undefined,
});
