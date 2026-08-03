import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
export { ConvexReactClient } from "./convex-client-stub";
import { getFunctionName } from "convex/server";
// Types matching Convex schema
export interface LexUser {
  _id: string;
  name: string;
  email: string;
  role: "partner" | "senior_associate" | "associate" | "paralegal" | "intern" | "admin" | "client";
  isActive: boolean;
  phone?: string;
  barCouncilNumber?: string;
  barCouncilExpiry?: string;
  isPublicFacing?: boolean;
  bio?: string;
  avatarUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  publicEmail?: string;
  baseSalary?: number;
  twoFactorEnabled?: boolean;
  isPending?: boolean;
  activationToken?: string;
  inviteExpiresAt?: string;
  invitedAt?: string;
  practiceAreas?: string[];
  avatar?: string;
  lastLoginAt?: string;
  totpSecret?: string;
}

export interface LexSession {
  _id: string;
  userId: string;
  device: string;
  browser: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface LexClient {
  _id: string;
  fullName: string;
  type: "individual" | "corporate";
  email?: string;
  phone?: string;
  address?: string;
  companyName?: string;
  registrationNumber?: string;
  kycStatus: "pending" | "submitted" | "verified" | "rejected";
  kycDocuments?: string[];
  kycFiles?: Array<{
    storageId: string;
    docType: "government_id" | "proof_of_address" | "other";
    fileName: string;
    mimeType?: string;
  }>;
  kycIdNumber?: string;
  kycConsentAt?: string;
  kycConsentVersion?: string;
  kycRejectionReason?: string;
  kycSubmittedAt?: string;
  kycReviewedAt?: string;
  kycReviewedBy?: string;
  notes?: string;
  isActive: boolean;
  userId?: string;
}

export interface LexCase {
  _id: string;
  caseNumber: string;
  title: string;
  description?: string;
  practiceArea: string;
  status: "inquiry" | "active" | "on_hold" | "closed_won" | "closed_lost";
  clientId: string;
  assignedLawyerId: string;
  teamMemberIds: string[];
  court?: string;
  judge?: string;
  opposingCounsel?: string;
  filingDate?: string;
  closedDate?: string;
  conflictChecked: boolean;
  conflictClearedBy?: string;
}

export interface LexHearing {
  _id: string;
  caseId: string;
  court: string;
  judge?: string;
  dateGregorian: string;
  dateBs: string;
  time?: string;
  purpose?: string;
  outcome?: string;
  nextDateGregorian?: string;
  nextDateBs?: string;
  status:
    | "scheduled"
    | "completed"
    | "adjourned"
    | "cancelled"
    | "postponed"
    | "not_reached"
    | "bench_disqualified"
    | "could_not_present"
    | "part_heard"
    | "continuous"
    | "procedural_order"
    | "evidence_exam"
    | "final_judgment"
    | "dismissed"
    | "settled"
    | "archived"
    | "on_hold";
  notes?: string;
}

export interface LexTask {
  _id: string;
  firmId?: string;
  caseId?: string;
  title: string;
  description?: string;
  assignedTo: string;
  createdBy: string;
  status: "todo" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  category?: "filing" | "research" | "client" | "court" | "admin" | "other";
  dueDate?: string;
  dueDateBs?: string;
  isRecurring: boolean;
  recurrenceRule?: "daily" | "weekly" | "monthly";
  reminderAt?: string;
  completedAt?: string;
  archivedAt?: string;
  parentTaskId?: string;
  watchers?: string[];
  clientVisible?: boolean;
  hearingId?: string;
  documentId?: string;
  lastDueReminderAt?: string;
}

export interface LexSopTemplate {
  _id: string;
  key: string;
  label: string;
  taskTitles: string[];
  defaultPriority: "low" | "medium" | "high" | "urgent";
  practiceArea?: string;
}

export interface LexTaskComment {
  _id: string;
  taskId: string;
  authorId: string;
  content: string;
  _creationTime: number;
}

export interface LexTimeEntry {
  _id: string;
  caseId: string;
  userId: string;
  description: string;
  minutes: number;
  isBillable: boolean;
  date: string;
  ratePerHour: number;
  invoiceId?: string;
}

export interface LexInvoice {
  _id: string;
  invoiceNumber: string;
  caseId: string;
  clientId: string;
  subtotal: number;
  vatAmount: number;
  total: number;
  issuedDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  notes?: string;
  paidDate?: string;
}

export interface LexTrustTransaction {
  _id: string;
  clientId: string;
  caseId?: string;
  type: "receipt" | "disbursement";
  amount: number;
  description: string;
  date: string;
  balance: number;
  approvedBy: string;
}

export interface LexMessage {
  _id: string;
  caseId: string;
  senderId: string;
  content: string;
  isInternal: boolean;
  attachmentIds: string[];
  readBy: string[];
  _creationTime: number;
}

export interface LexBrief {
  _id: string;
  caseId: string;
  title: string;
  content: string;
  authorId: string;
  sharedWith: string[];
  _creationTime: number;
  lastModified: number;
}

export interface LexLead {
  _id: string;
  fullName: string;
  email?: string;
  phone?: string;
  source: "website" | "referral" | "walk_in" | "phone" | "social";
  practiceAreaInterest?: string;
  message?: string;
  status: "new" | "contacted" | "consultation_scheduled" | "converted" | "lost";
  assignedTo?: string;
  convertedClientId?: string;
  notes?: string;
  intakeToken?: string;
  intakeSubmitted?: boolean;
  _creationTime: number;
}

export interface LexIntakeForm {
  _id: string;
  leadId: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  citizenshipNo: string;
  practiceArea: string;
  caseDescription: string;
  documentStorageIds: string[];
  submittedAt: number;
}

export interface LexAppointment {
  _id: string;
  clientId?: string;
  leadId?: string;
  lawyerId: string;
  date: string;
  time: string;
  type: "in_person" | "virtual" | "phone";
  status: "scheduled" | "completed" | "cancelled";
  notes?: string;
  _creationTime: number;
}

export interface LexExpense {
  _id: string;
  description: string;
  category:
    | "office_rent"
    | "utilities"
    | "court_fees"
    | "courier"
    | "printing"
    | "travel"
    | "supplies"
    | "software"
    | "other";
  amount: number;
  caseId?: string;
  receiptId?: string;
  date: string;
  submittedBy: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  _creationTime: number;
}

export interface LexCauseList {
  _id: string;
  caseId: string; // Internal case ID if matched
  courtName: string;
  judgeName: string;
  hearingType: string;
  serialNumber: string;
  status: "scheduled" | "heard" | "adjourned";
  pesiDate: string; // BS Date string
  _creationTime: number;
}

export interface LexAttendance {
  _id: string;
  userId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: "present" | "absent" | "half_day" | "leave";
}

export interface LexLeaveRequest {
  _id: string;
  userId: string;
  type: "annual" | "sick" | "maternity" | "paternity" | "unpaid";
  fromDate: string;
  toDate: string;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
}

export interface LexAuditLog {
  _id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  _creationTime: number;
}

export interface LexDocument {
  _id: string;
  caseId?: string;
  title: string;
  type:
    | "pleading"
    | "affidavit"
    | "contract"
    | "poa"
    | "correspondence"
    | "evidence"
    | "template"
    | "other";
  storageId: string;
  mimeType: string;
  sizeBytes: number;
  tags: string[];
  uploadedBy: string;
  isTemplate: boolean;
  isPrivileged: boolean;
  version: number;
  parentDocumentId?: string;
  requiresSignature?: boolean;
  signatureStatus?: "pending" | "signed";
  signedAt?: string;
  intendedSignerUserId?: string;
  signedByUserId?: string;
  signatureMethod?: "draw" | "type" | "upload";
  signatureArtifactStorageId?: string;
  typedSignatureText?: string;
  signConsentVersion?: string;
  signConsentAt?: string;
  viewedAt?: string;
  signerUserAgent?: string;
  sha256?: string;
  uploadStatus?: "quarantined" | "scanning" | "clean" | "rejected";
  isDeleted?: boolean;
  isOnLegalHold?: boolean;
  retentionUntil?: string;
  _creationTime: number;
}

export interface LexNotification {
  _id: string;
  userId: string;
  title: string;
  body: string;
  type?: string;
  isRead: boolean;
  link?: string;
  relatedId?: string;
  _creationTime: number;
}

export interface LexTemplate {
  _id: string;
  title: string;
  type: "retainer" | "petition" | "nda" | "general";
  content: string; // Contains placeholders like {{CLIENT_NAME}}
  _creationTime: number;
}

export interface LexResearchNote {
  _id: string;
  title: string;
  category:
    | "supreme_court"
    | "high_court"
    | "district_court"
    | "commentary"
    | "procedure"
    | "template_research";
  tags: string[];
  content: string;
  authorId: string;
  _creationTime: number;
}

const INITIAL_USERS: LexUser[] = [
  {
    _id: "u1",
    name: "Ramesh Badal",
    email: "ramesh@srimarlaw.com.np",
    role: "partner",
    isActive: true,
    isPublicFacing: true,
    phone: "+977-9860520520",
    barCouncilNumber: "NPC-001234",
    barCouncilExpiry: "2083-05-15",
    avatarUrl:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=256&h=256&auto=format&fit=crop",
    bio: "Ramesh Badal is a Senior Lawyer and the Former Attorney General of Nepal. With unparalleled expertise in constitutional and corporate law, he leads Srimar Law's high-stakes litigation.",
    linkedinUrl: "https://linkedin.com",
    twitterUrl: "https://twitter.com",
    publicEmail: "ramesh@srimarlaw.com.np",
  },
  {
    _id: "u2",
    name: "Sangit Dhungana",
    email: "sangit@srimarlaw.com.np",
    role: "associate",
    isActive: true,
    isPublicFacing: true,
    phone: "+977-9860520520",
    barCouncilNumber: "NPC-005678",
    barCouncilExpiry: "2082-12-30",
    avatarUrl:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=256&h=256&auto=format&fit=crop",
    bio: "Sangit Dhungana is a dedicated Associate Lawyer at Srimar Law, specializing in corporate compliance, dispute resolution, and civil litigation.",
    linkedinUrl: "https://linkedin.com",
    publicEmail: "sangit@srimarlaw.com.np",
  },
  {
    _id: "u6",
    name: "Rajan Sharma",
    email: "rajan@srimarlaw.com.np",
    role: "associate",
    isActive: true,
    isPublicFacing: true,
    phone: "+977 9801122334",
    barCouncilNumber: "NPC-008910",
    barCouncilExpiry: "2084-01-10",
    avatarUrl:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=256&h=256&auto=format&fit=crop",
    bio: "Rajan specializes in intellectual property and tech law. He advises Nepal's leading startups on regulatory compliance and data protection frameworks.",
    linkedinUrl: "https://linkedin.com",
    twitterUrl: "https://twitter.com",
  },
  {
    _id: "u7",
    name: "Priya Gurung",
    email: "priya@srimarlaw.com.np",
    role: "associate",
    isActive: true,
    isPublicFacing: true,
    phone: "+977 9811223344",
    barCouncilNumber: "NPC-009988",
    barCouncilExpiry: "2085-02-15",
    avatarUrl:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=256&h=256&auto=format&fit=crop",
    bio: "Priya is a dedicated advocate focusing on family law and dispute resolution. She is known for her empathetic approach and fierce courtroom advocacy.",
    publicEmail: "priya@srimarlaw.com.np",
  },
  {
    _id: "u3",
    name: "Hari Prasad",
    email: "hari@client.com",
    role: "client",
    isActive: true,
    phone: "+977 9803098765",
  },
  {
    _id: "u4",
    name: "Gita Nepal",
    email: "gita@admin.com",
    role: "admin",
    isActive: true,
    phone: "+977 9812345678",
  },
  {
    _id: "u5",
    name: "Krishna Aryal",
    email: "krishna@intern.com",
    role: "intern",
    isActive: true,
    phone: "+977 9860112233",
  },
];

const INITIAL_CLIENTS: LexClient[] = [
  {
    _id: "c1",
    fullName: "Hari Prasad",
    type: "individual",
    email: "hari@client.com",
    phone: "+977 9803098765",
    address: "Koteshwor, Kathmandu",
    kycStatus: "verified",
    isActive: true,
    notes: "Regular property dispute consultations.",
    userId: "u3",
  },
  {
    _id: "c2",
    fullName: "TechVenture Pvt. Ltd.",
    type: "corporate",
    email: "legal@techventure.com.np",
    phone: "+977 01 4412345",
    address: "Lalitpur",
    companyName: "TechVenture Pvt. Ltd.",
    registrationNumber: "REG-9912",
    kycStatus: "submitted",
    kycIdNumber: "REG-9912",
    kycConsentVersion: "kyc-consent-v1",
    kycConsentAt: new Date().toISOString(),
    kycSubmittedAt: new Date().toISOString(),
    kycFiles: [
      {
        storageId: "mock-kyc-id-c2",
        docType: "government_id",
        fileName: "company-registration.pdf",
      },
      {
        storageId: "mock-kyc-addr-c2",
        docType: "proof_of_address",
        fileName: "office-utility-bill.pdf",
      },
    ],
    kycDocuments: ["mock-kyc-id-c2", "mock-kyc-addr-c2"],
    isActive: true,
  },
  {
    _id: "c3",
    fullName: "Shree Ram Builders",
    type: "corporate",
    email: "shreerambuilders@ncell.com",
    phone: "+977 9851099999",
    address: "Bhaktapur",
    companyName: "Shree Ram Builders",
    kycStatus: "pending",
    isActive: true,
  },
];

const INITIAL_CASES: LexCase[] = [
  {
    _id: "case1",
    caseNumber: "KTM/2081/234",
    title: "Property Dispute \u2014 Bhaktapur Plot 234",
    practiceArea: "Property Law",
    status: "active",
    clientId: "c1",
    assignedLawyerId: "u2",
    teamMemberIds: ["u2", "u1"],
    court: "District Court ΓÇö Kathmandu",
    filingDate: "2026-01-10",
    conflictChecked: true,
  },
  {
    _id: "case2",
    caseNumber: "PAT/2081/582",
    title: "Company Registration \u2014 TechVenture Pvt. Ltd.",
    practiceArea: "Corporate Law",
    status: "active",
    clientId: "c2",
    assignedLawyerId: "u1",
    teamMemberIds: ["u1"],
    court: "High Court ΓÇö Patan",
    filingDate: "2026-02-15",
    conflictChecked: true,
  },
  {
    _id: "case3",
    caseNumber: "KTM/2081/999",
    title: "Sharma vs. Kathmandu Municipality",
    practiceArea: "Civil Litigation",
    status: "on_hold",
    clientId: "c1",
    assignedLawyerId: "u2",
    teamMemberIds: ["u2"],
    court: "Supreme Court of Nepal",
    filingDate: "2026-03-01",
    conflictChecked: true,
  },
];

const INITIAL_HEARINGS: LexHearing[] = [
  {
    _id: "h1",
    caseId: "case3",
    court: "Supreme Court of Nepal",
    dateGregorian: "2026-11-28",
    dateBs: "15 Mangsir 2083",
    time: "10:00 AM",
    purpose: "Final Hearing",
    status: "scheduled",
    notes: "Ensure all primary files are in order.",
  },
  {
    _id: "h2",
    caseId: "case2",
    court: "High Court ΓÇö Patan",
    dateGregorian: "2026-11-28",
    dateBs: "15 Mangsir 2083",
    time: "02:00 PM",
    purpose: "Interim Order Debate",
    status: "scheduled",
  },
  {
    _id: "h3",
    caseId: "case1",
    court: "District Court ΓÇö Kathmandu",
    dateGregorian: "2026-11-29",
    dateBs: "16 Mangsir 2083",
    time: "11:00 AM",
    purpose: "Evidence Submission",
    status: "scheduled",
  },
];

const INITIAL_TASKS: LexTask[] = [
  {
    _id: "t1",
    caseId: "case1",
    title: "File bail application \u2014 Gurung case",
    assignedTo: "u2",
    createdBy: "u1",
    status: "todo",
    priority: "urgent",
    category: "court",
    dueDate: "2026-07-30",
    dueDateBs: "15 Shrawan 2083",
    isRecurring: false,
    clientVisible: false,
    watchers: [],
  },
  {
    _id: "t2",
    caseId: "case2",
    title: "Review MOA draft before client meeting",
    assignedTo: "u2",
    createdBy: "u1",
    status: "in_progress",
    priority: "high",
    category: "client",
    dueDate: "2026-07-31",
    dueDateBs: "16 Shrawan 2083",
    isRecurring: false,
    clientVisible: true,
    watchers: [],
  },
  {
    _id: "t3",
    caseId: "case2",
    title: "Submit trademark registration docs",
    assignedTo: "u1",
    createdBy: "u1",
    status: "todo",
    priority: "medium",
    category: "filing",
    dueDate: "2026-08-02",
    dueDateBs: "18 Shrawan 2083",
    isRecurring: false,
    clientVisible: true,
    watchers: [],
  },
  {
    _id: "t4",
    caseId: "case1",
    title: "Provide citizenship copy for filing",
    assignedTo: "u2",
    createdBy: "u1",
    status: "todo",
    priority: "medium",
    category: "client",
    dueDate: "2026-08-05",
    dueDateBs: "21 Shrawan 2083",
    isRecurring: false,
    clientVisible: true,
    watchers: [],
  },
];

const INITIAL_SOP_TEMPLATES: LexSopTemplate[] = [
  {
    _id: "sop1",
    key: "new_case",
    label: "Litigation Setup (Firad Registration)",
    taskTitles: [
      "Draft Vakalatnama",
      "Prepare Firad Patra (Petition)",
      "Collect Client KYC & ID",
      "Pay Initial Court Dastur",
    ],
    defaultPriority: "high",
    practiceArea: "litigation",
  },
  {
    _id: "sop2",
    key: "hearing_prep",
    label: "Hearing Preparation (Bahas Prep)",
    taskTitles: [
      "Review opposing reply (Pratiuttar)",
      "Draft written arguments/notes",
      "Compile precedent case laws",
      "Client Briefing",
    ],
    defaultPriority: "high",
    practiceArea: "litigation",
  },
  {
    _id: "sop3",
    key: "company_incorporation",
    label: "Company Incorporation (ORC)",
    taskTitles: [
      "Draft MOA/AOA",
      "Name reservation at ORC",
      "PAN registration follow-up",
      "Share certificates issuance",
    ],
    defaultPriority: "high",
    practiceArea: "corporate",
  },
  {
    _id: "sop4",
    key: "property_due_diligence",
    label: "Property Due Diligence",
    taskTitles: [
      "Title search (Malpot)",
      "Check encumbrances",
      "Survey / boundary verification",
      "Draft sale deed review",
    ],
    defaultPriority: "medium",
    practiceArea: "property",
  },
  {
    _id: "sop5",
    key: "family_divorce",
    label: "Family — Divorce / Partition Prep",
    taskTitles: [
      "Collect marriage / citizenship docs",
      "Draft petition",
      "Asset inventory checklist",
      "Client counseling note",
    ],
    defaultPriority: "medium",
    practiceArea: "family",
  },
];

const INITIAL_TASK_COMMENTS: LexTaskComment[] = [];

const HEARING_PREP_TITLES_MOCK = [
  "Review case file and precedents",
  "Draft written arguments/notes",
  "Client briefing completed",
];

const INITIAL_TIME_ENTRIES: LexTimeEntry[] = [
  {
    _id: "time1",
    caseId: "case1",
    userId: "u2",
    description: "Property Dispute draft preparation & filing",
    minutes: 120,
    isBillable: true,
    date: "2026-07-29",
    ratePerHour: 1500,
  },
  {
    _id: "time2",
    caseId: "case2",
    userId: "u1",
    description: "Initial client meeting & structure discussion",
    minutes: 60,
    isBillable: true,
    date: "2026-07-29",
    ratePerHour: 2000,
  },
];

const INITIAL_INVOICES: LexInvoice[] = [
  {
    _id: "inv1",
    invoiceNumber: "INV-2081-001",
    caseId: "case1",
    clientId: "c1",
    subtotal: 13274,
    vatAmount: 1726,
    total: 15000,
    issuedDate: "2026-07-15",
    dueDate: "2026-07-30",
    status: "sent",
    notes: "Services for property title search.",
  },
  {
    _id: "inv2",
    invoiceNumber: "INV-2081-002",
    caseId: "case2",
    clientId: "c2",
    subtotal: 22124,
    vatAmount: 2876,
    total: 25000,
    issuedDate: "2026-06-20",
    dueDate: "2026-07-05",
    status: "paid",
    notes: "MOA/AOA drafting & registration fees.",
    paidDate: "2026-07-01",
  },
];

const INITIAL_TRUST_TRANSACTIONS: LexTrustTransaction[] = [
  {
    _id: "tt1",
    clientId: "c1",
    caseId: "case1",
    type: "receipt",
    amount: 50000,
    description: "Initial Retainer Deposit",
    date: "2026-07-10",
    balance: 50000,
    approvedBy: "u4",
  },
  {
    _id: "tt2",
    clientId: "c1",
    caseId: "case1",
    type: "disbursement",
    amount: 10000,
    description: "Court Filing Fees disbursement",
    date: "2026-07-12",
    balance: 40000,
    approvedBy: "u4",
  },
  {
    _id: "tt3",
    clientId: "c1",
    caseId: "case1",
    type: "disbursement",
    amount: 15000,
    description: "Release escrow payment for INV-2081-001",
    date: "2026-07-30",
    balance: 25000,
    approvedBy: "u4",
  },
];

const INITIAL_MESSAGES: LexMessage[] = [
  {
    _id: "m1",
    caseId: "case1",
    senderId: "u2",
    content: "Your hearing date has been confirmed for 15 Mangsir 2083.",
    isInternal: false,
    attachmentIds: [],
    readBy: ["u2"],
    _creationTime: Date.now() - 7200000,
  },
  {
    _id: "m2",
    caseId: "case1",
    senderId: "u3",
    content: "Thank you. Do I need to present any evidence?",
    isInternal: false,
    attachmentIds: [],
    readBy: ["u3"],
    _creationTime: Date.now() - 3600000,
  },
  {
    _id: "m3",
    caseId: "case1",
    senderId: "u2",
    content: "Yes, please bring the original land certificate and the latest tax receipts.",
    isInternal: false,
    attachmentIds: [],
    readBy: ["u2"],
    _creationTime: Date.now() - 1800000,
  },
  {
    _id: "m4",
    caseId: "case2",
    senderId: "u1",
    content: "We are reviewing your draft articles of association today.",
    isInternal: false,
    attachmentIds: [],
    readBy: ["u1"],
    _creationTime: Date.now() - 86400000,
  },
];

const INITIAL_BRIEFS: LexBrief[] = [
  {
    _id: "b1",
    caseId: "case1",
    title: "Bahas Note - Property Partition",
    content:
      "<p><strong>Key Argument:</strong> The partition deed was executed but not registered.</p><p>As per <strong>NKP 2078</strong>, registration within 6 months is mandatory.</p>",
    authorId: "u2",
    sharedWith: ["u1"],
    _creationTime: Date.now() - 86400000 * 2,
    lastModified: Date.now() - 86400000,
  },
];

const INITIAL_LEADS: LexLead[] = [
  {
    _id: "lead1",
    fullName: "Rajan Karki",
    phone: "+977 9841234567",
    practiceAreaInterest: "Property Law",
    source: "website",
    status: "new",
    _creationTime: Date.now() - 86400000 * 2,
  },
  {
    _id: "lead2",
    fullName: "Srijana Thapa",
    phone: "+977 9851234567",
    email: "srijana@email.com",
    practiceAreaInterest: "Family Law",
    source: "referral",
    status: "contacted",
    intakeToken: "mock-token-123",
    intakeSubmitted: false,
    _creationTime: Date.now() - 86400000 * 3,
  },
  {
    _id: "lead3",
    fullName: "Himalaya Trading Pvt. Ltd.",
    phone: "+977 01 4321234",
    email: "legal@himalaya.com",
    practiceAreaInterest: "Corporate Law",
    source: "website",
    status: "consultation_scheduled",
    assignedTo: "u1",
    _creationTime: Date.now() - 86400000 * 5,
  },
  {
    _id: "lead4",
    fullName: "Gopal Bhandari",
    phone: "+977 9806543210",
    practiceAreaInterest: "Criminal Law",
    source: "walk_in",
    status: "converted",
    convertedClientId: "c1",
    _creationTime: Date.now() - 86400000 * 8,
  },
  {
    _id: "lead5",
    fullName: "Sunita Gurung",
    phone: "+977 9812223334",
    practiceAreaInterest: "Immigration",
    source: "social",
    status: "lost",
    notes: "Client chose another firm",
    _creationTime: Date.now() - 86400000 * 10,
  },
];

const TODAY = new Date().toISOString().slice(0, 10);
const INITIAL_ATTENDANCE: LexAttendance[] = [
  {
    _id: "att1",
    userId: "u1",
    date: TODAY,
    clockIn: "9:02 AM",
    clockOut: "6:15 PM",
    status: "present",
  },
  {
    _id: "att2",
    userId: "u2",
    date: TODAY,
    clockIn: "9:30 AM",
    clockOut: "6:00 PM",
    status: "present",
  },
  {
    _id: "att3",
    userId: "u5",
    date: TODAY,
    clockIn: undefined,
    clockOut: undefined,
    status: "leave",
  },
];

const INITIAL_LEAVE_REQUESTS: LexLeaveRequest[] = [
  {
    _id: "lr1",
    userId: "u2",
    type: "sick",
    fromDate: "2026-07-28",
    toDate: "2026-07-30",
    reason: "Medical leave ΓÇö fever",
    status: "approved",
    reviewedBy: "u4",
  },
  {
    _id: "lr2",
    userId: "u5",
    type: "annual",
    fromDate: "2026-08-03",
    toDate: "2026-08-05",
    reason: "Family event",
    status: "pending",
  },
];

const INITIAL_AUDIT_LOG: LexAuditLog[] = [
  {
    _id: "al1",
    userId: "u2",
    action: "VIEW",
    resource: "documents",
    resourceId: "DOC-001",
    details: "Viewed: Property Title Deed ΓÇö Plot 234",
    ipAddress: "192.168.1.14",
    _creationTime: Date.now() - 3600000 * 2,
  },
  {
    _id: "al2",
    userId: "u1",
    action: "CREATE",
    resource: "cases",
    resourceId: "KTM/2081/234",
    details: "Created new case: Property Dispute ΓÇö Bhaktapur Plot 234",
    ipAddress: "192.168.1.10",
    _creationTime: Date.now() - 3600000 * 4,
  },
  {
    _id: "al3",
    userId: "u4",
    action: "UPDATE",
    resource: "users",
    resourceId: "u5",
    details: "Changed role: intern ΓåÆ paralegal",
    ipAddress: "192.168.1.1",
    _creationTime: Date.now() - 3600000 * 8,
  },
  {
    _id: "al4",
    userId: "u1",
    action: "SEND",
    resource: "invoices",
    resourceId: "INV-2081-001",
    details: "Sent invoice INV-2081-001 to Hari Prasad",
    ipAddress: "192.168.1.10",
    _creationTime: Date.now() - 86400000,
  },
  {
    _id: "al5",
    userId: "u2",
    action: "UPLOAD",
    resource: "documents",
    resourceId: "DOC-089",
    details: "Uploaded: Court Notice ΓÇö Hearing 15 Mangsir",
    ipAddress: "192.168.1.14",
    _creationTime: Date.now() - 86400000 * 2,
  },
  {
    _id: "al6",
    userId: "u4",
    action: "DELETE",
    resource: "leads",
    resourceId: "lead5",
    details: "Marked lead Sunita Gurung as lost",
    ipAddress: "192.168.1.1",
    _creationTime: Date.now() - 86400000 * 3,
  },
];

const INITIAL_DOCUMENTS: LexDocument[] = [
  {
    _id: "doc1",
    caseId: "case1",
    title: "Sharma Appeal Petition",
    type: "pleading",
    storageId: "mock-storage-1",
    mimeType: "application/pdf",
    sizeBytes: 340000,
    tags: [],
    uploadedBy: "u2",
    isTemplate: false,
    isPrivileged: false,
    version: 2,
    _creationTime: Date.now() - 86400000 * 10,
  },
  {
    _id: "doc2",
    caseId: "case1",
    title: "Property Title Deed (Exhibit A)",
    type: "evidence",
    storageId: "mock-storage-2",
    mimeType: "image/jpeg",
    sizeBytes: 2100000,
    tags: [],
    uploadedBy: "u1",
    isTemplate: false,
    isPrivileged: false,
    version: 1,
    _creationTime: Date.now() - 86400000 * 5,
  },
  {
    _id: "doc3",
    caseId: "case1",
    title: "Client Retainer Agreement",
    type: "contract",
    storageId: "mock-storage-3",
    mimeType: "application/pdf",
    sizeBytes: 180000,
    tags: [],
    uploadedBy: "u4",
    isTemplate: false,
    isPrivileged: true,
    version: 1,
    _creationTime: Date.now() - 86400000 * 30,
  },
  {
    _id: "doc4",
    caseId: "case2",
    title: "TechVenture Trademark Certificate",
    type: "evidence",
    storageId: "mock-storage-4",
    mimeType: "application/pdf",
    sizeBytes: 890000,
    tags: [],
    uploadedBy: "u1",
    isTemplate: false,
    isPrivileged: false,
    version: 1,
    _creationTime: Date.now() - 86400000 * 20,
  },
  {
    _id: "doc5",
    caseId: "case1",
    title: "Engagement Letter — Hari Prasad",
    type: "contract",
    storageId: "mock-storage-5",
    mimeType: "application/pdf",
    sizeBytes: 120000,
    tags: ["signature"],
    uploadedBy: "u2",
    isTemplate: false,
    isPrivileged: false,
    version: 1,
    requiresSignature: true,
    signatureStatus: "pending",
    intendedSignerUserId: "u3",
    _creationTime: Date.now() - 86400000 * 2,
  },
];

const INITIAL_NOTIFICATIONS: LexNotification[] = [
  {
    _id: "notif1",
    userId: "u2",
    title: "New Assignment",
    body: "You were assigned to KTM/2081/234",
    type: "info",
    isRead: false,
    link: "/staff/cases",
    _creationTime: Date.now() - 86400000,
  },
  {
    _id: "notif2",
    userId: "u1",
    title: "New Message",
    body: "Sita Thapa sent a new message in TechVenture case.",
    type: "alert",
    isRead: false,
    link: "/staff/cases",
    _creationTime: Date.now() - 3600000,
  },
  {
    _id: "notif3",
    userId: "u3",
    title: "Hearing Scheduled",
    body: "Your hearing is scheduled for 15 Mangsir 2083",
    type: "success",
    isRead: false,
    link: "/client/messages",
    _creationTime: Date.now() - 7200000,
  },
];

const INITIAL_TEMPLATES: LexTemplate[] = [
  {
    _id: "tmpl1",
    title: "Standard Retainer Agreement",
    type: "retainer",
    content:
      "RETAINER AGREEMENT\n\nThis Agreement is made on {{TODAY_DATE}} between Srimar Law and {{CLIENT_NAME}} (Client).\n\nThe Client engages the Law Firm to represent them in the matter of: {{CASE_TITLE}} (Case No: {{CASE_NUMBER}}).\n\nThe matter is currently at {{COURT_NAME}} before Hon. Judge {{JUDGE_NAME}}.\n\nSignatures:\n\n___________________\n{{CLIENT_NAME}}\n\n___________________\nSrimar Law",
    _creationTime: Date.now() - 100000,
  },
  {
    _id: "tmpl2",
    title: "Simple Power of Attorney",
    type: "general",
    content:
      "POWER OF ATTORNEY (WAKALATNAMA)\n\nI, {{CLIENT_NAME}}, hereby authorize Srimar Law and its lawyers to act on my behalf in the matter of {{CASE_TITLE}} before {{COURT_NAME}}.\n\nDate: {{TODAY_DATE}}\nSignature:\n___________________",
    _creationTime: Date.now() - 50000,
  },
];

const INITIAL_RESEARCH_NOTES: LexResearchNote[] = [
  {
    _id: "rn1",
    title: "Supreme Court on Adverse Possession — NKP 2078/12",
    category: "supreme_court",
    tags: ["adverse possession", "property", "limitation"],
    content:
      "The Supreme Court in NKP 2078, Issue 12 held that adverse possession claims require uninterrupted, open, and hostile possession for a statutory period of 12 years under the Muluki Civil Code. The claimant must also demonstrate that the original owner had full knowledge and did not act. Relevant section: Civil Code Section 96.",
    authorId: "u1",
    _creationTime: Date.now() - 86400000 * 30,
  },
  {
    _id: "rn2",
    title: "Company Registration Process — ORC 2079 Amendment",
    category: "procedure",
    tags: ["company", "ORC", "registration", "corporate"],
    content:
      "Following the Office of Company Registrar 2079 Amendment, all private limited companies must now submit a digital copy of the MOA/AOA along with the physical filing. PAN registration at IRD must be completed within 30 days of ORC approval. Contact: ORC Tripureshwor, 01-4228890.",
    authorId: "u1",
    _creationTime: Date.now() - 86400000 * 20,
  },
  {
    _id: "rn3",
    title: "High Court — Patan: Interim Stay in Property Disputes",
    category: "high_court",
    tags: ["interim stay", "property", "injunction", "Patan HC"],
    content:
      "Patan HC has consistently required three conditions for interim stay in property disputes: (1) Prima facie case established, (2) Balance of convenience in petitioner's favour, (3) Irreparable harm if stay not granted. Supporting precedent: Rajan Shrestha v. Municipality (2079). Filing fee: NPR 500 application, NPR 2000 for urgent listing.",
    authorId: "u2",
    _creationTime: Date.now() - 86400000 * 15,
  },
  {
    _id: "rn4",
    title: "Labour Court Procedure — Wrongful Termination Claims",
    category: "procedure",
    tags: ["labour", "wrongful termination", "Labour Act 2074"],
    content:
      "Under the Labour Act 2074, an employee disputing termination must file with the Labour Office within 35 days. If unresolved within 30 days at the Labour Office, the matter proceeds to the Labour Court. Key documentation: Appointment letter, termination notice, payslips for last 3 months, and any written warnings. Compensation formula: 1 month salary per year of service (up to 12 months).",
    authorId: "u2",
    _creationTime: Date.now() - 86400000 * 8,
  },
  {
    _id: "rn5",
    title: "E-Signature Validity under Electronic Transactions Act 2063",
    category: "commentary",
    tags: ["e-signature", "digital signature", "ETA 2063", "contracts"],
    content:
      "Under Nepal's Electronic Transactions Act 2063, digitally signed documents using government-issued digital certificates are legally valid and enforceable. However, documents requiring physical appearance (like property deeds, wills, and powers of attorney) still require physical presence and notarization. E-signatures from private platforms do not yet have formal statutory recognition.",
    authorId: "u1",
    _creationTime: Date.now() - 86400000 * 3,
  },
];

const INITIAL_EXPENSES: LexExpense[] = [
  {
    _id: "exp1",
    description: "Office Rent — Babarmahal",
    category: "office_rent",
    amount: 85000,
    date: TODAY,
    submittedBy: "u3",
    status: "approved",
    approvedBy: "u1",
    _creationTime: Date.now() - 86400000 * 30,
  },
  {
    _id: "exp2",
    description: "Supreme Court Filing Fee — Case CASE-2081-001",
    category: "court_fees",
    amount: 5000,
    caseId: "case1",
    date: TODAY,
    submittedBy: "u2",
    status: "approved",
    approvedBy: "u1",
    _creationTime: Date.now() - 86400000 * 20,
  },
  {
    _id: "exp3",
    description: "Document Courier — Blue Dart",
    category: "courier",
    amount: 1200,
    caseId: "case2",
    date: TODAY,
    submittedBy: "u3",
    status: "pending",
    _creationTime: Date.now() - 86400000 * 5,
  },
  {
    _id: "exp4",
    description: "Internet & Electricity — Shrawan",
    category: "utilities",
    amount: 6500,
    date: TODAY,
    submittedBy: "u3",
    status: "approved",
    approvedBy: "u1",
    _creationTime: Date.now() - 86400000 * 15,
  },
  {
    _id: "exp5",
    description: "Printing & Photocopying — 500 pages",
    category: "printing",
    amount: 2500,
    caseId: "case1",
    date: TODAY,
    submittedBy: "u4",
    status: "pending",
    _creationTime: Date.now() - 86400000 * 2,
  },
  {
    _id: "exp6",
    description: "Travel to High Court Patan",
    category: "travel",
    amount: 3000,
    caseId: "case3",
    date: TODAY,
    submittedBy: "u2",
    status: "approved",
    approvedBy: "u1",
    _creationTime: Date.now() - 86400000 * 10,
  },
  {
    _id: "exp7",
    description: "Legal Research Software License",
    category: "software",
    amount: 15000,
    date: TODAY,
    submittedBy: "u1",
    status: "approved",
    approvedBy: "u1",
    _creationTime: Date.now() - 86400000 * 45,
  },
  {
    _id: "exp8",
    description: "Office Stationery — Notepad, Pens, Binders",
    category: "supplies",
    amount: 1800,
    date: TODAY,
    submittedBy: "u3",
    status: "pending",
    _creationTime: Date.now() - 86400000,
  },
];

const INITIAL_PESI: LexCauseList[] = [
  {
    _id: "pesi1",
    caseId: "case1",
    courtName: "Supreme Court",
    judgeName: "Hon. Sapana Pradhan Malla, Hon. Kumar Regmi",
    hearingType: "Final Hearing",
    serialNumber: "12 (Kha)",
    status: "scheduled",
    pesiDate: "15 Bhadra 2081",
    _creationTime: Date.now(),
  },
  {
    _id: "pesi2",
    caseId: "case3",
    courtName: "High Court Patan",
    judgeName: "Hon. Neeta Gautam Dixit",
    hearingType: "Interim Order Discussion",
    serialNumber: "3 (Ka)",
    status: "scheduled",
    pesiDate: "16 Bhadra 2081",
    _creationTime: Date.now(),
  },
];

// Global in-memory simulation databases
let globalUsers = [...INITIAL_USERS];
let globalClients = [...INITIAL_CLIENTS];
let globalCases = [...INITIAL_CASES];
let globalHearings = [...INITIAL_HEARINGS];
let globalTasks = [...INITIAL_TASKS];
let globalSopTemplates = [...INITIAL_SOP_TEMPLATES];
let globalTaskComments = [...INITIAL_TASK_COMMENTS];
let globalTimeEntries = [...INITIAL_TIME_ENTRIES];
let globalInvoices = [...INITIAL_INVOICES];
let globalTrustTransactions = [...INITIAL_TRUST_TRANSACTIONS];
let globalMessages = [...INITIAL_MESSAGES];
let globalBriefs = [...INITIAL_BRIEFS];
let globalLeads = [...INITIAL_LEADS];
let globalAttendance = [...INITIAL_ATTENDANCE];
let globalLeaveRequests = [...INITIAL_LEAVE_REQUESTS];
let globalAuditLog = [...INITIAL_AUDIT_LOG];
let globalDocuments = [...INITIAL_DOCUMENTS];
let globalDocumentShares: any[] = [];
let globalEnvelopes: any[] = [];
let globalEnvelopeRecipients: any[] = [];
let globalSigningChallenges: any[] = [];
let globalNotifications = [...INITIAL_NOTIFICATIONS];

function mockNotifyTask(userId: string, title: string, body: string, taskId: string) {
  globalNotifications.unshift({
    _id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    title,
    body,
    type: "task_due",
    isRead: false,
    link: "/staff/tasks",
    relatedId: taskId,
    _creationTime: Date.now(),
  });
}

async function mockHashOtp(code: string) {
  const data = new TextEncoder().encode(`${code}:srimar-esign-otp-v1`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
let globalTemplates = [...INITIAL_TEMPLATES];
let globalResearchNotes = [...INITIAL_RESEARCH_NOTES];
let globalIntakeForms: LexIntakeForm[] = [];
let globalAppointments: any[] = [
  {
    _id: "apt1",
    clientId: "c1",
    lawyerId: "u2",
    date: TODAY,
    time: "11:00 AM",
    type: "in_person",
    status: "scheduled",
    _creationTime: Date.now() - 86400000,
  },
];
let globalExpenses = [...INITIAL_EXPENSES];
let globalPesi = [...INITIAL_PESI];
let globalSettings = {
  firmName: "Srimar Law",
  tagline: "Nepal's Premier Legal Practice",
  email: "mail@srimarlaw.com.np",
  phone: "+977-1-4220000",
  address: "Babarmahal, Kathmandu, Nepal",
  facebookUrl: "https://facebook.com/Srimar Law",
  linkedinUrl: "https://linkedin.com/company/Srimar Law",
  twitterUrl: "https://x.com/Srimar Law",
  instagramUrl: "https://instagram.com/Srimar Law",
  tiktokUrl: "https://tiktok.com/@Srimar Law",
  youtubeUrl: "https://youtube.com/Srimar Law",
  logoUrl: "",
  faviconUrl: "",
  heroImageUrl: "",
  primaryColor: "#3b0764", // default deep navy/purple
  seoMetaDescription:
    "Srimar Law is Nepal's Premier Legal Practice providing corporate, civil, and criminal defense.",
  seoTitleFormat: "Srimar Law | %s",
  googleAnalyticsId: "",
  mobileAppBannerVisible: true,
  mobileAppTitle: "Srimar Law Mobile App",
  mobileAppDescription: "Get legal assistance at your fingertips. Coming soon to iOS and Android.",
  mobileAppPlayStoreUrl: "https://play.google.com",
  mobileAppAppStoreUrl: "https://apple.com",
  integrations: {
    smsProvider: "none", // sparrow, aakash, twilio, none
    smsKeys: { token: "", accountSid: "", authToken: "" },
    activePayments: ["bank_transfer"] as string[], // esewa, khalti, bank_transfer
    paymentKeys: {
      esewaMerchantId: "",
      khaltiSecretKey: "",
      bankName: "",
      accountName: "",
      accountNumber: "",
      branch: "",
    },
    videoProvider: "google_meet", // google_meet, zoom, manual
    videoKeys: { clientId: "", clientSecret: "" },
  },
};

let globalTestimonials: any[] = [
  {
    _id: "t1",
    name: "Rajesh Shrestha",
    company: "Shrestha Group of Companies",
    text: "Srimar Law handled our corporate restructuring with exceptional expertise. The client portal made staying updated effortless.",
    rating: 5,
    isApproved: true,
    _creationTime: Date.now() - 864000000,
  },
  {
    _id: "t2",
    name: "Priya Karmacharya",
    company: "Individual Client",
    text: "They resolved my property dispute in record time. Transparent billing and constant communication set them apart.",
    rating: 5,
    isApproved: true,
    _creationTime: Date.now() - 864000000,
  },
  {
    _id: "t3",
    name: "Bikash Maharjan",
    company: "Tech Startup Founder",
    text: "Our IP registration was seamless. The team's understanding of Nepal's legal landscape is unmatched.",
    rating: 5,
    isApproved: true,
    _creationTime: Date.now() - 864000000,
  },
];

let globalPracticeAreas: any[] = [
  {
    _id: "pa1",
    title: "Corporate Law",
    slug: "corporate-law",
    iconName: "Building2",
    description: "Company registration, mergers, and corporate governance.",
    isActive: true,
    _creationTime: Date.now() - 864000000,
  },
  {
    _id: "pa2",
    title: "Criminal Defense",
    slug: "criminal-defense",
    iconName: "Shield",
    description: "Expert defense in criminal proceedings.",
    isActive: true,
    _creationTime: Date.now() - 864000000,
  },
  {
    _id: "pa3",
    title: "Civil Litigation",
    slug: "civil-litigation",
    iconName: "Scale",
    description: "Property disputes, contracts, and tort claims.",
    isActive: true,
    _creationTime: Date.now() - 864000000,
  },
];

let globalSessions: LexSession[] = [
  {
    _id: "sess_1",
    userId: "u1",
    device: "Windows 11 PC",
    browser: "Chrome",
    ipAddress: "192.168.1.12",
    lastActive: new Date().toISOString(),
    isCurrent: true,
  },
  {
    _id: "sess_2",
    userId: "u1",
    device: "iPhone 14 Pro",
    browser: "Safari",
    ipAddress: "103.10.20.5",
    lastActive: new Date(Date.now() - 3600000).toISOString(),
    isCurrent: false,
  },
];

let globalBlogPosts: any[] = [
  {
    _id: "bp1",
    title: "Understanding Nepal's New Civil Code",
    slug: "civil-code-nepal",
    excerpt:
      "A quick guide to the Muluki Ain updates. Learn how these changes affect business contracts and family law in Nepal.",
    content:
      "<h2>The Muluki Civil Code</h2><p>Nepal's Civil Code represents a monumental shift in the legal landscape...</p><h3>Key Changes to Contract Law</h3><p>Contracts now require more stringent verification...</p>",
    status: "published",
    author: "Srimar Law Team",
    category: "Civil Law",
    coverImageUrl:
      "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=1200&auto=format&fit=crop",
    publishDate: new Date(Date.now() - 864000000).toISOString(),
    _creationTime: Date.now() - 864000000,
  },
];

let globalSystemSettings = {
  defaultHourlyRate: "5000",
  vatRate: "13",
  invoicePaymentTerms: "14",
  defaultLanguage: "en",
  clientPortalEnabled: true,
  onlineBookingEnabled: true,
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((l) => l());
}

// Manage Preview Config locally
interface PreviewConfig {
  isAuthenticated: boolean;
  activeRole: LexUser["role"];
}

const getStoredConfig = (): PreviewConfig => {
  const stored = localStorage.getItem("Srimar Law_preview_config");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      // ignore
    }
  }
  return {
    isAuthenticated: true,
    activeRole: "admin",
  };
};

const saveStoredConfig = (config: PreviewConfig) => {
  localStorage.setItem("Srimar Law_preview_config", JSON.stringify(config));
};

// React Context for Preview Settings
export const PreviewContext = createContext<{
  config: PreviewConfig;
  setConfig: React.Dispatch<React.SetStateAction<PreviewConfig>>;
} | null>(null);

export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PreviewConfig>(getStoredConfig);

  useEffect(() => {
    saveStoredConfig(config);
    notifyListeners();
  }, [config]);

  return (
    <PreviewContext.Provider value={{ config, setConfig }}>{children}</PreviewContext.Provider>
  );
}

// ConvexReactClient is defined in convex-client-stub.ts and re-exported above

// Context for Convex auth
const ConvexAuthContext = createContext<{
  isLoading: boolean;
  isAuthenticated: boolean;
} | null>(null);

export function ConvexProvider({ client, children }: { client: any; children: React.ReactNode }) {
  return (
    <ConvexProviderWithAuth client={client} useAuth={useMockAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}

export function ConvexProviderWithAuth({
  children,
}: {
  client: any;
  useAuth: any;
  children: React.ReactNode;
}) {
  const preview = useContext(PreviewContext);
  const isAuthenticated = preview ? preview.config.isAuthenticated : true;

  return (
    <ConvexAuthContext.Provider value={{ isLoading: false, isAuthenticated }}>
      {children}
    </ConvexAuthContext.Provider>
  );
}

function useMockAuth() {
  const preview = useContext(PreviewContext);
  const isAuthenticated = preview ? preview.config.isAuthenticated : true;
  return {
    isLoading: false,
    isAuthenticated,
    fetchAccessToken: async () => "mock-access-token",
  };
}

export function useConvexAuth() {
  const ctx = useContext(ConvexAuthContext);
  if (!ctx) {
    return { isLoading: false, isAuthenticated: true, isRefreshing: false };
  }
  return { ...ctx, isRefreshing: false };
}

// Authenticated, Unauthenticated, AuthLoading components
export function Authenticated({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (!isLoading && isAuthenticated) return <>{children}</>;
  return null;
}

export function Unauthenticated({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (!isLoading && !isAuthenticated) return <>{children}</>;
  return null;
}

export function AuthLoading({ children }: { children: React.ReactNode }) {
  const { isLoading } = useConvexAuth();
  if (isLoading) return <>{children}</>;
  return null;
}

// useQuery mock implementation
export function useQuery(queryFunc: any, args?: any): any {
  const preview = useContext(PreviewContext);
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  let queryName = "";
  try {
    queryName = typeof queryFunc === "string" ? queryFunc : getFunctionName(queryFunc);
  } catch {
    queryName = "";
  }

  // getCurrentUser
  if (queryName.includes("getCurrentUser")) {
    const role = preview ? preview.config.activeRole : "admin";
    const user = globalUsers.find((u) => u.role === role) || globalUsers[0];
    return user;
  }

  // listUsers
  if (queryName.includes("listUsers")) {
    return globalUsers;
  }

  // listStaffDirectory
  if (queryName.includes("listStaffDirectory")) {
    const STAFF = ["partner", "senior_associate", "associate", "paralegal", "intern"];
    return globalUsers
      .filter((u) => STAFF.includes(u.role) && u.isActive && !u.isPending)
      .map((u) => ({ _id: u._id, name: u.name, role: u.role, email: u.email }));
  }

  if (queryName.includes("getRolePermissions")) {
    return (
      (globalSettings as any).rolePermissions || {
        admin: [
          "users.manage",
          "users.view_directory",
          "cases.view_all",
          "cases.manage",
          "finance.manage",
          "hr.manage",
          "cms.manage",
          "audit.view",
          "settings.manage",
          "documents.read",
          "documents.upload",
          "documents.share",
          "documents.delete",
          "records.dispose",
          "legalHold.manage",
        ],
        partner: [
          "users.view_directory",
          "cases.view_all",
          "cases.manage",
          "finance.manage",
          "hr.manage",
          "audit.view",
          "documents.read",
          "documents.upload",
          "documents.share",
          "documents.delete",
          "records.dispose",
          "legalHold.manage",
        ],
        senior_associate: [
          "users.view_directory",
          "cases.view_all",
          "cases.manage",
          "documents.read",
          "documents.upload",
          "documents.share",
          "documents.delete",
        ],
        associate: [
          "users.view_directory",
          "cases.manage",
          "documents.read",
          "documents.upload",
          "documents.share",
        ],
        paralegal: ["users.view_directory", "cases.manage", "documents.read", "documents.upload"],
        intern: ["users.view_directory", "documents.read"],
        client: ["documents.read", "documents.upload"],
      }
    );
  }

  if (queryName.includes("getUserActivity")) {
    const userId = args?.userId;
    return globalAuditLog
      .filter((l) => l.userId === userId || (l.resource === "users" && l.resourceId === userId))
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 20);
  }

  if (queryName.includes("getMyAuditLog")) {
    const role = preview ? preview.config.activeRole : "admin";
    const me = globalUsers.find((u) => u.role === role) || globalUsers[0];
    return globalAuditLog
      .filter((l) => l.userId === me._id)
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 30);
  }

  // CMS Queries
  if (queryName.includes("getSettings")) return globalSettings;
  if (queryName.includes("listTestimonials")) {
    if (args?.isApproved) return globalTestimonials.filter((t: any) => t.isApproved);
    return globalTestimonials;
  }
  if (queryName.includes("listPracticeAreas")) {
    const areas = globalPracticeAreas || [];
    if (args?.isActive !== undefined) return areas.filter((a: any) => a.isActive === args.isActive);
    return areas;
  }
  if (queryName.includes("listBlogPosts")) {
    if (args?.status) return globalBlogPosts.filter((p: any) => p.status === args.status);
    return globalBlogPosts;
  }
  if (queryName.includes("getBlogPostBySlug")) {
    return globalBlogPosts.find((p: any) => p.slug === args?.slug) || null;
  }
  if (queryName.includes("listPublicTeam")) {
    return globalUsers.filter((u) => u.isPublicFacing && u.isActive && u.role !== "client");
  }
  if (queryName.includes("listCareers")) {
    const jobs = (globalThis as any).__lexCareers || [
      {
        _id: "job1",
        title: "Associate Lawyer",
        department: "Litigation",
        location: "Kathmandu",
        type: "full_time",
        description: "Litigation associate role.",
        requirements: ["NPC license", "2+ years"],
        isActive: true,
        postedDate: new Date().toISOString(),
      },
    ];
    if (args?.isActive !== undefined) return jobs.filter((j: any) => j.isActive === args.isActive);
    return jobs;
  }
  if (queryName.includes("listResources")) {
    return (
      (globalThis as any).__lexResources || [
        {
          _id: "res1",
          title: "Guide to Company Registration in Nepal",
          description: "Step-by-step ORC process.",
          category: "Corporate",
          fileUrl: "https://example.com/guide.pdf",
          isGated: true,
          downloads: 12,
          publishedDate: new Date().toISOString(),
        },
      ]
    );
  }
  if (queryName.includes("listNewsAndAwards")) {
    return (
      (globalThis as any).__lexNews || [
        {
          _id: "news1",
          title: "Firm Recognized for Corporate Excellence",
          excerpt: "Award recognition.",
          content: "Full story.",
          date: new Date().toISOString().slice(0, 10),
          type: "award",
        },
      ]
    );
  }
  if (queryName.includes("listNavigationLinks")) {
    const links = (globalThis as any).__lexNav || [
      { _id: "n1", label: "Home", url: "/", location: "header", order: 1, isActive: true },
      {
        _id: "n2",
        label: "About Us",
        url: "/about-us",
        location: "header",
        order: 2,
        isActive: true,
      },
      {
        _id: "n3",
        label: "Practice Areas",
        url: "/practice-areas",
        location: "header",
        order: 3,
        isActive: true,
      },
      {
        _id: "n4",
        label: "Our Team",
        url: "/lawyers",
        location: "header",
        order: 4,
        isActive: true,
      },
      { _id: "n5", label: "Blog", url: "/blog", location: "header", order: 5, isActive: true },
      {
        _id: "n6",
        label: "Contact",
        url: "/contact",
        location: "header",
        order: 6,
        isActive: true,
      },
    ];
    if (args?.location) return links.filter((l: any) => l.location === args.location);
    return links;
  }
  if (queryName.includes("listJobApplications")) {
    return (globalThis as any).__lexJobApps || [];
  }
  if (queryName.includes("getLegalPage")) {
    const pages: any = {
      "privacy-policy": {
        slug: "privacy-policy",
        title: "Privacy Policy",
        content: "# Privacy Policy\n\nWe respect your privacy.",
        updatedAt: new Date().toISOString(),
      },
      terms: {
        slug: "terms",
        title: "Terms of Service",
        content: "# Terms of Service\n\nGoverning law: Nepal.",
        updatedAt: new Date().toISOString(),
      },
    };
    return pages[args?.slug] || null;
  }
  if (queryName.includes("getMyClientRecord")) {
    return globalClients.find((c: any) => c.userId === "u3") || globalClients[0] || null;
  }
  if (queryName.includes("getDashboardData") || queryName.includes("analytics")) {
    return {
      totalRevenue: 240000,
      realizationRate: 82,
      avgCaseValue: 80000,
      totalCases: globalCases.length,
      totalClients: globalClients.length,
      outstanding: 45000,
      totalExpenses: globalExpenses.reduce((s, e) => s + e.amount, 0),
      openLeads: globalLeads.filter((l) => l.status === "new").length,
      revenueByPractice: { Corporate: 120000, Litigation: 80000, Family: 40000 },
      hoursByAssociate: { "Sangit Dhungana": 42, "Ramesh Badal": 28 },
      monthlyRevenue: [
        { month: "2083-01", revenue: 40000 },
        { month: "2083-02", revenue: 55000 },
        { month: "2083-03", revenue: 70000 },
      ],
      casesByStatus: { active: 2, inquiry: 1 },
      kpis: { activeCases: 2, revenue: 240000, outstanding: 45000 },
    };
  }
  if (queryName.includes("generatePayroll")) {
    return globalUsers
      .filter((u) => u.role !== "client" && u.isActive)
      .map((u, i) => {
        const gross = (u as any).baseSalary || [180000, 90000, 70000, 25000][i % 4];
        const pf = Math.round(gross * 0.1);
        const ssf = Math.round(gross * 0.0333);
        const tax = Math.round(Math.max(0, gross - pf) > 200000 ? (gross - pf - 200000) * 0.1 : 0);
        return {
          userId: u._id,
          name: u.name,
          role: u.role,
          gross,
          pf,
          pfEmployer: pf,
          ssf,
          tax,
          net: gross - pf - tax,
        };
      });
  }
  if (queryName.includes("listAvailableSlots")) {
    return ["10:00 AM", "11:00 AM", "01:30 PM", "03:00 PM", "04:30 PM"];
  }
  if (queryName.includes("getPesi")) {
    return { available: false, message: "Automated Pesi sync is not connected.", items: [] };
  }
  if (queryName.includes("getSystemSettings")) {
    return (
      globalSystemSettings || {
        defaultHourlyRate: "5000",
        vatRate: "13",
        invoicePaymentTerms: "14",
        defaultLanguage: "en",
        clientPortalEnabled: true,
        onlineBookingEnabled: true,
        integrations: {
          smsProvider: "none",
          activePayments: ["bank_transfer"],
          emailProvider: "none",
        },
      }
    );
  }

  // Appointments
  if (queryName.includes("listAppointments")) {
    return globalAppointments;
  }

  // Notifications
  if (queryName.includes("listNotifications")) {
    const role = preview ? preview.config.activeRole : "admin";
    const me = globalUsers.find((u) => u.role === role) || globalUsers[0];
    return globalNotifications
      .filter((n) => n.userId === me._id)
      .sort((a, b) => b._creationTime - a._creationTime);
  }

  // HR Queries
  if (queryName.includes("listAttendance")) {
    return globalAttendance.filter((a) => a.date === args?.date);
  }
  if (queryName.includes("listLeaveRequests")) {
    return globalLeaveRequests;
  }

  // users.listSessions / listMySessions
  if (queryName.includes("listMySessions")) {
    const role = preview ? preview.config.activeRole : "admin";
    const me = globalUsers.find((u) => u.role === role) || globalUsers[0];
    return globalSessions.filter((s) => s.userId === me._id);
  }
  if (queryName.includes("listSessions")) {
    const role = preview ? preview.config.activeRole : "admin";
    const me = globalUsers.find((u) => u.role === role) || globalUsers[0];
    const targetId = args?.userId || me._id;
    return globalSessions.filter((s) => s.userId === targetId);
  }

  // listClients
  if (queryName.includes("listClients")) {
    return globalClients;
  }

  // getClient
  if (queryName.includes("getClient")) {
    const clientId = args?.clientId;
    return globalClients.find((c) => c._id === clientId) || null;
  }

  // listCases
  if (queryName.includes("listCases")) {
    let filtered = [...globalCases];
    if (args?.lawyerId) {
      filtered = filtered.filter((c) => c.assignedLawyerId === args.lawyerId);
    }
    if (args?.clientId) {
      filtered = filtered.filter((c) => c.clientId === args.clientId);
    }
    return filtered;
  }

  // getCase
  if (queryName.includes("getCase")) {
    const caseId = args?.caseId;
    return globalCases.find((c) => c._id === caseId) || null;
  }

  // listHearings
  if (queryName.includes("listHearings")) {
    let filtered = [...globalHearings];
    if (args?.caseId) {
      filtered = filtered.filter((h) => h.caseId === args.caseId);
    }
    return filtered;
  }

  // listTasks
  if (queryName.includes("listTasks") && !queryName.includes("listWorkload")) {
    const me = globalUsers[0]; // mock current user fallback
    // Soft client simulation: if filter asks clientVisible via args._clientOnly
    let filtered = [...globalTasks];
    if (args?.parentTaskId) {
      filtered = filtered.filter((t) => t.parentTaskId === args.parentTaskId);
    } else {
      if (args?.hearingId) filtered = filtered.filter((t) => t.hearingId === args.hearingId);
      if (args?.caseId) filtered = filtered.filter((t) => t.caseId === args.caseId);
      if (args?.assignedTo) filtered = filtered.filter((t) => t.assignedTo === args.assignedTo);
      if (!args?.includeSubtasks && !args?.hearingId && !args?.parentTaskId) {
        filtered = filtered.filter((t) => !t.parentTaskId);
      }
    }
    if (args?.status) filtered = filtered.filter((t) => t.status === args.status);
    if (!args?.includeArchived) filtered = filtered.filter((t) => !t.archivedAt);
    void me;
    return filtered;
  }

  if (queryName.includes("listWorkload")) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const open = globalTasks.filter(
      (t) => !t.archivedAt && !t.parentTaskId && t.status !== "done" && t.status !== "cancelled",
    );
    const map: Record<
      string,
      { assignedTo: string; total: number; urgent: number; overdue: number }
    > = {};
    for (const t of open) {
      if (!map[t.assignedTo])
        map[t.assignedTo] = { assignedTo: t.assignedTo, total: 0, urgent: 0, overdue: 0 };
      map[t.assignedTo].total++;
      if (t.priority === "urgent" || t.priority === "high") map[t.assignedTo].urgent++;
      if (t.dueDate) {
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        if (!Number.isNaN(due.getTime()) && due.getTime() < today.getTime())
          map[t.assignedTo].overdue++;
      }
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }

  if (queryName.includes("listSopTemplates") || queryName.includes("tasks.listSopTemplates")) {
    let list = [...globalSopTemplates];
    if (args?.practiceArea) list = list.filter((s) => s.practiceArea === args.practiceArea);
    return list;
  }

  if (queryName.includes("listComments") || queryName.includes("tasks.listComments")) {
    return globalTaskComments
      .filter((c) => c.taskId === args?.taskId)
      .sort((a, b) => a._creationTime - b._creationTime);
  }

  // listTimeEntries
  if (queryName.includes("listTimeEntries")) {
    let filtered = [...globalTimeEntries];
    if (args?.caseId) {
      filtered = filtered.filter((e) => e.caseId === args.caseId);
    }
    if (args?.userId) {
      filtered = filtered.filter((e) => e.userId === args.userId);
    }
    return filtered;
  }

  // listInvoices
  if (queryName.includes("listInvoices")) {
    let filtered = [...globalInvoices];
    if (args?.clientId) filtered = filtered.filter((i) => i.clientId === args.clientId);
    return filtered.sort(
      (a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime(),
    );
  }

  // listTrustTransactions
  if (queryName.includes("listTrustTransactions")) {
    let filtered = [...globalTrustTransactions];
    if (args?.clientId) {
      filtered = filtered.filter((t) => t.clientId === args.clientId);
    }
    return filtered;
  }

  // listMessages
  if (queryName.includes("listMessages")) {
    const caseId = args?.caseId;
    let list = globalMessages.filter((m) => m.caseId === caseId);
    list = list.sort((a, b) => a._creationTime - b._creationTime);
    return {
      page: list,
      isDone: true,
      continueCursor: "",
    };
  }

  // listLeads
  if (queryName.includes("listLeads")) {
    let filtered = [...globalLeads];
    if (args?.status) {
      filtered = filtered.filter((l) => l.status === args.status);
    }
    return filtered.sort((a, b) => b._creationTime - a._creationTime);
  }

  // listAttendance
  if (queryName.includes("listAttendance")) {
    let filtered = [...globalAttendance];
    if (args?.userId) filtered = filtered.filter((a) => a.userId === args.userId);
    if (args?.date) filtered = filtered.filter((a) => a.date === args.date);
    return filtered;
  }

  // listLeaveRequests
  if (queryName.includes("listLeaveRequests")) {
    let filtered = [...globalLeaveRequests];
    if (args?.userId) filtered = filtered.filter((l) => l.userId === args.userId);
    if (args?.status) filtered = filtered.filter((l) => l.status === args.status);
    return filtered;
  }

  // listAuditLog
  if (queryName.includes("listAuditLog")) {
    let filtered = [...globalAuditLog];
    if (args?.userId) filtered = filtered.filter((e) => e.userId === args.userId);
    if (args?.resource) filtered = filtered.filter((e) => e.resource === args.resource);
    return filtered.sort((a, b) => b._creationTime - a._creationTime).slice(0, 200);
  }

  // listDocuments — clients only see their case docs / intended signatures (mirrors Convex authZ)
  if (queryName.includes("listDocuments")) {
    let filtered = [...globalDocuments];
    filtered = filtered.filter((d) =>
      args?.inTrash ? d.isDeleted === true : d.isDeleted !== true,
    );
    if (args?.caseId) filtered = filtered.filter((d) => d.caseId === args.caseId);
    if (args?.isTemplate !== undefined)
      filtered = filtered.filter((d) => d.isTemplate === args.isTemplate);
    const role = preview ? preview.config.activeRole : "admin";
    if (role === "client") {
      const user =
        globalUsers.find((u) => u.role === "client") || globalUsers.find((u) => u._id === "u3");
      const client = globalClients.find((c) => c.userId === user?._id);
      const caseIds = new Set(
        globalCases.filter((c) => c.clientId === client?._id).map((c) => c._id),
      );
      filtered = filtered.filter(
        (d) =>
          !d.isTemplate &&
          ((d.caseId && caseIds.has(d.caseId)) ||
            d.uploadedBy === user?._id ||
            (d as any).intendedSignerUserId === user?._id),
      );
    }
    return filtered.sort((a, b) => b._creationTime - a._creationTime);
  }

  if (queryName.includes("listShareLinks")) {
    return globalDocumentShares.filter((share) => share.documentId === args?.documentId);
  }

  // getClientKycFileUrls
  if (queryName.includes("getClientKycFileUrls")) {
    const client = globalClients.find((c) => c._id === args.clientId);
    if (!client) return [];
    const files =
      client.kycFiles && client.kycFiles.length > 0
        ? client.kycFiles
        : (client.kycDocuments || []).map((storageId, i) => ({
            storageId,
            docType: "other" as const,
            fileName: `Document ${i + 1}`,
          }));
    return files.map((f) => ({ ...f, url: null }));
  }

  if (queryName.includes("listPortalSigners")) {
    return globalUsers
      .filter((u) => u.isActive && !u.isPending)
      .map((u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role }));
  }

  if (queryName.includes("listMyPendingEnvelopeActions")) {
    const role = preview ? preview.config.activeRole : "admin";
    const user = globalUsers.find((u) => u.role === role) || globalUsers[0];
    return globalEnvelopeRecipients
      .filter((r) => r.userId === user?._id && r.status === "pending")
      .map((r) => {
        const envelope = globalEnvelopes.find((e) => e._id === r.envelopeId);
        if (!envelope || envelope.status !== "sent") return null;
        if (envelope.expiresAt && new Date(envelope.expiresAt).getTime() < Date.now()) return null;
        const document = globalDocuments.find((d) => d._id === envelope.documentId);
        return {
          recipientId: r._id,
          envelopeId: envelope._id,
          envelopeTitle: envelope.title,
          routing: envelope.routing,
          expiresAt: envelope.expiresAt,
          document,
          order: r.order,
        };
      })
      .filter(Boolean);
  }

  if (queryName.includes("listEnvelopes")) {
    const role = preview ? preview.config.activeRole : "admin";
    if (role === "client") {
      const user =
        globalUsers.find((u) => u.role === "client") || globalUsers.find((u) => u._id === "u3");
      const myEnvIds = new Set(
        globalEnvelopeRecipients.filter((r) => r.userId === user?._id).map((r) => r.envelopeId),
      );
      return globalEnvelopes.filter((e) => myEnvIds.has(e._id));
    }
    return args?.status
      ? globalEnvelopes.filter((e) => e.status === args.status)
      : [...globalEnvelopes];
  }

  if (queryName.includes("getEnvelope")) {
    const envelope = globalEnvelopes.find((e) => e._id === args?.envelopeId);
    if (!envelope) return null;
    const recipients = globalEnvelopeRecipients
      .filter((r) => r.envelopeId === envelope._id)
      .sort((a, b) => a.order - b.order)
      .map((r) => {
        const u = globalUsers.find((x) => x._id === r.userId);
        return { ...r, userName: u?.name, userEmail: u?.email };
      });
    const document = globalDocuments.find((d) => d._id === envelope.documentId);
    return { envelope, recipients, document };
  }

  // getSignatureCertificate
  if (queryName.includes("getSignatureCertificate")) {
    const doc = globalDocuments.find((d) => d._id === args.documentId) as any;
    if (!doc || doc.signatureStatus !== "signed") return null;
    const signer = globalUsers.find((u) => u._id === doc.signedByUserId);
    return {
      certificateVersion: "completion-v1",
      documentId: doc._id,
      title: doc.title,
      mimeType: doc.mimeType,
      signedAt: doc.signedAt,
      viewedAt: doc.viewedAt,
      signatureMethod: doc.signatureMethod,
      typedSignatureText: doc.typedSignatureText,
      signConsentVersion: doc.signConsentVersion,
      signConsentAt: doc.signConsentAt,
      documentSha256: doc.sha256,
      signerUserAgent: doc.signerUserAgent,
      signer: signer ? { userId: signer._id, name: signer.name, email: signer.email } : null,
      documentUrl:
        doc.storageId?.startsWith("blob:") || doc.storageId?.startsWith("http")
          ? doc.storageId
          : null,
      signatureArtifactUrl: null,
      disclaimer:
        "This certificate records an electronic acknowledgment in the Srimar Law portal. It is not a qualified cryptographic certificate under a PKI CA.",
    };
  }

  // getDocument
  if (queryName.includes("documents.getDocument")) {
    return globalDocuments.find((d) => d._id === args.documentId) || null;
  }

  // listTemplates
  if (queryName.includes("templates.listTemplates")) {
    return [...globalTemplates].sort((a, b) => b._creationTime - a._creationTime);
  }

  // research.listNotes
  if (queryName.includes("research.listNotes")) {
    return [...globalResearchNotes].sort((a, b) => b._creationTime - a._creationTime);
  }

  // briefs.list
  if (queryName.includes("briefs.list")) {
    const cid = args?.caseId;
    let filtered = [...globalBriefs];
    if (cid) filtered = filtered.filter((b) => b.caseId === cid);
    return filtered.sort((a, b) => b.lastModified - a.lastModified);
  }

  // cases.checkConflict — fuzzy search across clients, cases, opposing counsel
  if (queryName.includes("cases.checkConflict")) {
    const q = (args?.query || "").toLowerCase().trim();
    if (!q || q.length < 2) return [];
    const hits: Array<{
      type: string;
      name: string;
      reason: string;
      caseId?: string;
      caseNumber?: string;
    }> = [];

    // Search clients
    globalClients.forEach((c) => {
      const nameMatch = c.fullName.toLowerCase().includes(q);
      const companyMatch = c.companyName?.toLowerCase().includes(q);
      if (nameMatch || companyMatch) {
        hits.push({
          type: "Existing Client",
          name: c.fullName,
          reason: nameMatch ? "Name match" : "Company name match",
        });
      }
    });

    // Search cases — title and opposing counsel
    globalCases.forEach((cas) => {
      if (cas.title.toLowerCase().includes(q)) {
        hits.push({
          type: "Existing Case",
          name: cas.title,
          reason: "Case title match",
          caseId: cas._id,
          caseNumber: cas.caseNumber,
        });
      }
      if (cas.opposingCounsel?.toLowerCase().includes(q)) {
        hits.push({
          type: "Opposing Counsel",
          name: cas.opposingCounsel,
          reason: `Opposing counsel in case ${cas.caseNumber}`,
          caseId: cas._id,
          caseNumber: cas.caseNumber,
        });
      }
    });

    return hits;
  }

  // leads.getIntakeByToken
  if (queryName.includes("leads.getIntakeByToken")) {
    const lead = globalLeads.find((l) => l.intakeToken === args?.token);
    if (!lead) return null;
    return { lead };
  }

  // appointments.listClientAppointments
  if (queryName.includes("appointments.listClientAppointments")) {
    const clientId =
      args?.clientId || getStoredConfig().activeRole === "client"
        ? globalClients[0]._id
        : undefined;
    return globalAppointments
      .filter((a) => a.clientId === clientId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // expenses.list
  if (queryName.includes("expenses.list")) {
    let filtered = [...globalExpenses];
    if (args?.category && args.category !== "all")
      filtered = filtered.filter((e) => e.category === args.category);
    if (args?.status && args.status !== "all")
      filtered = filtered.filter((e) => e.status === args.status);
    if (args?.caseId) filtered = filtered.filter((e) => e.caseId === args.caseId);
    return filtered.sort((a, b) => b._creationTime - a._creationTime);
  }

  // expenses.getStats
  if (queryName.includes("expenses.getStats")) {
    const total = globalExpenses.reduce((s, e) => s + e.amount, 0);
    const approved = globalExpenses
      .filter((e) => e.status === "approved")
      .reduce((s, e) => s + e.amount, 0);
    const pending = globalExpenses
      .filter((e) => e.status === "pending")
      .reduce((s, e) => s + e.amount, 0);
    const caseLinked = globalExpenses.filter((e) => !!e.caseId).reduce((s, e) => s + e.amount, 0);
    const byCategory: Record<string, number> = {};
    globalExpenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    return {
      total,
      approved,
      pending,
      caseLinked,
      byCategory,
      count: globalExpenses.length,
      pendingCount: globalExpenses.filter((e) => e.status === "pending").length,
    };
  }

  // analytics.getDashboardData
  if (queryName.includes("analytics.getDashboardData")) {
    // Revenue by practice area
    const revenueByPractice: Record<string, number> = {};
    globalInvoices
      .filter((i) => i.status === "paid")
      .forEach((inv) => {
        const c = globalCases.find((cs) => cs._id === inv.caseId);
        const pa = c?.practiceArea || "Other";
        revenueByPractice[pa] = (revenueByPractice[pa] || 0) + inv.total;
      });

    // Billable hours by associate
    const hoursByAssociate: Record<string, number> = {};
    globalTimeEntries
      .filter((t) => t.isBillable)
      .forEach((te) => {
        const u = globalUsers.find((us) => us._id === te.userId);
        const name = u?.name || te.userId;
        hoursByAssociate[name] = (hoursByAssociate[name] || 0) + (te as any).minutes / 60;
      });

    // Case status distribution
    const casesByStatus: Record<string, number> = {};
    globalCases.forEach((c) => {
      casesByStatus[c.status] = (casesByStatus[c.status] || 0) + 1;
    });

    // Monthly revenue (simulate 6 months)
    const monthlyRevenue = [
      { month: "Magh", revenue: 185000 },
      { month: "Falgun", revenue: 220000 },
      { month: "Chaitra", revenue: 175000 },
      { month: "Baisakh", revenue: 310000 },
      { month: "Jestha", revenue: 265000 },
      { month: "Ashar", revenue: 290000 },
    ];

    // Key metrics
    const totalRevenue = globalInvoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + i.total, 0);
    const totalBilled = globalInvoices.reduce((s, i) => s + i.total, 0);
    const realizationRate = totalBilled > 0 ? Math.round((totalRevenue / totalBilled) * 100) : 0;
    const avgCaseValue = globalCases.length > 0 ? Math.round(totalRevenue / globalCases.length) : 0;
    const totalClients = globalClients.length;
    const activeClients = globalClients.filter((c) => (c as any).isActive).length;
    const retentionRate = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0;

    return {
      revenueByPractice,
      hoursByAssociate,
      casesByStatus,
      monthlyRevenue,
      totalRevenue,
      realizationRate,
      avgCaseValue,
      retentionRate,
      totalCases: globalCases.length,
      activeCases: globalCases.filter((c) => c.status === "active").length,
      totalExpenses: globalExpenses.reduce((s, e) => s + e.amount, 0),
    };
  }

  // court.getPesi
  if (queryName.includes("court.getPesi")) {
    return {
      available: false,
      message:
        "Automated Pesi sync is not connected. Enter hearings manually or import when available.",
      items: args?.caseId ? globalPesi.filter((p) => p.caseId === args.caseId) : [...globalPesi],
    };
  }

  // cms.getSettings
  if (queryName.includes("cms.getSettings")) {
    return { ...globalSettings };
  }

  // cms.listPracticeAreas
  if (queryName.includes("cms.listPracticeAreas")) {
    if (args?.isActive) {
      return globalPracticeAreas.filter((pa) => pa.isActive);
    }
    return [...globalPracticeAreas];
  }

  // cms.listBlogPosts
  if (queryName.includes("cms.listBlogPosts")) {
    return [...globalBlogPosts];
  }

  // cms.getBlogPostBySlug
  if (queryName.includes("cms.getBlogPostBySlug")) {
    return globalBlogPosts.find((bp) => bp.slug === args?.slug) || null;
  }

  // settings.getSystemSettings
  if (queryName.includes("settings.getSystemSettings")) {
    return { ...globalSystemSettings };
  }

  // cms.listTestimonials
  if (queryName.includes("cms.listTestimonials")) {
    if (args?.isApproved) {
      return globalTestimonials.filter((t) => t.isApproved);
    }
    return [...globalTestimonials];
  }

  // cms.listPublicTeam
  if (queryName.includes("cms.listPublicTeam")) {
    return globalUsers.filter(
      (u) =>
        u.isPublicFacing &&
        (u.role === "partner" || u.role === "senior_associate" || u.role === "associate"),
    );
  }

  // getFileUrl
  if (queryName.includes("getFileUrl")) {
    // In our mock, if the storageId looks like a blob URL (created via URL.createObjectURL),
    // we return it directly so the browser can download/open it.
    // For initial seed documents ("mock-storage-X"), we just return a fake string.
    return args?.storageId?.startsWith("blob:")
      ? args.storageId
      : `https://mock-file-storage.local/${args?.storageId}`;
  }

  // Analytics Dashboard Data
  if (queryName.includes("analytics.getDashboardData")) {
    return {
      totalRevenue: 2450000,
      realizationRate: 85,
      avgCaseValue: 45000,
      totalCases: 120,
      retentionRate: 92,
      revenueByPractice: {
        "Corporate Law": 850000,
        "Civil Litigation": 600000,
        "Family Law": 450000,
        "Real Estate": 350000,
        "Criminal Defense": 200000,
      },
      hoursByAssociate: {
        "Aarav Sharma": 145,
        "Priya Thapa": 132,
        "Bishal Karki": 118,
        "Sita Rai": 95,
      },
      monthlyRevenue: [
        { month: "Jan", revenue: 320000 },
        { month: "Feb", revenue: 380000 },
        { month: "Mar", revenue: 410000 },
        { month: "Apr", revenue: 390000 },
        { month: "May", revenue: 460000 },
        { month: "Jun", revenue: 490000 },
      ],
      casesByStatus: {
        active: 65,
        closed: 40,
        pending_hearing: 10,
        appealed: 5,
      },
    };
  }

  return undefined;
}

// useMutation mock implementation
export function useMutation(mutationFunc: any): any {
  let mutationName = "";
  try {
    mutationName = typeof mutationFunc === "string" ? mutationFunc : getFunctionName(mutationFunc);
  } catch {
    mutationName = "";
  }

  // TEMPLATES
  if (mutationName.includes("templates.createTemplate")) {
    return async (args: any) => {
      const newTmpl: LexTemplate = {
        _id: `tmpl_${Date.now()}`,
        title: args.title,
        type: args.type,
        content: args.content,
        _creationTime: Date.now(),
      };
      globalTemplates.push(newTmpl);
      notifyListeners();
      return newTmpl._id;
    };
  }
  if (mutationName.includes("templates.updateTemplate")) {
    return async (args: any) => {
      const idx = globalTemplates.findIndex((t) => t._id === args.id);
      if (idx !== -1) {
        globalTemplates[idx] = { ...globalTemplates[idx], ...args };
        notifyListeners();
      }
    };
  }
  if (mutationName.includes("templates.deleteTemplate")) {
    return async (args: { id: string }) => {
      globalTemplates = globalTemplates.filter((t) => t._id !== args.id);
      notifyListeners();
    };
  }

  // RESEARCH NOTES
  if (mutationName.includes("research.createNote")) {
    return async (args: any) => {
      const newNote: any = {
        _id: `rn_${Date.now()}`,
        title: args.title,
        category: args.category,
        tags: args.tags || [],
        content: args.content,
        authorId: args.authorId,
        caseId: args.caseId,
        citation: args.citation,
        _creationTime: Date.now(),
      };
      globalResearchNotes.push(newNote);
      notifyListeners();
      return newNote._id;
    };
  }
  if (mutationName.includes("research.updateNote")) {
    return async (args: any) => {
      const idx = globalResearchNotes.findIndex((n) => n._id === args.id);
      if (idx !== -1) {
        globalResearchNotes[idx] = { ...globalResearchNotes[idx], ...args };
        notifyListeners();
      }
    };
  }
  if (mutationName.includes("research.deleteNote")) {
    return async (args: { id: string }) => {
      globalResearchNotes = globalResearchNotes.filter((n) => n._id !== args.id);
      notifyListeners();
    };
  }

  // BRIEFS
  if (mutationName.includes("briefs.create")) {
    return async (args: any) => {
      const newBrief: LexBrief = {
        _id: `b_${Date.now()}`,
        caseId: args.caseId,
        title: args.title || "Untitled Brief",
        content: args.content || "",
        authorId: args.authorId,
        sharedWith: args.sharedWith || [],
        _creationTime: Date.now(),
        lastModified: Date.now(),
      };
      globalBriefs.push(newBrief);
      notifyListeners();
      return newBrief._id;
    };
  }
  if (mutationName.includes("briefs.update")) {
    return async (args: any) => {
      const idx = globalBriefs.findIndex((b) => b._id === args.id);
      if (idx !== -1) {
        const { id: _id, ...rest } = args;
        globalBriefs[idx] = { ...globalBriefs[idx], ...rest, lastModified: Date.now() };
        notifyListeners();
      }
    };
  }
  if (mutationName.includes("briefs.delete")) {
    return async (args: { id: string }) => {
      globalBriefs = globalBriefs.filter((b) => b._id !== args.id);
      notifyListeners();
    };
  }

  // EXPENSES
  if (mutationName.includes("expenses.create")) {
    return async (args: any) => {
      const newExp: LexExpense = {
        _id: `exp_${Date.now()}`,
        description: args.description,
        category: args.category,
        amount: args.amount,
        caseId: args.caseId,
        date: args.date,
        submittedBy: args.submittedBy,
        status: "pending",
        _creationTime: Date.now(),
      };
      globalExpenses.push(newExp);
      notifyListeners();
      return newExp._id;
    };
  }
  if (mutationName.includes("expenses.approve")) {
    return async (args: any) => {
      const idx = globalExpenses.findIndex((e) => e._id === args.id);
      if (idx !== -1) {
        globalExpenses[idx] = {
          ...globalExpenses[idx],
          status: args.status,
          approvedBy: args.approvedBy,
        };
        notifyListeners();
      }
    };
  }
  if (mutationName.includes("expenses.delete") || mutationName.includes("expenses.remove")) {
    return async (args: { id: string }) => {
      globalExpenses = globalExpenses.filter((e) => e._id !== args.id);
      notifyListeners();
    };
  }

  // TASKS
  if (
    mutationName.includes("tasks.createTask") ||
    (mutationName.endsWith("createTask") && mutationName.includes("task"))
  ) {
    return async (args: any) => {
      const recurring = !!(args.isRecurring && args.recurrenceRule);
      const newTask: LexTask = {
        _id: `t_${Date.now()}`,
        title: args.title,
        description: args.description,
        caseId: args.caseId,
        assignedTo: args.assignedTo,
        createdBy: "u1",
        status: "todo",
        priority: args.priority || "medium",
        category: args.category,
        dueDate: args.dueDate,
        dueDateBs: args.dueDateBs,
        hearingId: args.hearingId,
        documentId: args.documentId,
        parentTaskId: args.parentTaskId,
        watchers: args.watchers || [],
        clientVisible: args.clientVisible ?? false,
        isRecurring: recurring,
        recurrenceRule: recurring ? args.recurrenceRule : undefined,
        reminderAt: args.reminderAt,
      };
      globalTasks.push(newTask);
      if (args.assignedTo && args.assignedTo !== "u1") {
        mockNotifyTask(
          args.assignedTo,
          "New task assigned",
          `"${args.title}" was assigned to you.`,
          newTask._id,
        );
      }
      notifyListeners();
      return newTask._id;
    };
  }

  if (mutationName.includes("archiveTask")) {
    return async (args: { taskId: string }) => {
      const idx = globalTasks.findIndex((t) => t._id === args.taskId);
      if (idx !== -1) {
        globalTasks[idx] = {
          ...globalTasks[idx],
          archivedAt: new Date().toISOString(),
          status: "cancelled",
        };
        notifyListeners();
      }
    };
  }

  if (mutationName.includes("restoreTask")) {
    return async (args: { taskId: string }) => {
      const idx = globalTasks.findIndex((t) => t._id === args.taskId);
      if (idx !== -1) {
        const t = { ...globalTasks[idx], status: "todo" as const };
        delete t.archivedAt;
        globalTasks[idx] = t;
        notifyListeners();
      }
    };
  }
  if (
    mutationName.includes("tasks.updateTask") ||
    (mutationName.endsWith("updateTask") && mutationName.includes("task"))
  ) {
    return async (args: any) => {
      const idx = globalTasks.findIndex((t) => t._id === args.taskId);
      if (idx === -1) return;
      const { taskId: _taskId, ...raw } = args;
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(raw)) {
        if (value !== undefined) updates[key] = value === null ? undefined : value;
      }
      const prev = globalTasks[idx];
      if (raw.status !== undefined) {
        if (raw.status === "done" && prev.status !== "done") {
          updates.completedAt = new Date().toISOString();
        } else if (raw.status !== "done") {
          updates.completedAt = undefined;
        }
      }
      globalTasks[idx] = { ...prev, ...updates } as LexTask;
      if (updates.caseId === undefined && "caseId" in updates) delete globalTasks[idx].caseId;
      if (updates.dueDate === undefined && "dueDate" in updates) delete globalTasks[idx].dueDate;
      if (updates.dueDateBs === undefined && "dueDateBs" in updates)
        delete globalTasks[idx].dueDateBs;
      if (updates.description === undefined && "description" in updates)
        delete globalTasks[idx].description;
      if (updates.completedAt === undefined && "completedAt" in updates)
        delete globalTasks[idx].completedAt;
      if (updates.hearingId === undefined && "hearingId" in updates)
        delete globalTasks[idx].hearingId;
      if (updates.documentId === undefined && "documentId" in updates)
        delete globalTasks[idx].documentId;
      if (raw.assignedTo && raw.assignedTo !== prev.assignedTo) {
        mockNotifyTask(
          raw.assignedTo,
          "Task reassigned to you",
          `"${globalTasks[idx].title}" was reassigned to you.`,
          prev._id,
        );
      }
      notifyListeners();
    };
  }
  if (
    mutationName.includes("tasks.deleteTask") ||
    (mutationName.endsWith("deleteTask") && mutationName.includes("task"))
  ) {
    return async (args: { taskId: string }) => {
      globalTaskComments = globalTaskComments.filter((c) => c.taskId !== args.taskId);
      globalTasks = globalTasks.filter((t) => t._id !== args.taskId);
      notifyListeners();
    };
  }

  if (mutationName.includes("runSop") || mutationName.includes("tasks.runSop")) {
    return async (args: { templateKey: string; caseId: string; assignedTo?: string }) => {
      const template = globalSopTemplates.find((t) => t.key === args.templateKey);
      if (!template) throw new Error("SOP template not found");
      const existingTitles = new Set(
        globalTasks
          .filter((t) => t.caseId === args.caseId)
          .map((t) => t.title.trim().toLowerCase()),
      );
      const assignee = args.assignedTo || "u1";
      let created = 0;
      let skipped = 0;
      for (const title of template.taskTitles) {
        if (existingTitles.has(title.trim().toLowerCase())) {
          skipped++;
          continue;
        }
        const id = `t_${Date.now()}_${created}`;
        globalTasks.push({
          _id: id,
          title,
          caseId: args.caseId,
          assignedTo: assignee,
          createdBy: "u1",
          status: "todo",
          priority: template.defaultPriority,
          isRecurring: false,
        });
        existingTitles.add(title.trim().toLowerCase());
        created++;
        if (assignee !== "u1") {
          mockNotifyTask(assignee, "New task assigned", `"${title}" was assigned to you.`, id);
        }
      }
      notifyListeners();
      return { created, skipped, label: template.label };
    };
  }

  if (mutationName.includes("createHearingPrepTasks")) {
    return async (args: { hearingId: string; assignedTo?: string }) => {
      const hearing = globalHearings.find((h) => h._id === args.hearingId);
      if (!hearing) throw new Error("Hearing not found");
      const caseDoc = globalCases.find((c) => c._id === hearing.caseId);
      const assignee = args.assignedTo || caseDoc?.assignedLawyerId || "u1";
      const existingTitles = new Set(
        globalTasks
          .filter((t) => t.hearingId === args.hearingId)
          .map((t) => t.title.trim().toLowerCase()),
      );
      let created = 0;
      let skipped = 0;
      for (const title of HEARING_PREP_TITLES_MOCK) {
        if (existingTitles.has(title.toLowerCase())) {
          skipped++;
          continue;
        }
        const id = `t_${Date.now()}_${created}`;
        globalTasks.push({
          _id: id,
          title,
          caseId: hearing.caseId,
          hearingId: args.hearingId,
          assignedTo: assignee,
          createdBy: "u1",
          status: "todo",
          priority: "high",
          dueDate: hearing.dateGregorian,
          dueDateBs: hearing.dateBs,
          description: `Hearing prep for ${hearing.court}`,
          isRecurring: false,
        });
        created++;
      }
      notifyListeners();
      return { created, skipped };
    };
  }

  if (mutationName.includes("addComment") && mutationName.includes("task")) {
    return async (args: { taskId: string; content: string }) => {
      const content = (args.content || "").trim();
      if (!content) throw new Error("Comment cannot be empty");
      const id = `tc_${Date.now()}`;
      globalTaskComments.push({
        _id: id,
        taskId: args.taskId,
        authorId: "u1",
        content,
        _creationTime: Date.now(),
      });
      notifyListeners();
      return id;
    };
  }

  if (
    mutationName.includes("scanOverdueReminders") ||
    mutationName.includes("sendOverdueReminders")
  ) {
    return async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let sent = 0;
      for (const task of globalTasks) {
        if (!task.dueDate || task.status === "done" || task.status === "cancelled") continue;
        const due = new Date(task.dueDate);
        if (Number.isNaN(due.getTime())) continue;
        due.setHours(0, 0, 0, 0);
        if (due.getTime() > today.getTime()) continue;
        if (task.lastDueReminderAt) {
          const last = new Date(task.lastDueReminderAt);
          if (!Number.isNaN(last.getTime()) && last.toDateString() === new Date().toDateString())
            continue;
        }
        mockNotifyTask(
          task.assignedTo,
          "Task due / overdue",
          `"${task.title}" is due or overdue (${task.dueDateBs || task.dueDate}).`,
          task._id,
        );
        task.lastDueReminderAt = new Date().toISOString();
        sent++;
      }
      notifyListeners();
      return { sent };
    };
  }

  // TIME ENTRIES
  if (mutationName.includes("timeEntries.createTimeEntry")) {
    return async (args: any) => {
      const newTe: LexTimeEntry = {
        _id: `te_${Date.now()}`,
        caseId: args.caseId,
        userId: args.userId,
        description: args.description,
        minutes: args.minutes,
        isBillable: args.isBillable,
        date: args.date,
        ratePerHour: args.ratePerHour,
      };
      globalTimeEntries.push(newTe);
      notifyListeners();
      return newTe._id;
    };
  }

  return async (args: any) => {
    console.log(`Mock Mutation Triggered: ${mutationName}`, args);

    // users.updateUser
    if (mutationName.includes("updateUser")) {
      const { userId, ...updates } = args;
      globalUsers = globalUsers.map((user) => {
        if (user._id === userId) {
          return { ...user, ...updates };
        }
        return user;
      });
      notifyListeners();
      return { success: true };
    }

    // users.createUser
    if (mutationName.includes("createUser")) {
      const sendInvite = args.invite !== false;
      const activationToken = sendInvite
        ? "setup_" + Math.random().toString(36).substring(2, 15)
        : undefined;
      const inviteExpiresAt = sendInvite
        ? new Date(Date.now() + 7 * 86400000).toISOString()
        : undefined;
      const id = "u_" + Date.now();
      const newUser: LexUser = {
        _id: id,
        name: args.name,
        email: args.email || "",
        role: args.role,
        isActive: sendInvite ? false : true,
        isPending: sendInvite,
        isPublicFacing: args.isPublicFacing || false,
        phone: args.phone,
        barCouncilNumber: args.barCouncilNumber,
        barCouncilExpiry: args.barCouncilExpiry,
        practiceAreas: args.practiceAreas,
        activationToken,
        inviteExpiresAt,
      };
      globalUsers.push(newUser);
      notifyListeners();

      if (sendInvite && args.email && activationToken) {
        setTimeout(() => {
          toast.info(`📧 Email Sent: Invitation link delivered to ${args.email}`, {
            duration: 6000,
            description: `(MOCK) User must click link: ${window.location.origin}/setup-account?token=${activationToken}`,
          });
        }, 500);
      }

      return { id, activationToken, inviteExpiresAt };
    }

    // users.resendInvitation
    if (mutationName.includes("resendInvitation")) {
      const token = "setup_" + Math.random().toString(36).substring(2, 15);
      const expires = new Date(Date.now() + 7 * 86400000).toISOString();
      globalUsers = globalUsers.map((u) =>
        u._id === args.userId
          ? {
              ...u,
              activationToken: token,
              isPending: true,
              isActive: false,
              inviteExpiresAt: expires,
            }
          : u,
      );
      notifyListeners();
      return { success: true, activationToken: token, inviteExpiresAt: expires };
    }

    // users.archiveUser
    if (mutationName.includes("archiveUser")) {
      globalUsers = globalUsers.map((u) => (u._id === args.userId ? { ...u, isActive: false } : u));
      globalSessions = globalSessions.filter((s) => s.userId !== args.userId);
      notifyListeners();
      return { success: true, mode: "soft" };
    }

    // users.bulkUpdateUsers
    if (mutationName.includes("bulkUpdateUsers")) {
      let count = 0;
      for (const userId of args.userIds || []) {
        const user = globalUsers.find((u) => u._id === userId);
        if (!user) continue;
        if (args.action === "suspend") {
          globalUsers = globalUsers.map((u) => (u._id === userId ? { ...u, isActive: false } : u));
          count++;
        } else if (args.action === "reactivate" && !user.isPending) {
          globalUsers = globalUsers.map((u) => (u._id === userId ? { ...u, isActive: true } : u));
          count++;
        } else if (
          args.action === "resend_invite" &&
          user.email &&
          (user.isPending || !user.isActive)
        ) {
          const token = "setup_" + Math.random().toString(36).substring(2, 15);
          globalUsers = globalUsers.map((u) =>
            u._id === userId
              ? {
                  ...u,
                  activationToken: token,
                  isPending: true,
                  isActive: false,
                  inviteExpiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
                }
              : u,
          );
          count++;
        }
      }
      notifyListeners();
      return { success: true, count };
    }

    // users.saveRolePermissions
    if (mutationName.includes("saveRolePermissions")) {
      (globalSettings as any).rolePermissions = args.permissions;
      notifyListeners();
      return { success: true };
    }

    // users.updateOwnProfile
    if (mutationName.includes("updateOwnProfile")) {
      const role = getStoredConfig().activeRole;
      const me = globalUsers.find((u) => u.role === role) || globalUsers[0];
      globalUsers = globalUsers.map((u) => (u._id === me._id ? { ...u, ...args } : u));
      notifyListeners();
      return { success: true };
    }

    // users.generateAvatarUploadUrl
    if (mutationName.includes("generateAvatarUploadUrl")) {
      return "mock-upload-url-" + Date.now();
    }

    // users.setAvatarFromStorage
    if (mutationName.includes("setAvatarFromStorage")) {
      const role = getStoredConfig().activeRole;
      const me = globalUsers.find((u) => u.role === role) || globalUsers[0];
      const url = `https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=256&h=256&auto=format&fit=crop&mock=${args.storageId}`;
      globalUsers = globalUsers.map((u) => (u._id === me._id ? { ...u, avatar: url } : u));
      notifyListeners();
      return { success: true, url };
    }

    // users.beginTotpEnrollment
    if (mutationName.includes("beginTotpEnrollment")) {
      const secret = "MOCK2FASECRET" + Math.random().toString(36).slice(2, 8).toUpperCase();
      const role = getStoredConfig().activeRole;
      const me = globalUsers.find((u) => u.role === role) || globalUsers[0];
      globalUsers = globalUsers.map((u) =>
        u._id === me._id ? { ...u, totpSecret: secret, twoFactorEnabled: false } : u,
      );
      notifyListeners();
      return {
        secret,
        otpauthUrl: `otpauth://totp/SrimarLaw:${me.email}?secret=${secret}&issuer=SrimarLaw`,
      };
    }

    // users.confirmTotpEnrollment
    if (mutationName.includes("confirmTotpEnrollment")) {
      if (!args.code || args.code.length < 4) throw new Error("Invalid authenticator code");
      const role = getStoredConfig().activeRole;
      const me = globalUsers.find((u) => u.role === role) || globalUsers[0];
      globalUsers = globalUsers.map((u) =>
        u._id === me._id ? { ...u, twoFactorEnabled: true } : u,
      );
      notifyListeners();
      return { success: true };
    }

    // users.disableTotp
    if (mutationName.includes("disableTotp")) {
      if (!args.code || args.code.length < 4) throw new Error("Invalid authenticator code");
      const role = getStoredConfig().activeRole;
      const me = globalUsers.find((u) => u.role === role) || globalUsers[0];
      globalUsers = globalUsers.map((u) =>
        u._id === me._id ? { ...u, twoFactorEnabled: false, totpSecret: undefined } : u,
      );
      notifyListeners();
      return { success: true };
    }

    // users.revokeAllSessions
    if (mutationName.includes("revokeAllSessions")) {
      const before = globalSessions.length;
      globalSessions = globalSessions.filter((s) => s.userId !== args.userId);
      notifyListeners();
      return { success: true, count: before - globalSessions.length };
    }

    // users.activateAccount
    if (mutationName.includes("activateAccount")) {
      const { token } = args;
      const userIndex = globalUsers.findIndex((u) => u.activationToken === token);
      if (userIndex === -1) {
        throw new Error("Invalid activation token");
      }
      const user = globalUsers[userIndex];
      if (user.inviteExpiresAt && new Date(user.inviteExpiresAt).getTime() < Date.now()) {
        throw new Error("Invitation has expired. Ask an admin to resend the invite.");
      }

      globalUsers[userIndex] = {
        ...globalUsers[userIndex],
        isPending: false,
        isActive: true,
        activationToken: undefined,
        inviteExpiresAt: undefined,
      };
      notifyListeners();
      return { success: true, userId: user._id, role: user.role };
    }

    // HR Mutations
    if (mutationName.includes("reviewLeaveRequest")) {
      const { leaveRequestId, status } = args;
      const leave = globalLeaveRequests.find((l) => l._id === leaveRequestId);
      if (leave) {
        leave.status = status;
      }
      notifyListeners();
      return { success: true };
    }
    if (mutationName.includes("upsertAttendance")) {
      const { userId, date, status } = args;
      const existingIndex = globalAttendance.findIndex(
        (a) => a.userId === userId && a.date === date,
      );
      if (existingIndex > -1) {
        globalAttendance[existingIndex].status = status;
      } else {
        globalAttendance.push({
          _id: "att_" + Date.now(),
          userId,
          date,
          status,
          clockIn: "09:00 AM",
        });
      }
      notifyListeners();
      return { success: true };
    }

    // CMS Mutations
    if (mutationName.includes("updateSettings")) {
      globalSettings = { ...globalSettings, ...args };
      notifyListeners();
      return { success: true };
    }

    // Appointments & Mock Email Triggers
    if (mutationName.includes("createAppointment")) {
      const newItem = {
        _id: "apt_" + Date.now(),
        _creationTime: Date.now(),
        status: "pending",
        ...args,
      };
      globalAppointments.push(newItem);

      // Simulate Email/SMS sent to user
      toast("📧 Mock Email/SMS Sent", {
        description: `To ${args.clientName}: Your appointment request for ${args.date} at ${args.timeSlot} has been received and is pending review.`,
        duration: 8000,
      });

      // Add a notification for Admins (in this mock, we just use u_1 for Admin)
      globalNotifications.push({
        _id: "notif_" + Date.now(),
        userId: "u_1",
        title: "New Appointment Request",
        body: `${args.clientName} requested an appointment for ${args.practiceArea}.`,
        isRead: false,
        link: "/admin/appointments",
        _creationTime: Date.now(),
      });

      notifyListeners();
      return newItem._id;
    }

    if (mutationName.includes("updateAppointmentStatus")) {
      const { id, status, meetingLink } = args;
      const aptIndex = globalAppointments.findIndex((a) => a._id === id);
      if (aptIndex > -1) {
        globalAppointments[aptIndex] = { ...globalAppointments[aptIndex], status, meetingLink };

        if (status === "confirmed") {
          const apt = globalAppointments[aptIndex];
          // Simulate Email/SMS to user
          toast("📧 Mock Email/SMS Sent", {
            description: `To ${apt.clientName}: Your appointment is CONFIRMED for ${apt.date} at ${apt.timeSlot}.${meetingLink ? " Link: " + meetingLink : ""}`,
            duration: 8000,
          });

          // Add a notification for the client (if they have an account, for mock we just assume u_3 is a client)
          globalNotifications.push({
            _id: "notif_" + Date.now(),
            userId: "u_3",
            title: "Appointment Confirmed",
            body: `Your appointment on ${apt.date} at ${apt.timeSlot} has been confirmed.`,
            isRead: false,
            link: "/client/appointments",
            _creationTime: Date.now(),
          });
        }
      }
      notifyListeners();
      return { success: true };
    }

    if (mutationName.includes("assignLawyerToAppointment")) {
      const { id, assignedLawyerId } = args;
      const apt = globalAppointments.find((a) => a._id === id);
      if (apt) {
        apt.assignedLawyerId = assignedLawyerId;
      }
      notifyListeners();
      return { success: true };
    }

    // Notifications
    if (mutationName.includes("notifications.markRead")) {
      const notif = globalNotifications.find((n) => n._id === args.notificationId);
      if (notif) {
        notif.isRead = true;
      }
      notifyListeners();
      return { success: true };
    }

    if (mutationName.includes("notifications.markAllRead")) {
      // mark all for current user? in mock we mark all true
      globalNotifications.forEach((n) => (n.isRead = true));
      notifyListeners();
      return { success: true };
    }

    // Testimonials
    if (mutationName.includes("createTestimonial")) {
      const newItem = { _id: "t_" + Date.now(), _creationTime: Date.now(), ...args };
      globalTestimonials.push(newItem);
      notifyListeners();
      return newItem._id;
    }
    if (mutationName.includes("updateTestimonial")) {
      const { id, ...updates } = args;
      globalTestimonials = globalTestimonials.map((t) => (t._id === id ? { ...t, ...updates } : t));
      notifyListeners();
      return { success: true };
    }
    if (mutationName.includes("deleteTestimonial")) {
      globalTestimonials = globalTestimonials.filter((t) => t._id !== args.id);
      notifyListeners();
      return { success: true };
    }

    if (mutationName.includes("createJobApplication")) {
      const apps = ((globalThis as any).__lexJobApps ||= []);
      const id = "app_" + Date.now();
      apps.unshift({ _id: id, status: "new", appliedDate: new Date().toISOString(), ...args });
      notifyListeners();
      toast.success("Application submitted");
      return id;
    }
    if (mutationName.includes("subscribeNewsletter")) {
      toast.success("Subscribed to newsletter");
      return { success: true, alreadySubscribed: false };
    }
    if (mutationName.includes("createResource") || mutationName.includes("createNewsAndAward")) {
      notifyListeners();
      toast.success("Saved");
      return "cms_" + Date.now();
    }
    if (
      mutationName.includes("updateResource") ||
      mutationName.includes("updateNewsAndAward") ||
      mutationName.includes("deleteResource") ||
      mutationName.includes("deleteNewsAndAward")
    ) {
      notifyListeners();
      return { success: true };
    }
    if (mutationName.includes("incrementResourceDownload")) {
      return { success: true };
    }
    if (mutationName.includes("submitKyc")) {
      const idx = globalClients.findIndex((c: any) => c._id === args.clientId || c.userId === "u3");
      if (idx >= 0) {
        const files = args.files || [];
        const now = new Date().toISOString();
        globalClients[idx] = {
          ...globalClients[idx],
          kycStatus: "submitted",
          kycFiles: files,
          kycDocuments: files.map((f: any) => f.storageId),
          address: args.address || globalClients[idx].address,
          kycIdNumber: args.idNumber,
          kycConsentAt: now,
          kycConsentVersion: "kyc-consent-v1",
          kycSubmittedAt: now,
          kycRejectionReason: undefined,
        };
      }
      notifyListeners();
      toast.success("KYC submitted");
      return { success: true };
    }
    if (mutationName.includes("reviewKyc")) {
      const now = new Date().toISOString();
      globalClients = globalClients.map((c) => {
        if (c._id !== args.clientId) return c;
        if (args.decision === "verified") {
          return {
            ...c,
            kycStatus: "verified" as const,
            kycRejectionReason: undefined,
            kycReviewedAt: now,
            kycReviewedBy: "u1",
          };
        }
        return {
          ...c,
          kycStatus: "rejected" as const,
          kycRejectionReason: args.rejectionReason || "Rejected",
          kycReviewedAt: now,
          kycReviewedBy: "u1",
        };
      });
      notifyListeners();
      toast.success(args.decision === "verified" ? "KYC verified" : "KYC rejected");
      return { success: true };
    }
    if (mutationName.includes("requestSignature")) {
      const idx = globalDocuments.findIndex((d) => d._id === args.documentId);
      if (idx < 0) throw new Error("Document not found");
      const doc = globalDocuments[idx] as any;
      if (doc.isPrivileged) throw new Error("Internal docs cannot be sent to clients");
      let signer = args.intendedSignerUserId;
      if (!signer && doc.caseId) {
        const c = globalCases.find((x) => x._id === doc.caseId);
        const client = globalClients.find((cl) => cl._id === c?.clientId);
        signer = client?.userId;
      }
      if (!signer)
        throw new Error("No signer found — link the document to a case with a portal client");
      globalDocuments[idx] = {
        ...doc,
        requiresSignature: true,
        signatureStatus: "pending",
        intendedSignerUserId: signer,
        signedAt: undefined,
        signedByUserId: undefined,
        viewedAt: undefined,
        sha256: undefined,
      };
      globalNotifications.unshift({
        _id: "notif_sig_" + Date.now(),
        userId: signer,
        title: "Document ready to sign",
        message: `"${doc.title}" requires your electronic acknowledgment.`,
        type: "document_request",
        isRead: false,
        link: "/client/signatures",
        _creationTime: Date.now(),
      } as any);
      notifyListeners();
      toast.success("Sent for signature");
      return { success: true, intendedSignerUserId: signer };
    }
    if (mutationName.includes("markDocumentViewed")) {
      const idx = globalDocuments.findIndex((d) => d._id === args.documentId);
      if (idx >= 0 && !(globalDocuments[idx] as any).viewedAt) {
        (globalDocuments[idx] as any).viewedAt = new Date().toISOString();
        notifyListeners();
      }
      return { viewedAt: (globalDocuments[idx] as any)?.viewedAt };
    }
    if (mutationName.includes("createEnvelope")) {
      const role = getStoredConfig().activeRole || "admin";
      const staff = globalUsers.find((u) => u.role === role) || globalUsers[0];
      const doc = globalDocuments.find((d) => d._id === args.documentId) as any;
      if (!doc) throw new Error("Document not found");
      if (doc.isTemplate || doc.isPrivileged) {
        throw new Error("Cannot create an envelope for template or internal-only documents");
      }
      const ids: string[] = args.recipientUserIds || [];
      if (ids.length === 0) throw new Error("Add at least one signer");
      const envelopeId = "env_" + Date.now();
      globalEnvelopes.push({
        _id: envelopeId,
        documentId: args.documentId,
        caseId: doc.caseId,
        title: args.title || doc.title,
        status: "draft",
        routing: args.routing || "sequential",
        createdBy: staff?._id,
        expiresAt: args.expiresAt,
        _creationTime: Date.now(),
      });
      ids.forEach((userId: string, i: number) => {
        globalEnvelopeRecipients.push({
          _id: `envr_${Date.now()}_${i}`,
          envelopeId,
          userId,
          order: i,
          status: args.routing === "sequential" && i > 0 ? "awaiting_turn" : "pending",
        });
      });
      notifyListeners();
      return { envelopeId };
    }

    if (mutationName.includes("sendEnvelope")) {
      const envelope = globalEnvelopes.find((e) => e._id === args.envelopeId);
      if (!envelope) throw new Error("Envelope not found");
      if (envelope.status !== "draft" && envelope.status !== "sent") {
        throw new Error(`Cannot send envelope in status ${envelope.status}`);
      }
      const recipients = globalEnvelopeRecipients.filter((r) => r.envelopeId === args.envelopeId);
      recipients.forEach((r) => {
        if (envelope.routing === "sequential") {
          r.status = r.order === 0 ? "pending" : r.status === "signed" ? "signed" : "awaiting_turn";
        }
      });
      const active =
        envelope.routing === "parallel"
          ? recipients.filter((r) => r.status !== "signed" && r.status !== "declined")
          : recipients.filter((r) => r.order === 0);
      envelope.status = "sent";
      const docIdx = globalDocuments.findIndex((d) => d._id === envelope.documentId);
      if (docIdx >= 0) {
        globalDocuments[docIdx] = {
          ...globalDocuments[docIdx],
          requiresSignature: true,
          signatureStatus: "pending",
          intendedSignerUserId: active[0]?.userId,
          signedAt: undefined,
          signedByUserId: undefined,
        } as any;
      }
      active.forEach((r) => {
        globalNotifications.unshift({
          _id: "notif_env_" + Date.now() + r.userId,
          userId: r.userId,
          title: "Signature envelope ready",
          message: `"${envelope.title}" is ready for your signature.`,
          type: "document_request",
          isRead: false,
          link: "/client/signatures",
          _creationTime: Date.now(),
        } as any);
      });
      notifyListeners();
      return { success: true };
    }

    if (mutationName.includes("voidEnvelope")) {
      const envelope = globalEnvelopes.find((e) => e._id === args.envelopeId);
      if (!envelope) throw new Error("Envelope not found");
      if (!args.reason?.trim()) throw new Error("Void reason is required");
      envelope.status = "voided";
      envelope.voidedAt = new Date().toISOString();
      envelope.voidReason = args.reason.trim();
      const docIdx = globalDocuments.findIndex((d) => d._id === envelope.documentId);
      if (docIdx >= 0) {
        (globalDocuments[docIdx] as any).requiresSignature = false;
        (globalDocuments[docIdx] as any).signatureStatus = undefined;
      }
      notifyListeners();
      return { success: true };
    }

    if (mutationName.includes("declineEnvelope")) {
      const role = getStoredConfig().activeRole || "admin";
      const user = globalUsers.find((u) => u.role === role) || globalUsers[0];
      const envelope = globalEnvelopes.find((e) => e._id === args.envelopeId);
      if (!envelope || envelope.status !== "sent")
        throw new Error("Only active envelopes can be declined");
      if (!args.reason?.trim()) throw new Error("Decline reason is required");
      const mine = globalEnvelopeRecipients.find(
        (r) => r.envelopeId === args.envelopeId && r.userId === user?._id,
      );
      if (!mine || mine.status !== "pending") {
        throw new Error("It is not your turn, or you are not a signer on this envelope");
      }
      mine.status = "declined";
      mine.declinedAt = new Date().toISOString();
      mine.declineReason = args.reason.trim();
      envelope.status = "declined";
      notifyListeners();
      return { success: true };
    }

    if (mutationName.includes("remindEnvelope")) {
      const envelope = globalEnvelopes.find((e) => e._id === args.envelopeId);
      if (!envelope || envelope.status !== "sent")
        throw new Error("Can only remind on sent envelopes");
      const pending = globalEnvelopeRecipients.filter(
        (r) => r.envelopeId === args.envelopeId && r.status === "pending",
      );
      if (pending.length === 0) throw new Error("No pending signers to remind");
      const now = new Date().toISOString();
      pending.forEach((r) => {
        r.remindedAt = now;
        globalNotifications.unshift({
          _id: "notif_remind_" + Date.now() + r.userId,
          userId: r.userId,
          title: "Reminder: signature needed",
          message: `Please sign "${envelope.title}" in the client portal.`,
          type: "document_request",
          isRead: false,
          link: "/client/signatures",
          _creationTime: Date.now(),
        } as any);
      });
      envelope.lastRemindedAt = now;
      notifyListeners();
      return { success: true, reminded: pending.length };
    }

    if (mutationName.includes("issueSigningOtp")) {
      const role = getStoredConfig().activeRole || "admin";
      const user = globalUsers.find((u) => u.role === role) || globalUsers[0];
      if (args.envelopeId) {
        const envelope = globalEnvelopes.find((e) => e._id === args.envelopeId);
        if (!envelope || envelope.status !== "sent") {
          throw new Error("Envelope is not available for signing");
        }
        const mine = globalEnvelopeRecipients.find(
          (r) => r.envelopeId === args.envelopeId && r.userId === user?._id,
        );
        if (!mine || mine.status !== "pending") {
          throw new Error("You are not the active signer for this envelope");
        }
      }
      const code = Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(6, "0");
      const codeHash = await mockHashOtp(code);
      globalSigningChallenges = globalSigningChallenges.filter(
        (c) => !(c.userId === user?._id && c.documentId === args.documentId),
      );
      const challengeId = "otp_" + Date.now();
      globalSigningChallenges.push({
        _id: challengeId,
        userId: user?._id,
        documentId: args.documentId,
        envelopeId: args.envelopeId,
        codeHash,
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0,
      });
      globalNotifications.unshift({
        _id: "notif_otp_" + Date.now(),
        userId: user?._id,
        title: "Your signing verification code",
        message: `Your e-sign code is ${code}. It expires in 10 minutes.`,
        type: "system",
        isRead: false,
        link: "/client/signatures",
        _creationTime: Date.now(),
      } as any);
      notifyListeners();
      return { challengeId, expiresAt: Date.now() + 10 * 60 * 1000, demoCode: code };
    }

    if (mutationName.includes("verifySigningOtp")) {
      const role = getStoredConfig().activeRole || "admin";
      const user = globalUsers.find((u) => u.role === role) || globalUsers[0];
      const challenge = globalSigningChallenges.find((c) => c._id === args.challengeId);
      if (!challenge || challenge.userId !== user?._id) throw new Error("Invalid challenge");
      if (challenge.verifiedAt) return { verified: true, challengeId: args.challengeId };
      if (challenge.expiresAt < Date.now()) throw new Error("Code expired — request a new one");
      if (challenge.attempts >= 5) throw new Error("Too many attempts — request a new code");
      challenge.attempts += 1;
      const ok = (await mockHashOtp(String(args.code || "").trim())) === challenge.codeHash;
      if (!ok) throw new Error("Incorrect code");
      challenge.verifiedAt = Date.now();
      notifyListeners();
      return { verified: true, challengeId: args.challengeId };
    }

    if (mutationName.includes("signDocument")) {
      const idx = globalDocuments.findIndex((d) => d._id === args.documentId);
      if (idx >= 0) {
        const doc = globalDocuments[idx] as any;
        const role = getStoredConfig().activeRole || "admin";
        const user = globalUsers.find((u) => u.role === role) || globalUsers[0];
        if (
          doc.intendedSignerUserId &&
          doc.intendedSignerUserId !== user?._id &&
          role === "client"
        ) {
          throw new Error("You are not the authorized signer for this document");
        }
        if (role === "client" && doc.caseId && !doc.intendedSignerUserId) {
          const client = globalClients.find((c) => c.userId === user?._id);
          const ownsCase = globalCases.some(
            (c) => c._id === doc.caseId && c.clientId === client?._id,
          );
          if (!ownsCase) throw new Error("You are not the authorized signer for this document");
        }
        if (!args.consentAccepted) throw new Error("Consent is required to sign");
        if (!doc.viewedAt) throw new Error("Preview the document before signing");
        const challenge = globalSigningChallenges.find((c) => c._id === args.otpChallengeId);
        if (!challenge || challenge.userId !== user?._id || !challenge.verifiedAt) {
          throw new Error("Verify your OTP code before signing");
        }
        if (challenge.documentId !== args.documentId) {
          throw new Error("OTP challenge does not match this document");
        }
        const signedAt = new Date().toISOString();
        doc.signatureStatus = "signed";
        doc.signedAt = signedAt;
        doc.signedByUserId = user?._id;
        doc.signatureMethod = args.signatureMethod;
        doc.signatureArtifactStorageId = args.signatureArtifactStorageId;
        doc.typedSignatureText = args.typedSignatureText;
        doc.signConsentVersion = "esign-consent-v1";
        doc.signConsentAt = signedAt;
        doc.signerUserAgent = args.userAgent;
        doc.sha256 = args.documentSha256;

        if (args.envelopeId) {
          const envelope = globalEnvelopes.find((e) => e._id === args.envelopeId);
          const mine = globalEnvelopeRecipients.find(
            (r) => r.envelopeId === args.envelopeId && r.userId === user?._id,
          );
          if (mine) {
            mine.status = "signed";
            mine.signedAt = signedAt;
          }
          const siblings = globalEnvelopeRecipients
            .filter((r) => r.envelopeId === args.envelopeId)
            .sort((a, b) => a.order - b.order);
          if (siblings.every((r) => r.status === "signed")) {
            if (envelope) {
              envelope.status = "completed";
              envelope.completedAt = signedAt;
            }
          } else if (envelope?.routing === "sequential") {
            const next = siblings.find((r) => r.status === "awaiting_turn");
            if (next) {
              next.status = "pending";
              doc.signatureStatus = "pending";
              doc.signedAt = undefined;
              doc.signedByUserId = undefined;
              doc.viewedAt = undefined;
              doc.intendedSignerUserId = next.userId;
              globalNotifications.unshift({
                _id: "notif_turn_" + Date.now(),
                userId: next.userId,
                title: "Your turn to sign",
                message: `"${envelope.title}" is ready for your signature.`,
                type: "document_request",
                isRead: false,
                link: "/client/signatures",
                _creationTime: Date.now(),
              } as any);
            }
          }
        }
      }
      notifyListeners();
      return { success: true };
    }
    if (mutationName.includes("bookConsultation")) {
      const id = "apt_" + Date.now();
      globalAppointments.push({
        _id: id,
        clientName: args.clientName,
        clientEmail: args.clientEmail,
        clientPhone: args.clientPhone,
        clientId: args.clientId,
        practiceArea: args.practiceArea,
        date: args.date,
        timeSlot: args.timeSlot,
        notes: args.notes,
        assignedLawyerId: args.assignedLawyerId,
        status: "pending",
        _creationTime: Date.now(),
      } as any);
      notifyListeners();
      toast.success("Appointment requested");
      return id;
    }
    if (mutationName.includes("initiateGatewayPayment")) {
      return {
        paymentId: "pay_" + Date.now(),
        gateway: args.gateway,
        amount: 0,
        nextStep: "redirect_or_confirm",
      };
    }
    if (
      mutationName.includes("sendEmail") ||
      mutationName.includes("sendSms") ||
      mutationName.includes("sendHearingReminder")
    ) {
      toast.success("Message queued", {
        description: "Logged for delivery (configure provider in Settings).",
      });
      return { success: true, delivered: false };
    }
    if (mutationName.includes("setBaseSalary")) {
      globalUsers = globalUsers.map((u) =>
        u._id === args.userId ? ({ ...u, baseSalary: args.baseSalary } as any) : u,
      );
      notifyListeners();
      return { success: true };
    }
    if (
      mutationName.includes("expenses.remove") ||
      (mutationName.includes("expenses.") && mutationName.includes("remove"))
    ) {
      globalExpenses = globalExpenses.filter((e) => e._id !== args.id);
      notifyListeners();
      return { success: true };
    }
    // court.syncPesi
    if (mutationName.includes("court.syncPesi")) {
      const { caseId } = args;
      const targetCase = globalCases.find((c) => c._id === caseId);
      if (!targetCase) throw new Error("Case not found");

      const newPesi = {
        _id: "pesi_" + Date.now(),
        caseId,
        courtName: targetCase.court || "Supreme Court",
        judgeName:
          "Hon. " +
          ["Hari Phuyal", "Sapana Pradhan Malla", "Anand Mohan Bhattarai"][
            Math.floor(Math.random() * 3)
          ],
        hearingType: [
          "First Hearing",
          "Evidence Submission",
          "Final Hearing",
          "Interim Order Debate",
        ][Math.floor(Math.random() * 4)],
        serialNumber: Math.floor(Math.random() * 50) + " (Kha)",
        status: "scheduled" as const,
        pesiDate: "16 Bhadra 2081",
        _creationTime: Date.now(),
      };

      globalPesi.push(newPesi);
      notifyListeners();
      return newPesi;
    }

    // Chatbots / Leads
    if (mutationName.includes("chatbots.submitLead")) {
      const newItem = {
        _id: "lead_" + Date.now(),
        _creationTime: Date.now(),
        status: "new",
        source: "website",
        ...args,
      };
      globalLeads.unshift(newItem);
      notifyListeners();

      toast.success("Lead captured!", {
        description: `New lead from ${args.fullName} via Chatbot.`,
      });
      return newItem._id;
    }

    // Practice Areas
    if (mutationName.includes("createPracticeArea")) {
      const newItem = { _id: "pa_" + Date.now(), _creationTime: Date.now(), ...args };
      globalPracticeAreas.push(newItem);
      notifyListeners();
      return newItem._id;
    }
    if (mutationName.includes("updatePracticeArea")) {
      const { id, ...updates } = args;
      globalPracticeAreas = globalPracticeAreas.map((t) =>
        t._id === id ? { ...t, ...updates } : t,
      );
      notifyListeners();
      return { success: true };
    }
    if (mutationName.includes("deletePracticeArea")) {
      globalPracticeAreas = globalPracticeAreas.filter((t) => t._id !== args.id);
      notifyListeners();
      return { success: true };
    }

    // Blog Posts
    if (mutationName.includes("createBlogPost")) {
      const newItem = { _id: "bp_" + Date.now(), _creationTime: Date.now(), ...args };
      globalBlogPosts.push(newItem);
      notifyListeners();
      return newItem._id;
    }
    if (mutationName.includes("updateBlogPost")) {
      const { id, ...updates } = args;
      globalBlogPosts = globalBlogPosts.map((t) => (t._id === id ? { ...t, ...updates } : t));
      notifyListeners();
      return { success: true };
    }
    if (mutationName.includes("deleteBlogPost")) {
      globalBlogPosts = globalBlogPosts.filter((t) => t._id !== args.id);
      notifyListeners();
      return { success: true };
    }

    // users.updateProfile
    if (mutationName.includes("updateProfile")) {
      const { userId, ...updates } = args;
      globalUsers = globalUsers.map((user) => {
        if (user._id === userId) {
          return { ...user, ...updates };
        }
        return user;
      });
      notifyListeners();
      return { success: true };
    }

    // users.changePassword
    if (mutationName.includes("changePassword")) {
      const { currentPassword, newPassword } = args;
      if (!newPassword || newPassword.length < 8)
        throw new Error("Password must be at least 8 characters");
      if (currentPassword === undefined) throw new Error("Current password is required");
      return { success: true, message: "Password updated." };
    }

    // users.toggle2FA (deprecated)
    if (mutationName.includes("toggle2FA")) {
      const role = getStoredConfig().activeRole;
      const me = globalUsers.find((u) => u.role === role) || globalUsers[0];
      if (args.enabled) {
        throw new Error("Use beginTotpEnrollment and confirmTotpEnrollment to enable 2FA");
      }
      globalUsers = globalUsers.map((u) =>
        u._id === me._id ? { ...u, twoFactorEnabled: false, totpSecret: undefined } : u,
      );
      notifyListeners();
      return { success: true };
    }

    // users.revokeSession
    if (mutationName.includes("revokeSession")) {
      const { sessionId } = args;
      globalSessions = globalSessions.filter((s) => s._id !== sessionId);
      notifyListeners();
      return { success: true };
    }

    // users.sendPasswordReset
    if (mutationName.includes("sendPasswordReset")) {
      return { success: true };
    }

    // users.updateCurrentUser
    if (mutationName.includes("updateCurrentUser")) {
      const preview = getStoredConfig();
      const user = globalUsers.find((u) => u.role === preview.activeRole) || globalUsers[0];
      return { id: user._id, role: user.role };
    }

    // leads.createLead
    if (mutationName.includes("createLead")) {
      return { success: true, leadId: "mock-lead-id" };
    }

    // leads.generateIntakeLink
    if (mutationName.includes("generateIntakeLink")) {
      const idx = globalLeads.findIndex((l) => l._id === args.leadId);
      if (idx !== -1) {
        const token = `intake_${Math.random().toString(36).substr(2, 9)}`;
        globalLeads[idx] = { ...globalLeads[idx], intakeToken: token, intakeSubmitted: false };
        notifyListeners();
        return token;
      }
      throw new Error("Lead not found");
    }

    // leads.submitIntake
    if (mutationName.includes("submitIntake")) {
      const idx = globalLeads.findIndex((l) => l.intakeToken === args.token);
      if (idx !== -1) {
        const lead = globalLeads[idx];
        const newIntake: LexIntakeForm = {
          _id: `intake_${Date.now()}`,
          leadId: lead._id,
          fullName: args.fullName,
          phone: args.phone,
          email: args.email,
          address: args.address,
          citizenshipNo: args.citizenshipNo,
          practiceArea: args.practiceArea,
          caseDescription: args.caseDescription,
          documentStorageIds: args.documentStorageIds || [],
          submittedAt: Date.now(),
        };
        globalIntakeForms.push(newIntake);
        globalLeads[idx] = {
          ...lead,
          intakeSubmitted: true,
          fullName: args.fullName,
          email: args.email,
          phone: args.phone,
        };
        notifyListeners();
        return { success: true };
      }
      throw new Error("Invalid or expired intake token");
    }

    // appointments.bookConsultation
    if (mutationName.includes("bookConsultation")) {
      const newApt: any = {
        _id: `apt_${Date.now()}`,
        clientName: args.clientName || "Client",
        clientEmail: args.clientEmail,
        clientPhone: args.clientPhone || "",
        clientId: args.clientId,
        practiceArea: args.practiceArea || "Consultation",
        date: args.date,
        timeSlot: args.timeSlot || args.time,
        notes: args.notes,
        assignedLawyerId: args.assignedLawyerId || args.lawyerId,
        status: "pending",
        _creationTime: Date.now(),
      };
      globalAppointments.push(newApt);
      notifyListeners();
      return newApt._id;
    }

    // clients.submitKyc (duplicate path — keep in sync with handler above)
    if (mutationName.includes("submitKyc")) {
      const client =
        (args.clientId && globalClients.find((c) => c._id === args.clientId)) ||
        globalClients.find((c: any) => c.userId === "u3") ||
        globalClients[0];
      if (!client) throw new Error("No client profile linked to this account");
      const files = args.files || [];
      const now = new Date().toISOString();
      globalClients = globalClients.map((c) =>
        c._id === client._id
          ? {
              ...c,
              kycStatus: "submitted" as const,
              kycFiles: files,
              kycDocuments: files.map((f: any) => f.storageId),
              address: args.address ?? c.address,
              kycIdNumber: args.idNumber,
              kycConsentAt: now,
              kycConsentVersion: "kyc-consent-v1",
              kycSubmittedAt: now,
              kycRejectionReason: undefined,
            }
          : c,
      );
      notifyListeners();
      return { success: true };
    }

    // documents.signDocument (duplicate path — primary handler above)
    if (mutationName.includes("signDocument")) {
      return { success: true };
    }

    // cms.subscribeNewsletter
    if (mutationName.includes("subscribeNewsletter")) {
      return { success: true, alreadySubscribed: false };
    }

    // cms.createJobApplication
    if (mutationName.includes("createJobApplication")) {
      const apps = ((globalThis as any).__lexJobApps ||= []);
      const id = `app_${Date.now()}`;
      apps.push({ _id: id, ...args, status: "new", appliedDate: new Date().toISOString() });
      notifyListeners();
      return id;
    }

    // cms.incrementResourceDownload
    if (mutationName.includes("incrementResourceDownload")) {
      const resources = ((globalThis as any).__lexResources ||= []);
      const idx = resources.findIndex((r: any) => r._id === args.id);
      if (idx !== -1) resources[idx].downloads = (resources[idx].downloads || 0) + 1;
      notifyListeners();
      return { success: true };
    }

    // cms news CRUD
    if (mutationName.includes("createNewsAndAward")) {
      const news = ((globalThis as any).__lexNews ||= []);
      const id = `news_${Date.now()}`;
      news.push({ _id: id, ...args });
      notifyListeners();
      return id;
    }
    if (mutationName.includes("updateNewsAndAward")) {
      const news = ((globalThis as any).__lexNews ||= []);
      const { id, ...updates } = args;
      const idx = news.findIndex((n: any) => n._id === id);
      if (idx !== -1) news[idx] = { ...news[idx], ...updates };
      notifyListeners();
      return { success: true };
    }
    if (mutationName.includes("deleteNewsAndAward")) {
      (globalThis as any).__lexNews = ((globalThis as any).__lexNews || []).filter(
        (n: any) => n._id !== args.id,
      );
      notifyListeners();
      return { success: true };
    }

    // cms resources CRUD
    if (mutationName.includes("createResource")) {
      const resources = ((globalThis as any).__lexResources ||= []);
      const id = `res_${Date.now()}`;
      resources.push({ _id: id, downloads: 0, publishedDate: new Date().toISOString(), ...args });
      notifyListeners();
      return id;
    }
    if (mutationName.includes("updateResource")) {
      const resources = ((globalThis as any).__lexResources ||= []);
      const { id, ...updates } = args;
      const idx = resources.findIndex((r: any) => r._id === id);
      if (idx !== -1) resources[idx] = { ...resources[idx], ...updates };
      notifyListeners();
      return { success: true };
    }
    if (mutationName.includes("deleteResource")) {
      (globalThis as any).__lexResources = ((globalThis as any).__lexResources || []).filter(
        (r: any) => r._id !== args.id,
      );
      notifyListeners();
      return { success: true };
    }

    // clients.createClient
    if (mutationName.includes("createClient")) {
      const newClient: LexClient = {
        _id: "c_" + Date.now(),
        kycStatus: "pending",
        isActive: true,
        ...args,
      };
      globalClients.push(newClient);
      notifyListeners();
      return newClient._id;
    }

    // cases.markConflictChecked
    if (mutationName.includes("markConflictChecked")) {
      const idx = globalCases.findIndex((c) => c._id === args.caseId);
      if (idx !== -1) {
        globalCases[idx] = {
          ...globalCases[idx],
          conflictChecked: true,
          conflictClearedBy: args.clearedBy,
        };
        notifyListeners();
      }
      return { success: true };
    }

    // clients.updateClient (staff mock toggles KYC; real Convex blocks client self-verify)
    if (mutationName.includes("updateClient")) {
      const { clientId, ...updates } = args;
      globalClients = globalClients.map((c) => {
        if (c._id === clientId) {
          return { ...c, ...updates };
        }
        return c;
      });
      notifyListeners();
      return { success: true };
    }

    // cases.createCase
    if (mutationName.includes("createCase")) {
      const newCase: LexCase = {
        _id: "case_" + Date.now(),
        status: "active",
        conflictChecked: true,
        ...args,
      };
      globalCases.push(newCase);
      notifyListeners();
      return newCase._id;
    }

    // cases.updateCase
    if (mutationName.includes("updateCase")) {
      const { caseId, ...updates } = args;
      globalCases = globalCases.map((c) => {
        if (c._id === caseId) {
          return { ...c, ...updates };
        }
        return c;
      });
      notifyListeners();
      return { success: true };
    }

    // hearings.createHearing
    if (mutationName.includes("createHearing")) {
      const newHearing: LexHearing = {
        _id: "h_" + Date.now(),
        status: "scheduled",
        ...args,
      };
      globalHearings.push(newHearing);
      notifyListeners();
      return newHearing._id;
    }

    // hearings.updateHearing
    if (mutationName.includes("updateHearing")) {
      const { hearingId, ...updates } = args;
      const hIndex = globalHearings.findIndex((h) => h._id === hearingId);
      if (hIndex === -1) return { success: false };

      globalHearings[hIndex] = { ...globalHearings[hIndex], ...updates };

      // Notification trigger: Alert client when hearing is modified
      const theCase = globalCases.find((c) => c._id === globalHearings[hIndex].caseId);
      if (theCase) {
        globalNotifications.push({
          _id: "notif_" + Date.now(),
          userId: theCase.clientId,
          title: "Hearing Updated",
          body: `The hearing for ${theCase.title} has been updated.`,
          type: "alert",
          isRead: false,
          link: "/client/matters",
          _creationTime: Date.now(),
        });
      }

      notifyListeners();
      return { success: true };
    }

    // timeEntries.createTimeEntry
    if (mutationName.includes("createTimeEntry")) {
      const newEntry: LexTimeEntry = {
        _id: "time_" + Date.now(),
        userId: "u2",
        ...args,
      };
      globalTimeEntries.push(newEntry);
      notifyListeners();
      return newEntry._id;
    }

    // timeEntries.deleteTimeEntry
    if (mutationName.includes("deleteTimeEntry")) {
      const { entryId } = args;
      globalTimeEntries = globalTimeEntries.filter((e) => e._id !== entryId);
      notifyListeners();
      return { success: true };
    }

    // messages.sendMessage
    if (mutationName.includes("sendMessage")) {
      const newMsg: LexMessage = {
        _id: "msg_" + Date.now(),
        caseId: args.caseId,
        senderId: args.senderId,
        content: args.content,
        isInternal: args.isInternal,
        attachmentIds: args.attachmentIds || [],
        readBy: [args.senderId],
        _creationTime: Date.now(),
      };
      globalMessages.push(newMsg);

      // Notification Trigger
      const theCase = globalCases.find((c) => c._id === args.caseId);
      if (theCase) {
        const sender = globalUsers.find((u) => u._id === args.senderId);
        const senderClient = globalClients.find((c) => c._id === args.senderId);
        const senderName = sender ? sender.name : senderClient ? senderClient.fullName : "Someone";

        // If staff sent a message, alert the client (unless it's internal)
        if (sender && !args.isInternal) {
          globalNotifications.push({
            _id: "notif_" + Date.now(),
            userId: theCase.clientId,
            title: "New Message",
            body: `${senderName} sent you a message regarding ${theCase.title}.`,
            type: "info",
            isRead: false,
            link: "/client/messages",
            _creationTime: Date.now(),
          });
        }
        // If client sent a message, alert the assigned lawyer
        else if (senderClient) {
          globalNotifications.push({
            _id: "notif_" + Date.now(),
            userId: theCase.assignedLawyerId,
            title: "New Client Message",
            body: `${senderName} sent a message regarding ${theCase.title}.`,
            type: "info",
            isRead: false,
            link: "/staff/cases",
            _creationTime: Date.now(),
          });
        }
      }

      notifyListeners();
      return { success: true };
    }

    // messages.markMessagesRead
    if (mutationName.includes("markMessagesRead")) {
      const config = getStoredConfig();
      const user = globalUsers.find((u) => u.role === config.activeRole) || globalUsers[0];
      globalMessages = globalMessages.map((m) => {
        if (m.caseId === args.caseId && !m.readBy.includes(user._id)) {
          return { ...m, readBy: [...m.readBy, user._id] };
        }
        return m;
      });
      notifyListeners();
      return { success: true };
    }

    // leads.updateLead
    if (mutationName.includes("updateLead")) {
      const { leadId, ...updates } = args;
      globalLeads = globalLeads.map((l) => (l._id === leadId ? { ...l, ...updates } : l));
      notifyListeners();
      return { success: true };
    }

    // leads.convertToClient ΓÇö creates a client record and marks lead as converted
    if (mutationName.includes("convertToClient")) {
      const { leadId, ...clientArgs } = args;
      const lead = globalLeads.find((l) => l._id === leadId);
      if (!lead) return { success: false };
      const newClientId = "c_" + Date.now();
      const newClient: LexClient = {
        _id: newClientId,
        fullName: lead.fullName,
        type: clientArgs.type || "individual",
        email: lead.email,
        phone: lead.phone,
        kycStatus: "pending",
        isActive: true,
        ...clientArgs,
      };
      globalClients.push(newClient);
      globalLeads = globalLeads.map((l) =>
        l._id === leadId
          ? { ...l, status: "converted" as const, convertedClientId: newClientId }
          : l,
      );
      // Write audit log entry
      const config = getStoredConfig();
      const user = globalUsers.find((u) => u.role === config.activeRole) || globalUsers[0];
      globalAuditLog.unshift({
        _id: "al_" + Date.now(),
        userId: user._id,
        action: "CONVERT",
        resource: "leads",
        resourceId: leadId,
        details: `Converted lead "${lead.fullName}" to client record`,
        ipAddress: "127.0.0.1",
        _creationTime: Date.now(),
      });
      notifyListeners();
      return newClientId;
    }

    // hr.upsertAttendance
    if (mutationName.includes("upsertAttendance")) {
      const { userId, date, ...rest } = args;
      const existing = globalAttendance.find((a) => a.userId === userId && a.date === date);
      if (existing) {
        globalAttendance = globalAttendance.map((a) =>
          a.userId === userId && a.date === date ? { ...a, ...rest } : a,
        );
      } else {
        globalAttendance.push({ _id: "att_" + Date.now(), userId, date, ...rest });
      }
      notifyListeners();
      return { success: true };
    }

    // hr.createLeaveRequest
    if (mutationName.includes("createLeaveRequest")) {
      const config = getStoredConfig();
      const user = globalUsers.find((u) => u.role === config.activeRole) || globalUsers[0];
      const newLR: LexLeaveRequest = {
        _id: "lr_" + Date.now(),
        userId: user._id,
        status: "pending",
        ...args,
      };
      globalLeaveRequests.push(newLR);
      notifyListeners();
      return newLR._id;
    }

    // hr.reviewLeaveRequest
    if (mutationName.includes("reviewLeaveRequest")) {
      const { leaveRequestId, status } = args;
      const config = getStoredConfig();
      const reviewer = globalUsers.find((u) => u.role === config.activeRole) || globalUsers[0];
      globalLeaveRequests = globalLeaveRequests.map((lr) =>
        lr._id === leaveRequestId ? { ...lr, status, reviewedBy: reviewer._id } : lr,
      );
      notifyListeners();
      return { success: true };
    }

    // auditLog.writeAuditLog
    if (mutationName.includes("writeAuditLog")) {
      const config = getStoredConfig();
      const user = globalUsers.find((u) => u.role === config.activeRole) || globalUsers[0];
      const entry: LexAuditLog = {
        _id: "al_" + Date.now(),
        userId: user._id,
        _creationTime: Date.now(),
        ...args,
      };
      globalAuditLog.unshift(entry);
      notifyListeners();
      return entry._id;
    }

    // documents.generateUploadUrl
    if (mutationName.includes("generateUploadUrl")) {
      return "mock-upload-url";
    }

    if (mutationName.includes("migrateLegacySecurityBoundary")) {
      return { success: true, updated: 0 };
    }

    if (mutationName.includes("createShareLink")) {
      const token = `share_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      globalDocumentShares.push({
        _id: `share_record_${Date.now()}`,
        documentId: args.documentId,
        token,
        expiresAt: args.expiresAt,
        password: args.password,
        allowDownload: args.allowDownload !== false,
        maxDownloads: args.maxDownloads,
        downloadsCount: 0,
        isActive: true,
      });
      notifyListeners();
      return token;
    }

    if (mutationName.includes("getSharedDocument")) {
      const share = globalDocumentShares.find((item) => item.token === args.token && item.isActive);
      if (!share || (share.expiresAt && Date.parse(share.expiresAt) <= Date.now()))
        throw new Error("This share link is invalid or expired");
      if (share.password && share.password !== args.password) return { isPasswordRequired: true };
      const doc = globalDocuments.find((item) => item._id === share.documentId);
      if (!doc || doc.isDeleted) throw new Error("Document is unavailable");
      return {
        isPasswordRequired: false,
        title: doc.title,
        type: doc.type,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        allowDownload: share.allowDownload,
      };
    }

    if (mutationName.includes("downloadSharedDocument")) {
      const share = globalDocumentShares.find((item) => item.token === args.token && item.isActive);
      if (!share || (share.expiresAt && Date.parse(share.expiresAt) <= Date.now()))
        throw new Error("This share link is invalid or expired");
      if (share.password && share.password !== args.password) return { isPasswordRequired: true };
      if (!share.allowDownload) throw new Error("Downloads are disabled for this share");
      if (share.maxDownloads && share.downloadsCount >= share.maxDownloads)
        throw new Error("Download limit reached");
      const doc = globalDocuments.find((item) => item._id === share.documentId);
      if (!doc) throw new Error("Document is unavailable");
      share.downloadsCount += 1;
      notifyListeners();
      return { isPasswordRequired: false, url: doc.storageId };
    }

    if (mutationName.includes("revokeShareLink")) {
      const share = globalDocumentShares.find((item) => item._id === args.shareId);
      if (share) share.isActive = false;
      notifyListeners();
      return { success: true };
    }

    // documents.createDocument
    if (mutationName.includes("createDocument")) {
      const config = getStoredConfig();
      const user = globalUsers.find((u) => u.role === config.activeRole) || globalUsers[0];

      // Calculate version (if parentDocumentId provided, increment its version)
      let nextVersion = 1;
      if (args.parentDocumentId) {
        const parent = globalDocuments.find((d) => d._id === args.parentDocumentId);
        if (parent) {
          nextVersion = parent.version + 1;
        }
      }

      const newDoc: LexDocument = {
        _id: "doc_" + Date.now(),
        _creationTime: Date.now(),
        uploadedBy: user._id,
        version: nextVersion,
        uploadStatus: "clean",
        ...args,
      };
      globalDocuments.push(newDoc);
      notifyListeners();
      return newDoc._id;
    }

    if (mutationName.includes("trashDocument")) {
      const doc = globalDocuments.find((item) => item._id === args.documentId);
      if (doc?.isOnLegalHold) throw new Error("Legal hold blocks deletion");
      if (doc) doc.isDeleted = true;
      notifyListeners();
      return { success: true };
    }

    if (mutationName.includes("restoreDocument")) {
      const doc = globalDocuments.find((item) => item._id === args.documentId);
      if (doc) doc.isDeleted = false;
      notifyListeners();
      return { success: true };
    }

    if (mutationName.includes("setLegalHold")) {
      const doc = globalDocuments.find((item) => item._id === args.documentId) as any;
      if (doc) {
        doc.isOnLegalHold = args.enabled;
        doc.legalHoldReason = args.reason;
      }
      notifyListeners();
      return { success: true };
    }

    if (mutationName.includes("setRetention")) {
      const doc = globalDocuments.find((item) => item._id === args.documentId) as any;
      if (doc) {
        doc.retentionPolicy = args.policy;
        doc.retentionUntil = args.retentionUntil;
      }
      notifyListeners();
      return { success: true };
    }

    if (mutationName.includes("hardDeleteDocument")) {
      const doc = globalDocuments.find((item) => item._id === args.documentId);
      if (
        doc?.isOnLegalHold ||
        (doc?.retentionUntil && Date.parse(doc.retentionUntil) > Date.now())
      )
        throw new Error("Retention or legal hold blocks deletion");
      globalDocuments = globalDocuments.filter((item) => item._id !== args.documentId);
      notifyListeners();
      return { success: true };
    }

    // documents.deleteDocument
    if (mutationName.includes("deleteDocument")) {
      globalDocuments = globalDocuments.filter((d) => d._id !== args.documentId);
      notifyListeners();
      return { success: true };
    }

    // invoices.createInvoiceFromTimeEntries
    if (mutationName.includes("createInvoiceFromTimeEntries")) {
      const { caseId, clientId, dueDate, notes } = args;
      const unbilled = globalTimeEntries.filter(
        (t) => t.caseId === caseId && t.isBillable && !t.invoiceId,
      );
      if (unbilled.length === 0) return { success: false, message: "No unbilled entries found." };

      const subtotal = unbilled.reduce((sum, t) => sum + (t.minutes / 60) * t.ratePerHour, 0);
      const vatAmount = subtotal * 0.13;
      const total = subtotal + vatAmount;

      const newInvoiceId = "inv_" + Date.now();
      const newInvoice: LexInvoice = {
        _id: newInvoiceId,
        invoiceNumber:
          "INV-" +
          new Date().getFullYear() +
          "-" +
          String(globalInvoices.length + 1).padStart(3, "0"),
        caseId,
        clientId,
        subtotal,
        vatAmount,
        total,
        issuedDate: new Date().toISOString().split("T")[0],
        dueDate,
        status: "sent",
        notes,
      };

      globalInvoices.push(newInvoice);

      // Mark time entries as billed
      globalTimeEntries = globalTimeEntries.map((t) =>
        t.caseId === caseId && t.isBillable && !t.invoiceId ? { ...t, invoiceId: newInvoiceId } : t,
      );

      notifyListeners();
      return newInvoiceId;
    }

    // invoices.payInvoice (Mock Payment Gateway callback)
    if (mutationName.includes("payInvoice")) {
      const { invoiceId, paymentMethod } = args;
      const invoiceIndex = globalInvoices.findIndex((i) => i._id === invoiceId);
      if (invoiceIndex === -1) return { success: false };

      const invoice = globalInvoices[invoiceIndex];
      globalInvoices[invoiceIndex] = {
        ...invoice,
        status: "paid",
        paidDate: new Date().toISOString().split("T")[0],
      };

      // Record Trust Transaction
      const lastTx = globalTrustTransactions.filter((t) => t.clientId === invoice.clientId).pop();
      const newBalance = (lastTx?.balance || 0) + invoice.total;

      globalTrustTransactions.push({
        _id: "tt_" + Date.now(),
        clientId: invoice.clientId,
        caseId: invoice.caseId,
        type: "receipt",
        amount: invoice.total,
        description: `Payment via ${paymentMethod} for ${invoice.invoiceNumber}`,
        date: new Date().toISOString().split("T")[0],
        balance: newBalance,
        approvedBy: "System",
      });

      notifyListeners();
      return { success: true };
    }

    // notifications.markRead
    if (mutationName.includes("markRead")) {
      const { notificationId } = args;
      const index = globalNotifications.findIndex((n) => n._id === notificationId);
      if (index !== -1) {
        globalNotifications[index] = { ...globalNotifications[index], isRead: true };
        notifyListeners();
      }
      return { success: true };
    }

    // notifications.markAllRead
    if (mutationName.includes("markAllRead")) {
      const { userId } = args;
      globalNotifications = globalNotifications.map((n) =>
        n.userId === userId ? { ...n, isRead: true } : n,
      );
      notifyListeners();
      return { success: true };
    }

    // cms.updateSettings
    if (mutationName.includes("cms.updateSettings")) {
      globalSettings = { ...globalSettings, ...args };
      notifyListeners();
      return { success: true };
    }

    // cms.createPracticeArea
    if (mutationName.includes("cms.createPracticeArea")) {
      const pa = { _id: "pa_" + Date.now(), _creationTime: Date.now(), ...args };
      globalPracticeAreas.push(pa);
      notifyListeners();
      return pa._id;
    }

    // cms.updatePracticeArea
    if (mutationName.includes("cms.updatePracticeArea")) {
      globalPracticeAreas = globalPracticeAreas.map((pa) =>
        pa._id === args.id ? { ...pa, ...args } : pa,
      );
      notifyListeners();
      return { success: true };
    }

    // cms.deletePracticeArea
    if (mutationName.includes("cms.deletePracticeArea")) {
      globalPracticeAreas = globalPracticeAreas.filter((pa) => pa._id !== args.id);
      notifyListeners();
      return { success: true };
    }

    // cms.createBlogPost
    if (mutationName.includes("cms.createBlogPost")) {
      const post = { _id: "bp_" + Date.now(), _creationTime: Date.now(), ...args };
      globalBlogPosts.push(post);
      notifyListeners();
      return post._id;
    }

    // cms.updateBlogPost
    if (mutationName.includes("cms.updateBlogPost")) {
      globalBlogPosts = globalBlogPosts.map((bp) => (bp._id === args.id ? { ...bp, ...args } : bp));
      notifyListeners();
      return { success: true };
    }

    // cms.deleteBlogPost
    if (mutationName.includes("cms.deleteBlogPost")) {
      globalBlogPosts = globalBlogPosts.filter((bp) => bp._id !== args.id);
      notifyListeners();
      return { success: true };
    }

    // settings.updateSystemSettings
    if (mutationName.includes("settings.updateSystemSettings")) {
      globalSystemSettings = { ...globalSystemSettings, ...args };
      notifyListeners();
      return { success: true };
    }

    // cms.createTestimonial
    if (mutationName.includes("cms.createTestimonial")) {
      const t = { _id: "t_" + Date.now(), _creationTime: Date.now(), ...args };
      globalTestimonials.push(t);
      notifyListeners();
      return t._id;
    }

    // cms.updateTestimonial
    if (mutationName.includes("cms.updateTestimonial")) {
      globalTestimonials = globalTestimonials.map((t) =>
        t._id === args.id ? { ...t, ...args } : t,
      );
      notifyListeners();
      return { success: true };
    }

    // cms.deleteTestimonial
    if (mutationName.includes("cms.deleteTestimonial")) {
      globalTestimonials = globalTestimonials.filter((t) => t._id !== args.id);
      notifyListeners();
      return { success: true };
    }

    // cms.updateTeamMember
    if (mutationName.includes("cms.updateTeamMember")) {
      globalUsers = globalUsers.map((u) => (u._id === args.id ? { ...u, ...args } : u));
      notifyListeners();
      return { success: true };
    }

    return { success: true };
  };
}

// Preview Settings Panel Component
function PreviewControlPanel({
  config,
  setConfig,
}: {
  config: PreviewConfig;
  setConfig: React.Dispatch<React.SetStateAction<PreviewConfig>>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-semibold border border-accent/30 transition-all transform hover:scale-105 cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          Preview Settings
        </button>
      ) : (
        <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-80 p-5 flex flex-col gap-4 animate-in fade-in-50 slide-in-from-bottom-5">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h4 className="font-serif font-bold text-lg text-primary">Preview Control Panel</h4>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground text-sm font-medium px-2 py-1 rounded-md hover:bg-secondary cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="flex flex-col gap-3.5">
            {/* Auth Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Auth State</span>
              <button
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    isAuthenticated: !prev.isAuthenticated,
                  }))
                }
                className={`px-3 py-1 rounded-md text-xs font-semibold uppercase transition-colors cursor-pointer ${
                  config.isAuthenticated
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                }`}
              >
                {config.isAuthenticated ? "Authenticated" : "Guest (Logged Out)"}
              </button>
            </div>

            {/* Role Switcher */}
            {config.isAuthenticated && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Simulation Role</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["admin", "client", "partner", "associate"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          activeRole: r,
                        }))
                      }
                      className={`px-2.5 py-1.5 rounded-md text-xs font-semibold capitalize border transition-all cursor-pointer ${
                        config.activeRole === r
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Navigation */}
            <div className="flex flex-col gap-1.5 border-t border-border pt-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Navigation
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <a
                  href="/"
                  className="px-2.5 py-1.5 rounded-md text-xs text-center font-medium bg-secondary hover:bg-secondary/80 border border-border"
                >
                  Public Website
                </a>
                <button
                  onClick={() => {
                    setConfig((prev) => ({ ...prev, activeRole: "client" }));
                    setTimeout(() => {
                      window.location.href = "/client";
                    }, 50);
                  }}
                  className="px-2.5 py-1.5 rounded-md text-xs text-center font-medium bg-secondary hover:bg-secondary/80 border border-border cursor-pointer"
                >
                  Client Portal
                </button>
                <button
                  onClick={() => {
                    setConfig((prev) => ({ ...prev, activeRole: "partner" }));
                    setTimeout(() => {
                      window.location.href = "/staff";
                    }, 50);
                  }}
                  className="px-2.5 py-1.5 rounded-md text-xs text-center font-medium bg-secondary hover:bg-secondary/80 border border-border cursor-pointer"
                >
                  Lex Workspace
                </button>
                <button
                  onClick={() => {
                    setConfig((prev) => ({ ...prev, activeRole: "admin" }));
                    setTimeout(() => {
                      window.location.href = "/admin";
                    }, 50);
                  }}
                  className="px-2.5 py-1.5 rounded-md text-xs text-center font-medium bg-secondary hover:bg-secondary/80 border border-border cursor-pointer"
                >
                  Admin Console
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
