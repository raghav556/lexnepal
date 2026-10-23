import { expect, test, type Page } from "@playwright/test";
import { e2ePasswordFor, E2E_USERS } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

async function signIn(page: Page, email: string) {
  await prepareE2eAuth(page, email);
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill(e2ePasswordFor(email));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff(\/|$)/, { timeout: 20_000 });
}

test.describe("Staff HR self-service", () => {
  test("staff can open HR and submit a leave request", async ({ page }) => {
    await signIn(page, E2E_USERS.staff.email);

    // This smoke test must never submit leave or trigger notifications in the
    // persistent fixture database. Read/refetch and mutation responses stay local.
    const requests: Record<string, unknown>[] = [];
    let staffId = "";
    await page.route("**/api/v1/hr/**", async (route) => {
      const url = new URL(route.request().url());
      staffId = url.searchParams.get("userId") || staffId;
      if (route.request().method() === "POST") {
        expect(url.pathname).toBe("/api/v1/hr/leave-requests");
        const body = route.request().postDataJSON();
        requests.push({
          ...body,
          id: `synthetic-${requests.length}`,
          _id: `synthetic-${requests.length}`,
          userId: staffId,
          firmId: "synthetic",
          status: "pending",
          reviewedBy: null,
        });
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ data: requests.at(-1) }),
        });
      }
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ data: url.pathname.endsWith("leave-requests") ? requests : [] }),
      });
    });

    await page.goto("/staff/hr");
    await expect(page.getByRole("heading", { name: "Human Resources" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("tab", { name: /Attendance/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Leave & Requests", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Payslips/i })).toHaveCount(0);

    await page.getByRole("tab", { name: "Leave & Requests", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Request Leave", exact: true })).toBeVisible();

    const reason = `E2E leave ${Date.now()}`;
    await page.getByLabel("Type").click();
    await page.getByRole("option", { name: "Unpaid leave", exact: true }).click();
    await page.getByLabel("Reason (optional)").fill(reason);
    await page.getByRole("button", { name: "Submit Request", exact: true }).click();

    await expect(page.locator(".staff-hr-feedback")).toContainText(
      "Leave request submitted for review.",
      {
        timeout: 15_000,
      },
    );
    await expect(page.getByTestId("leave-request-row").filter({ hasText: reason })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page
        .getByTestId("leave-request-row")
        .filter({ hasText: reason })
        .getByText("Pending", { exact: true }),
    ).toBeVisible();
  });
});
