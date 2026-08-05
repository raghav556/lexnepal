import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import { users } from "../../db/schema";
import { migrateHrExport } from "../../src/server/services/hr-migration";
import {
  GET as listAttendance,
  POST as upsertAttendance,
} from "../../src/app/api/v1/hr/attendance/route";
import {
  GET as listLeave,
  POST as createLeave,
} from "../../src/app/api/v1/hr/leave-requests/route";
import { POST as reviewLeave } from "../../src/app/api/v1/hr/leave-requests/review/route";
import { GET as getPayroll } from "../../src/app/api/v1/hr/payroll/route";
import { POST as setBaseSalary } from "../../src/app/api/v1/hr/base-salary/route";

const database = getDatabase();
const firmA = "61000000-0000-4000-8000-000000000001";
const firmMap = { convex_firm_a: firmA };
const password = "Local-boundary-only-2026!";
const exportPath = "tests/fixtures/convex-hr-export";

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
  const report = await migrateHrExport({ exportPath, firmMap, orphanFirmId: firmA });
  if (!report.reconciliation.passed) {
    throw new Error(`HR migrate reconcile failed: ${JSON.stringify(report)}`);
  }

  const [adminA] = await database
    .update(users)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(users.email, "boundary-a@example.invalid"))
    .returning({ id: users.id, firmId: users.firmId });
  if (!adminA || adminA.firmId !== firmA) {
    throw new Error("boundary-a user missing or wrong firm");
  }

  await database
    .update(users)
    .set({ role: "associate", updatedAt: new Date() })
    .where(eq(users.email, "boundary-b@example.invalid"));

  const adminCookie = await signIn("boundary-a@example.invalid");
  const associateCookie = await signIn("boundary-b@example.invalid");

  const today = new Date().toISOString().slice(0, 10);

  const forbiddenPayroll = await getPayroll(
    new Request("http://local/api/v1/hr/payroll", { headers: { cookie: associateCookie } }),
  );
  if (forbiddenPayroll.status !== 403) {
    throw new Error(`Expected associate payroll 403, got ${forbiddenPayroll.status}`);
  }

  const attendanceList = await listAttendance(
    new Request(`http://local/api/v1/hr/attendance?date=2026-08-04`, {
      headers: { cookie: adminCookie },
    }),
  );
  if (!attendanceList.ok) {
    throw new Error(`List attendance failed: ${attendanceList.status} ${await attendanceList.text()}`);
  }
  const attendanceBody = (await attendanceList.json()) as { data: Array<{ status: string }> };
  if (!attendanceBody.data.some((row) => row.status === "present")) {
    throw new Error("Migrated attendance row missing");
  }

  const upsert = await upsertAttendance(
    new Request("http://local/api/v1/hr/attendance", {
      method: "POST",
      headers: { cookie: adminCookie, "content-type": "application/json" },
      body: JSON.stringify({
        userId: adminA.id,
        date: today,
        clockIn: "10:00 AM",
        status: "present",
      }),
    }),
  );
  if (!upsert.ok) {
    throw new Error(`Upsert attendance failed: ${upsert.status} ${await upsert.text()}`);
  }

  const leaveList = await listLeave(
    new Request("http://local/api/v1/hr/leave-requests", { headers: { cookie: adminCookie } }),
  );
  if (!leaveList.ok) throw new Error(`List leave failed: ${leaveList.status}`);
  const leaveBody = (await leaveList.json()) as {
    data: Array<{ id: string; status: string; reason: string | null }>;
  };
  const pending = leaveBody.data.find((row) => row.status === "pending");
  if (!pending) throw new Error("Migrated pending leave missing");

  const reviewed = await reviewLeave(
    new Request("http://local/api/v1/hr/leave-requests/review", {
      method: "POST",
      headers: { cookie: adminCookie, "content-type": "application/json" },
      body: JSON.stringify({ leaveRequestId: pending.id, status: "approved" }),
    }),
  );
  if (!reviewed.ok) {
    throw new Error(`Review leave failed: ${reviewed.status} ${await reviewed.text()}`);
  }

  const created = await createLeave(
    new Request("http://local/api/v1/hr/leave-requests", {
      method: "POST",
      headers: { cookie: associateCookie, "content-type": "application/json" },
      body: JSON.stringify({
        type: "sick",
        fromDate: today,
        toDate: today,
        reason: "verify-local",
      }),
    }),
  );
  if (!created.ok) {
    throw new Error(`Create leave failed: ${created.status} ${await created.text()}`);
  }

  const salary = await setBaseSalary(
    new Request("http://local/api/v1/hr/base-salary", {
      method: "POST",
      headers: { cookie: adminCookie, "content-type": "application/json" },
      body: JSON.stringify({ userId: adminA.id, baseSalary: 250000 }),
    }),
  );
  if (!salary.ok) {
    throw new Error(`Set salary failed: ${salary.status} ${await salary.text()}`);
  }

  const payroll = await getPayroll(
    new Request("http://local/api/v1/hr/payroll", { headers: { cookie: adminCookie } }),
  );
  if (!payroll.ok) {
    throw new Error(`Payroll failed: ${payroll.status} ${await payroll.text()}`);
  }
  const payrollBody = (await payroll.json()) as {
    data: Array<{ userId: string; gross: number; net: number; pf: number }>;
  };
  const row = payrollBody.data.find((r) => r.userId === adminA.id);
  if (!row || row.gross !== 250000 || row.pf !== 25000) {
    throw new Error(`Unexpected payroll row: ${JSON.stringify(row)}`);
  }

  console.log(
    JSON.stringify({
      migrate: report.reconciliation.checks,
      attendanceMigrated: attendanceBody.data.length,
      leaveApproved: true,
      payrollGross: row.gross,
      associatePayrollDenied: true,
    }),
  );
  console.log("hr:verify-local passed");
} finally {
  await database
    .update(users)
    .set({ role: "associate", updatedAt: new Date() })
    .where(eq(users.email, "boundary-a@example.invalid"));
  await database
    .update(users)
    .set({ role: "associate", updatedAt: new Date() })
    .where(eq(users.email, "boundary-b@example.invalid"));
  await closeDatabase();
}
