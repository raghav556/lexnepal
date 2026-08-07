import { and, desc, eq, like } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import {
  appointments,
  authUsers,
  durableJobs,
  firmSettings,
  leads,
  notifications,
  users,
} from "../../db/schema";
import { DEFAULT_APPOINTMENT_SLOTS } from "../../src/shared/crm/appointment-slots";
import { migrateCrmExport } from "../../src/server/services/crm-migration";
import { GET as listLeads, POST as createLeadStaff } from "../../src/app/api/v1/leads/route";
import { PATCH as updateLead } from "../../src/app/api/v1/leads/[id]/route";
import { POST as createLeadPublic } from "../../src/app/api/v1/public/leads/route";
import { POST as convertLead } from "../../src/app/api/v1/leads/[id]/convert/route";
import { POST as generateIntakeLink } from "../../src/app/api/v1/leads/[id]/intake-link/route";
import { POST as submitIntake } from "../../src/app/api/v1/public/leads/intake/[token]/route";
import {
  GET as listAppointments,
  POST as createAppointmentStaff,
} from "../../src/app/api/v1/appointments/route";
import { GET as listSlots } from "../../src/app/api/v1/appointments/slots/route";
import { POST as createAppointmentPublic } from "../../src/app/api/v1/public/appointments/route";
import { PATCH as updateAppointmentStatus } from "../../src/app/api/v1/appointments/[id]/status/route";
import { POST as assignAppointment } from "../../src/app/api/v1/appointments/[id]/assign/route";
import { POST as rescheduleAppointment } from "../../src/app/api/v1/appointments/[id]/reschedule/route";

const database = getDatabase();
const firmA = "61000000-0000-4000-8000-000000000001";
const firmMap = { convex_firm_a: firmA };
const password = "Local-boundary-only-2026!";
const exportPath = "tests/fixtures/convex-crm-export";
const assigneeEmail = "crm-verify-assignee@example.invalid";
const scopedEmail = "crm-verify-paralegal@example.invalid";

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

async function ensureAssigneeUser() {
  const [row] = await database
    .insert(users)
    .values({
      firmId: firmA,
      tokenIdentifier: `crm-verify:${assigneeEmail}`,
      email: assigneeEmail,
      name: "CRM Verify Assignee",
      role: "associate",
      isActive: true,
      isPending: false,
    })
    .onConflictDoUpdate({
      target: [users.firmId, users.email],
      set: {
        role: "associate",
        isActive: true,
        isPending: false,
        updatedAt: new Date(),
      },
    })
    .returning({ id: users.id });
  if (!row) throw new Error("Failed to ensure CRM verify assignee");
  return row;
}

/** Paralegal without clients.manage — used to prove assignee self-scoping. */
async function ensureScopedParalegal() {
  const [lexUser] = await database
    .insert(users)
    .values({
      firmId: firmA,
      tokenIdentifier: `crm-verify:${scopedEmail}`,
      email: scopedEmail,
      name: "CRM Verify Paralegal",
      role: "paralegal",
      isActive: true,
      isPending: false,
    })
    .onConflictDoUpdate({
      target: [users.firmId, users.email],
      set: {
        role: "paralegal",
        isActive: true,
        isPending: false,
        updatedAt: new Date(),
      },
    })
    .returning({ id: users.id, firmId: users.firmId });
  if (!lexUser) throw new Error("Failed to ensure CRM verify paralegal");

  const [existingAuth] = await database
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.lexnepalUserId, lexUser.id))
    .limit(1);
  if (existingAuth) await database.delete(authUsers).where(eq(authUsers.id, existingAuth.id));

  const created = await getLocalAuth().api.createUser({
    body: {
      name: "CRM Verify Paralegal",
      email: scopedEmail,
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
  await database
    .insert(firmSettings)
    .values({
      firmId: firmA,
      key: "rolePermissions",
      value: {
        associate: ["cases.view_all", "cases.manage", "clients.manage", "clients.view_all"],
      },
    })
    .onConflictDoUpdate({
      target: [firmSettings.firmId, firmSettings.key],
      set: {
        value: {
          associate: ["cases.view_all", "cases.manage", "clients.manage", "clients.view_all"],
        },
        updatedAt: new Date(),
      },
    });

  const first = await migrateCrmExport({ exportPath, firmMap });
  const second = await migrateCrmExport({ exportPath, firmMap });
  if (!first.reconciliation.passed) {
    throw new Error(`First CRM migration failed: ${JSON.stringify(first, null, 2)}`);
  }
  if (!second.reconciliation.passed) {
    throw new Error(`Second CRM migration failed: ${JSON.stringify(second, null, 2)}`);
  }

  const cookie = await signIn("boundary-a@example.invalid");
  const headers = { cookie, "content-type": "application/json" };

  const [adminA] = await database
    .select({ id: users.id, firmId: users.firmId })
    .from(users)
    .where(eq(users.email, "boundary-a@example.invalid"))
    .limit(1);
  if (!adminA || adminA.firmId !== firmA) {
    throw new Error("boundary-a user missing or wrong firm");
  }
  const assignee = await ensureAssigneeUser();
  const scoped = await ensureScopedParalegal();

  const leadsResponse = await listLeads(new Request("http://local/api/v1/leads", { headers }));
  const appointmentsResponse = await listAppointments(
    new Request("http://local/api/v1/appointments", { headers }),
  );
  const slotsResponse = await listSlots(
    new Request("http://local/api/v1/appointments/slots?date=2026-08-10"),
  );

  if (!leadsResponse.ok) throw new Error(`Leads list failed: ${leadsResponse.status}`);
  if (!appointmentsResponse.ok) {
    throw new Error(`Appointments list failed: ${appointmentsResponse.status}`);
  }
  if (!slotsResponse.ok) throw new Error(`Slots list failed: ${slotsResponse.status}`);

  const leadsBody = (await leadsResponse.json()) as { data: Array<{ fullName: string; _id: string }> };
  const appointmentsBody = (await appointmentsResponse.json()) as {
    data: Array<{ clientName: string; timeSlot: string; _id: string }>;
  };
  const slotsBody = (await slotsResponse.json()) as { data: string[] };

  if (!leadsBody.data.some((row) => row.fullName === "CRM Fixture Lead" && row._id)) {
    throw new Error("Migrated lead missing or missing _id");
  }
  if (!appointmentsBody.data.some((row) => row.clientName === "CRM Fixture Lead" && row.timeSlot === "10:00 AM")) {
    throw new Error("Migrated appointment missing");
  }
  if (!slotsBody.data.includes("11:00 AM")) {
    throw new Error("Available slots missing expected free slot");
  }
  if (slotsBody.data.includes("10:00 AM")) {
    throw new Error("Booked pending slot should still block availability (non-cancelled)");
  }
  const canonSlots = new Set<string>(DEFAULT_APPOINTMENT_SLOTS);
  if (slotsBody.data.some((slot) => !canonSlots.has(slot))) {
    throw new Error(`Slots API returned non-canon slot: ${JSON.stringify(slotsBody.data)}`);
  }
  if (slotsBody.data.includes("11:30 AM") || slotsBody.data.includes("02:00 PM")) {
    throw new Error("Drifted UI slots must not appear in slots API");
  }

  const invalidSlot = await createAppointmentPublic(
    new Request("http://local/api/v1/public/appointments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientName: "Invalid Slot Client",
        clientPhone: "+977-9800000099",
        practiceArea: "Family Law",
        date: "2026-09-10",
        timeSlot: "11:30 AM",
      }),
    }),
  );
  if (invalidSlot.status !== 400) {
    throw new Error(`Expected invalid slot 400, got ${invalidSlot.status} ${await invalidSlot.text()}`);
  }

  const publicLead = await createLeadPublic(
    new Request("http://local/api/v1/public/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName: "Verify Public Lead",
        email: "public-lead@example.invalid",
        phone: "+977-9800000077",
        source: "website",
        message: "verify-local",
      }),
    }),
  );
  if (!publicLead.ok) {
    throw new Error(`Public create lead failed: ${publicLead.status} ${await publicLead.text()}`);
  }
  const publicLeadBody = (await publicLead.json()) as { data: { id: string; _id: string } };
  const publicLeadId = publicLeadBody.data.id || publicLeadBody.data._id;

  const publicLeadNotes = await database
    .select({ title: notifications.title, relatedId: notifications.relatedId, userId: notifications.userId })
    .from(notifications)
    .where(and(eq(notifications.firmId, firmA), eq(notifications.userId, adminA.id)))
    .orderBy(desc(notifications.createdAt))
    .limit(30);
  if (
    !publicLeadNotes.some(
      (n) => n.title === "New website lead" && n.relatedId === publicLeadId,
    )
  ) {
    throw new Error(
      `Expected public-lead notification for admin; saw ${JSON.stringify(publicLeadNotes.slice(0, 5))}`,
    );
  }

  const staffLead = await createLeadStaff(
    new Request("http://local/api/v1/leads", {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Verify Staff Lead",
        phone: "+977-9800000066",
        source: "phone",
      }),
    }),
  );
  if (!staffLead.ok) {
    throw new Error(`Staff create lead failed: ${staffLead.status} ${await staffLead.text()}`);
  }
  const staffLeadBody = (await staffLead.json()) as { data: { id: string; _id: string } };
  const staffLeadId = staffLeadBody.data.id || staffLeadBody.data._id;

  const softDeleteTarget = await createLeadStaff(
    new Request("http://local/api/v1/leads", {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Verify Soft Delete Lead",
        phone: "+977-9800000044",
        source: "walk_in",
      }),
    }),
  );
  if (!softDeleteTarget.ok) {
    throw new Error(`Soft-delete fixture lead failed: ${softDeleteTarget.status}`);
  }
  const softBody = (await softDeleteTarget.json()) as { data: { id: string } };
  await database
    .update(leads)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(leads.id, softBody.data.id));

  const afterDeleteList = await listLeads(new Request("http://local/api/v1/leads", { headers }));
  if (!afterDeleteList.ok) throw new Error(`List leads after soft-delete failed: ${afterDeleteList.status}`);
  const afterDeleteBody = (await afterDeleteList.json()) as { data: Array<{ id: string }> };
  if (afterDeleteBody.data.some((row) => row.id === softBody.data.id)) {
    throw new Error("Soft-deleted lead still returned by GET /api/v1/leads");
  }

  const converted = await convertLead(
    new Request(`http://local/api/v1/leads/${staffLeadId}/convert`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "individual" }),
    }),
  );
  if (!converted.ok) {
    throw new Error(`Convert lead failed: ${converted.status} ${await converted.text()}`);
  }
  const convertedBody = (await converted.json()) as { data: { clientId: string } };
  if (!convertedBody.data.clientId) {
    throw new Error("Convert response missing clientId");
  }

  const leadsBySource = await listLeads(
    new Request("http://local/api/v1/leads?source=phone", { headers }),
  );
  if (!leadsBySource.ok) throw new Error(`List leads by source failed: ${leadsBySource.status}`);
  const sourceBody = (await leadsBySource.json()) as { data: Array<{ source: string }> };
  if (sourceBody.data.length === 0 || sourceBody.data.some((row) => row.source !== "phone")) {
    throw new Error("source=phone filter returned unexpected rows");
  }

  const leadsByPublicQ = await listLeads(
    new Request("http://local/api/v1/leads?q=Verify%20Public", { headers }),
  );
  if (!leadsByPublicQ.ok) throw new Error(`List leads q public failed: ${leadsByPublicQ.status}`);
  const publicQBody = (await leadsByPublicQ.json()) as { data: Array<{ fullName: string }> };
  if (!publicQBody.data.some((row) => row.fullName.includes("Verify Public"))) {
    throw new Error("q filter did not find Verify Public Lead");
  }

  const publicAppt = await createAppointmentPublic(
    new Request("http://local/api/v1/public/appointments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientName: "Verify Public Client",
        clientEmail: "public-appt@example.invalid",
        clientPhone: "+977-9800000055",
        practiceArea: "Family Law",
        date: "2026-08-20",
        timeSlot: "03:00 PM",
      }),
    }),
  );
  if (!publicAppt.ok) {
    throw new Error(`Public create appointment failed: ${publicAppt.status} ${await publicAppt.text()}`);
  }
  const publicApptBody = (await publicAppt.json()) as { data: { id: string; _id?: string } };
  const publicApptId = publicApptBody.data.id || publicApptBody.data._id!;

  const publicApptNotes = await database
    .select({ title: notifications.title, relatedId: notifications.relatedId })
    .from(notifications)
    .where(and(eq(notifications.firmId, firmA), eq(notifications.userId, adminA.id)))
    .orderBy(desc(notifications.createdAt))
    .limit(30);
  if (
    !publicApptNotes.some(
      (n) => n.title === "New public consultation request" && n.relatedId === publicApptId,
    )
  ) {
    throw new Error(
      `Expected public appointment notification for admin; saw ${JSON.stringify(publicApptNotes.slice(0, 5))}`,
    );
  }

  const assignedAppt = await assignAppointment(
    new Request(`http://local/api/v1/appointments/${publicApptId}/assign`, {
      method: "POST",
      headers,
      body: JSON.stringify({ assignedLawyerId: assignee.id }),
    }),
  );
  if (!assignedAppt.ok) {
    throw new Error(`Assign appointment failed: ${assignedAppt.status} ${await assignedAppt.text()}`);
  }
  const assignApptNotes = await database
    .select({ title: notifications.title, relatedId: notifications.relatedId })
    .from(notifications)
    .where(and(eq(notifications.firmId, firmA), eq(notifications.userId, assignee.id)))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
  if (
    !assignApptNotes.some(
      (n) => n.title === "Appointment assigned to you" && n.relatedId === publicApptId,
    )
  ) {
    throw new Error(
      `Expected appointment assign notification; saw ${JSON.stringify(assignApptNotes.slice(0, 5))}`,
    );
  }

  const confirmed = await updateAppointmentStatus(
    new Request(`http://local/api/v1/appointments/${publicApptId}/status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "confirmed" }),
    }),
  );
  if (!confirmed.ok) {
    throw new Error(`Confirm appointment failed: ${confirmed.status} ${await confirmed.text()}`);
  }
  const confirmJobs = await database
    .select({ idempotencyKey: durableJobs.idempotencyKey, type: durableJobs.type })
    .from(durableJobs)
    .where(
      and(
        eq(durableJobs.firmId, firmA),
        eq(durableJobs.type, "communication.email"),
        like(durableJobs.idempotencyKey, "crm.appointment_confirmed:%"),
      ),
    )
    .limit(10);
  if (confirmJobs.length === 0) {
    throw new Error("Expected communication.email job for appointment confirm (not audit-only stub)");
  }

  const rescheduled = await rescheduleAppointment(
    new Request(`http://local/api/v1/appointments/${publicApptId}/reschedule`, {
      method: "POST",
      headers,
      body: JSON.stringify({ date: "2026-08-21", timeSlot: "04:30 PM" }),
    }),
  );
  if (!rescheduled.ok) {
    throw new Error(`Reschedule failed: ${rescheduled.status} ${await rescheduled.text()}`);
  }
  const rescheduleJobs = await database
    .select({ idempotencyKey: durableJobs.idempotencyKey })
    .from(durableJobs)
    .where(
      and(
        eq(durableJobs.firmId, firmA),
        like(durableJobs.idempotencyKey, "crm.appointment_rescheduled:%"),
      ),
    )
    .limit(5);
  if (rescheduleJobs.length === 0) {
    throw new Error("Expected communication.email job for appointment reschedule");
  }

  const cancelled = await updateAppointmentStatus(
    new Request(`http://local/api/v1/appointments/${publicApptId}/status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "cancelled" }),
    }),
  );
  if (!cancelled.ok) {
    throw new Error(`Cancel appointment failed: ${cancelled.status} ${await cancelled.text()}`);
  }
  const cancelJobs = await database
    .select({ idempotencyKey: durableJobs.idempotencyKey })
    .from(durableJobs)
    .where(
      and(
        eq(durableJobs.firmId, firmA),
        like(durableJobs.idempotencyKey, "crm.appointment_cancelled:%"),
      ),
    )
    .limit(5);
  if (cancelJobs.length === 0) {
    throw new Error("Expected communication.email job for appointment cancel");
  }

  const bridgeLead = await createLeadStaff(
    new Request("http://local/api/v1/leads", {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Verify Bridge Lead",
        phone: "+977-9800000033",
        email: "bridge-lead@example.invalid",
        source: "referral",
        practiceAreaInterest: "Corporate",
      }),
    }),
  );
  if (!bridgeLead.ok) {
    throw new Error(`Bridge fixture lead failed: ${bridgeLead.status} ${await bridgeLead.text()}`);
  }
  const bridgeLeadBody = (await bridgeLead.json()) as { data: { id: string; _id: string } };
  const bridgeLeadId = bridgeLeadBody.data.id || bridgeLeadBody.data._id;

  const scheduled = await createAppointmentStaff(
    new Request("http://local/api/v1/appointments", {
      method: "POST",
      headers,
      body: JSON.stringify({
        clientName: "Verify Bridge Lead",
        clientEmail: "bridge-lead@example.invalid",
        clientPhone: "+977-9800000033",
        leadId: bridgeLeadId,
        practiceArea: "Corporate",
        date: "2026-08-25",
        timeSlot: "11:00 AM",
        notes: "crm-3 verify",
      }),
    }),
  );
  if (!scheduled.ok) {
    throw new Error(`Schedule-from-lead failed: ${scheduled.status} ${await scheduled.text()}`);
  }
  const scheduledBody = (await scheduled.json()) as {
    data: { id: string; leadId?: string | null; _id?: string };
  };
  if (scheduledBody.data.leadId !== bridgeLeadId) {
    throw new Error(`Appointment missing leadId link: ${JSON.stringify(scheduledBody.data)}`);
  }

  const [bridgeLeadRow] = await database
    .select({ status: leads.status })
    .from(leads)
    .where(eq(leads.id, bridgeLeadId))
    .limit(1);
  if (bridgeLeadRow?.status !== "consultation_scheduled") {
    throw new Error(`Lead status not consultation_scheduled: ${bridgeLeadRow?.status}`);
  }

  const byLead = await listAppointments(
    new Request(`http://local/api/v1/appointments?leadId=${encodeURIComponent(bridgeLeadId)}`, {
      headers,
    }),
  );
  if (!byLead.ok) throw new Error(`List appointments by leadId failed: ${byLead.status}`);
  const byLeadBody = (await byLead.json()) as { data: Array<{ id: string; leadId?: string }> };
  if (
    byLeadBody.data.length === 0 ||
    !byLeadBody.data.some((row) => row.id === scheduledBody.data.id || row.id === scheduledBody.data._id)
  ) {
    throw new Error("leadId filter did not return scheduled appointment");
  }
  if (byLeadBody.data.some((row) => row.leadId && row.leadId !== bridgeLeadId)) {
    throw new Error("leadId filter returned unrelated appointments");
  }

  const assignLead = await createLeadStaff(
    new Request("http://local/api/v1/leads", {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Verify Assign Lead",
        phone: "+977-9800000022",
        source: "phone",
      }),
    }),
  );
  if (!assignLead.ok) {
    throw new Error(`Assign fixture lead failed: ${assignLead.status} ${await assignLead.text()}`);
  }
  const assignLeadBody = (await assignLead.json()) as { data: { id: string; _id: string } };
  const assignLeadId = assignLeadBody.data.id || assignLeadBody.data._id;

  const assigned = await updateLead(
    new Request(`http://local/api/v1/leads/${assignLeadId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ assignedTo: assignee.id }),
    }),
  );
  if (!assigned.ok) {
    throw new Error(`Assign lead failed: ${assigned.status} ${await assigned.text()}`);
  }

  const assignNotes = await database
    .select({ title: notifications.title, relatedId: notifications.relatedId })
    .from(notifications)
    .where(and(eq(notifications.firmId, firmA), eq(notifications.userId, assignee.id)))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
  if (
    !assignNotes.some((n) => n.title === "Lead assigned to you" && n.relatedId === assignLeadId)
  ) {
    throw new Error(
      `Expected assign notification for assignee; saw ${JSON.stringify(assignNotes.slice(0, 5))}`,
    );
  }

  const intakeLead = await createLeadStaff(
    new Request("http://local/api/v1/leads", {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Verify Intake Lead",
        phone: "+977-9800000011",
        source: "referral",
        assignedTo: assignee.id,
      }),
    }),
  );
  if (!intakeLead.ok) {
    throw new Error(`Intake fixture lead failed: ${intakeLead.status} ${await intakeLead.text()}`);
  }
  const intakeLeadBody = (await intakeLead.json()) as { data: { id: string; _id: string } };
  const intakeLeadId = intakeLeadBody.data.id || intakeLeadBody.data._id;

  const intakeLink = await generateIntakeLink(
    new Request(`http://local/api/v1/leads/${intakeLeadId}/intake-link`, {
      method: "POST",
      headers,
    }),
  );
  if (!intakeLink.ok) {
    throw new Error(`Generate intake link failed: ${intakeLink.status} ${await intakeLink.text()}`);
  }
  const intakeLinkBody = (await intakeLink.json()) as { data: { token: string } };
  const intakeToken = intakeLinkBody.data.token;

  const intakeSubmit = await submitIntake(
    new Request(`http://local/api/v1/public/leads/intake/${intakeToken}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName: "Verify Intake Lead",
        phone: "+977-9800000011",
        practiceArea: "Corporate",
        caseDescription: "CRM-4 intake verify",
      }),
    }),
  );
  if (!intakeSubmit.ok) {
    throw new Error(`Submit intake failed: ${intakeSubmit.status} ${await intakeSubmit.text()}`);
  }

  const intakeNotes = await database
    .select({ title: notifications.title, relatedId: notifications.relatedId })
    .from(notifications)
    .where(and(eq(notifications.firmId, firmA), eq(notifications.userId, assignee.id)))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
  if (
    !intakeNotes.some(
      (n) => n.title === "Intake form submitted" && n.relatedId === intakeLeadId,
    )
  ) {
    throw new Error(
      `Expected intake notification for assignee; saw ${JSON.stringify(intakeNotes.slice(0, 5))}`,
    );
  }

  const scopedMine = await createLeadStaff(
    new Request("http://local/api/v1/leads", {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Verify Scoped Mine",
        phone: "+977-9800000009",
        source: "walk_in",
        assignedTo: scoped.id,
      }),
    }),
  );
  if (!scopedMine.ok) {
    throw new Error(`Scoped mine lead failed: ${scopedMine.status} ${await scopedMine.text()}`);
  }
  const scopedMineBody = (await scopedMine.json()) as { data: { id: string } };
  const scopedMineId = scopedMineBody.data.id;

  const scopedOther = await createLeadStaff(
    new Request("http://local/api/v1/leads", {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Verify Scoped Other",
        phone: "+977-9800000008",
        source: "phone",
      }),
    }),
  );
  if (!scopedOther.ok) {
    throw new Error(`Scoped other lead failed: ${scopedOther.status}`);
  }
  const scopedOtherBody = (await scopedOther.json()) as { data: { id: string } };

  const scopedCookie = await signIn(scopedEmail);
  const scopedHeaders = { cookie: scopedCookie, "content-type": "application/json" };
  const scopedList = await listLeads(new Request("http://local/api/v1/leads", { headers: scopedHeaders }));
  if (!scopedList.ok) throw new Error(`Scoped list failed: ${scopedList.status}`);
  const scopedListBody = (await scopedList.json()) as {
    data: Array<{ id: string; assignedTo?: string | null }>;
  };
  if (!scopedListBody.data.some((row) => row.id === scopedMineId)) {
    throw new Error("Scoped user missing own assigned lead");
  }
  if (scopedListBody.data.some((row) => row.id === scopedOtherBody.data.id)) {
    throw new Error("Scoped user saw an unassigned / other lead");
  }
  if (scopedListBody.data.some((row) => row.assignedTo && row.assignedTo !== scoped.id)) {
    throw new Error("Scoped list leaked another assignee's lead");
  }

  const scopedConvertDenied = await convertLead(
    new Request(`http://local/api/v1/leads/${scopedMineId}/convert`, {
      method: "POST",
      headers: scopedHeaders,
      body: JSON.stringify({ type: "individual" }),
    }),
  );
  if (scopedConvertDenied.status !== 403) {
    throw new Error(`Expected scoped convert 403, got ${scopedConvertDenied.status}`);
  }

  const scopedCreate = await createLeadStaff(
    new Request("http://local/api/v1/leads", {
      method: "POST",
      headers: scopedHeaders,
      body: JSON.stringify({
        fullName: "Verify Scoped Self Create",
        phone: "+977-9800000007",
        source: "walk_in",
        assignedTo: adminA.id,
      }),
    }),
  );
  if (!scopedCreate.ok) {
    throw new Error(`Scoped create failed: ${scopedCreate.status} ${await scopedCreate.text()}`);
  }
  const scopedCreateBody = (await scopedCreate.json()) as {
    data: { id: string; assignedTo?: string | null };
  };
  if (scopedCreateBody.data.assignedTo !== scoped.id) {
    throw new Error(
      `Scoped create should force self assignee, got ${scopedCreateBody.data.assignedTo}`,
    );
  }

  const peerAppt = await createAppointmentStaff(
    new Request("http://local/api/v1/appointments", {
      method: "POST",
      headers,
      body: JSON.stringify({
        clientName: "Verify Peer Appointment",
        clientPhone: "+977-9800000006",
        practiceArea: "Litigation",
        date: "2026-09-15",
        timeSlot: "04:30 PM",
        assignedLawyerId: adminA.id,
      }),
    }),
  );
  if (!peerAppt.ok) {
    throw new Error(`Peer appointment create failed: ${peerAppt.status} ${await peerAppt.text()}`);
  }
  const peerApptBody = (await peerAppt.json()) as { data: { id: string } };

  const scopedAppts = await listAppointments(
    new Request("http://local/api/v1/appointments", { headers: scopedHeaders }),
  );
  if (!scopedAppts.ok) throw new Error(`Scoped appointments list failed: ${scopedAppts.status}`);
  const scopedApptsBody = (await scopedAppts.json()) as {
    data: Array<{ id: string; assignedLawyerId?: string | null }>;
  };
  if (scopedApptsBody.data.some((row) => row.id === peerApptBody.data.id)) {
    throw new Error("Non-manager staff saw another lawyer's appointment");
  }
  if (
    scopedApptsBody.data.some(
      (row) => row.assignedLawyerId && row.assignedLawyerId !== scoped.id,
    )
  ) {
    throw new Error("Staff appointment list leaked another assignee");
  }

  await database
    .insert(firmSettings)
    .values({
      firmId: firmA,
      key: "onlineBookingEnabled",
      value: false,
    })
    .onConflictDoUpdate({
      target: [firmSettings.firmId, firmSettings.key],
      set: { value: false, updatedAt: new Date(), deletedAt: null },
    });
  const bookingDisabled = await createAppointmentPublic(
    new Request("http://local/api/v1/public/appointments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientName: "Booking Disabled Client",
        clientPhone: "+977-9800000005",
        practiceArea: "Family Law",
        date: "2026-09-20",
        timeSlot: "01:30 PM",
      }),
    }),
  );
  if (bookingDisabled.status !== 503) {
    throw new Error(
      `Expected online booking disabled 503, got ${bookingDisabled.status} ${await bookingDisabled.text()}`,
    );
  }
  await database
    .insert(firmSettings)
    .values({
      firmId: firmA,
      key: "onlineBookingEnabled",
      value: true,
    })
    .onConflictDoUpdate({
      target: [firmSettings.firmId, firmSettings.key],
      set: { value: true, updatedAt: new Date(), deletedAt: null },
    });

  const [leadCount] = await database.select({ id: leads.id }).from(leads).where(eq(leads.firmId, firmA)).limit(1);
  const [apptCount] = await database
    .select({ id: appointments.id })
    .from(appointments)
    .where(eq(appointments.firmId, firmA))
    .limit(1);
  if (!leadCount || !apptCount) throw new Error("Expected firm-scoped CRM rows after migration");

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        migrated: second.migrated,
        reconciliation: second.reconciliation,
        apiCounts: {
          leads: leadsBody.data.length,
          appointments: appointmentsBody.data.length,
          slots: slotsBody.data.length,
        },
        softDeletedHidden: true,
        convertHandoffClientId: convertedBody.data.clientId,
        listFiltersOk: true,
        scheduleFromLeadOk: true,
        appointmentLeadId: scheduledBody.data.leadId,
        notificationsOk: true,
        staffAssigneeScopeOk: true,
        appointmentSlotCanonOk: true,
        staffAppointmentScopeOk: true,
        onlineBookingToggleOk: true,
        appointmentNotificationsOk: true,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await closeDatabase();
}
