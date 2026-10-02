import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { e2ePasswordFor, UI_PREVIEW_CLIENT } from "../../scripts/e2e/fixtures";
import { UI_PREVIEW_CASES } from "../../scripts/e2e/client-ui-preview-contract";
import { prepareE2eAuth } from "./auth-helpers";

const evidence = path.resolve(process.cwd(), "..", "..", "qa", "cui-17", "implementation");

async function signIn(page: Page) {
  await prepareE2eAuth(page, UI_PREVIEW_CLIENT.email);
  const login = await page.request.post("/api/auth/sign-in/email", {
    data: {
      email: UI_PREVIEW_CLIENT.email,
      password: e2ePasswordFor(UI_PREVIEW_CLIENT.email),
    },
    timeout: 120_000,
  });
  expect(login.ok(), await login.text()).toBe(true);
}

async function stubGet(page: Page, pattern: RegExp, status: number, data: unknown = []) {
  await page.route(pattern, async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(status === 200 ? { data } : { error: { message: "Unavailable" } }),
    });
  });
}

test.describe("CUI-17 truthful Client states", () => {
  test.describe.configure({ timeout: 600_000 });

  test("failed Client record differs from a successful null on representative routes", async ({
    page,
  }) => {
    await mkdir(evidence, { recursive: true });
    await signIn(page);
    await stubGet(page, /\/api\/v1\/clients\/me(?:\?|$)/, 503);
    for (const route of ["/client", "/client/documents", "/client/kyc"]) {
      await page.goto(route);
      await expect(page.getByText("Unable to load your client profile")).toBeVisible({
        timeout: 120_000,
      });
      await expect(page.getByText(/No client profile linked/i)).toHaveCount(0);
    }
    await page.screenshot({
      path: path.join(evidence, "01-client-record-error.png"),
      fullPage: true,
    });
    await page.unrouteAll({ behavior: "wait" });
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByText("Unable to load your client profile")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Submitted documents" })).toBeVisible();
    await stubGet(page, /\/api\/v1\/clients\/me(?:\?|$)/, 200, null);
    await page.goto("/client");
    await expect(page.getByText("No client profile linked")).toBeVisible();
    await expect(page.getByText("Unable to load your client profile")).toHaveCount(0);
  });

  test("dependent sections distinguish request failure from empty and retry", async ({ page }) => {
    await mkdir(evidence, { recursive: true });
    await signIn(page);

    await stubGet(page, /\/api\/v1\/documents(?:\?|$)/, 503);
    await page.goto("/client");
    await expect(page.getByRole("heading", { name: "Your Matters" })).toBeVisible({
      timeout: 120_000,
    });
    await expect(page.getByText("Unable to load documents")).toBeVisible();
    await expect(page.getByText("Preparing your portal")).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidence, "02-home-partial-error.png"),
      fullPage: true,
    });
    await page.unrouteAll({ behavior: "wait" });
    await page
      .locator('[data-slot="dashboard-empty-state"]')
      .filter({ hasText: "Unable to load documents" })
      .getByRole("button", { name: "Try again" })
      .click();
    await expect(page.getByText("Unable to load documents")).toHaveCount(0);
    await stubGet(page, /\/api\/v1\/documents(?:\?|$)/, 503);
    await page.goto("/client/documents");
    await expect(page.getByText("Unable to load documents")).toBeVisible();
    await expect(page.getByText("No documents yet")).toHaveCount(0);
    await page.screenshot({ path: path.join(evidence, "03-documents-error.png"), fullPage: true });
    await page.unrouteAll({ behavior: "wait" });

    const casesResponse = await page.request.get("/api/v1/cases");
    expect(casesResponse.ok()).toBe(true);
    const cases = (await casesResponse.json()).data as Array<{ _id: string; caseNumber: string }>;
    const matter = cases.find((item) => item.caseNumber === UI_PREVIEW_CASES.primary.caseNumber);
    expect(matter).toBeTruthy();
    await stubGet(page, /\/api\/v1\/documents(?:\?|$)/, 503);
    await page.goto(`/client/cases/${matter!._id}`);
    await page.getByRole("tab", { name: "Documents" }).click();
    await expect(page.getByText("Unable to load documents")).toBeVisible();
    await page.unrouteAll({ behavior: "wait" });

    await stubGet(page, /\/api\/v1\/hearings(?:\?|$)/, 503);
    await page.goto("/client/hearings");
    await expect(page.getByText("Unable to load hearings")).toBeVisible();
    await expect(page.getByText("No upcoming hearings")).toHaveCount(0);
    await page.unrouteAll({ behavior: "wait" });

    await stubGet(page, /\/api\/v1\/tasks(?:\?|$)/, 503);
    await page.goto("/client/checklist");
    await expect(page.getByText("Unable to load action items")).toBeVisible();
    await expect(page.getByText("No shared action items yet")).toHaveCount(0);
    await page.unrouteAll({ behavior: "wait" });

    await stubGet(page, /\/api\/v1\/cases(?:\?|$)/, 503);
    await page.goto("/client/checklist");
    await expect(page.getByText("Unable to load your matters")).toBeVisible();
    await expect(page.getByText("No shared action items yet")).toHaveCount(0);
    await page.unrouteAll({ behavior: "wait" });

    await stubGet(page, /\/api\/v1\/clients\/[^/]+\/kyc-files(?:\?|$)/, 503);
    await page.goto("/client/kyc");
    await expect(page.getByText("Unable to load submitted documents")).toBeVisible();
    await expect(page.getByText("No documents have been submitted yet.")).toHaveCount(0);
    await page.unrouteAll({ behavior: "wait" });
    await page
      .locator('[data-slot="dashboard-empty-state"]')
      .filter({ hasText: "Unable to load submitted documents" })
      .getByRole("button", { name: "Try again" })
      .click();
    await expect(page.getByText("Unable to load submitted documents")).toHaveCount(0);

    await stubGet(page, /\/api\/v1\/documents(?:\?|$)/, 200, []);
    await page.goto("/client/documents");
    await expect(page.getByText("No documents yet")).toBeVisible();
    await expect(page.getByText("Unable to load documents")).toHaveCount(0);
    await page.unrouteAll({ behavior: "wait" });
    await page.goto("/client/documents");
    await expect(page.getByText("Document Library")).toBeVisible();
  });

  test("conversation, slot, and Profile failures stay recoverable", async ({ page }) => {
    await mkdir(evidence, { recursive: true });
    await signIn(page);
    await stubGet(page, /\/api\/v1\/cases(?:\?|$)/, 503);
    await page.goto("/client/messages");
    await expect(page.getByText("Unable to load conversations")).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText("No matters yet")).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidence, "04-messages-list-error.png"),
      fullPage: true,
    });
    await page.unrouteAll({ behavior: "wait" });
    await stubGet(page, /\/api\/v1\/cases(?:\?|$)/, 200, []);
    await page.goto("/client/messages");
    await expect(page.getByText("No matters yet")).toBeVisible();
    await page.unrouteAll({ behavior: "wait" });

    await page.route(/\/api\/v1\/messages\/read$/, (route) => route.abort());
    await stubGet(page, /\/api\/v1\/messages(?:\?|$)/, 503);
    await page.goto("/client/messages");
    const list = page.getByRole("list", { name: "Matter conversations" });
    await expect(list).toBeVisible();
    await list.getByRole("button").first().click();
    await expect(page.getByText("Unable to load messages")).toBeVisible();
    await expect(
      page.getByText("No messages yet. Send a note or document to begin this conversation."),
    ).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidence, "05-messages-thread-error.png"),
      fullPage: true,
    });
    await page.unrouteAll({ behavior: "wait" });
    await page
      .locator('[data-slot="dashboard-empty-state"]')
      .filter({ hasText: "Unable to load messages" })
      .getByRole("button", { name: "Try again" })
      .click();
    await expect(page.getByText("Unable to load messages")).toHaveCount(0);
    await page.route(/\/api\/v1\/messages\/read$/, (route) => route.abort());
    await stubGet(page, /\/api\/v1\/messages(?:\?|$)/, 200, {
      page: [],
      isDone: true,
      continueCursor: "",
    });
    await page.goto("/client/messages");
    await page
      .getByRole("list", { name: "Matter conversations" })
      .getByRole("button")
      .first()
      .click();
    await expect(
      page.getByText("No messages yet. Send a note or document to begin this conversation."),
    ).toBeVisible();
    await page.unrouteAll({ behavior: "wait" });

    await stubGet(page, /\/api\/v1\/appointments\/slots(?:\?|$)/, 503);
    await page.goto("/client/booking");
    await expect(page.getByText("Availability could not be loaded")).toBeVisible();
    await expect(page.getByText("No available times on this date.")).toHaveCount(0);
    await page.screenshot({ path: path.join(evidence, "06-slots-error.png"), fullPage: true });
    await page.unrouteAll({ behavior: "wait" });
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByText("Availability could not be loaded")).toHaveCount(0);
    await stubGet(page, /\/api\/v1\/appointments\/slots(?:\?|$)/, 200, []);
    await page.goto("/client/booking");
    await expect(page.getByText("No available times on this date.")).toBeVisible();
    await page.unrouteAll({ behavior: "wait" });

    await stubGet(page, /\/api\/v1\/users\/me\/audit-events(?:\?|$)/, 503);
    await page.goto("/client/profile");
    await page.getByRole("tab", { name: "Data & Privacy" }).click();
    await expect(page.getByText("Activity unavailable")).toBeVisible();
    await page.screenshot({
      path: path.join(evidence, "07-profile-activity-error.png"),
      fullPage: true,
    });
    await page.unrouteAll({ behavior: "wait" });
    await page
      .locator('[data-slot="dashboard-empty-state"]')
      .filter({ hasText: "Activity unavailable" })
      .getByRole("button", { name: "Try again" })
      .click();
    await expect(page.getByText("Activity unavailable")).toHaveCount(0);

    await stubGet(page, /\/api\/v1\/users\/[^/]+\/sessions(?:\?|$)/, 503);
    await page.goto("/client/profile");
    await page.getByRole("tab", { name: "Active Sessions" }).click();
    await expect(page.getByText("Sessions unavailable")).toBeVisible();
    await page.screenshot({
      path: path.join(evidence, "08-profile-sessions-error.png"),
      fullPage: true,
    });
    await page.unrouteAll({ behavior: "wait" });
    await page
      .locator('[data-slot="dashboard-empty-state"]')
      .filter({ hasText: "Sessions unavailable" })
      .getByRole("button", { name: "Try again" })
      .click();
    await expect(page.getByText("Sessions unavailable")).toHaveCount(0);
  });
});
