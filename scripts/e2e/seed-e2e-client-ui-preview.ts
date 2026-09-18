/**
 * CUI-01 Client UI-preview fixture.
 *
 * Explicit local-only command. Does not run on production startup.
 * Reuses the existing E2E fixture family (same firm, staff, helpers).
 * Does not mutate the smoke Client (Sarita Ray / E2E-PORTAL-001).
 *
 *   npm run e2e:seed:client-ui
 */
import { createHash, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { AnyMySqlColumn, MySqlTable } from "drizzle-orm/mysql-core";
import { returningInsert, returningMutation, returningUpsert } from "@/server/db/mysql-returning";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getDocumentStorageRuntime } from "../../src/server/storage/runtime";
import { formatBs, gregorianToBs } from "../../src/lib/nepali-calendar";
import { addCalendarDaysIso } from "../../src/shared/crm/appointment-dates";
import {
  appointments,
  authAccounts,
  authUsers,
  caseTeamMembers,
  cases,
  clientKycFiles,
  clients,
  documents,
  hearings,
  messageReads,
  messages,
  notifications,
  signatureEnvelopes,
  signatureRecipients,
  tasks,
  users,
} from "../../db/schema";
import { E2E_USERS, UI_PREVIEW_CLIENT } from "./fixtures";
import { seedE2eUsers } from "./seed-e2e-users";
import {
  UI_PREVIEW_ANCHOR_DATE,
  UI_PREVIEW_CASES,
  UI_PREVIEW_DOCUMENTS,
  UI_PREVIEW_EXPECTED_COUNTS,
  UI_PREVIEW_LEGACY,
  UI_PREVIEW_NOW,
  UI_PREVIEW_TASK_TITLES,
} from "./client-ui-preview-contract";

type PreviewSummary = {
  firmId: string;
  clientUserId: string;
  clientId: string;
  staffUserId: string;
  staff2UserId: string | null;
  caseIds: Record<string, string>;
  hearingIds: Record<string, string>;
  taskIds: Record<string, string>;
  documentIds: Record<string, string>;
  messageIds: Record<string, string>;
  appointmentIds: Record<string, string>;
  kycFileIds: Record<string, string>;
  envelopeIds: Record<string, string>;
  notificationIds: Record<string, string>;
  counts: typeof UI_PREVIEW_EXPECTED_COUNTS & { messageReads: number };
};

function isoDate(deltaDays: number): string {
  return addCalendarDaysIso(UI_PREVIEW_ANCHOR_DATE, deltaDays);
}

function at(iso: string, hour = 9, minute = 0): Date {
  return new Date(
    `${iso}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:45`,
  );
}

function dateBsFor(iso: string): string {
  return formatBs(gregorianToBs(new Date(`${iso}T12:00:00+05:45`)));
}

function fixtureBytes(label: string, kind: "pdf" | "docx"): Buffer {
  if (kind === "pdf") {
    return Buffer.from(`%PDF-1.7\nLexNepal CUI-01 fixture ${label}\n`);
  }
  return Buffer.from(`PK\u0003\u0004LexNepal CUI-01 DOCX fixture ${label}\n`);
}

async function provisionPreviewUser(firmId: string) {
  const db = getDatabase();
  const fixture = UI_PREVIEW_CLIENT;
  const [existing] = await db.select().from(users).where(eq(users.email, fixture.email)).limit(1);

  const [lexUser] = await returningUpsert(
    db
      .insert(users)
      .values({
        firmId,
        tokenIdentifier: `e2e:${fixture.email}`,
        email: fixture.email,
        name: fixture.name,
        role: fixture.role,
        phone: "+977 9801234567",
        languages: ["English", "Nepali"],
        isActive: true,
        isPending: false,
      })
      .onDuplicateKeyUpdate({
        set: {
          isActive: true,
          isPending: false,
          deletedAt: null,
          role: fixture.role,
          name: fixture.name,
          email: fixture.email,
          phone: "+977 9801234567",
          languages: ["English", "Nepali"],
          tokenIdentifier: `e2e:${fixture.email}`,
          updatedAt: UI_PREVIEW_NOW,
        },
      }),
    () => db.select().from(users).where(eq(users.email, fixture.email)).limit(1),
  );

  const lexnepalUserId = lexUser!.id;
  const [byLex] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.lexnepalUserId, lexnepalUserId))
    .limit(1);
  if (byLex) await db.delete(authUsers).where(eq(authUsers.id, byLex.id));
  const [byEmail] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, fixture.email))
    .limit(1);
  if (byEmail) await db.delete(authUsers).where(eq(authUsers.id, byEmail.id));

  const authUserId = randomUUID();
  await db.insert(authUsers).values({
    id: authUserId,
    lexnepalUserId,
    name: fixture.name,
    email: fixture.email,
    emailVerified: true,
    role: "user",
  });
  await db.insert(authAccounts).values({
    id: randomUUID(),
    accountId: authUserId,
    providerId: "credential",
    userId: authUserId,
    password: await hashPassword(fixture.password),
  });

  return { userId: lexnepalUserId, existed: Boolean(existing) };
}

async function upsertByLegacy<T extends { id: string }>(
  table: MySqlTable & { id: AnyMySqlColumn; legacyConvexId: AnyMySqlColumn },
  legacyId: string,
  values: Record<string, unknown>,
  load: (id: string) => Promise<T[]>,
): Promise<string> {
  const db = getDatabase();
  const [existing] = await db
    .select({ id: table.id })
    .from(table as never)
    .where(eq(table.legacyConvexId, legacyId))
    .limit(1);
  if (existing) {
    await db
      .update(table as never)
      .set({ ...values, deletedAt: null, updatedAt: UI_PREVIEW_NOW } as never)
      .where(eq(table.id, existing.id));
    return existing.id as string;
  }
  const [created] = await returningInsert(
    db
      .insert(table as never)
      .values({
        ...values,
        legacyConvexId: legacyId,
        createdAt: values.createdAt ?? UI_PREVIEW_NOW,
        updatedAt: UI_PREVIEW_NOW,
      } as never)
      .$returningId(),
    (id) => load(id),
  );
  return created!.id;
}

export async function seedE2eClientUiPreview(): Promise<PreviewSummary> {
  const { firmId } = await seedE2eUsers();
  const db = getDatabase();

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
  if (!staffUser) throw new Error("E2E staff user missing after seedE2eUsers");

  const { userId: clientUserId } = await provisionPreviewUser(firmId);

  const [existingClient] = await db
    .select()
    .from(clients)
    .where(
      and(eq(clients.firmId, firmId), eq(clients.userId, clientUserId), isNull(clients.deletedAt)),
    )
    .limit(1);

  let clientId: string;
  if (existingClient) {
    const [updated] = await returningMutation(
      db
        .update(clients)
        .set({
          fullName: UI_PREVIEW_CLIENT.name,
          email: UI_PREVIEW_CLIENT.email,
          phone: "+977 9801234567",
          address: "Lalitpur, Bagmati Province, Nepal",
          type: "individual",
          kycStatus: "submitted",
          kycIdNumber: "CUI1-KYC-001",
          kycSubmittedAt: at(isoDate(-6), 10, 24),
          kycConsentAt: at(isoDate(-6), 10, 20),
          kycConsentVersion: "local-ui-preview-v1",
          isActive: true,
          updatedAt: UI_PREVIEW_NOW,
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
          userId: clientUserId,
          type: "individual",
          fullName: UI_PREVIEW_CLIENT.name,
          email: UI_PREVIEW_CLIENT.email,
          phone: "+977 9801234567",
          address: "Lalitpur, Bagmati Province, Nepal",
          kycStatus: "submitted",
          kycIdNumber: "CUI1-KYC-001",
          kycSubmittedAt: at(isoDate(-6), 10, 24),
          kycConsentAt: at(isoDate(-6), 10, 20),
          kycConsentVersion: "local-ui-preview-v1",
          isActive: true,
        })
        .$returningId(),
      (id) => db.select().from(clients).where(eq(clients.id, id)).limit(1),
    );
    clientId = created!.id;
  }

  const caseIds: Record<string, string> = {};
  for (const [key, spec] of Object.entries(UI_PREVIEW_CASES)) {
    const [existing] = await db
      .select()
      .from(cases)
      .where(
        and(
          eq(cases.firmId, firmId),
          eq(cases.caseNumber, spec.caseNumber),
          isNull(cases.deletedAt),
        ),
      )
      .limit(1);
    const values = {
      clientId,
      assignedLawyerId: staffUser.id,
      title: spec.title,
      practiceArea: spec.practiceArea,
      status: spec.status,
      court: spec.court,
      opposingCounsel: spec.opposingCounsel,
      filingDate: spec.filingDate,
      description: spec.description,
      clientSummary: spec.clientSummary,
      closureOutcome: "closureOutcome" in spec ? spec.closureOutcome : null,
      closedDate: "closedDate" in spec ? spec.closedDate : null,
      updatedAt: UI_PREVIEW_NOW,
    };
    if (existing) {
      await db.update(cases).set(values).where(eq(cases.id, existing.id));
      caseIds[key] = existing.id;
    } else {
      const [created] = await returningInsert(
        db
          .insert(cases)
          .values({
            firmId,
            caseNumber: spec.caseNumber,
            ...values,
          })
          .$returningId(),
        (id) => db.select().from(cases).where(eq(cases.id, id)).limit(1),
      );
      caseIds[key] = created!.id;
    }

    if (staff2User) {
      await db
        .insert(caseTeamMembers)
        .values({
          firmId,
          caseId: caseIds[key]!,
          userId: staff2User.id,
        })
        .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } });
    }
  }

  const hearingSpecs = [
    {
      key: "next",
      legacy: UI_PREVIEW_LEGACY.hearingNext,
      caseKey: "primary",
      date: isoDate(24),
      time: "10:30:00",
      court: "High Court, Kathmandu",
      purpose: "Pre-trial Hearing",
      status: "scheduled" as const,
    },
    {
      key: "upcomingProperty",
      legacy: UI_PREVIEW_LEGACY.hearingUpcomingProperty,
      caseKey: "property",
      date: isoDate(40),
      time: "09:30:00",
      court: "Lalitpur District Court",
      purpose: "Evidence Hearing",
      status: "scheduled" as const,
    },
    {
      key: "upcomingFamily",
      legacy: UI_PREVIEW_LEGACY.hearingUpcomingFamily,
      caseKey: "family",
      date: isoDate(48),
      time: "14:00:00",
      court: "Kathmandu District Court",
      purpose: "Case Management Hearing",
      status: "scheduled" as const,
    },
    {
      key: "completed",
      legacy: UI_PREVIEW_LEGACY.hearingCompleted,
      caseKey: "primary",
      date: isoDate(-27),
      time: "11:00:00",
      court: "High Court, Kathmandu",
      purpose: "Preliminary Hearing",
      status: "completed" as const,
    },
    {
      key: "adjourned",
      legacy: UI_PREVIEW_LEGACY.hearingAdjourned,
      caseKey: "family",
      date: isoDate(-70),
      time: "13:00:00",
      court: "Family Court, Lalitpur",
      purpose: "Mediation Hearing",
      status: "adjourned" as const,
    },
  ] as const;

  const hearingIds: Record<string, string> = {};
  for (const spec of hearingSpecs) {
    hearingIds[spec.key] = await upsertByLegacy(
      hearings,
      spec.legacy,
      {
        firmId,
        caseId: caseIds[spec.caseKey],
        court: spec.court,
        dateGregorian: spec.date,
        dateBs: dateBsFor(spec.date),
        hearingTime: spec.time,
        purpose: spec.purpose,
        status: spec.status,
      },
      (id) => db.select().from(hearings).where(eq(hearings.id, id)).limit(1),
    );
  }

  const taskSpecs = [
    {
      key: "overdue",
      legacy: UI_PREVIEW_LEGACY.taskOverdue,
      title: UI_PREVIEW_TASK_TITLES.overdue,
      caseKey: "property",
      due: isoDate(-3),
      status: "todo" as const,
      completedAt: null as Date | null,
    },
    {
      key: "dueSoon",
      legacy: UI_PREVIEW_LEGACY.taskDueSoon,
      title: UI_PREVIEW_TASK_TITLES.dueSoon,
      caseKey: "family",
      due: isoDate(2),
      status: "todo" as const,
      completedAt: null as Date | null,
    },
    {
      key: "upcoming",
      legacy: UI_PREVIEW_LEGACY.taskUpcoming,
      title: UI_PREVIEW_TASK_TITLES.upcoming,
      caseKey: "property",
      due: isoDate(30),
      status: "todo" as const,
      completedAt: null as Date | null,
    },
    {
      key: "completed",
      legacy: UI_PREVIEW_LEGACY.taskCompleted,
      title: UI_PREVIEW_TASK_TITLES.completed,
      caseKey: "primary",
      due: isoDate(-8),
      status: "done" as const,
      completedAt: at(isoDate(-8), 16),
    },
  ] as const;

  const taskIds: Record<string, string> = {};
  for (const spec of taskSpecs) {
    taskIds[spec.key] = await upsertByLegacy(
      tasks,
      spec.legacy,
      {
        firmId,
        caseId: caseIds[spec.caseKey],
        title: spec.title,
        description: "Client-visible UI-preview checklist item.",
        assignedTo: clientUserId,
        createdBy: staffUser.id,
        status: spec.status,
        priority: spec.key === "overdue" ? "high" : "medium",
        category: "client",
        dueDate: at(spec.due, 9),
        dueDateBs: dateBsFor(spec.due),
        clientVisible: true,
        archivedAt: null,
        completedAt: spec.completedAt,
      },
      (id) => db.select().from(tasks).where(eq(tasks.id, id)).limit(1),
    );
  }

  const storage = getDocumentStorageRuntime().storage;
  await storage.initialize();
  const documentIds: Record<string, string> = {};

  for (const [key, spec] of Object.entries(UI_PREVIEW_DOCUMENTS)) {
    const kind = spec.mimeType.includes("wordprocessingml") ? "docx" : "pdf";
    const bytes = fixtureBytes(spec.documentNumber, kind);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const storageId = `protected/${firmId}/cui1/${spec.documentNumber.toLowerCase()}`;
    await storage.putObject(storageId, bytes, spec.mimeType, { sha256 });

    const signature = "signature" in spec ? spec.signature : undefined;
    const uploaderId = spec.uploader === "client" ? clientUserId : staffUser.id;
    const createdAt = at(isoDate(spec.uploader === "client" ? -5 : -12), 11);
    const [existing] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.firmId, firmId), eq(documents.documentNumber, spec.documentNumber)))
      .limit(1);
    const values = {
      caseId: caseIds[spec.case],
      title: spec.title,
      type: spec.type,
      storageId,
      mimeType: spec.mimeType,
      sizeBytes: bytes.length,
      sha256,
      uploadedBy: uploaderId,
      isTemplate: false,
      isPrivileged: false,
      uploadStatus: "clean" as const,
      confidentialityLevel: "public" as const,
      status: "approved" as const,
      requiresSignature: Boolean(signature),
      signatureStatus: signature ?? null,
      intendedSignerUserId: signature ? clientUserId : null,
      signedByUserId: signature === "signed" ? clientUserId : null,
      signedAt: signature === "signed" ? at(isoDate(-13), 15) : null,
      deletedAt: null,
      updatedAt: UI_PREVIEW_NOW,
    };
    if (existing) {
      await db.update(documents).set(values).where(eq(documents.id, existing.id));
      documentIds[key] = existing.id;
    } else {
      const [created] = await returningInsert(
        db
          .insert(documents)
          .values({
            firmId,
            documentNumber: spec.documentNumber,
            createdAt,
            ...values,
          })
          .$returningId(),
        (id) => db.select().from(documents).where(eq(documents.id, id)).limit(1),
      );
      documentIds[key] = created!.id;
    }
  }

  const messageSpecs = [
    {
      key: "staff1",
      legacy: UI_PREVIEW_LEGACY.messageStaff1,
      senderId: staffUser.id,
      content:
        "Dear Ravi, the draft reply has been filed in court today as discussed. A copy is available in your Documents section.",
      createdAt: at(isoDate(0), 10, 14),
      clientRead: true,
    },
    {
      key: "client1",
      legacy: UI_PREVIEW_LEGACY.messageClient1,
      senderId: clientUserId,
      content: "Thank you for the update. Could you please confirm the next hearing date?",
      createdAt: at(isoDate(0), 10, 28),
      clientRead: true,
    },
    {
      key: "staff2",
      legacy: UI_PREVIEW_LEGACY.messageStaff2,
      senderId: staffUser.id,
      content:
        "The next hearing is scheduled for 12 October 2026. No action is required from your side at this time.",
      createdAt: at(isoDate(0), 10, 32),
      clientRead: true,
    },
    {
      key: "staffUnread",
      legacy: UI_PREVIEW_LEGACY.messageStaffUnread,
      senderId: staffUser.id,
      content: "Please review the engagement letter in Sign Documents when you have a moment.",
      createdAt: at(isoDate(0), 11, 5),
      clientRead: false,
    },
  ] as const;

  const messageIds: Record<string, string> = {};
  for (const spec of messageSpecs) {
    messageIds[spec.key] = await upsertByLegacy(
      messages,
      spec.legacy,
      {
        firmId,
        caseId: caseIds.primary,
        senderId: spec.senderId,
        content: spec.content,
        isInternal: false,
        createdAt: spec.createdAt,
      },
      (id) => db.select().from(messages).where(eq(messages.id, id)).limit(1),
    );
    if (spec.clientRead) {
      await db
        .insert(messageReads)
        .values({
          firmId,
          messageId: messageIds[spec.key]!,
          userId: clientUserId,
          readAt: spec.createdAt,
        })
        .onDuplicateKeyUpdate({ set: { readAt: spec.createdAt } });
    } else {
      await db
        .delete(messageReads)
        .where(
          and(
            eq(messageReads.firmId, firmId),
            eq(messageReads.messageId, messageIds[spec.key]!),
            eq(messageReads.userId, clientUserId),
          ),
        );
    }
  }

  const appointmentSpecs = [
    {
      key: "upcomingVirtual",
      legacy: UI_PREVIEW_LEGACY.appointmentUpcomingVirtual,
      date: isoDate(24),
      timeSlot: "10:00 AM",
      practiceArea: "Virtual Consultation",
      status: "confirmed" as const,
      meetingLink: "https://meet.example.invalid/cui1-preview",
      notes: "Online meeting (Zoom)",
    },
    {
      key: "upcomingOffice",
      legacy: UI_PREVIEW_LEGACY.appointmentUpcomingOffice,
      date: isoDate(34),
      timeSlot: "03:00 PM",
      practiceArea: "In-Person Consultation",
      status: "confirmed" as const,
      meetingLink: null,
      notes: "Srimar Law Office, Lalitpur",
    },
    {
      key: "upcomingPhone",
      legacy: UI_PREVIEW_LEGACY.appointmentUpcomingPhone,
      date: isoDate(48),
      timeSlot: "11:00 AM",
      practiceArea: "Phone Consultation",
      status: "confirmed" as const,
      meetingLink: null,
      notes: "Lawyer will call the registered number",
    },
    {
      key: "past",
      legacy: UI_PREVIEW_LEGACY.appointmentPast,
      date: isoDate(-21),
      timeSlot: "01:30 PM",
      practiceArea: "Virtual Consultation",
      status: "completed" as const,
      meetingLink: null,
      notes: "Document review discussion",
    },
  ] as const;

  const appointmentIds: Record<string, string> = {};
  for (const spec of appointmentSpecs) {
    appointmentIds[spec.key] = await upsertByLegacy(
      appointments,
      spec.legacy,
      {
        firmId,
        clientName: UI_PREVIEW_CLIENT.name,
        clientEmail: UI_PREVIEW_CLIENT.email,
        clientPhone: "+977 9801234567",
        clientId,
        practiceArea: spec.practiceArea,
        date: spec.date,
        timeSlot: spec.timeSlot,
        notes: spec.notes,
        status: spec.status,
        assignedLawyerId: staffUser.id,
        meetingLink: spec.meetingLink,
      },
      (id) => db.select().from(appointments).where(eq(appointments.id, id)).limit(1),
    );
  }

  const kycSpecs = [
    {
      key: "governmentId",
      legacy: UI_PREVIEW_LEGACY.kycGovernmentId,
      documentType: "government_id" as const,
      fileName: "Citizenship-Copy.pdf",
    },
    {
      key: "proofOfAddress",
      legacy: UI_PREVIEW_LEGACY.kycProofOfAddress,
      documentType: "proof_of_address" as const,
      fileName: "Utility-Bill.pdf",
    },
  ] as const;
  const kycFileIds: Record<string, string> = {};
  for (const spec of kycSpecs) {
    const bytes = fixtureBytes(spec.fileName, "pdf");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const storageId = `protected/${firmId}/cui1/kyc/${spec.documentType}`;
    await storage.putObject(storageId, bytes, "application/pdf", { sha256 });
    kycFileIds[spec.key] = await upsertByLegacy(
      clientKycFiles,
      spec.legacy,
      {
        firmId,
        clientId,
        storageId,
        documentType: spec.documentType,
        fileName: spec.fileName,
        mimeType: "application/pdf",
        sha256,
      },
      (id) => db.select().from(clientKycFiles).where(eq(clientKycFiles.id, id)).limit(1),
    );
  }

  const envelopePendingId = await upsertByLegacy(
    signatureEnvelopes,
    UI_PREVIEW_LEGACY.envelopePending,
    {
      firmId,
      documentId: documentIds.pendingSignPdf,
      caseId: caseIds.primary,
      title: "Client Engagement Letter",
      status: "sent",
      routing: "parallel",
      createdBy: staffUser.id,
      expiresAt: at(isoDate(26), 17),
      voidedAt: null,
      completedAt: null,
    },
    (id) => db.select().from(signatureEnvelopes).where(eq(signatureEnvelopes.id, id)).limit(1),
  );
  const envelopeCompletedId = await upsertByLegacy(
    signatureEnvelopes,
    UI_PREVIEW_LEGACY.envelopeCompleted,
    {
      firmId,
      documentId: documentIds.signedPdf,
      caseId: caseIds.family,
      title: "NDA Agreement",
      status: "completed",
      routing: "parallel",
      createdBy: staffUser.id,
      expiresAt: at(isoDate(40), 17),
      completedAt: at(isoDate(-13), 15),
    },
    (id) => db.select().from(signatureEnvelopes).where(eq(signatureEnvelopes.id, id)).limit(1),
  );

  await upsertByLegacy(
    signatureRecipients,
    UI_PREVIEW_LEGACY.recipientPending,
    {
      firmId,
      envelopeId: envelopePendingId,
      userId: clientUserId,
      order: 0,
      status: "pending",
      signedAt: null,
      declinedAt: null,
    },
    (id) => db.select().from(signatureRecipients).where(eq(signatureRecipients.id, id)).limit(1),
  );
  await upsertByLegacy(
    signatureRecipients,
    UI_PREVIEW_LEGACY.recipientSigned,
    {
      firmId,
      envelopeId: envelopeCompletedId,
      userId: clientUserId,
      order: 0,
      status: "signed",
      signedAt: at(isoDate(-13), 15),
    },
    (id) => db.select().from(signatureRecipients).where(eq(signatureRecipients.id, id)).limit(1),
  );

  const notificationSpecs = [
    {
      key: "hearing",
      legacy: UI_PREVIEW_LEGACY.notificationHearing,
      type: "hearing_reminder" as const,
      title: "Next hearing scheduled",
      body: "A hearing date has been scheduled for Sharma vs. ABC Construction Pvt. Ltd.",
      relatedId: hearingIds.next,
      link: "/client/hearings",
      isRead: false,
      createdAt: at(isoDate(0), 8, 30),
    },
    {
      key: "message",
      legacy: UI_PREVIEW_LEGACY.notificationMessage,
      type: "message" as const,
      title: "New message from your legal team",
      body: "You have received a new message regarding Sharma vs. ABC Construction Pvt. Ltd.",
      relatedId: messageIds.staffUnread,
      link: "/client/messages",
      isRead: false,
      createdAt: at(isoDate(0), 9, 15),
    },
    {
      key: "document",
      legacy: UI_PREVIEW_LEGACY.notificationDocument,
      type: "document_request" as const,
      title: "Document shared",
      body: "Your legal team shared Court Notice.pdf.",
      relatedId: documentIds.courtPdf,
      link: "/client/documents",
      isRead: true,
      createdAt: at(isoDate(-4), 13),
    },
    {
      key: "appointment",
      legacy: UI_PREVIEW_LEGACY.notificationAppointment,
      type: "system" as const,
      title: "Appointment confirmed",
      body: "Your consultation has been confirmed for 12 October 2026.",
      relatedId: appointmentIds.upcomingVirtual,
      link: "/client/booking",
      isRead: true,
      createdAt: at(isoDate(-4), 8, 30),
    },
    {
      key: "signature",
      legacy: UI_PREVIEW_LEGACY.notificationSignature,
      type: "document_request" as const,
      title: "Signature requested",
      body: "Client Engagement Letter.pdf needs your signature.",
      relatedId: envelopePendingId,
      link: "/client/signatures",
      isRead: false,
      createdAt: at(isoDate(-1), 16),
    },
    {
      key: "matter",
      legacy: UI_PREVIEW_LEGACY.notificationMatter,
      type: "system" as const,
      title: "Matter status updated",
      body: "The status of Sharma vs. ABC Construction Pvt. Ltd. has been updated.",
      relatedId: caseIds.primary,
      link: "/client/cases",
      isRead: true,
      createdAt: at(isoDate(-21), 11),
    },
  ] as const;

  const notificationIds: Record<string, string> = {};
  for (const spec of notificationSpecs) {
    notificationIds[spec.key] = await upsertByLegacy(
      notifications,
      spec.legacy,
      {
        firmId,
        userId: clientUserId,
        title: spec.title,
        body: spec.body,
        type: spec.type,
        relatedId: spec.relatedId,
        link: spec.link,
        isRead: spec.isRead,
        createdAt: spec.createdAt,
      },
      (id) => db.select().from(notifications).where(eq(notifications.id, id)).limit(1),
    );
  }

  const previewCaseIds = Object.values(caseIds);
  const [messageReadRows] = await Promise.all([
    db
      .select({ id: messageReads.id })
      .from(messageReads)
      .where(
        and(
          eq(messageReads.firmId, firmId),
          inArray(messageReads.messageId, Object.values(messageIds)),
        ),
      ),
  ]);

  const counts = {
    clients: 1,
    cases: previewCaseIds.length,
    teamLinks: staff2User ? previewCaseIds.length : 0,
    hearings: Object.keys(hearingIds).length,
    tasks: Object.keys(taskIds).length,
    documents: Object.keys(documentIds).length,
    messages: Object.keys(messageIds).length,
    appointments: Object.keys(appointmentIds).length,
    kycFiles: Object.keys(kycFileIds).length,
    envelopes: 2,
    notifications: Object.keys(notificationIds).length,
    messageReads: messageReadRows.length,
  };

  return {
    firmId,
    clientUserId,
    clientId,
    staffUserId: staffUser.id,
    staff2UserId: staff2User?.id ?? null,
    caseIds,
    hearingIds,
    taskIds,
    documentIds,
    messageIds,
    appointmentIds,
    kycFileIds,
    envelopeIds: { pending: envelopePendingId, completed: envelopeCompletedId },
    notificationIds,
    counts,
  };
}

const invokedDirectly = process.argv[1]
  ?.replace(/\\/g, "/")
  .endsWith("/scripts/e2e/seed-e2e-client-ui-preview.ts");
if (invokedDirectly) {
  try {
    const result = await seedE2eClientUiPreview();
    console.log(
      JSON.stringify(
        {
          ok: true,
          profile: "ui-preview",
          clientEmail: UI_PREVIEW_CLIENT.email,
          expected: UI_PREVIEW_EXPECTED_COUNTS,
          ...result,
        },
        null,
        2,
      ),
    );
  } finally {
    await closeDatabase();
  }
}
