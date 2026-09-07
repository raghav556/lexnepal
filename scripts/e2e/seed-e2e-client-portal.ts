import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { returningInsert, returningMutation } from "@/server/db/mysql-returning";
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
import { getDocumentStorageRuntime } from "../../src/server/storage/runtime";
import { E2E_USERS, seedE2eUsers } from "./seed-e2e-users";

const CASE_NUMBER = "E2E-PORTAL-001";
const DOC_NUMBER = "E2E-PORTAL-DOC-001";
const DOC_VERSION_NUMBER = "E2E-PORTAL-DOC-001-V2";
const SECOND_DOC_NUMBER = "E2E-PORTAL-DOC-002";
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
    const [updated] = await returningMutation(
      db
        .update(clients)
        .set({
          userId: clientUser.id,
          fullName: E2E_USERS.client.name,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(clients.id, existingClient.id)),
      () => db.select().from(clients).where(eq(clients.id, existingClient.id)),
    );
    clientId = updated!.id;
  } else {
    const [created] = await returningInsert(
      db
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
        .$returningId(),
      (id) => db.select().from(clients).where(eq(clients.id, id)).limit(1),
    );
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
    const [updated] = await returningMutation(
      db
        .update(cases)
        .set({
          clientId,
          assignedLawyerId: staffUser.id,
          title: "E2E Portal Matter",
          practiceArea: "Corporate",
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(cases.id, existingCase.id)),
      () => db.select().from(cases).where(eq(cases.id, existingCase.id)),
    );
    caseId = updated!.id;
  } else {
    const [created] = await returningInsert(
      db
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
        .$returningId(),
      (id) => db.select().from(cases).where(eq(cases.id, id)).limit(1),
    );
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
    const [updated] = await returningMutation(
      db
        .update(tasks)
        .set({
          clientVisible: true,
          assignedTo: clientUser.id,
          archivedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, existingTask.id)),
      () => db.select().from(tasks).where(eq(tasks.id, existingTask.id)),
    );
    taskId = updated!.id;
  } else {
    const [created] = await returningInsert(
      db
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
        .$returningId(),
      (id) => db.select().from(tasks).where(eq(tasks.id, id)).limit(1),
    );
    taskId = created!.id;
  }

  const storageId = `protected/${firmId}/e2e-portal-shared-doc`;
  const rootBytes = Buffer.from("%PDF-1.7\nLexNepal E2E portal document version 1\n");
  const rootSha256 = createHash("sha256").update(rootBytes).digest("hex");
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
    const [updated] = await returningMutation(
      db
        .update(documents)
        .set({
          caseId,
          title: "Welcome letter (shared)",
          isPrivileged: false,
          confidentialityLevel: "public",
          uploadStatus: "clean",
          storageId,
          mimeType: "application/pdf",
          sizeBytes: rootBytes.length,
          sha256: rootSha256,
          uploadedBy: staffUser.id,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, existingDoc.id)),
      () => db.select().from(documents).where(eq(documents.id, existingDoc.id)),
    );
    documentId = updated!.id;
  } else {
    const [created] = await returningInsert(
      db
        .insert(documents)
        .values({
          firmId,
          caseId,
          documentNumber: DOC_NUMBER,
          title: "Welcome letter (shared)",
          type: "correspondence",
          storageId,
          mimeType: "application/pdf",
          sizeBytes: rootBytes.length,
          sha256: rootSha256,
          uploadedBy: staffUser.id,
          isTemplate: false,
          isPrivileged: false,
          uploadStatus: "clean",
          confidentialityLevel: "public",
          status: "approved",
        })
        .$returningId(),
      (id) => db.select().from(documents).where(eq(documents.id, id)).limit(1),
    );
    documentId = created!.id;
  }

  const versionBytes = Buffer.from("%PDF-1.7\nLexNepal E2E portal document version 2\n");
  const versionStorageId = `protected/${firmId}/e2e-portal-shared-doc-v2`;
  const versionSha256 = createHash("sha256").update(versionBytes).digest("hex");
  const [existingVersion] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.firmId, firmId), eq(documents.documentNumber, DOC_VERSION_NUMBER)))
    .limit(1);
  if (existingVersion) {
    await db
      .update(documents)
      .set({
        caseId,
        title: "Welcome letter (shared)",
        storageId: versionStorageId,
        mimeType: "application/pdf",
        sizeBytes: versionBytes.length,
        sha256: versionSha256,
        version: 2,
        parentDocumentId: documentId,
        uploadedBy: staffUser.id,
        uploadStatus: "clean",
        isPrivileged: false,
        confidentialityLevel: "public",
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, existingVersion.id));
  } else {
    await db.insert(documents).values({
      firmId,
      caseId,
      documentNumber: DOC_VERSION_NUMBER,
      title: "Welcome letter (shared)",
      type: "correspondence",
      storageId: versionStorageId,
      mimeType: "application/pdf",
      sizeBytes: versionBytes.length,
      sha256: versionSha256,
      version: 2,
      parentDocumentId: documentId,
      uploadedBy: staffUser.id,
      isTemplate: false,
      isPrivileged: false,
      uploadStatus: "clean",
      confidentialityLevel: "public",
      status: "approved",
    });
  }

  const secondBytes = Buffer.from("%PDF-1.7\nLexNepal E2E second portal document\n");
  const secondStorageId = `protected/${firmId}/e2e-portal-second-doc`;
  const secondSha256 = createHash("sha256").update(secondBytes).digest("hex");
  const [existingSecond] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.firmId, firmId), eq(documents.documentNumber, SECOND_DOC_NUMBER)))
    .limit(1);
  if (existingSecond) {
    await db
      .update(documents)
      .set({
        caseId,
        title: "Case checklist (shared)",
        storageId: secondStorageId,
        mimeType: "application/pdf",
        sizeBytes: secondBytes.length,
        sha256: secondSha256,
        uploadedBy: staffUser.id,
        uploadStatus: "clean",
        isPrivileged: false,
        confidentialityLevel: "public",
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, existingSecond.id));
  } else {
    await db.insert(documents).values({
      firmId,
      caseId,
      documentNumber: SECOND_DOC_NUMBER,
      title: "Case checklist (shared)",
      type: "correspondence",
      storageId: secondStorageId,
      mimeType: "application/pdf",
      sizeBytes: secondBytes.length,
      sha256: secondSha256,
      uploadedBy: staffUser.id,
      isTemplate: false,
      isPrivileged: false,
      uploadStatus: "clean",
      confidentialityLevel: "public",
      status: "approved",
    });
  }

  const storage = getDocumentStorageRuntime().storage;
  await storage.initialize();
  await Promise.all([
    storage.putObject(storageId, rootBytes, "application/pdf", { sha256: rootSha256 }),
    storage.putObject(versionStorageId, versionBytes, "application/pdf", { sha256: versionSha256 }),
    storage.putObject(secondStorageId, secondBytes, "application/pdf", { sha256: secondSha256 }),
  ]);

  if (staff2User) {
    await db
      .insert(caseTeamMembers)
      .values({
        firmId,
        caseId,
        userId: staff2User.id,
      })
      .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } });
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
