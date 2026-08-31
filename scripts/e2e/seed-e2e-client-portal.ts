/**
 * Idempotent portal data for E2E Client: CRM client link + matter + checklist task + shared doc.
 *
 * Prerequisites: DATABASE_URL. Calls seedE2eUsers() first.
 *
 *   npm run e2e:seed:portal
 */
import { and, eq, isNull } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { cases, caseTeamMembers, clients, documents, tasks, users } from "../../db/schema";
import { E2E_USERS, seedE2eUsers } from "./seed-e2e-users";

const CASE_NUMBER = "E2E-PORTAL-001";
const DOC_NUMBER = "E2E-PORTAL-DOC-001";
const TASK_TITLE = "Provide ID copy";

export async function seedE2eClientPortal() {
  const { firmId } = await seedE2eUsers();
  const db = getDatabase();

  const [clientUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.firmId, firmId),
        eq(users.email, E2E_USERS.client.email),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);
  const [staffUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.firmId, firmId),
        eq(users.email, E2E_USERS.staff.email),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);
  const [staff2User] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.firmId, firmId),
        eq(users.email, E2E_USERS.staff2.email),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);
  if (!clientUser || !staffUser) {
    throw new Error("E2E client/staff users missing after seedE2eUsers");
  }

  const [existingClient] = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.firmId, firmId),
        eq(clients.email, E2E_USERS.client.email),
        isNull(clients.deletedAt),
      ),
    )
    .limit(1);

  let clientId: string;
  if (existingClient) {
    const [updated] = await db
      .update(clients)
      .set({
        userId: clientUser.id,
        fullName: E2E_USERS.client.name,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, existingClient.id))
      .returning({ id: clients.id });
    clientId = updated!.id;
  } else {
    const [created] = await db
      .insert(clients)
      .values({
        firmId,
        userId: clientUser.id,
        type: "individual",
        fullName: E2E_USERS.client.name,
        email: E2E_USERS.client.email,
        phone: "9800000001",
        isActive: true,
      })
      .returning({ id: clients.id });
    clientId = created!.id;
  }

  const [existingCase] = await db
    .select()
    .from(cases)
    .where(
      and(eq(cases.firmId, firmId), eq(cases.caseNumber, CASE_NUMBER), isNull(cases.deletedAt)),
    )
    .limit(1);

  let caseId: string;
  if (existingCase) {
    const [updated] = await db
      .update(cases)
      .set({
        clientId,
        assignedLawyerId: staffUser.id,
        title: "E2E Portal Matter",
        practiceArea: "Corporate",
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(cases.id, existingCase.id))
      .returning({ id: cases.id });
    caseId = updated!.id;
  } else {
    const [created] = await db
      .insert(cases)
      .values({
        firmId,
        caseNumber: CASE_NUMBER,
        title: "E2E Portal Matter",
        practiceArea: "Corporate",
        status: "active",
        clientId,
        assignedLawyerId: staffUser.id,
        description: "Seeded matter for client portal E2E.",
      })
      .returning({ id: cases.id });
    caseId = created!.id;
  }

  const [existingTask] = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.firmId, firmId),
        eq(tasks.caseId, caseId),
        eq(tasks.title, TASK_TITLE),
        isNull(tasks.deletedAt),
      ),
    )
    .limit(1);

  let taskId: string;
  if (existingTask) {
    const [updated] = await db
      .update(tasks)
      .set({
        clientVisible: true,
        assignedTo: clientUser.id,
        archivedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, existingTask.id))
      .returning({ id: tasks.id });
    taskId = updated!.id;
  } else {
    const [created] = await db
      .insert(tasks)
      .values({
        firmId,
        caseId,
        title: TASK_TITLE,
        description: "Client-visible checklist item for portal smoke.",
        assignedTo: clientUser.id,
        createdBy: staffUser.id,
        status: "todo",
        priority: "medium",
        clientVisible: true,
      })
      .returning({ id: tasks.id });
    taskId = created!.id;
  }

  const storageId = `protected/${firmId}/e2e-portal-shared-doc`;
  const [existingDoc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.firmId, firmId),
        eq(documents.documentNumber, DOC_NUMBER),
        isNull(documents.deletedAt),
      ),
    )
    .limit(1);

  let documentId: string;
  if (existingDoc) {
    const [updated] = await db
      .update(documents)
      .set({
        caseId,
        title: "Welcome letter (shared)",
        isPrivileged: false,
        confidentialityLevel: "public",
        uploadStatus: "clean",
        uploadedBy: staffUser.id,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, existingDoc.id))
      .returning({ id: documents.id });
    documentId = updated!.id;
  } else {
    const [created] = await db
      .insert(documents)
      .values({
        firmId,
        caseId,
        documentNumber: DOC_NUMBER,
        title: "Welcome letter (shared)",
        type: "correspondence",
        storageId,
        mimeType: "application/pdf",
        sizeBytes: 256,
        uploadedBy: staffUser.id,
        isTemplate: false,
        isPrivileged: false,
        uploadStatus: "clean",
        confidentialityLevel: "public",
        status: "approved",
      })
      .returning({ id: documents.id });
    documentId = created!.id;
  }

  if (staff2User) {
    await db
      .insert(caseTeamMembers)
      .values({
        firmId,
        caseId,
        userId: staff2User.id,
      })
      .onConflictDoNothing();
  }

  return {
    firmId,
    clientId,
    caseId,
    taskId,
    documentId,
    caseNumber: CASE_NUMBER,
    staffUserId: staffUser.id,
    staff2UserId: staff2User?.id ?? null,
  };
}

const invokedDirectly = process.argv[1]
  ?.replace(/\\/g, "/")
  .endsWith("/scripts/e2e/seed-e2e-client-portal.ts");
if (invokedDirectly) {
  try {
    const result = await seedE2eClientPortal();
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } finally {
    await closeDatabase();
  }
}
