import type { VisualState } from "./catalog";

const timestamp = "2026-09-18T03:00:00.000Z";
export const syntheticUser = {
  id: "visual-user",
  _id: "visual-user",
  name: "Ravi Sharma",
  role: "client",
  email: "ravi@visual.example.invalid",
  phone: "+977 9800000000",
  createdAt: "2026-01-01T00:00:00.000Z",
  lastLoginAt: timestamp,
  twoFactorEnabled: false,
  emailVerified: true,
  avatarUrl: null,
};
const client = {
  _id: "visual-client",
  id: "visual-client",
  fullName: syntheticUser.name,
  email: syntheticUser.email,
  phone: syntheticUser.phone,
  address: "Kathmandu, Nepal",
  kycStatus: "submitted",
  createdAt: syntheticUser.createdAt,
};
const advocate = {
  _id: "visual-lawyer",
  id: "visual-lawyer",
  name: "Adv. Sita Adhikari",
  role: "lawyer",
};
const matter = {
  _id: "matter-1",
  id: "matter-1",
  title: "Sharma vs. ABC Construction Pvt. Ltd.",
  caseNumber: "CIV-2026-001",
  status: "active",
  practiceArea: "Civil Litigation",
  court: "Kathmandu District Court",
  advocate,
  assignedTo: [advocate._id],
  clientId: client._id,
  clientSummary: "Your legal team is preparing the next hearing.",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: timestamp,
  parties: [],
};
const hearing = {
  _id: "hearing-1",
  id: "hearing-1",
  caseId: matter._id,
  dateGregorian: "2026-09-24",
  time: "10:30",
  court: matter.court,
  purpose: "Evidence hearing",
  status: "scheduled",
};
const document = {
  _id: "document-1",
  id: "document-1",
  title: "Evidence submission.pdf",
  fileName: "Evidence submission.pdf",
  caseId: matter._id,
  type: "evidence",
  mimeType: "application/pdf",
  uploadedBy: advocate._id,
  sizeBytes: 131072,
  createdAt: timestamp,
  updatedAt: timestamp,
  status: "approved",
};
const task = {
  _id: "task-1",
  id: "task-1",
  caseId: matter._id,
  title: "Review the evidence summary",
  description: "Contact your legal team if any details require correction.",
  status: "todo",
  clientVisible: true,
  dueDate: "2026-09-23",
  priority: "medium",
  createdAt: timestamp,
};
const notification = {
  _id: "notification-1",
  id: "notification-1",
  title: "Your hearing has been scheduled",
  body: "Your legal team has shared the next hearing date.",
  type: "hearing_reminder",
  isRead: false,
  relatedId: matter._id,
  caseId: matter._id,
  createdAt: timestamp,
  link: "/client/hearings",
};
const appointment = {
  _id: "appointment-1",
  id: "appointment-1",
  date: "2026-09-22",
  timeSlot: "11:00",
  practiceArea: "Virtual Consultation",
  status: "confirmed",
  notes: "Discuss the hearing preparation.",
};
const message = {
  _id: "message-1",
  id: "message-1",
  caseId: matter._id,
  senderId: advocate._id,
  content: "Please review the evidence summary before our next meeting.",
  isInternal: false,
  createdAt: timestamp,
  _creationTime: timestamp,
  attachments: [],
  isRead: false,
};
const signingDocument = { ...document, title: "Client declaration.pdf" };

export function createVisualData(state: VisualState) {
  const data = {
    client: { ...client },
    cases: [{ ...matter }],
    detail: { ...matter },
    hearings: [{ ...hearing }],
    documents: [{ ...document }],
    tasks: [{ ...task }],
    notifications: [{ ...notification }],
    appointments: [{ ...appointment }],
    messages: { page: [{ ...message }], isDone: true, continueCursor: null },
    unread: { "matter-1": 1 },
    slots: ["09:00", "10:00", "11:00"],
    files: [
      {
        id: "kyc-1",
        name: "Proof of address.pdf",
        fileName: "Proof of address.pdf",
        storageId: "synthetic-only",
        docType: "proof_of_address",
        mimeType: "application/pdf",
        url: "https://visual.example.invalid/disabled-file",
        uploadedAt: timestamp,
        createdAt: timestamp,
      },
    ],
    envelopes: [{ kind: "direct", document: signingDocument }],
    inbox: {
      pendingEnvelopes: [],
      pendingDirect: [{ kind: "direct", document: signingDocument }],
      recentlySigned: [] as {
        kind: string;
        document: typeof signingDocument & { signedAt: string };
      }[],
    },
    sessions: [
      {
        id: "synthetic-session",
        isCurrent: true,
        current: true,
        userAgent: "Synthetic Chromium",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    audit: [
      {
        id: "audit-1",
        action: "profile.updated",
        createdAt: timestamp,
        summary: "Profile updated",
      },
    ],
  };
  if (state === "empty") {
    for (const key of [
      "cases",
      "hearings",
      "documents",
      "tasks",
      "notifications",
      "appointments",
      "files",
      "envelopes",
      "sessions",
      "audit",
    ] as const)
      data[key] = [];
    data.messages.page = [];
    data.inbox.pendingDirect = [];
    data.slots = [];
    data.unread = { "matter-1": 0 };
  }
  if (state === "no-upcoming" || state === "complete") {
    data.hearings[0].dateGregorian = "2026-09-10";
    data.hearings[0].status = "completed";
    data.appointments[0].date = "2026-09-10";
    data.appointments[0].status = "completed";
    data.tasks[0].status = "done";
    data.notifications[0].isRead = true;
    data.client.kycStatus = "verified";
    data.envelopes = [];
    data.inbox.pendingDirect = [];
    data.inbox.recentlySigned = [
      { kind: "direct", document: { ...signingDocument, signedAt: timestamp } },
    ];
    data.unread = { "matter-1": 0 };
    if (state === "complete") {
      data.cases[0].status = "closed";
      data.detail.status = "closed";
    }
  }
  if (state === "long-text") {
    const long = "A long synthetic description containing many words and legal details ".repeat(5);
    data.cases[0].title = long;
    data.detail.title = long;
    data.hearings[0].court = "Kathmandu District Court — Commercial and Civil Division ".repeat(5);
    data.documents[0].title = "evidence_".repeat(24) + ".pdf";
    data.tasks[0].title = long;
    data.notifications[0].title = long;
    data.messages.page[0].content = long + "unbroken".repeat(36);
    data.files[0].name = "proof_of_address_".repeat(16) + ".pdf";
    data.files[0].fileName = data.files[0].name;
    data.appointments[0].notes = long;
    data.inbox.pendingDirect[0].document = { ...signingDocument, title: long + ".pdf" };
  }
  if (state === "high-volume") {
    for (const key of [
      "cases",
      "hearings",
      "documents",
      "tasks",
      "notifications",
      "appointments",
      "files",
      "audit",
    ] as const) {
      // Fixtures only: replicate existing domain shapes without production writes.
      Object.assign(data, {
        [key]: Array.from({ length: 120 }, (_, index) => ({
          ...data[key][0],
          id: `${key}-${index}`,
          _id: key === "cases" && index === 0 ? "matter-1" : `${key}-${index}`,
        })),
      });
    }
    data.messages.page = Array.from({ length: 120 }, (_, index) => ({
      ...message,
      id: `message-${index}`,
      _id: `message-${index}`,
    }));
  }
  return data;
}
