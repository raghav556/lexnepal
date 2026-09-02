import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import { firmSettings, hearings, tasks, researchNotes } from "../../db/schema";
import { migrateWorkManagementExport } from "../../src/server/services/work-management-migration";
import { GET as listTasks } from "../../src/app/api/v1/tasks/route";
import { GET as listHearings } from "../../src/app/api/v1/hearings/route";
import { GET as listResearch } from "../../src/app/api/v1/research/route";
import { POST as scanOverdue } from "../../src/app/api/v1/tasks/overdue-reminders/route";

const database = getDatabase();
const firmA = "61000000-0000-4000-8000-000000000001";
const firmMap = { convex_firm_a: firmA };
const password = "Local-boundary-only-2026!";
const exportPath = "tests/fixtures/convex-work-management-export";

async function signIn(email: string) {
  const response = await getLocalAuth().api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  if (!response.ok)
    throw new Error(`Sign-in failed for ${email}. Run npm run auth:verify-boundary first.`);
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
        associate: ["cases.view_all", "cases.manage"],
      },
    })
    .onDuplicateKeyUpdate({
      set: {
        value: { associate: ["cases.view_all", "cases.manage"] },
        updatedAt: new Date(),
      },
    });

  const first = await migrateWorkManagementExport({ exportPath, firmMap });
  const second = await migrateWorkManagementExport({ exportPath, firmMap });
  if (!first.reconciliation.passed) {
    throw new Error(`First work-management migration failed: ${JSON.stringify(first, null, 2)}`);
  }
  if (!second.reconciliation.passed) {
    throw new Error(`Second work-management migration failed: ${JSON.stringify(second, null, 2)}`);
  }
  if (JSON.stringify(first.migrated) !== JSON.stringify(second.migrated)) {
    throw new Error("Idempotent re-run changed migrated counts");
  }

  const cookie = await signIn("boundary-a@example.invalid");
  const headers = { cookie };
  const tasksResponse = await listTasks(new Request("http://local/api/v1/tasks", { headers }));
  const hearingsResponse = await listHearings(
    new Request("http://local/api/v1/hearings", { headers }),
  );
  const researchResponse = await listResearch(
    new Request("http://local/api/v1/research", { headers }),
  );
  const overdueResponse = await scanOverdue(
    new Request("http://local/api/v1/tasks/overdue-reminders", { method: "POST", headers }),
  );

  if (!tasksResponse.ok) throw new Error(`Tasks list failed: ${tasksResponse.status}`);
  if (!hearingsResponse.ok) throw new Error(`Hearings list failed: ${hearingsResponse.status}`);
  if (!researchResponse.ok) throw new Error(`Research list failed: ${researchResponse.status}`);
  if (!overdueResponse.ok) throw new Error(`Overdue scan failed: ${overdueResponse.status}`);

  const taskBody = (await tasksResponse.json()) as { data: Array<{ _id: string; title: string }> };
  const hearingBody = (await hearingsResponse.json()) as {
    data: Array<{ _id: string; time?: string }>;
  };
  const researchBody = (await researchResponse.json()) as {
    data: Array<{ _id: string; tags?: string[] }>;
  };
  const overdueBody = (await overdueResponse.json()) as { data: { sent: number } };

  if (!taskBody.data.some((row) => row.title.includes("Prepare hearing brief"))) {
    throw new Error("Migrated task was not visible through Next.js tasks API");
  }
  if (
    !hearingBody.data.some(
      (row) => row.time === "10:30" || (row as { hearingTime?: string }).hearingTime === "10:30",
    )
  ) {
    throw new Error("Migrated hearing time alias missing from API DTO");
  }
  if (!researchBody.data.some((row) => (row.tags ?? []).includes("fixture"))) {
    throw new Error("Migrated research tags missing from API DTO");
  }
  if (typeof overdueBody.data.sent !== "number") {
    throw new Error("Overdue reminder scan did not return a sent count");
  }

  const [taskCount] = await database
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.firmId, firmA));
  const [hearingCount] = await database
    .select({ id: hearings.id })
    .from(hearings)
    .where(eq(hearings.firmId, firmA));
  const [researchCount] = await database
    .select({ id: researchNotes.id })
    .from(researchNotes)
    .where(eq(researchNotes.firmId, firmA));
  if (!taskCount || !hearingCount || !researchCount) {
    throw new Error("Expected firm-scoped work-management rows after migration");
  }

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        migrated: second.migrated,
        reconciliation: second.reconciliation,
        overdueSent: overdueBody.data.sent,
        apiCounts: {
          tasks: taskBody.data.length,
          hearings: hearingBody.data.length,
          research: researchBody.data.length,
        },
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await closeDatabase();
}
