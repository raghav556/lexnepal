import { randomUUID } from "node:crypto";
import { and, eq, isNull, like } from "drizzle-orm";
import { returningInsert } from "@/server/db/mysql-returning";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import { GET as listAppointments } from "../../src/app/api/v1/appointments/route";
import { POST as bookConsultation } from "../../src/app/api/v1/appointments/book/route";
import { appointments, clients, users } from "../../db/schema";
import { E2E_USERS } from "../e2e/fixtures";
import { seedE2eUsers } from "../e2e/seed-e2e-users";

const database = getDatabase();
const testPrefix = "SEC_CLIENT_APPOINTMENT_AUTH:";

async function signIn(email: string, password: string) {
  const response = await getLocalAuth().api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  if (!response.ok) throw new Error(`Sign-in failed for ${email}`);
  const cookie = response.headers.get("set-cookie");
  if (!cookie) throw new Error("Session cookie missing");
  return cookie;
}

async function postBooking(cookie: string, body: Record<string, unknown>) {
  return bookConsultation(
    new Request("http://local/api/v1/appointments/book", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

let createdClientAId: string | null = null;
let createdClientBId: string | null = null;
let activeFirmId: string | null = null;

try {
  const { firmId } = await seedE2eUsers();
  activeFirmId = firmId;
  const [clientAUser] = await database
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.firmId, firmId), eq(users.email, E2E_USERS.client.email)))
    .limit(1);
  const [staffUser] = await database
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.firmId, firmId), eq(users.email, E2E_USERS.staff.email)))
    .limit(1);
  if (!clientAUser || !staffUser) throw new Error("Required local fixture users are missing");

  let [clientA] = await database
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.firmId, firmId),
        eq(clients.userId, clientAUser.id),
        isNull(clients.deletedAt),
      ),
    )
    .limit(1);
  if (!clientA) {
    const [created] = await returningInsert(
      database
        .insert(clients)
        .values({
          firmId,
          userId: clientAUser.id,
          type: "individual",
          fullName: "Security Test Client A",
          email: "security-client-a@example.invalid",
          phone: "+977-9800000101",
          isActive: true,
        })
        .$returningId(),
      (id) => database.select().from(clients).where(eq(clients.id, id)).limit(1),
    );
    if (!created) throw new Error("Failed to create Client A fixture");
    clientA = created;
    createdClientAId = created.id;
  }

  const [clientB] = await returningInsert(
    database
      .insert(clients)
      .values({
        firmId,
        type: "individual",
        fullName: "Security Test Client B",
        email: `security-client-b-${randomUUID()}@example.invalid`,
        phone: "+977-9800000102",
        isActive: true,
      })
      .$returningId(),
    (id) => database.select().from(clients).where(eq(clients.id, id)).limit(1),
  );
  if (!clientB) throw new Error("Failed to create Client B fixture");
  createdClientBId = clientB.id;

  const clientCookie = await signIn(E2E_USERS.client.email, E2E_USERS.client.password);
  const staffCookie = await signIn(E2E_USERS.staff.email, E2E_USERS.staff.password);
  const rejectedNotes = `${testPrefix}rejected`;
  const ownNotes = `${testPrefix}own`;
  const foreignNotes = `${testPrefix}foreign-listing`;
  const staffNotes = `${testPrefix}staff`;
  const browserIdentity = {
    clientName: "Forged Browser Name",
    clientEmail: "forged-browser@example.invalid",
    clientPhone: "+977-9800000999",
  };

  const rejected = await postBooking(clientCookie, {
    ...browserIdentity,
    clientId: clientB.id,
    practiceArea: "Virtual Consultation",
    date: "2026-12-10",
    timeSlot: "10:00 AM",
    notes: rejectedNotes,
    assignedLawyerId: staffUser.id,
  });
  const rejectedBody = await rejected.json();
  if (rejected.status !== 403 || rejected.ok) {
    throw new Error(`Foreign Client ID was not rejected: ${rejected.status}`);
  }
  const rejectedText = JSON.stringify(rejectedBody);
  if (
    rejectedText.includes(clientB.id) ||
    rejectedText.includes(clientB.fullName) ||
    rejectedText.includes(clientB.email ?? "")
  ) {
    throw new Error("Foreign Client ID rejection leaked Client B details");
  }
  const rejectedRows = await database
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.firmId, firmId), eq(appointments.notes, rejectedNotes)))
    .limit(1);
  if (rejectedRows.length > 0) throw new Error("Rejected request created an appointment");

  const own = await postBooking(clientCookie, {
    ...browserIdentity,
    practiceArea: "Phone Consultation",
    date: "2026-12-10",
    timeSlot: "11:00 AM",
    notes: ownNotes,
    assignedLawyerId: staffUser.id,
  });
  if (!own.ok) throw new Error(`Own Client booking failed: ${own.status} ${await own.text()}`);
  const ownBody = (await own.json()) as { data: { id?: string; _id?: string; status?: string } };
  const ownAppointmentId = ownBody.data.id ?? ownBody.data._id;
  if (!ownAppointmentId || ownBody.data.status !== "pending") {
    throw new Error("Own Client booking did not return a pending appointment");
  }
  const [ownRow] = await database
    .select()
    .from(appointments)
    .where(eq(appointments.id, ownAppointmentId))
    .limit(1);
  if (!ownRow) throw new Error("Created Client appointment was not found");
  if (
    ownRow.clientId !== clientA.id ||
    ownRow.clientName !== clientA.fullName ||
    ownRow.clientEmail !== clientA.email ||
    ownRow.clientPhone !== (clientA.phone || "N/A") ||
    ownRow.assignedLawyerId !== null ||
    ownRow.status !== "pending"
  ) {
    throw new Error(
      "Client booking did not use the server-side Client identity and unassigned state",
    );
  }

  await database.insert(appointments).values({
    firmId,
    clientName: clientB.fullName,
    clientEmail: clientB.email,
    clientPhone: clientB.phone || "N/A",
    clientId: clientB.id,
    practiceArea: "Virtual Consultation",
    date: "2026-12-11",
    timeSlot: "01:30 PM",
    notes: foreignNotes,
    status: "confirmed",
  });
  const listed = await listAppointments(
    new Request(`http://local/api/v1/appointments?clientId=${clientB.id}`, {
      headers: { cookie: clientCookie },
    }),
  );
  if (!listed.ok) throw new Error(`Client appointment list failed: ${listed.status}`);
  const listedBody = (await listed.json()) as { data: Array<{ clientId?: string }> };
  if (listedBody.data.length === 0 || listedBody.data.some((row) => row.clientId !== clientA.id)) {
    throw new Error("Client appointment listing was not scoped to Client A");
  }

  const staff = await postBooking(staffCookie, {
    clientName: clientB.fullName,
    clientEmail: clientB.email,
    clientPhone: clientB.phone || "N/A",
    clientId: clientB.id,
    practiceArea: "In-Person Consultation",
    date: "2026-12-12",
    timeSlot: "03:00 PM",
    notes: staffNotes,
    assignedLawyerId: staffUser.id,
  });
  if (!staff.ok)
    throw new Error(`Staff booking regression failed: ${staff.status} ${await staff.text()}`);
  const staffBody = (await staff.json()) as { data: { id?: string; _id?: string } };
  const staffAppointmentId = staffBody.data.id ?? staffBody.data._id;
  const [staffRow] = await database
    .select()
    .from(appointments)
    .where(eq(appointments.id, staffAppointmentId!))
    .limit(1);
  if (staffRow?.assignedLawyerId !== staffUser.id || staffRow.clientId !== clientB.id) {
    throw new Error("Staff booking behavior changed unexpectedly");
  }

  process.stdout.write(
    JSON.stringify({
      ok: true,
      foreignClientIdRejected: true,
      rejectedRequestCreatedNoAppointment: true,
      clientIdentityDerived: true,
      clientLawyerAssignmentCleared: true,
      clientListingScoped: true,
      staffBookingPreserved: true,
    }) + "\n",
  );
} finally {
  if (activeFirmId) {
    await database
      .delete(appointments)
      .where(
        and(eq(appointments.firmId, activeFirmId), like(appointments.notes, `${testPrefix}%`)),
      );
    if (createdClientBId) await database.delete(clients).where(eq(clients.id, createdClientBId));
    if (createdClientAId) await database.delete(clients).where(eq(clients.id, createdClientAId));
  }
  await closeDatabase();
}
