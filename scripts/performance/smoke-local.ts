/**
 * R4.8 — Seed representative local volume and time list/search Route Handlers.
 * Pass rule: each measured endpoint stays under PERFORMANCE_SMOKE_BUDGETS_MS.
 */
import { and, count, eq, like } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import {
  cases,
  clients,
  documents,
  firmSettings,
  invoices,
  tasks,
  users,
} from "../../db/schema";
import {
  PERFORMANCE_SMOKE_BUDGETS_MS,
  PERFORMANCE_SMOKE_VOLUME,
  type PerformanceSmokeResult,
} from "../../src/shared/contracts/performance";
import { GET as listClients } from "../../src/app/api/v1/clients/route";
import { GET as listCases } from "../../src/app/api/v1/cases/route";
import { GET as listDocuments } from "../../src/app/api/v1/documents/route";
import { GET as searchDocuments } from "../../src/app/api/v1/documents/search/route";
import { POST as conflictSearch } from "../../src/app/api/v1/conflict-checks/search/route";
import { GET as listInvoices } from "../../src/app/api/v1/financial/invoices/route";
import { GET as listTasks } from "../../src/app/api/v1/tasks/route";

const database = getDatabase();
const firmA = "61000000-0000-4000-8000-000000000001";
const password = "Local-boundary-only-2026!";
const PREFIX = "perf-smoke";

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

async function ensurePermissions() {
  await database
    .insert(firmSettings)
    .values({
      firmId: firmA,
      key: "rolePermissions",
      value: {
        associate: [
          "users.view_directory",
          "clients.view_all",
          "clients.manage",
          "cases.view_all",
          "cases.manage",
          "documents.read",
          "documents.upload",
          "documents.share",
          "documents.delete",
          "finance.manage",
          "conflicts.manage",
        ],
      },
    })
    .onConflictDoUpdate({
      target: [firmSettings.firmId, firmSettings.key],
      set: {
        value: {
          associate: [
            "users.view_directory",
            "clients.view_all",
            "clients.manage",
            "cases.view_all",
            "cases.manage",
            "documents.read",
            "documents.upload",
            "documents.share",
            "documents.delete",
            "finance.manage",
            "conflicts.manage",
          ],
        },
        updatedAt: new Date(),
      },
    });
}

async function countPrefixed(table: typeof clients | typeof cases | typeof documents | typeof invoices | typeof tasks) {
  const [row] = await database
    .select({ value: count() })
    .from(table)
    .where(and(eq(table.firmId, firmA), like(table.legacyConvexId, `${PREFIX}%`)));
  return row.value;
}

async function seedVolume(lawyerId: string) {
  const existingClients = await countPrefixed(clients);
  if (existingClients >= PERFORMANCE_SMOKE_VOLUME.clients) {
    return {
      seeded: false,
      clients: existingClients,
      cases: await countPrefixed(cases),
      documents: await countPrefixed(documents),
      invoices: await countPrefixed(invoices),
      tasks: await countPrefixed(tasks),
    };
  }

  const clientRows = Array.from({ length: PERFORMANCE_SMOKE_VOLUME.clients }, (_, i) => ({
    firmId: firmA,
    type: "individual" as const,
    fullName: `Perf Smoke Client ${String(i + 1).padStart(4, "0")}`,
    email: `perf-client-${i + 1}@example.invalid`,
    kycStatus: "pending" as const,
    isActive: true,
    legacyConvexId: `${PREFIX}-client-${i + 1}`,
  }));
  for (let offset = 0; offset < clientRows.length; offset += 50) {
    await database.insert(clients).values(clientRows.slice(offset, offset + 50)).onConflictDoNothing();
  }

  const seededClients = await database
    .select({ id: clients.id, legacyConvexId: clients.legacyConvexId })
    .from(clients)
    .where(and(eq(clients.firmId, firmA), like(clients.legacyConvexId, `${PREFIX}-client-%`)));
  if (seededClients.length < PERFORMANCE_SMOKE_VOLUME.clients) {
    throw new Error(`Client seed incomplete: ${seededClients.length}`);
  }

  const caseRows = Array.from({ length: PERFORMANCE_SMOKE_VOLUME.cases }, (_, i) => {
    const client = seededClients[i % seededClients.length]!;
    return {
      firmId: firmA,
      caseNumber: `PERF-${String(i + 1).padStart(5, "0")}`,
      title: `Perf Smoke Matter ${i + 1} Retainer Review`,
      practiceArea: "civil",
      status: "active" as const,
      clientId: client.id,
      assignedLawyerId: lawyerId,
      opposingCounsel: i % 7 === 0 ? `Opposing Counsel ${i}` : null,
      conflictChecked: false,
      legacyConvexId: `${PREFIX}-case-${i + 1}`,
    };
  });
  for (let offset = 0; offset < caseRows.length; offset += 50) {
    await database.insert(cases).values(caseRows.slice(offset, offset + 50)).onConflictDoNothing();
  }

  const seededCases = await database
    .select({ id: cases.id })
    .from(cases)
    .where(and(eq(cases.firmId, firmA), like(cases.legacyConvexId, `${PREFIX}-case-%`)));
  if (seededCases.length < PERFORMANCE_SMOKE_VOLUME.cases) {
    throw new Error(`Case seed incomplete: ${seededCases.length}`);
  }

  const docRows = Array.from({ length: PERFORMANCE_SMOKE_VOLUME.documents }, (_, i) => {
    const matter = seededCases[i % seededCases.length]!;
    return {
      firmId: firmA,
      caseId: matter.id,
      documentNumber: `PERF-DOC-${String(i + 1).padStart(5, "0")}`,
      title: `Perf Smoke Brief ${i + 1} petition filing`,
      type: "pleading" as const,
      storageId: `protected/${firmA}/perf-smoke/${i + 1}`,
      mimeType: "application/pdf",
      sizeBytes: 2048,
      uploadedBy: lawyerId,
      isTemplate: false,
      isPrivileged: false,
      uploadStatus: "clean" as const,
      confidentialityLevel: "confidential" as const,
      legacyConvexId: `${PREFIX}-doc-${i + 1}`,
    };
  });
  for (let offset = 0; offset < docRows.length; offset += 50) {
    await database.insert(documents).values(docRows.slice(offset, offset + 50)).onConflictDoNothing();
  }

  const invoiceRows = Array.from({ length: PERFORMANCE_SMOKE_VOLUME.invoices }, (_, i) => {
    const matter = seededCases[i % seededCases.length]!;
    const client = seededClients[i % seededClients.length]!;
    const subtotal = 1000 + (i % 50) * 100;
    const vat = Math.round(subtotal * 0.13);
    return {
      firmId: firmA,
      invoiceNumber: `PERF-INV-${String(i + 1).padStart(5, "0")}`,
      caseId: matter.id,
      clientId: client.id,
      status: "sent" as const,
      subtotal: String(subtotal),
      vatAmount: String(vat),
      total: String(subtotal + vat),
      issuedDate: "2026-08-01",
      dueDate: "2026-08-31",
      legacyConvexId: `${PREFIX}-inv-${i + 1}`,
    };
  });
  for (let offset = 0; offset < invoiceRows.length; offset += 50) {
    await database.insert(invoices).values(invoiceRows.slice(offset, offset + 50)).onConflictDoNothing();
  }

  const taskRows = Array.from({ length: PERFORMANCE_SMOKE_VOLUME.tasks }, (_, i) => {
    const matter = seededCases[i % seededCases.length]!;
    return {
      firmId: firmA,
      caseId: matter.id,
      title: `Perf Smoke Task ${i + 1}`,
      assignedTo: lawyerId,
      createdBy: lawyerId,
      status: "todo" as const,
      priority: (i % 3 === 0 ? "high" : "medium") as "high" | "medium",
      clientVisible: false,
      isRecurring: false,
      legacyConvexId: `${PREFIX}-task-${i + 1}`,
    };
  });
  for (let offset = 0; offset < taskRows.length; offset += 50) {
    await database.insert(tasks).values(taskRows.slice(offset, offset + 50)).onConflictDoNothing();
  }

  return {
    seeded: true,
    clients: await countPrefixed(clients),
    cases: await countPrefixed(cases),
    documents: await countPrefixed(documents),
    invoices: await countPrefixed(invoices),
    tasks: await countPrefixed(tasks),
  };
}

async function measure(
  name: keyof typeof PERFORMANCE_SMOKE_BUDGETS_MS,
  run: () => Promise<{ ok: boolean; rows?: number; detail?: string }>,
): Promise<PerformanceSmokeResult> {
  const budgetMs = PERFORMANCE_SMOKE_BUDGETS_MS[name];
  // Warm path (auth + query plan) once, then measure.
  const warm = await run();
  if (!warm.ok) throw new Error(`${name} warm failed: ${warm.detail ?? "unknown"}`);

  const started = performance.now();
  const result = await run();
  const ms = performance.now() - started;
  if (!result.ok) throw new Error(`${name} measured call failed: ${result.detail ?? "unknown"}`);
  return {
    name,
    ms: Number(ms.toFixed(1)),
    budgetMs,
    passed: ms <= budgetMs,
    rows: result.rows,
  };
}

try {
  await ensurePermissions();

  const [boundaryUser] = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "boundary-a@example.invalid"))
    .limit(1);
  if (!boundaryUser) throw new Error("boundary-a user missing. Run auth:verify-boundary first.");

  const volume = await seedVolume(boundaryUser.id);
  for (const [key, minimum] of Object.entries(PERFORMANCE_SMOKE_VOLUME) as Array<
    [keyof typeof PERFORMANCE_SMOKE_VOLUME, number]
  >) {
    if (volume[key] < minimum) {
      throw new Error(`Volume shortfall for ${key}: have ${volume[key]}, need ${minimum}`);
    }
  }

  const cookie = await signIn("boundary-a@example.invalid");
  const headers = { cookie, "content-type": "application/json" };

  const results: PerformanceSmokeResult[] = [];

  results.push(
    await measure("clientsList", async () => {
      const response = await listClients(new Request("http://local/api/v1/clients", { headers }));
      if (!response.ok) return { ok: false, detail: `${response.status}` };
      const body = (await response.json()) as { data: unknown[] };
      return { ok: Array.isArray(body.data) && body.data.length > 0, rows: body.data.length };
    }),
  );

  results.push(
    await measure("casesList", async () => {
      const response = await listCases(new Request("http://local/api/v1/cases", { headers }));
      if (!response.ok) return { ok: false, detail: `${response.status}` };
      const body = (await response.json()) as { data: unknown[] };
      return { ok: Array.isArray(body.data) && body.data.length > 0, rows: body.data.length };
    }),
  );

  results.push(
    await measure("documentsList", async () => {
      const response = await listDocuments(new Request("http://local/api/v1/documents", { headers }));
      if (!response.ok) return { ok: false, detail: `${response.status}` };
      const body = (await response.json()) as { data: unknown[] };
      return { ok: Array.isArray(body.data) && body.data.length > 0, rows: body.data.length };
    }),
  );

  results.push(
    await measure("documentsSearch", async () => {
      const response = await searchDocuments(
        new Request("http://local/api/v1/documents/search?query=petition", { headers }),
      );
      if (!response.ok) return { ok: false, detail: `${response.status}` };
      const body = (await response.json()) as { data: unknown[] };
      return { ok: Array.isArray(body.data), rows: body.data.length };
    }),
  );

  results.push(
    await measure("conflictSearch", async () => {
      const response = await conflictSearch(
        new Request("http://local/api/v1/conflict-checks/search", {
          method: "POST",
          headers,
          body: JSON.stringify({ query: "Perf Smoke" }),
        }),
      );
      if (!response.ok) return { ok: false, detail: `${response.status} ${await response.text()}` };
      const body = (await response.json()) as { data: unknown };
      return { ok: body.data != null, rows: 1 };
    }),
  );

  results.push(
    await measure("invoicesList", async () => {
      const response = await listInvoices(
        new Request("http://local/api/v1/financial/invoices", { headers }),
      );
      if (!response.ok) return { ok: false, detail: `${response.status}` };
      const body = (await response.json()) as { data: unknown[] };
      return { ok: Array.isArray(body.data) && body.data.length > 0, rows: body.data.length };
    }),
  );

  results.push(
    await measure("tasksList", async () => {
      const response = await listTasks(new Request("http://local/api/v1/tasks", { headers }));
      if (!response.ok) return { ok: false, detail: `${response.status}` };
      const body = (await response.json()) as { data: unknown[] };
      return { ok: Array.isArray(body.data) && body.data.length > 0, rows: body.data.length };
    }),
  );

  const passed = results.every((row) => row.passed);
  const evidence = {
    r48: {
      passed,
      volume,
      budgetsMs: PERFORMANCE_SMOKE_BUDGETS_MS,
      results,
    },
  };
  console.log(JSON.stringify(evidence));
  if (!passed) {
    const failed = results.filter((row) => !row.passed);
    throw new Error(`Performance smoke exceeded budget: ${JSON.stringify(failed)}`);
  }
  console.log("performance:smoke-local passed");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
  console.error("performance:smoke-local failed");
} finally {
  await closeDatabase().catch(() => undefined);
}
