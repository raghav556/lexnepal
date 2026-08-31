import type { Page } from "@playwright/test";
import { E2E_USERS } from "../../scripts/e2e/fixtures";

const fixtureIps: Record<string, string> = {
  [E2E_USERS.admin.email]: "127.0.2.10",
  [E2E_USERS.staff.email]: "127.0.2.11",
  [E2E_USERS.staff2.email]: "127.0.2.12",
  [E2E_USERS.client.email]: "127.0.2.13",
};

export async function prepareE2eAuth(page: Page, email: string): Promise<void> {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": fixtureIps[email] ?? "127.0.2.99" });
}
