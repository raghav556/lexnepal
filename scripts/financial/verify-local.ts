import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import { expenses, firmSettings, invoices, timeEntries, trustTransactions } from "../../db/schema";
import { migrateFinancialExport } from "../../src/server/services/financial-migration";
import { GET as listInvoices } from "../../next-app/app/api/v1/financial/invoices/route";
import { GET as listTimeEntries } from "../../next-app/app/api/v1/financial/time-entries/route";
import { GET as listTrust } from "../../next-app/app/api/v1/financial/trust-transactions/route";
import { GET as listExpenses } from "../../next-app/app/api/v1/financial/expenses/route";
import { GET as expenseStats } from "../../next-app/app/api/v1/financial/expenses/stats/route";
import { POST as createTimeEntry } from "../../next-app/app/api/v1/financial/time-entries/route";

const database = getDatabase();
const firmA = "61000000-0000-4000-8000-000000000001";
const firmMap = { convex_firm_a: firmA };
const password = "Local-boundary-only-2026!";
const exportPath = "tests/fixtures/convex-financial-export";

async function signIn(email: string) {
  const response = await getLocalAuth().api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  if (!response.ok) throw new Error(`Sign-in failed for ${email}. Run auth:verify-boundary first.`);
  const cookie = response.headers.get("set-cookie");
  if (!cookie) throw new Error("Session cookie missing");
  return cookie;
}

try {
  await database
    .insert(firmSettings)
    .values({
      firmId: firmA,
      key: "rolePermissions",
      value: {
        associate: ["cases.view_all", "cases.manage", "finance.manage", "clients.view_all"],
      },
    })
    .onConflictDoUpdate({
      target: [firmSettings.firmId, firmSettings.key],
      set: {
        value: {
          associate: ["cases.view_all", "cases.manage", "finance.manage", "clients.view_all"],
        },
        updatedAt: new Date(),
      },
    });

  const first = await migrateFinancialExport({ exportPath, firmMap });
  const second = await migrateFinancialExport({ exportPath, firmMap });
  if (!first.reconciliation.passed) {
    throw new Error(`First financial migration failed: ${JSON.stringify(first, null, 2)}`);
  }
  if (!second.reconciliation.passed) {
    throw new Error(`Second financial migration failed: ${JSON.stringify(second, null, 2)}`);
  }

  const cookie = await signIn("boundary-a@example.invalid");
  const headers = { cookie, "content-type": "application/json" };

  const invoicesResponse = await listInvoices(new Request("http://local/api/v1/financial/invoices", { headers }));
  const timeResponse = await listTimeEntries(
    new Request("http://local/api/v1/financial/time-entries", { headers }),
  );
  const trustResponse = await listTrust(
    new Request("http://local/api/v1/financial/trust-transactions", { headers }),
  );
  const expensesResponse = await listExpenses(
    new Request("http://local/api/v1/financial/expenses", { headers }),
  );
  const statsResponse = await expenseStats(
    new Request("http://local/api/v1/financial/expenses/stats", { headers }),
  );

  if (!invoicesResponse.ok) throw new Error(`Invoices list failed: ${invoicesResponse.status}`);
  if (!timeResponse.ok) throw new Error(`Time entries list failed: ${timeResponse.status}`);
  if (!trustResponse.ok) throw new Error(`Trust list failed: ${trustResponse.status}`);
  if (!expensesResponse.ok) throw new Error(`Expenses list failed: ${expensesResponse.status}`);
  if (!statsResponse.ok) throw new Error(`Expense stats failed: ${statsResponse.status}`);

  const invoiceBody = (await invoicesResponse.json()) as { data: Array<{ invoiceNumber: string; total: number }> };
  const timeBody = (await timeResponse.json()) as { data: Array<{ _id: string; date?: string }> };
  const trustBody = (await trustResponse.json()) as { data: Array<{ amount: number }> };
  const expenseBody = (await expensesResponse.json()) as { data: Array<{ category: string }> };
  const statsBody = (await statsResponse.json()) as { data: { count: number; pending: number } };

  if (!invoiceBody.data.some((row) => row.invoiceNumber === "INV-FIX001" && row.total === 11300)) {
    throw new Error("Migrated invoice missing or totals not numeric");
  }
  if (!timeBody.data.some((row) => row.date === "2026-08-02")) {
    throw new Error("Migrated time entry date alias missing");
  }
  if (!trustBody.data.some((row) => row.amount === 50000)) {
    throw new Error("Migrated trust amount missing");
  }
  if (!expenseBody.data.some((row) => row.category === "court_fees")) {
    throw new Error("Migrated expense missing");
  }
  if (statsBody.data.count < 1) throw new Error("Expense stats empty");

  const [invoice] = invoiceBody.data;
  const caseId = (
    await database.select({ caseId: invoices.caseId }).from(invoices).where(eq(invoices.firmId, firmA)).limit(1)
  )[0]?.caseId;
  if (!caseId) throw new Error("No case linked for create-time test");

  const createResponse = await createTimeEntry(
    new Request("http://local/api/v1/financial/time-entries", {
      method: "POST",
      headers,
      body: JSON.stringify({
        caseId,
        description: "Verify-local time entry",
        minutes: 30,
        isBillable: true,
        date: "2026-08-04",
        ratePerHour: 4000,
      }),
    }),
  );
  if (!createResponse.ok) {
    throw new Error(`Create time entry failed: ${createResponse.status} ${await createResponse.text()}`);
  }

  const [timeCount] = await database.select({ id: timeEntries.id }).from(timeEntries).where(eq(timeEntries.firmId, firmA));
  const [trustCount] = await database
    .select({ id: trustTransactions.id })
    .from(trustTransactions)
    .where(eq(trustTransactions.firmId, firmA));
  const [expenseCount] = await database.select({ id: expenses.id }).from(expenses).where(eq(expenses.firmId, firmA));
  if (!timeCount || !trustCount || !expenseCount || !invoice) {
    throw new Error("Expected firm-scoped financial rows after migration");
  }

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        migrated: second.migrated,
        reconciliation: second.reconciliation,
        apiCounts: {
          invoices: invoiceBody.data.length,
          timeEntries: timeBody.data.length,
          trust: trustBody.data.length,
          expenses: expenseBody.data.length,
        },
        stats: statsBody.data,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await closeDatabase();
}
