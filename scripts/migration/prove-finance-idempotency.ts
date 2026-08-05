/**
 * R4.4 proof: double-submit payment/trust with the same idempotency key does not double-post.
 */
import { and, count, eq, isNull } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import { firmSettings, invoices, payments, trustTransactions } from "../../db/schema";
import { migrateFinancialExport } from "../../src/server/services/financial-migration";
import { POST as payInvoice } from "../../src/app/api/v1/financial/invoices/[id]/pay/route";
import { POST as createTrust } from "../../src/app/api/v1/financial/trust-transactions/route";
import { appendReconciliationReport } from "./report-writer";
import type { DomainMigrationReport } from "./types";

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

  await migrateFinancialExport({ exportPath, firmMap });

  const cookie = await signIn("boundary-a@example.invalid");
  const headers = { cookie, "content-type": "application/json" };

  const [invoice] = await database
    .select({ id: invoices.id, clientId: invoices.clientId, status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.firmId, firmA), isNull(invoices.deletedAt)))
    .limit(1);
  if (!invoice) throw new Error("No invoice available for idempotency proof");

  // Ensure a payable invoice for the payment double-submit path.
  if (invoice.status === "paid") {
    await database
      .update(invoices)
      .set({ status: "sent", paidDate: null, updatedAt: new Date() })
      .where(eq(invoices.id, invoice.id));
  }

  const payKey = `r44-pay-${Date.now()}`;
  const payBody = JSON.stringify({
    gateway: "bank_transfer",
    referenceNumber: `R44-${Date.now()}`,
    idempotencyKey: payKey,
  });

  const pay1 = await payInvoice(
    new Request(`http://local/api/v1/financial/invoices/${invoice.id}/pay`, {
      method: "POST",
      headers,
      body: payBody,
    }),
  );
  const pay2 = await payInvoice(
    new Request(`http://local/api/v1/financial/invoices/${invoice.id}/pay`, {
      method: "POST",
      headers,
      body: payBody,
    }),
  );
  if (!pay1.ok) throw new Error(`First pay failed: ${pay1.status} ${await pay1.text()}`);
  if (!pay2.ok) throw new Error(`Second pay failed: ${pay2.status} ${await pay2.text()}`);

  const pay1Body = (await pay1.json()) as { data: { paymentId: string; replayed?: boolean } };
  const pay2Body = (await pay2.json()) as { data: { paymentId: string; replayed?: boolean } };
  if (pay1Body.data.paymentId !== pay2Body.data.paymentId) {
    throw new Error("Payment double-submit returned different payment ids");
  }
  if (pay2Body.data.replayed !== true) {
    throw new Error("Second pay should be marked replayed");
  }

  const [paymentRows] = await database
    .select({ value: count() })
    .from(payments)
    .where(and(eq(payments.firmId, firmA), eq(payments.idempotencyKey, payKey)));
  if (paymentRows.value !== 1) {
    throw new Error(`Expected 1 payment for key, got ${paymentRows.value}`);
  }

  // Already-paid without a new key must not insert another completed payment.
  const beforePaidReplay = await database
    .select({ value: count() })
    .from(payments)
    .where(
      and(eq(payments.firmId, firmA), eq(payments.invoiceId, invoice.id), eq(payments.status, "completed")),
    );
  const pay3 = await payInvoice(
    new Request(`http://local/api/v1/financial/invoices/${invoice.id}/pay`, {
      method: "POST",
      headers,
      body: JSON.stringify({ gateway: "cash" }),
    }),
  );
  if (!pay3.ok) throw new Error(`Already-paid replay failed: ${pay3.status} ${await pay3.text()}`);
  const pay3Body = (await pay3.json()) as { data: { paymentId: string; replayed?: boolean } };
  if (pay3Body.data.replayed !== true) {
    throw new Error("Already-paid pay should replay existing payment");
  }
  const afterPaidReplay = await database
    .select({ value: count() })
    .from(payments)
    .where(
      and(eq(payments.firmId, firmA), eq(payments.invoiceId, invoice.id), eq(payments.status, "completed")),
    );
  if (afterPaidReplay[0].value !== beforePaidReplay[0].value) {
    throw new Error("Already-paid replay double-posted a payment");
  }

  const trustKey = `r44-trust-${Date.now()}`;
  const trustBody = JSON.stringify({
    clientId: invoice.clientId,
    type: "receipt",
    amount: 2500,
    description: "R4.4 idempotency trust receipt",
    date: "2026-08-05",
    balance: 2500,
    idempotencyKey: trustKey,
  });
  const trust1 = await createTrust(
    new Request("http://local/api/v1/financial/trust-transactions", {
      method: "POST",
      headers,
      body: trustBody,
    }),
  );
  const trust2 = await createTrust(
    new Request("http://local/api/v1/financial/trust-transactions", {
      method: "POST",
      headers,
      body: trustBody,
    }),
  );
  if (!trust1.ok) throw new Error(`First trust failed: ${trust1.status} ${await trust1.text()}`);
  if (!trust2.ok) throw new Error(`Second trust failed: ${trust2.status} ${await trust2.text()}`);
  const trust1Body = (await trust1.json()) as { data: { id: string; replayed?: boolean } };
  const trust2Body = (await trust2.json()) as { data: { id: string; replayed?: boolean } };
  if (trust1Body.data.id !== trust2Body.data.id) {
    throw new Error("Trust double-submit returned different ids");
  }
  if (trust2Body.data.replayed !== true) {
    throw new Error("Second trust should be marked replayed");
  }

  const [trustRows] = await database
    .select({ value: count() })
    .from(trustTransactions)
    .where(and(eq(trustTransactions.firmId, firmA), eq(trustTransactions.idempotencyKey, trustKey)));
  if (trustRows.value !== 1) {
    throw new Error(`Expected 1 trust row for key, got ${trustRows.value}`);
  }

  const report: DomainMigrationReport = {
    source: { paymentSubmits: 2, trustSubmits: 2, alreadyPaidReplays: 1 },
    migrated: { paymentsForKey: 1, trustForKey: 1, completedPaymentsStable: 1 },
    exceptions: [],
    reconciliation: {
      passed: true,
      checks: {
        paymentIdempotent: { source: 2, target: 1 },
        trustIdempotent: { source: 2, target: 1 },
        alreadyPaidNoDoublePost: { source: 1, target: 1 },
      },
    },
  };

  await appendReconciliationReport({
    domain: "r4.4",
    command: "prove-finance-idempotency",
    report,
    notes: [
      "R4.4 finance idempotency: same Idempotency-Key / body key replays payment and trust without double-post.",
      "Already-paid invoice pay without a new key returns existing completed payment.",
      `payKey=${payKey} trustKey=${trustKey}`,
    ],
  });

  console.log(
    JSON.stringify(
      {
        passed: true,
        paymentId: pay1Body.data.paymentId,
        trustId: trust1Body.data.id,
        paymentRows: paymentRows.value,
        trustRows: trustRows.value,
      },
      null,
      2,
    ),
  );
  console.log("migration:prove-finance-idempotency passed");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
  console.error("migration:prove-finance-idempotency failed");
} finally {
  await closeDatabase();
}
