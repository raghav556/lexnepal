import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "../../scripts/e2e/fixtures";

test("document generator resolves editor variables and clears a case when the client changes", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/sign-in/email", {
    data: { email: E2E_USERS.admin.email, password: E2E_PASSWORD },
  });
  expect(login.ok()).toBe(true);
  const data = {
    "document-templates": [
      {
        _id: "template-one",
        title: "Generator regression",
        category: "other",
        htmlContent:
          "<p>Client: {{client.name}}</p><p>Case: {{case.title}} ({{case.number}})</p><p>Lawyer: {{lawyer.name}}</p>",
        variables: ["client.name", "case.title", "case.number", "lawyer.name"],
      },
    ],
    clients: [
      { _id: "client-one", fullName: "Test Client", phone: "", address: "" },
      { _id: "client-two", fullName: "Second Client", phone: "", address: "" },
    ],
    cases: [
      {
        _id: "case-one",
        clientId: "client-one",
        title: "Test Matter",
        caseNumber: "TEST-01",
        assignedLawyerId: "lawyer-one",
      },
    ],
    users: [{ id: "lawyer-one", name: "Test Lawyer" }],
    firm: { id: "firm-one", name: "Test Firm" },
    documents: [],
  };
  for (const [endpoint, value] of Object.entries(data)) {
    await page.route(new RegExp(`/api/v1/${endpoint}(?:\\?.*)?$`), (route) =>
      route.fulfill({ json: { data: value } }),
    );
  }
  await page.route("**/api/v1/document-upload-intents", (route) =>
    route.fulfill({
      status: 201,
      json: {
        data: {
          intentId: "upload-one",
          upload: { url: "/api/v1/storage/uploads/test", fields: {} },
        },
      },
    }),
  );
  await page.route("**/api/v1/storage/uploads/test", (route) =>
    route.fulfill({ status: 201, json: {} }),
  );
  await page.route("**/api/v1/document-upload-intents/upload-one/complete", (route) =>
    route.fulfill({ status: 202, json: { data: { status: "queued" } } }),
  );
  await page.goto("/admin/document-generator");
  await page.getByRole("button", { name: "Generator regression" }).click();
  const selectors = page.locator("main select");
  await selectors.nth(0).selectOption("client-one");
  await selectors.nth(1).selectOption("case-one");
  await selectors.nth(0).selectOption("client-two");
  await expect(selectors.nth(1)).toHaveValue("");
  await selectors.nth(0).selectOption("client-one");
  await selectors.nth(1).selectOption("case-one");
  const download = page.waitForEvent("download");
  const uploadIntent = page.waitForRequest("**/api/v1/document-upload-intents");
  await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/TEST-01\.pdf$/);
  expect((await uploadIntent).postDataJSON().metadata).toMatchObject({
    title: "Generator regression — Test Client",
    type: "other",
    tags: ["generated", "other"],
    isTemplate: false,
    isPrivileged: false,
  });
  await expect(page.locator("main pre")).toHaveText(
    "Client: Test Client\nCase: Test Matter (TEST-01)\nLawyer: Test Lawyer",
  );
  await expect(
    page.getByText("Document generated and saved to case files.", { exact: true }),
  ).toBeVisible();
});
