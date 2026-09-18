/**
 * CUI-01 UI-preview fixture contract.
 *
 * Local/test-only identifiers for a coherent Client Portal dataset.
 * Isolated from the smoke Client (Sarita Ray / E2E-PORTAL-001).
 *
 * Deterministic timestamps are relative to UI_PREVIEW_NOW. Live UI still
 * computes "overdue / today / earlier" against wall-clock time; CUI-19 should
 * freeze Playwright's clock to UI_PREVIEW_NOW rather than changing production UI.
 */

export const UI_PREVIEW_NOW = new Date("2026-09-18T05:30:00.000Z");
export const UI_PREVIEW_ANCHOR_DATE = "2026-09-18";

export const UI_PREVIEW_SMOKE_CASE_NUMBER = "E2E-PORTAL-001";

export const UI_PREVIEW_CASES = {
  primary: {
    caseNumber: "CUI1-MATTER-001",
    title: "Sharma vs. ABC Construction Pvt. Ltd.",
    practiceArea: "Civil Dispute",
    status: "active" as const,
    court: "High Court, Kathmandu",
    opposingCounsel: "ABC Construction Pvt. Ltd.",
    filingDate: "2024-01-15",
    description:
      "Civil dispute relating to breach of construction agreement and compensation claim.",
    clientSummary:
      "This is a civil dispute relating to breach of construction agreement with ABC Construction Pvt. Ltd.",
  },
  property: {
    caseNumber: "CUI1-MATTER-002",
    title: "Property Dispute - Kathmandu",
    practiceArea: "Real Estate / Property Dispute",
    status: "active" as const,
    court: "Lalitpur District Court",
    opposingCounsel: null,
    filingDate: "2025-06-15",
    description: "Property ownership dispute in Kathmandu valley.",
    clientSummary: "Property ownership matter with upcoming evidence submission.",
  },
  commercial: {
    caseNumber: "CUI1-MATTER-003",
    title: "Business Agreement Review",
    practiceArea: "Corporate / Commercial",
    status: "on_hold" as const,
    court: null,
    opposingCounsel: null,
    filingDate: "2025-07-22",
    description: "Commercial agreement review currently on hold pending client documents.",
    clientSummary: "Corporate agreement review paused until requested papers arrive.",
  },
  family: {
    caseNumber: "CUI1-MATTER-004",
    title: "Family Settlement Matter",
    practiceArea: "Family Law",
    status: "closed" as const,
    closureOutcome: "settled" as const,
    court: "Family Court, Lalitpur",
    opposingCounsel: null,
    filingDate: "2025-03-01",
    closedDate: "2026-08-12",
    description: "Family settlement concluded.",
    clientSummary: "Family settlement matter closed after mediation.",
  },
} as const;

export const UI_PREVIEW_DOCUMENTS = {
  courtPdf: {
    documentNumber: "CUI1-DOC-001",
    title: "Court Notice.pdf",
    type: "court_filing" as const,
    mimeType: "application/pdf",
    case: "primary" as const,
    uploader: "staff" as const,
  },
  clientDocx: {
    documentNumber: "CUI1-DOC-002",
    title: "Reply Draft.docx",
    type: "correspondence" as const,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    case: "primary" as const,
    uploader: "client" as const,
  },
  evidencePdf: {
    documentNumber: "CUI1-DOC-003",
    title: "Site Photos.pdf",
    type: "evidence" as const,
    mimeType: "application/pdf",
    case: "property" as const,
    uploader: "client" as const,
  },
  pendingSignPdf: {
    documentNumber: "CUI1-DOC-004",
    title: "Client Engagement Letter.pdf",
    type: "contract" as const,
    mimeType: "application/pdf",
    case: "primary" as const,
    uploader: "staff" as const,
    signature: "pending" as const,
  },
  signedPdf: {
    documentNumber: "CUI1-DOC-005",
    title: "NDA Agreement.pdf",
    type: "contract" as const,
    mimeType: "application/pdf",
    case: "family" as const,
    uploader: "staff" as const,
    signature: "signed" as const,
  },
  sharedPdf: {
    documentNumber: "CUI1-DOC-006",
    title: "Legal Opinion.pdf",
    type: "correspondence" as const,
    mimeType: "application/pdf",
    case: "primary" as const,
    uploader: "staff" as const,
  },
} as const;

export const UI_PREVIEW_LEGACY = {
  hearingNext: "cui1:hearing:next",
  hearingUpcomingProperty: "cui1:hearing:upcoming-property",
  hearingUpcomingFamily: "cui1:hearing:upcoming-family",
  hearingCompleted: "cui1:hearing:completed",
  hearingAdjourned: "cui1:hearing:adjourned",
  taskOverdue: "cui1:task:overdue",
  taskDueSoon: "cui1:task:due-soon",
  taskUpcoming: "cui1:task:upcoming",
  taskCompleted: "cui1:task:completed",
  messageStaff1: "cui1:message:staff-1",
  messageClient1: "cui1:message:client-1",
  messageStaff2: "cui1:message:staff-2",
  messageStaffUnread: "cui1:message:staff-unread",
  appointmentUpcomingVirtual: "cui1:appointment:upcoming-virtual",
  appointmentUpcomingOffice: "cui1:appointment:upcoming-office",
  appointmentUpcomingPhone: "cui1:appointment:upcoming-phone",
  appointmentPast: "cui1:appointment:past",
  kycGovernmentId: "cui1:kyc:government-id",
  kycProofOfAddress: "cui1:kyc:proof-of-address",
  envelopePending: "cui1:envelope:pending",
  envelopeCompleted: "cui1:envelope:completed",
  recipientPending: "cui1:recipient:pending",
  recipientSigned: "cui1:recipient:signed",
  notificationHearing: "cui1:notification:hearing",
  notificationMessage: "cui1:notification:message",
  notificationDocument: "cui1:notification:document",
  notificationAppointment: "cui1:notification:appointment",
  notificationSignature: "cui1:notification:signature",
  notificationMatter: "cui1:notification:matter",
} as const;

export const UI_PREVIEW_TASK_TITLES = {
  overdue: "Provide updated property document",
  dueSoon: "Review and sign settlement draft",
  upcoming: "Upload additional identity copy",
  completed: "Confirm hearing attendance",
} as const;

export const UI_PREVIEW_EXPECTED_COUNTS = {
  clients: 1,
  cases: 4,
  teamLinks: 4,
  hearings: 5,
  tasks: 4,
  documents: 6,
  messages: 4,
  appointments: 4,
  kycFiles: 2,
  envelopes: 2,
  notifications: 6,
} as const;
