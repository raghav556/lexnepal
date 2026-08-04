import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import { appointments, firmSettings, leads } from "../../db/schema";
import { migrateCrmExport } from "../../src/server/services/crm-migration";
import { GET as listLeads, POST as createLeadStaff } from "../../next-app/app/api/v1/leads/route";
import { POST as createLeadPublic } from "../../next-app/app/api/v1/public/leads/route";
import { GET as listAppointments } from "../../next-app/app/api/v1/appointments/route";
import { GET as listSlots } from "../../next-app/app/api/v1/appointments/slots/route";
import { POST as createAppointmentPublic } from "../../next-app/app/api/v1/public/appointments/route";

const database = getDatabase();
const firmA = "61000000-0000-4000-8000-000000000001";
const firmMap = { convex_firm_a: firmA };
const password = "Local-boundary-only-2026!";
const exportPath = "tests/fixtures/convex-crm-export";

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

  const publicAppt = await createAppointmentPublic(
    new Request("http://local/api/v1/public/appointments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientName: "Verify Public Client",
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
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await closeDatabase();
}
