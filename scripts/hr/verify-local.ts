import { returningInsert } from "@/server/db/mysql-returning";
import { returningMutation } from "@/server/db/mysql-returning";
import { and, desc, eq, isNull } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import {
  auditLog,
  authUsers,
  durableJobs,
  leaveBalances,
  leaveRequests,
  notifications,
  payrollRuns,
  users,
} from "../../db/schema";
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
import {
  GET as listLeaveBalances,
  POST as upsertLeaveBalance,
} from "../../src/app/api/v1/hr/leave-balances/route";
import {
  GET as listPayrollRuns,
  POST as createPayrollRun,
} from "../../src/app/api/v1/hr/payroll/runs/route";
import { POST as finalizePayrollRun } from "../../src/app/api/v1/hr/payroll/runs/[id]/finalize/route";
import { GET as listPayslips } from "../../src/app/api/v1/hr/payroll/payslips/route";
import { leaveChargeDays } from "../../src/shared/hr/leave-days";

const database = getDatabase();
const firmA = "61000000-0000-4000-8000-000000000001";
const firmMap = { convex_firm_a: firmA };
const password = "Local-boundary-only-2026!";
const exportPath = "tests/fixtures/convex-hr-export";
const associateEmail = "hr-verify-associate@example.invalid";

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

async function ensureFirmAssociate() {
  const [lexUser] = await returningInsert(
    database
      .insert(users)
      .values({
        firmId: firmA,
        tokenIdentifier: `hr-verify:${associateEmail}`,
        email: associateEmail,
        name: "HR Verify Associate",
        role: "associate",
        isActive: true,
        isPending: false,
      })
      .onDuplicateKeyUpdate({
        set: {
          role: "associate",
          isActive: true,
          isPending: false,
          updatedAt: new Date(),
        },
      })
      .$returningId(),
    (id) => database.select().from(users).where(eq(users.id, id)).limit(1),
  );
  if (!lexUser) throw new Error("Failed to ensure HR verify associate");

  const [existingAuth] = await database
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.lexnepalUserId, lexUser.id))
    .limit(1);
  if (existingAuth) await database.delete(authUsers).where(eq(authUsers.id, existingAuth.id));

  const created = await getLocalAuth().api.createUser({
    body: {
      name: "HR Verify Associate",
      email: associateEmail,
      password,
      role: "user",
      data: { lexnepalUserId: lexUser.id },
    },
  });
  await database
    .update(authUsers)
    .set({ emailVerified: true })
    .where(eq(authUsers.id, created.user.id));

  return lexUser;
}

try {
  const report = await migrateHrExport({ exportPath, firmMap, orphanFirmId: firmA });
  if (!report.reconciliation.passed) {
    throw new Error(`HR migrate reconcile failed: ${JSON.stringify(report)}`);
  }

  const [adminA] = await returningMutation(
    database
      .update(users)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(users.email, "boundary-a@example.invalid")),
    () => database.select().from(users).where(eq(users.email, "boundary-a@example.invalid")),
  );
  if (!adminA || adminA.firmId !== firmA) {
    throw new Error("boundary-a user missing or wrong firm");
  }

  const associate = await ensureFirmAssociate();

  // This verifier is intentionally repeatable. Its dedicated associate survives between
  // local runs, so remove only that fixture user's prior leave state before asserting
  // balance arithmetic. Without this reset, earlier approved/pending requests accumulate
  // and eventually make a healthy implementation look overdrawn.
  await database
    .delete(leaveRequests)
    .where(and(eq(leaveRequests.firmId, firmA), eq(leaveRequests.userId, associate.id)));
  await database
    .delete(leaveBalances)
    .where(and(eq(leaveBalances.firmId, firmA), eq(leaveBalances.userId, associate.id)));

  const adminCookie = await signIn("boundary-a@example.invalid");
  const associateCookie = await signIn(associateEmail);

  const today = new Date().toISOString().slice(0, 10);

  // HR-S2: associate without hr.manage cannot view payroll
  const forbiddenPayroll = await getPayroll(
    new Request("http://local/api/v1/hr/payroll", { headers: { cookie: associateCookie } }),
  );
  if (forbiddenPayroll.status !== 403) {
    throw new Error(`Expected associate payroll 403, got ${forbiddenPayroll.status}`);
  }

  // HR-S1: associate cannot mark peer attendance
  const peerDenied = await upsertAttendance(
    new Request("http://local/api/v1/hr/attendance", {
      method: "POST",
      headers: { cookie: associateCookie, "content-type": "application/json" },
      body: JSON.stringify({
        userId: adminA.id,
        date: today,
        clockIn: "09:00 AM",
        status: "present",
      }),
    }),
  );
  if (peerDenied.status !== 403) {
    throw new Error(`Expected associate peer attendance 403, got ${peerDenied.status}`);
  }

  // HR-S1: associate can mark self
  const selfOk = await upsertAttendance(
    new Request("http://local/api/v1/hr/attendance", {
      method: "POST",
      headers: { cookie: associateCookie, "content-type": "application/json" },
      body: JSON.stringify({
        userId: associate.id,
        date: today,
        clockIn: "09:15 AM",
        status: "present",
      }),
    }),
  );
  if (!selfOk.ok) {
    throw new Error(`Associate self attendance failed: ${selfOk.status} ${await selfOk.text()}`);
  }

  // Non-managers only see their own attendance even without userId filter
  const scopedList = await listAttendance(
    new Request("http://local/api/v1/hr/attendance", {
      headers: { cookie: associateCookie },
    }),
  );
  if (!scopedList.ok) {
    throw new Error(`Associate attendance list failed: ${scopedList.status}`);
  }
  const scopedBody = (await scopedList.json()) as { data: Array<{ userId: string }> };
  if (scopedBody.data.some((row) => row.userId !== associate.id)) {
    throw new Error("Associate attendance list leaked another user's rows");
  }

  // HR-S2: associate cannot review leave
  const associateReviewDenied = await reviewLeave(
    new Request("http://local/api/v1/hr/leave-requests/review", {
      method: "POST",
      headers: { cookie: associateCookie, "content-type": "application/json" },
      body: JSON.stringify({
        leaveRequestId: "00000000-0000-4000-8000-000000000099",
        status: "approved",
      }),
    }),
  );
  if (associateReviewDenied.status !== 403) {
    throw new Error(`Expected associate leave review 403, got ${associateReviewDenied.status}`);
  }

  const attendanceList = await listAttendance(
    new Request(`http://local/api/v1/hr/attendance?date=2026-08-04`, {
      headers: { cookie: adminCookie },
    }),
  );
  if (!attendanceList.ok) {
    throw new Error(
      `List attendance failed: ${attendanceList.status} ${await attendanceList.text()}`,
    );
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
  const pending = leaveBody.data.find((row) => row.status === "pending") as
    | {
        id: string;
        status: string;
        reason: string | null;
        fromDate?: string;
        toDate?: string;
        userId?: string;
      }
    | undefined;
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
  const reviewedBody = (await reviewed.json()) as {
    data: { fromDate: string; toDate: string; userId: string };
  };
  const syncedDates = leaveChargeDays(reviewedBody.data.fromDate, reviewedBody.data.toDate, {
    skipWeekends: true,
  });
  for (const date of syncedDates) {
    const dayList = await listAttendance(
      new Request(
        `http://local/api/v1/hr/attendance?date=${date}&userId=${reviewedBody.data.userId}`,
        {
          headers: { cookie: adminCookie },
        },
      ),
    );
    if (!dayList.ok) throw new Error(`Attendance sync list failed for ${date}`);
    const dayBody = (await dayList.json()) as { data: Array<{ status: string }> };
    if (!dayBody.data.some((row) => row.status === "leave")) {
      throw new Error(`Expected leave attendance on ${date} after approve`);
    }
  }

  const year = Number(today.slice(0, 4));
  const balanceSet = await upsertLeaveBalance(
    new Request("http://local/api/v1/hr/leave-balances", {
      method: "POST",
      headers: { cookie: adminCookie, "content-type": "application/json" },
      body: JSON.stringify({
        userId: associate.id,
        type: "annual",
        year,
        entitledDays: 1,
      }),
    }),
  );
  if (!balanceSet.ok) {
    throw new Error(`Set leave balance failed: ${balanceSet.status} ${await balanceSet.text()}`);
  }

  // Find a Mon–Fri window in the future for a 5-weekday request
  const start = new Date(`${today}T12:00:00Z`);
  while (start.getUTCDay() !== 1) start.setUTCDate(start.getUTCDate() + 1);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 4);
  const weekFrom = start.toISOString().slice(0, 10);
  const weekTo = end.toISOString().slice(0, 10);

  const overBalance = await createLeave(
    new Request("http://local/api/v1/hr/leave-requests", {
      method: "POST",
      headers: { cookie: associateCookie, "content-type": "application/json" },
      body: JSON.stringify({
        type: "annual",
        fromDate: weekFrom,
        toDate: weekTo,
        reason: "over-balance",
      }),
    }),
  );
  if (overBalance.status !== 400) {
    throw new Error(`Expected over-balance leave 400, got ${overBalance.status}`);
  }

  const balanceTopUp = await upsertLeaveBalance(
    new Request("http://local/api/v1/hr/leave-balances", {
      method: "POST",
      headers: { cookie: adminCookie, "content-type": "application/json" },
      body: JSON.stringify({
        userId: associate.id,
        type: "annual",
        year,
        entitledDays: 10,
      }),
    }),
  );
  if (!balanceTopUp.ok) {
    throw new Error(`Top-up leave balance failed: ${balanceTopUp.status}`);
  }

  const oneDayAnnual = await createLeave(
    new Request("http://local/api/v1/hr/leave-requests", {
      method: "POST",
      headers: { cookie: associateCookie, "content-type": "application/json" },
      body: JSON.stringify({
        type: "annual",
        fromDate: weekFrom,
        toDate: weekFrom,
        reason: "one-day-annual",
      }),
    }),
  );
  if (!oneDayAnnual.ok) {
    throw new Error(
      `One-day annual leave failed: ${oneDayAnnual.status} ${await oneDayAnnual.text()}`,
    );
  }
  const oneDayBody = (await oneDayAnnual.json()) as { data: { id: string } };

  const managerNotes = await database
    .select({ title: notifications.title, relatedId: notifications.relatedId })
    .from(notifications)
    .where(and(eq(notifications.firmId, firmA), eq(notifications.userId, adminA.id)))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
  if (
    !managerNotes.some(
      (n) => n.title === "Leave request submitted" && n.relatedId === oneDayBody.data.id,
    )
  ) {
    throw new Error(
      `Expected leave-submit notification for admin; saw ${JSON.stringify(managerNotes.slice(0, 5))}`,
    );
  }

  const leaveEmailJobs = await database
    .select({ type: durableJobs.type, payload: durableJobs.payload })
    .from(durableJobs)
    .where(and(eq(durableJobs.firmId, firmA), eq(durableJobs.type, "communication.email")))
    .orderBy(desc(durableJobs.createdAt))
    .limit(30);
  if (
    !leaveEmailJobs.some((job) => {
      const payload = job.payload as { subject?: string; to?: string };
      return (
        payload.subject === "Leave request submitted" &&
        typeof payload.to === "string" &&
        payload.to.length > 0
      );
    })
  ) {
    throw new Error("Expected leave-submit email job for hr.manage recipients");
  }

  const balances = await listLeaveBalances(
    new Request(`http://local/api/v1/hr/leave-balances?userId=${associate.id}&year=${year}`, {
      headers: { cookie: associateCookie },
    }),
  );
  if (!balances.ok) throw new Error(`List balances failed: ${balances.status}`);
  const balancesBody = (await balances.json()) as {
    data: Array<{ type: string; remainingDays: number; pendingDays: number }>;
  };
  const annualBal = balancesBody.data.find((b) => b.type === "annual");
  if (!annualBal || annualBal.pendingDays < 1 || annualBal.remainingDays < 1) {
    throw new Error(`Unexpected annual balance after pending: ${JSON.stringify(annualBal)}`);
  }

  const reviewedAnnual = await reviewLeave(
    new Request("http://local/api/v1/hr/leave-requests/review", {
      method: "POST",
      headers: { cookie: adminCookie, "content-type": "application/json" },
      body: JSON.stringify({ leaveRequestId: oneDayBody.data.id, status: "approved" }),
    }),
  );
  if (!reviewedAnnual.ok) {
    throw new Error(
      `Review one-day annual failed: ${reviewedAnnual.status} ${await reviewedAnnual.text()}`,
    );
  }

  const requesterNotes = await database
    .select({ title: notifications.title, relatedId: notifications.relatedId })
    .from(notifications)
    .where(and(eq(notifications.firmId, firmA), eq(notifications.userId, associate.id)))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
  if (
    !requesterNotes.some(
      (n) => n.title === "Leave request approved" && n.relatedId === oneDayBody.data.id,
    )
  ) {
    throw new Error(
      `Expected leave-decision notification for associate; saw ${JSON.stringify(requesterNotes.slice(0, 5))}`,
    );
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

  // Also give associate a salary so they appear on payroll runs / payslips
  const associateSalary = await setBaseSalary(
    new Request("http://local/api/v1/hr/base-salary", {
      method: "POST",
      headers: { cookie: adminCookie, "content-type": "application/json" },
      body: JSON.stringify({ userId: associate.id, baseSalary: 100000 }),
    }),
  );
  if (!associateSalary.ok) {
    throw new Error(`Associate salary failed: ${associateSalary.status}`);
  }

  const periodStart = `${today.slice(0, 7)}-01`;
  const periodEndDay = new Date(
    Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0),
  ).getUTCDate();
  const periodEnd = `${today.slice(0, 7)}-${String(periodEndDay).padStart(2, "0")}`;

  // Re-runs: retire prior runs for this period so draft→finalize stays idempotent.
  await database
    .update(payrollRuns)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(payrollRuns.firmId, firmA),
        eq(payrollRuns.periodStart, periodStart),
        eq(payrollRuns.periodEnd, periodEnd),
        isNull(payrollRuns.deletedAt),
      ),
    );

  const deniedRuns = await listPayrollRuns(
    new Request("http://local/api/v1/hr/payroll/runs", { headers: { cookie: associateCookie } }),
  );
  if (deniedRuns.status !== 403) {
    throw new Error(`Expected associate payroll runs 403, got ${deniedRuns.status}`);
  }

  const createdRun = await createPayrollRun(
    new Request("http://local/api/v1/hr/payroll/runs", {
      method: "POST",
      headers: { cookie: adminCookie, "content-type": "application/json" },
      body: JSON.stringify({ periodStart, periodEnd, label: "HR-5 verify" }),
    }),
  );
  if (!createdRun.ok) {
    throw new Error(`Create payroll run failed: ${createdRun.status} ${await createdRun.text()}`);
  }
  const createdRunBody = (await createdRun.json()) as { data: { id: string; status: string } };
  if (createdRunBody.data.status !== "draft") {
    throw new Error("Expected draft payroll run");
  }

  const emptyPayslips = await listPayslips(
    new Request("http://local/api/v1/hr/payroll/payslips", {
      headers: { cookie: associateCookie },
    }),
  );
  if (!emptyPayslips.ok) throw new Error(`Payslips list failed: ${emptyPayslips.status}`);
  const emptyPayslipBody = (await emptyPayslips.json()) as { data: unknown[] };
  if (emptyPayslipBody.data.length !== 0) {
    throw new Error("Draft runs must not appear on staff payslips");
  }

  const finalized = await finalizePayrollRun(
    new Request(`http://local/api/v1/hr/payroll/runs/${createdRunBody.data.id}/finalize`, {
      method: "POST",
      headers: { cookie: adminCookie, "content-type": "application/json" },
      body: "{}",
    }),
  );
  if (!finalized.ok) {
    throw new Error(`Finalize payroll failed: ${finalized.status} ${await finalized.text()}`);
  }

  const payslips = await listPayslips(
    new Request("http://local/api/v1/hr/payroll/payslips", {
      headers: { cookie: associateCookie },
    }),
  );
  if (!payslips.ok) throw new Error(`Payslips after finalize failed: ${payslips.status}`);
  const payslipBody = (await payslips.json()) as {
    data: Array<{ runId: string; line: { userId: string; net: number } }>;
  };
  if (!payslipBody.data.some((p) => p.runId === createdRunBody.data.id && p.line.net > 0)) {
    throw new Error(`Associate payslip missing after finalize: ${JSON.stringify(payslipBody)}`);
  }

  // HR-S2: partner with default hr.manage can generate payroll + mark peer
  await database
    .update(users)
    .set({ role: "partner", updatedAt: new Date() })
    .where(eq(users.id, associate.id));
  const partnerCookie = await signIn(associateEmail);
  const partnerPayroll = await getPayroll(
    new Request("http://local/api/v1/hr/payroll", { headers: { cookie: partnerCookie } }),
  );
  if (!partnerPayroll.ok) {
    throw new Error(
      `Expected partner payroll 200, got ${partnerPayroll.status} ${await partnerPayroll.text()}`,
    );
  }

  const partnerPeer = await upsertAttendance(
    new Request("http://local/api/v1/hr/attendance", {
      method: "POST",
      headers: { cookie: partnerCookie, "content-type": "application/json" },
      body: JSON.stringify({
        userId: adminA.id,
        date: today,
        clockIn: "11:00 AM",
        status: "present",
      }),
    }),
  );
  if (!partnerPeer.ok) {
    throw new Error(
      `Partner peer attendance failed: ${partnerPeer.status} ${await partnerPeer.text()}`,
    );
  }

  const recentActions = await database
    .select({ action: auditLog.action })
    .from(auditLog)
    .where(and(eq(auditLog.firmId, firmA), eq(auditLog.userId, adminA.id)))
    .orderBy(desc(auditLog.createdAt))
    .limit(20);
  const actions = new Set(recentActions.map((a) => a.action));
  for (const required of [
    "hr.attendance_upserted",
    "hr.leave_approved",
    "hr.salary_set",
    "hr.payroll_generated",
  ] as const) {
    if (!actions.has(required)) {
      throw new Error(`Missing audit action ${required}; saw ${[...actions].join(",")}`);
    }
  }

  const associateAudits = await database
    .select({ action: auditLog.action })
    .from(auditLog)
    .where(and(eq(auditLog.firmId, firmA), eq(auditLog.userId, associate.id)))
    .orderBy(desc(auditLog.createdAt))
    .limit(20);
  if (!associateAudits.some((a) => a.action === "hr.leave_created")) {
    throw new Error("Missing hr.leave_created audit for associate");
  }
  if (!associateAudits.some((a) => a.action === "hr.attendance_upserted")) {
    throw new Error("Missing hr.attendance_upserted audit for associate self clock");
  }

  console.log(
    JSON.stringify({
      migrate: report.reconciliation.checks,
      attendanceMigrated: attendanceBody.data.length,
      leaveApproved: true,
      payrollGross: row.gross,
      associatePayrollDenied: true,
      associatePeerAttendanceDenied: true,
      associateSelfAttendanceOk: true,
      associateAttendanceScoped: true,
      partnerPayrollAllowed: true,
      partnerPeerAttendanceOk: true,
      hrAuditEventsPresent: true,
      leaveAttendanceSynced: true,
      leaveBalanceEnforced: true,
      payrollRunFinalized: true,
      staffPayslipVisible: true,
      leaveSubmitNotified: true,
      leaveDecisionNotified: true,
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
    .where(eq(users.email, associateEmail));
  await closeDatabase();
}
