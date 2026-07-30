import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
export { ConvexReactClient } from "./convex-client-stub.ts";

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
  twoFactorEnabled?: boolean;
  isPending?: boolean;
  activationToken?: string;
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
  kycStatus: "pending" | "submitted" | "verified";
  notes?: string;
  isActive: boolean;
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
  status: "scheduled" | "completed" | "adjourned" | "cancelled";
  notes?: string;
}

export interface LexTask {
  _id: string;
  caseId?: string;
  title: string;
  description?: string;
  assignedTo: string;
  createdBy: string;
  status: "todo" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  dueDateBs?: string;
  isRecurring: boolean;
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

export interface LexNotification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  link?: string;
  _creationTime: number;
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
  category: "office_rent" | "utilities" | "court_fees" | "courier" | "printing" | "travel" | "supplies" | "software" | "other";
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
  type: "pleading" | "affidavit" | "contract" | "poa" | "correspondence" | "evidence" | "template" | "other";
  storageId: string;
  mimeType: string;
  sizeBytes: number;
  tags: string[];
  uploadedBy: string;
  isTemplate: boolean;
  isPrivileged: boolean;
  version: number;
  parentDocumentId?: string;
  _creationTime: number;
}

export interface LexNotification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "alert" | "success" | "warning";
  isRead: boolean;
  link?: string;
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
  category: "supreme_court" | "high_court" | "district_court" | "commentary" | "procedure" | "template_research";
  tags: string[];
  content: string;
  authorId: string;
  _creationTime: number;
}

const INITIAL_USERS: LexUser[] = [
  { 
    _id: "u1", name: "Ramesh Badal", email: "ramesh@srimarlaw.com.np", role: "partner", isActive: true, isPublicFacing: true, phone: "+977-9860520520", barCouncilNumber: "NPC-001234", barCouncilExpiry: "2083-05-15",
    avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=256&h=256&auto=format&fit=crop",
    bio: "Ramesh Badal is a Senior Lawyer and the Former Attorney General of Nepal. With unparalleled expertise in constitutional and corporate law, he leads Srimar Law's high-stakes litigation.",
    linkedinUrl: "https://linkedin.com", twitterUrl: "https://twitter.com", publicEmail: "ramesh@srimarlaw.com.np"
  },
  { 
    _id: "u2", name: "Sangit Dhungana", email: "sangit@srimarlaw.com.np", role: "associate", isActive: true, isPublicFacing: true, phone: "+977-9860520520", barCouncilNumber: "NPC-005678", barCouncilExpiry: "2082-12-30",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=256&h=256&auto=format&fit=crop",
    bio: "Sangit Dhungana is a dedicated Associate Lawyer at Srimar Law, specializing in corporate compliance, dispute resolution, and civil litigation.",
    linkedinUrl: "https://linkedin.com", publicEmail: "sangit@srimarlaw.com.np"
  },
  { 
    _id: "u6", name: "Rajan Sharma", email: "rajan@srimarlaw.com.np", role: "associate", isActive: true, isPublicFacing: true, phone: "+977 9801122334", barCouncilNumber: "NPC-008910", barCouncilExpiry: "2084-01-10",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=256&h=256&auto=format&fit=crop",
    bio: "Rajan specializes in intellectual property and tech law. He advises Nepal's leading startups on regulatory compliance and data protection frameworks.",
    linkedinUrl: "https://linkedin.com", twitterUrl: "https://twitter.com"
  },
  { 
    _id: "u7", name: "Priya Gurung", email: "priya@srimarlaw.com.np", role: "associate", isActive: true, isPublicFacing: true, phone: "+977 9811223344", barCouncilNumber: "NPC-009988", barCouncilExpiry: "2085-02-15",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=256&h=256&auto=format&fit=crop",
    bio: "Priya is a dedicated advocate focusing on family law and dispute resolution. She is known for her empathetic approach and fierce courtroom advocacy.",
    publicEmail: "priya@srimarlaw.com.np"
  },
  { _id: "u3", name: "Hari Prasad", email: "hari@client.com", role: "client", isActive: true, phone: "+977 9803098765" },
  { _id: "u4", name: "Gita Nepal", email: "gita@admin.com", role: "admin", isActive: true, phone: "+977 9812345678" },
  { _id: "u5", name: "Krishna Aryal", email: "krishna@intern.com", role: "intern", isActive: true, phone: "+977 9860112233" }
];

const INITIAL_CLIENTS: LexClient[] = [
  { _id: "c1", fullName: "Hari Prasad", type: "individual", email: "hari@client.com", phone: "+977 9803098765", address: "Koteshwor, Kathmandu", kycStatus: "verified", isActive: true, notes: "Regular property dispute consultations." },
  { _id: "c2", fullName: "TechVenture Pvt. Ltd.", type: "corporate", email: "legal@techventure.com.np", phone: "+977 01 4412345", address: "Lalitpur", companyName: "TechVenture Pvt. Ltd.", registrationNumber: "REG-9912", kycStatus: "submitted", isActive: true },
  { _id: "c3", fullName: "Shree Ram Builders", type: "corporate", email: "shreerambuilders@ncell.com", phone: "+977 9851099999", address: "Bhaktapur", companyName: "Shree Ram Builders", kycStatus: "pending", isActive: true }
];

const INITIAL_CASES: LexCase[] = [
  { _id: "case1", caseNumber: "KTM/2081/234", title: "Property Dispute \u2014 Bhaktapur Plot 234", practiceArea: "Property Law", status: "active", clientId: "c1", assignedLawyerId: "u2", teamMemberIds: ["u2", "u1"], court: "District Court ΓÇö Kathmandu", filingDate: "2026-01-10", conflictChecked: true },
  { _id: "case2", caseNumber: "PAT/2081/582", title: "Company Registration \u2014 TechVenture Pvt. Ltd.", practiceArea: "Corporate Law", status: "active", clientId: "c2", assignedLawyerId: "u1", teamMemberIds: ["u1"], court: "High Court ΓÇö Patan", filingDate: "2026-02-15", conflictChecked: true },
  { _id: "case3", caseNumber: "KTM/2081/999", title: "Sharma vs. Kathmandu Municipality", practiceArea: "Civil Litigation", status: "on_hold", clientId: "c1", assignedLawyerId: "u2", teamMemberIds: ["u2"], court: "Supreme Court of Nepal", filingDate: "2026-03-01", conflictChecked: true }
];

const INITIAL_HEARINGS: LexHearing[] = [
  { _id: "h1", caseId: "case3", court: "Supreme Court of Nepal", dateGregorian: "2026-11-28", dateBs: "15 Mangsir 2083", time: "10:00 AM", purpose: "Final Hearing", status: "scheduled", notes: "Ensure all primary files are in order." },
  { _id: "h2", caseId: "case2", court: "High Court ΓÇö Patan", dateGregorian: "2026-11-28", dateBs: "15 Mangsir 2083", time: "02:00 PM", purpose: "Interim Order Debate", status: "scheduled" },
  { _id: "h3", caseId: "case1", court: "District Court ΓÇö Kathmandu", dateGregorian: "2026-11-29", dateBs: "16 Mangsir 2083", time: "11:00 AM", purpose: "Evidence Submission", status: "scheduled" }
];

const INITIAL_TASKS: LexTask[] = [
  { _id: "t1", caseId: "case1", title: "File bail application \u2014 Gurung case", assignedTo: "u2", createdBy: "u1", status: "todo", priority: "urgent", dueDate: "2026-07-30", dueDateBs: "15 Shrawan 2083", isRecurring: false },
  { _id: "t2", caseId: "case2", title: "Review MOA draft before client meeting", assignedTo: "u2", createdBy: "u1", status: "in_progress", priority: "high", dueDate: "2026-07-31", dueDateBs: "16 Shrawan 2083", isRecurring: false },
  { _id: "t3", caseId: "case2", title: "Submit trademark registration docs", assignedTo: "u1", createdBy: "u1", status: "todo", priority: "medium", dueDate: "2026-08-02", dueDateBs: "18 Shrawan 2083", isRecurring: false }
];

const INITIAL_TIME_ENTRIES: LexTimeEntry[] = [
  { _id: "time1", caseId: "case1", userId: "u2", description: "Property Dispute draft preparation & filing", minutes: 120, isBillable: true, date: "2026-07-29", ratePerHour: 1500 },
  { _id: "time2", caseId: "case2", userId: "u1", description: "Initial client meeting & structure discussion", minutes: 60, isBillable: true, date: "2026-07-29", ratePerHour: 2000 }
];

const INITIAL_INVOICES: LexInvoice[] = [
  { _id: "inv1", invoiceNumber: "INV-2081-001", caseId: "case1", clientId: "c1", subtotal: 13274, vatAmount: 1726, total: 15000, issuedDate: "2026-07-15", dueDate: "2026-07-30", status: "sent", notes: "Services for property title search." },
  { _id: "inv2", invoiceNumber: "INV-2081-002", caseId: "case2", clientId: "c2", subtotal: 22124, vatAmount: 2876, total: 25000, issuedDate: "2026-06-20", dueDate: "2026-07-05", status: "paid", notes: "MOA/AOA drafting & registration fees.", paidDate: "2026-07-01" }
];

const INITIAL_TRUST_TRANSACTIONS: LexTrustTransaction[] = [
  { _id: "tt1", clientId: "c1", caseId: "case1", type: "receipt", amount: 50000, description: "Initial Retainer Deposit", date: "2026-07-10", balance: 50000, approvedBy: "u4" },
  { _id: "tt2", clientId: "c1", caseId: "case1", type: "disbursement", amount: 10000, description: "Court Filing Fees disbursement", date: "2026-07-12", balance: 40000, approvedBy: "u4" },
  { _id: "tt3", clientId: "c1", caseId: "case1", type: "disbursement", amount: 15000, description: "Release escrow payment for INV-2081-001", date: "2026-07-30", balance: 25000, approvedBy: "u4" }
];

const INITIAL_MESSAGES: LexMessage[] = [
  { _id: "m1", caseId: "case1", senderId: "u2", content: "Your hearing date has been confirmed for 15 Mangsir 2083.", isInternal: false, attachmentIds: [], readBy: ["u2"], _creationTime: Date.now() - 7200000 },
  { _id: "m2", caseId: "case1", senderId: "u3", content: "Thank you. Do I need to present any evidence?", isInternal: false, attachmentIds: [], readBy: ["u3"], _creationTime: Date.now() - 3600000 },
  { _id: "m3", caseId: "case1", senderId: "u2", content: "Yes, please bring the original land certificate and the latest tax receipts.", isInternal: false, attachmentIds: [], readBy: ["u2"], _creationTime: Date.now() - 1800000 },
  { _id: "m4", caseId: "case2", senderId: "u1", content: "We are reviewing your draft articles of association today.", isInternal: false, attachmentIds: [], readBy: ["u1"], _creationTime: Date.now() - 86400000 }
];

const INITIAL_LEADS: LexLead[] = [
  { _id: "lead1", fullName: "Rajan Karki", phone: "+977 9841234567", practiceAreaInterest: "Property Law", source: "website", status: "new", _creationTime: Date.now() - 86400000 * 2 },
  { _id: "lead2", fullName: "Srijana Thapa", phone: "+977 9851234567", email: "srijana@email.com", practiceAreaInterest: "Family Law", source: "referral", status: "contacted", intakeToken: "mock-token-123", intakeSubmitted: false, _creationTime: Date.now() - 86400000 * 3 },
  { _id: "lead3", fullName: "Himalaya Trading Pvt. Ltd.", phone: "+977 01 4321234", email: "legal@himalaya.com", practiceAreaInterest: "Corporate Law", source: "website", status: "consultation_scheduled", assignedTo: "u1", _creationTime: Date.now() - 86400000 * 5 },
  { _id: "lead4", fullName: "Gopal Bhandari", phone: "+977 9806543210", practiceAreaInterest: "Criminal Law", source: "walk_in", status: "converted", convertedClientId: "c1", _creationTime: Date.now() - 86400000 * 8 },
  { _id: "lead5", fullName: "Sunita Gurung", phone: "+977 9812223334", practiceAreaInterest: "Immigration", source: "social", status: "lost", notes: "Client chose another firm", _creationTime: Date.now() - 86400000 * 10 }
];

const TODAY = new Date().toISOString().slice(0, 10);
const INITIAL_ATTENDANCE: LexAttendance[] = [
  { _id: "att1", userId: "u1", date: TODAY, clockIn: "9:02 AM", clockOut: "6:15 PM", status: "present" },
  { _id: "att2", userId: "u2", date: TODAY, clockIn: "9:30 AM", clockOut: "6:00 PM", status: "present" },
  { _id: "att3", userId: "u5", date: TODAY, clockIn: undefined, clockOut: undefined, status: "leave" }
];

const INITIAL_LEAVE_REQUESTS: LexLeaveRequest[] = [
  { _id: "lr1", userId: "u2", type: "sick", fromDate: "2026-07-28", toDate: "2026-07-30", reason: "Medical leave ΓÇö fever", status: "approved", reviewedBy: "u4" },
  { _id: "lr2", userId: "u5", type: "annual", fromDate: "2026-08-03", toDate: "2026-08-05", reason: "Family event", status: "pending" }
];

const INITIAL_AUDIT_LOG: LexAuditLog[] = [
  { _id: "al1", userId: "u2", action: "VIEW", resource: "documents", resourceId: "DOC-001", details: "Viewed: Property Title Deed ΓÇö Plot 234", ipAddress: "192.168.1.14", _creationTime: Date.now() - 3600000 * 2 },
  { _id: "al2", userId: "u1", action: "CREATE", resource: "cases", resourceId: "KTM/2081/234", details: "Created new case: Property Dispute ΓÇö Bhaktapur Plot 234", ipAddress: "192.168.1.10", _creationTime: Date.now() - 3600000 * 4 },
  { _id: "al3", userId: "u4", action: "UPDATE", resource: "users", resourceId: "u5", details: "Changed role: intern ΓåÆ paralegal", ipAddress: "192.168.1.1", _creationTime: Date.now() - 3600000 * 8 },
  { _id: "al4", userId: "u1", action: "SEND", resource: "invoices", resourceId: "INV-2081-001", details: "Sent invoice INV-2081-001 to Hari Prasad", ipAddress: "192.168.1.10", _creationTime: Date.now() - 86400000 },
  { _id: "al5", userId: "u2", action: "UPLOAD", resource: "documents", resourceId: "DOC-089", details: "Uploaded: Court Notice ΓÇö Hearing 15 Mangsir", ipAddress: "192.168.1.14", _creationTime: Date.now() - 86400000 * 2 },
  { _id: "al6", userId: "u4", action: "DELETE", resource: "leads", resourceId: "lead5", details: "Marked lead Sunita Gurung as lost", ipAddress: "192.168.1.1", _creationTime: Date.now() - 86400000 * 3 }
];

const INITIAL_DOCUMENTS: LexDocument[] = [
  { _id: "doc1", caseId: "case1", title: "Sharma Appeal Petition", type: "pleading", storageId: "mock-storage-1", mimeType: "application/pdf", sizeBytes: 340000, tags: [], uploadedBy: "u2", isTemplate: false, isPrivileged: false, version: 2, _creationTime: Date.now() - 86400000 * 10 },
  { _id: "doc2", caseId: "case1", title: "Property Title Deed (Exhibit A)", type: "evidence", storageId: "mock-storage-2", mimeType: "image/jpeg", sizeBytes: 2100000, tags: [], uploadedBy: "u1", isTemplate: false, isPrivileged: false, version: 1, _creationTime: Date.now() - 86400000 * 5 },
  { _id: "doc3", caseId: "case1", title: "Client Retainer Agreement", type: "contract", storageId: "mock-storage-3", mimeType: "application/pdf", sizeBytes: 180000, tags: [], uploadedBy: "u4", isTemplate: false, isPrivileged: true, version: 1, _creationTime: Date.now() - 86400000 * 30 },
  { _id: "doc4", caseId: "case2", title: "TechVenture Trademark Certificate", type: "evidence", storageId: "mock-storage-4", mimeType: "application/pdf", sizeBytes: 890000, tags: [], uploadedBy: "u1", isTemplate: false, isPrivileged: false, version: 1, _creationTime: Date.now() - 86400000 * 20 }
];

const INITIAL_NOTIFICATIONS: LexNotification[] = [
  { _id: "notif1", userId: "u2", title: "New Assignment", message: "You were assigned to KTM/2081/234", type: "info", isRead: false, link: "/staff/cases", _creationTime: Date.now() - 86400000 },
  { _id: "notif2", userId: "u1", title: "New Message", message: "Sita Thapa sent a new message in TechVenture case.", type: "alert", isRead: false, link: "/staff/cases", _creationTime: Date.now() - 3600000 },
  { _id: "notif3", userId: "u3", title: "Hearing Scheduled", message: "Your hearing is scheduled for 15 Mangsir 2083", type: "success", isRead: false, link: "/client/matters", _creationTime: Date.now() - 7200000 },
];

const INITIAL_TEMPLATES: LexTemplate[] = [
  {
    _id: "tmpl1",
    title: "Standard Retainer Agreement",
    type: "retainer",
    content: "RETAINER AGREEMENT\n\nThis Agreement is made on {{TODAY_DATE}} between Srimar Law and {{CLIENT_NAME}} (Client).\n\nThe Client engages the Law Firm to represent them in the matter of: {{CASE_TITLE}} (Case No: {{CASE_NUMBER}}).\n\nThe matter is currently at {{COURT_NAME}} before Hon. Judge {{JUDGE_NAME}}.\n\nSignatures:\n\n___________________\n{{CLIENT_NAME}}\n\n___________________\nSrimar Law",
    _creationTime: Date.now() - 100000,
  },
  {
    _id: "tmpl2",
    title: "Simple Power of Attorney",
    type: "general",
    content: "POWER OF ATTORNEY (WAKALATNAMA)\n\nI, {{CLIENT_NAME}}, hereby authorize Srimar Law and its lawyers to act on my behalf in the matter of {{CASE_TITLE}} before {{COURT_NAME}}.\n\nDate: {{TODAY_DATE}}\nSignature:\n___________________",
    _creationTime: Date.now() - 50000,
  }
];

const INITIAL_RESEARCH_NOTES: LexResearchNote[] = [
  {
    _id: "rn1",
    title: "Supreme Court on Adverse Possession — NKP 2078/12",
    category: "supreme_court",
    tags: ["adverse possession", "property", "limitation"],
    content: "The Supreme Court in NKP 2078, Issue 12 held that adverse possession claims require uninterrupted, open, and hostile possession for a statutory period of 12 years under the Muluki Civil Code. The claimant must also demonstrate that the original owner had full knowledge and did not act. Relevant section: Civil Code Section 96.",
    authorId: "u1",
    _creationTime: Date.now() - 86400000 * 30
  },
  {
    _id: "rn2",
    title: "Company Registration Process — ORC 2079 Amendment",
    category: "procedure",
    tags: ["company", "ORC", "registration", "corporate"],
    content: "Following the Office of Company Registrar 2079 Amendment, all private limited companies must now submit a digital copy of the MOA/AOA along with the physical filing. PAN registration at IRD must be completed within 30 days of ORC approval. Contact: ORC Tripureshwor, 01-4228890.",
    authorId: "u1",
    _creationTime: Date.now() - 86400000 * 20
  },
  {
    _id: "rn3",
    title: "High Court — Patan: Interim Stay in Property Disputes",
    category: "high_court",
    tags: ["interim stay", "property", "injunction", "Patan HC"],
    content: "Patan HC has consistently required three conditions for interim stay in property disputes: (1) Prima facie case established, (2) Balance of convenience in petitioner's favour, (3) Irreparable harm if stay not granted. Supporting precedent: Rajan Shrestha v. Municipality (2079). Filing fee: NPR 500 application, NPR 2000 for urgent listing.",
    authorId: "u2",
    _creationTime: Date.now() - 86400000 * 15
  },
  {
    _id: "rn4",
    title: "Labour Court Procedure — Wrongful Termination Claims",
    category: "procedure",
    tags: ["labour", "wrongful termination", "Labour Act 2074"],
    content: "Under the Labour Act 2074, an employee disputing termination must file with the Labour Office within 35 days. If unresolved within 30 days at the Labour Office, the matter proceeds to the Labour Court. Key documentation: Appointment letter, termination notice, payslips for last 3 months, and any written warnings. Compensation formula: 1 month salary per year of service (up to 12 months).",
    authorId: "u2",
    _creationTime: Date.now() - 86400000 * 8
  },
  {
    _id: "rn5",
    title: "E-Signature Validity under Electronic Transactions Act 2063",
    category: "commentary",
    tags: ["e-signature", "digital signature", "ETA 2063", "contracts"],
    content: "Under Nepal's Electronic Transactions Act 2063, digitally signed documents using government-issued digital certificates are legally valid and enforceable. However, documents requiring physical appearance (like property deeds, wills, and powers of attorney) still require physical presence and notarization. E-signatures from private platforms do not yet have formal statutory recognition.",
    authorId: "u1",
    _creationTime: Date.now() - 86400000 * 3
  }
];

const INITIAL_EXPENSES: LexExpense[] = [
  { _id: "exp1", description: "Office Rent — Babarmahal", category: "office_rent", amount: 85000, date: TODAY, submittedBy: "u3", status: "approved", approvedBy: "u1", _creationTime: Date.now() - 86400000 * 30 },
  { _id: "exp2", description: "Supreme Court Filing Fee — Case CASE-2081-001", category: "court_fees", amount: 5000, caseId: "case1", date: TODAY, submittedBy: "u2", status: "approved", approvedBy: "u1", _creationTime: Date.now() - 86400000 * 20 },
  { _id: "exp3", description: "Document Courier — Blue Dart", category: "courier", amount: 1200, caseId: "case2", date: TODAY, submittedBy: "u3", status: "pending", _creationTime: Date.now() - 86400000 * 5 },
  { _id: "exp4", description: "Internet & Electricity — Shrawan", category: "utilities", amount: 6500, date: TODAY, submittedBy: "u3", status: "approved", approvedBy: "u1", _creationTime: Date.now() - 86400000 * 15 },
  { _id: "exp5", description: "Printing & Photocopying — 500 pages", category: "printing", amount: 2500, caseId: "case1", date: TODAY, submittedBy: "u4", status: "pending", _creationTime: Date.now() - 86400000 * 2 },
  { _id: "exp6", description: "Travel to High Court Patan", category: "travel", amount: 3000, caseId: "case3", date: TODAY, submittedBy: "u2", status: "approved", approvedBy: "u1", _creationTime: Date.now() - 86400000 * 10 },
  { _id: "exp7", description: "Legal Research Software License", category: "software", amount: 15000, date: TODAY, submittedBy: "u1", status: "approved", approvedBy: "u1", _creationTime: Date.now() - 86400000 * 45 },
  { _id: "exp8", description: "Office Stationery — Notepad, Pens, Binders", category: "supplies", amount: 1800, date: TODAY, submittedBy: "u3", status: "pending", _creationTime: Date.now() - 86400000 },
];

const INITIAL_PESI: LexCauseList[] = [
  { _id: "pesi1", caseId: "case1", courtName: "Supreme Court", judgeName: "Hon. Sapana Pradhan Malla, Hon. Kumar Regmi", hearingType: "Final Hearing", serialNumber: "12 (Kha)", status: "scheduled", pesiDate: "15 Bhadra 2081", _creationTime: Date.now() },
  { _id: "pesi2", caseId: "case3", courtName: "High Court Patan", judgeName: "Hon. Neeta Gautam Dixit", hearingType: "Interim Order Discussion", serialNumber: "3 (Ka)", status: "scheduled", pesiDate: "16 Bhadra 2081", _creationTime: Date.now() },
];

// Global in-memory simulation databases
let globalUsers = [...INITIAL_USERS];
let globalClients = [...INITIAL_CLIENTS];
let globalCases = [...INITIAL_CASES];
let globalHearings = [...INITIAL_HEARINGS];
let globalTasks = [...INITIAL_TASKS];
let globalTimeEntries = [...INITIAL_TIME_ENTRIES];
let globalInvoices = [...INITIAL_INVOICES];
let globalTrustTransactions = [...INITIAL_TRUST_TRANSACTIONS];
let globalMessages = [...INITIAL_MESSAGES];
let globalLeads = [...INITIAL_LEADS];
let globalAttendance = [...INITIAL_ATTENDANCE];
let globalLeaveRequests = [...INITIAL_LEAVE_REQUESTS];
let globalAuditLog = [...INITIAL_AUDIT_LOG];
let globalDocuments = [...INITIAL_DOCUMENTS];
let globalNotifications = [...INITIAL_NOTIFICATIONS];
let globalTemplates = [...INITIAL_TEMPLATES];
let globalResearchNotes = [...INITIAL_RESEARCH_NOTES];
let globalIntakeForms: LexIntakeForm[] = [];
let globalAppointments: any[] = [
  { _id: "apt1", clientId: "c1", lawyerId: "u2", date: TODAY, time: "11:00 AM", type: "in_person", status: "scheduled", _creationTime: Date.now() - 86400000 },
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
  seoMetaDescription: "Srimar Law is Nepal's Premier Legal Practice providing corporate, civil, and criminal defense.",
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
    paymentKeys: { esewaMerchantId: "", khaltiSecretKey: "", bankName: "", accountName: "", accountNumber: "", branch: "" },
    videoProvider: "google_meet", // google_meet, zoom, manual
    videoKeys: { clientId: "", clientSecret: "" }
  }
};

let globalTestimonials: any[] = [
  { _id: "t1", name: "Rajesh Shrestha", company: "Shrestha Group of Companies", text: "Srimar Law handled our corporate restructuring with exceptional expertise. The client portal made staying updated effortless.", rating: 5, isApproved: true, _creationTime: Date.now() - 864000000 },
  { _id: "t2", name: "Priya Karmacharya", company: "Individual Client", text: "They resolved my property dispute in record time. Transparent billing and constant communication set them apart.", rating: 5, isApproved: true, _creationTime: Date.now() - 864000000 },
  { _id: "t3", name: "Bikash Maharjan", company: "Tech Startup Founder", text: "Our IP registration was seamless. The team's understanding of Nepal's legal landscape is unmatched.", rating: 5, isApproved: true, _creationTime: Date.now() - 864000000 }
];

let globalPracticeAreas: any[] = [
  { _id: "pa1", title: "Corporate Law", slug: "corporate-law", iconName: "Building2", description: "Company registration, mergers, and corporate governance.", isActive: true, _creationTime: Date.now() - 864000000 },
  { _id: "pa2", title: "Criminal Defense", slug: "criminal-defense", iconName: "Shield", description: "Expert defense in criminal proceedings.", isActive: true, _creationTime: Date.now() - 864000000 },
  { _id: "pa3", title: "Civil Litigation", slug: "civil-litigation", iconName: "Scale", description: "Property disputes, contracts, and tort claims.", isActive: true, _creationTime: Date.now() - 864000000  },
];

let globalSessions: LexSession[] = [
  { _id: "sess_1", userId: "u_1", device: "Windows 11 PC", browser: "Chrome", ipAddress: "192.168.1.12", lastActive: new Date().toISOString(), isCurrent: true },
  { _id: "sess_2", userId: "u_1", device: "iPhone 14 Pro", browser: "Safari", ipAddress: "103.10.20.5", lastActive: new Date(Date.now() - 3600000).toISOString(), isCurrent: false }
];


let globalBlogPosts: any[] = [
  { 
    _id: "bp1", 
    title: "Understanding Nepal's New Civil Code", 
    slug: "civil-code-nepal", 
    excerpt: "A quick guide to the Muluki Ain updates. Learn how these changes affect business contracts and family law in Nepal.", 
    content: "<h2>The Muluki Civil Code</h2><p>Nepal's Civil Code represents a monumental shift in the legal landscape...</p><h3>Key Changes to Contract Law</h3><p>Contracts now require more stringent verification...</p>", 
    status: "published", 
    author: "Srimar Law Team", 
    category: "Civil Law",
    coverImageUrl: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=1200&auto=format&fit=crop",
    publishDate: new Date(Date.now() - 864000000).toISOString(), 
    _creationTime: Date.now() - 864000000 
  }
];

let globalSystemSettings = {
  defaultHourlyRate: "5000",
  vatRate: "13",
  invoicePaymentTerms: "14",
  defaultLanguage: "en",
  clientPortalEnabled: true,
  onlineBookingEnabled: true
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
    <PreviewContext.Provider value={{ config, setConfig }}>
      {children}
      <PreviewControlPanel config={config} setConfig={setConfig} />
    </PreviewContext.Provider>
  );
}

// ConvexReactClient is defined in convex-client-stub.ts and re-exported above

// Context for Convex auth
const ConvexAuthContext = createContext<{
  isLoading: boolean;
  isAuthenticated: boolean;
} | null>(null);

export function ConvexProvider({ client, children }: { client: any; children: React.ReactNode }) {
  return <ConvexProviderWithAuth client={client} useAuth={useMockAuth}>{children}</ConvexProviderWithAuth>;
}

export function ConvexProviderWithAuth({ children }: { client: any; useAuth: any; children: React.ReactNode }) {
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

  const queryName = typeof queryFunc === "string" ? queryFunc : String(queryFunc);

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

  // CMS Queries
  if (queryName.includes("getSettings")) return globalSettings;
  if (queryName.includes("listTestimonials")) return globalTestimonials;
  if (queryName.includes("listPracticeAreas")) return globalPracticeAreas;
  if (queryName.includes("listBlogPosts")) return globalBlogPosts;

  // Appointments
  if (queryName.includes("listAppointments")) {
    return globalAppointments;
  }

  // Notifications
  if (queryName.includes("listNotifications")) {
    return globalNotifications.filter(n => n.userId === args?.userId).sort((a, b) => b._creationTime - a._creationTime);
  }

  // HR Queries
  if (queryName.includes("listAttendance")) {
    return globalAttendance.filter(a => a.date === args?.date);
  }
  if (queryName.includes("listLeaveRequests")) {
    return globalLeaveRequests;
  }

  // users.listSessions
  if (queryName.includes("listSessions")) {
    return globalSessions.filter(s => s.userId === args?.userId);
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
  if (queryName.includes("listTasks")) {
    let filtered = [...globalTasks];
    if (args?.caseId) {
      filtered = filtered.filter((t) => t.caseId === args.caseId);
    }
    if (args?.assignedTo) {
      filtered = filtered.filter((t) => t.assignedTo === args.assignedTo);
    }
    if (args?.status) {
      filtered = filtered.filter((t) => t.status === args.status);
    }
    return filtered;
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
    return filtered.sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());
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

  // listDocuments
  if (queryName.includes("listDocuments")) {
    let filtered = [...globalDocuments];
    if (args?.caseId) filtered = filtered.filter((d) => d.caseId === args.caseId);
    if (args?.isTemplate !== undefined) filtered = filtered.filter((d) => d.isTemplate === args.isTemplate);
    return filtered.sort((a, b) => b._creationTime - a._creationTime);
  }

  // getDocument
  if (queryName.includes("documents.getDocument")) {
    return globalDocuments.find(d => d._id === args.documentId) || null;
  }

  // listTemplates
  if (queryName.includes("templates.listTemplates")) {
    return [...globalTemplates].sort((a, b) => b._creationTime - a._creationTime);
  }

  // research.listNotes
  if (queryName.includes("research.listNotes")) {
    return [...globalResearchNotes].sort((a, b) => b._creationTime - a._creationTime);
  }

  // cases.checkConflict — fuzzy search across clients, cases, opposing counsel
  if (queryName.includes("cases.checkConflict")) {
    const q = (args?.query || "").toLowerCase().trim();
    if (!q || q.length < 2) return [];
    const hits: Array<{ type: string; name: string; reason: string; caseId?: string; caseNumber?: string }> = [];

    // Search clients
    globalClients.forEach((c) => {
      const nameMatch = c.fullName.toLowerCase().includes(q);
      const companyMatch = c.companyName?.toLowerCase().includes(q);
      if (nameMatch || companyMatch) {
        hits.push({ type: "Existing Client", name: c.fullName, reason: nameMatch ? "Name match" : "Company name match" });
      }
    });

    // Search cases — title and opposing counsel
    globalCases.forEach((cas) => {
      if (cas.title.toLowerCase().includes(q)) {
        hits.push({ type: "Existing Case", name: cas.title, reason: "Case title match", caseId: cas._id, caseNumber: cas.caseNumber });
      }
      if (cas.opposingCounsel?.toLowerCase().includes(q)) {
        hits.push({ type: "Opposing Counsel", name: cas.opposingCounsel, reason: `Opposing counsel in case ${cas.caseNumber}`, caseId: cas._id, caseNumber: cas.caseNumber });
      }
    });

    return hits;
  }

  // leads.getIntakeByToken
  if (queryName.includes("leads.getIntakeByToken")) {
    const lead = globalLeads.find(l => l.intakeToken === args?.token);
    if (!lead) return null;
    return { lead };
  }

  // appointments.listClientAppointments
  if (queryName.includes("appointments.listClientAppointments")) {
    const clientId = args?.clientId || getStoredConfig().activeRole === "client" ? globalClients[0]._id : undefined;
    return globalAppointments.filter(a => a.clientId === clientId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // expenses.list
  if (queryName.includes("expenses.list")) {
    let filtered = [...globalExpenses];
    if (args?.category && args.category !== "all") filtered = filtered.filter(e => e.category === args.category);
    if (args?.status && args.status !== "all") filtered = filtered.filter(e => e.status === args.status);
    if (args?.caseId) filtered = filtered.filter(e => e.caseId === args.caseId);
    return filtered.sort((a, b) => b._creationTime - a._creationTime);
  }

  // expenses.getStats
  if (queryName.includes("expenses.getStats")) {
    const total = globalExpenses.reduce((s, e) => s + e.amount, 0);
    const approved = globalExpenses.filter(e => e.status === "approved").reduce((s, e) => s + e.amount, 0);
    const pending = globalExpenses.filter(e => e.status === "pending").reduce((s, e) => s + e.amount, 0);
    const caseLinked = globalExpenses.filter(e => !!e.caseId).reduce((s, e) => s + e.amount, 0);
    const byCategory: Record<string, number> = {};
    globalExpenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
    return { total, approved, pending, caseLinked, byCategory, count: globalExpenses.length, pendingCount: globalExpenses.filter(e => e.status === "pending").length };
  }

  // analytics.getDashboardData
  if (queryName.includes("analytics.getDashboardData")) {
    // Revenue by practice area
    const revenueByPractice: Record<string, number> = {};
    globalInvoices.filter(i => i.status === "paid").forEach(inv => {
      const c = globalCases.find(cs => cs._id === inv.caseId);
      const pa = c?.practiceArea || "Other";
      revenueByPractice[pa] = (revenueByPractice[pa] || 0) + inv.total;
    });

    // Billable hours by associate
    const hoursByAssociate: Record<string, number> = {};
    globalTimeEntries.filter(t => t.isBillable).forEach(te => {
      const u = globalUsers.find(us => us._id === te.userId);
      const name = u?.name || te.userId;
      hoursByAssociate[name] = (hoursByAssociate[name] || 0) + ((te as any).minutes / 60);
    });

    // Case status distribution
    const casesByStatus: Record<string, number> = {};
    globalCases.forEach(c => { casesByStatus[c.status] = (casesByStatus[c.status] || 0) + 1; });

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
    const totalRevenue = globalInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
    const totalBilled = globalInvoices.reduce((s, i) => s + i.total, 0);
    const realizationRate = totalBilled > 0 ? Math.round((totalRevenue / totalBilled) * 100) : 0;
    const avgCaseValue = globalCases.length > 0 ? Math.round(totalRevenue / globalCases.length) : 0;
    const totalClients = globalClients.length;
    const activeClients = globalClients.filter(c => (c as any).isActive).length;
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
      activeCases: globalCases.filter(c => c.status === "active").length,
      totalExpenses: globalExpenses.reduce((s, e) => s + e.amount, 0),
    };
  }

  // court.getPesi
  if (queryName.includes("court.getPesi")) {
    // Return pesi items for a specific case, or all if not provided
    if (args?.caseId) {
      return globalPesi.filter(p => p.caseId === args.caseId);
    }
    return [...globalPesi];
  }

  // cms.getSettings
  if (queryName.includes("cms.getSettings")) {
    return { ...globalSettings };
  }

  // cms.listPracticeAreas
  if (queryName.includes("cms.listPracticeAreas")) {
    if (args?.isActive) {
      return globalPracticeAreas.filter(pa => pa.isActive);
    }
    return [...globalPracticeAreas];
  }

  // cms.listBlogPosts
  if (queryName.includes("cms.listBlogPosts")) {
    return [...globalBlogPosts];
  }

  // cms.getBlogPostBySlug
  if (queryName.includes("cms.getBlogPostBySlug")) {
    return globalBlogPosts.find(bp => bp.slug === args?.slug) || null;
  }

  // settings.getSystemSettings
  if (queryName.includes("settings.getSystemSettings")) {
    return { ...globalSystemSettings };
  }

  // cms.listTestimonials
  if (queryName.includes("cms.listTestimonials")) {
    if (args?.isApproved) {
      return globalTestimonials.filter(t => t.isApproved);
    }
    return [...globalTestimonials];
  }

  // cms.listPublicTeam
  if (queryName.includes("cms.listPublicTeam")) {
    return globalUsers.filter(u => u.isPublicFacing && (u.role === "partner" || u.role === "senior_associate" || u.role === "associate"));
  }

  // getFileUrl
  if (queryName.includes("getFileUrl")) {
    // In our mock, if the storageId looks like a blob URL (created via URL.createObjectURL),
    // we return it directly so the browser can download/open it.
    // For initial seed documents ("mock-storage-X"), we just return a fake string.
    return args?.storageId?.startsWith("blob:") ? args.storageId : `https://mock-file-storage.local/${args?.storageId}`;
  }

  return undefined;
}

// useMutation mock implementation
export function useMutation(mutationFunc: any): any {
  const mutationName = typeof mutationFunc === "string" ? mutationFunc : String(mutationFunc);

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
      const idx = globalTemplates.findIndex(t => t._id === args.id);
      if (idx !== -1) {
        globalTemplates[idx] = { ...globalTemplates[idx], ...args };
        notifyListeners();
      }
    };
  }
  if (mutationName.includes("templates.deleteTemplate")) {
    return async (args: { id: string }) => {
      globalTemplates = globalTemplates.filter(t => t._id !== args.id);
      notifyListeners();
    };
  }

  // RESEARCH NOTES
  if (mutationName.includes("research.createNote")) {
    return async (args: any) => {
      const newNote: LexResearchNote = {
        _id: `rn_${Date.now()}`,
        title: args.title,
        category: args.category,
        tags: args.tags || [],
        content: args.content,
        authorId: args.authorId,
        _creationTime: Date.now(),
      };
      globalResearchNotes.push(newNote);
      notifyListeners();
      return newNote._id;
    };
  }
  if (mutationName.includes("research.updateNote")) {
    return async (args: any) => {
      const idx = globalResearchNotes.findIndex(n => n._id === args.id);
      if (idx !== -1) {
        globalResearchNotes[idx] = { ...globalResearchNotes[idx], ...args };
        notifyListeners();
      }
    };
  }
  if (mutationName.includes("research.deleteNote")) {
    return async (args: { id: string }) => {
      globalResearchNotes = globalResearchNotes.filter(n => n._id !== args.id);
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
      const idx = globalExpenses.findIndex(e => e._id === args.id);
      if (idx !== -1) {
        globalExpenses[idx] = { ...globalExpenses[idx], status: args.status, approvedBy: args.approvedBy };
        notifyListeners();
      }
    };
  }
  if (mutationName.includes("expenses.delete")) {
    return async (args: { id: string }) => {
      globalExpenses = globalExpenses.filter(e => e._id !== args.id);
      notifyListeners();
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
      const activationToken = "setup_" + Math.random().toString(36).substring(2, 15);
      const newUser: LexUser = {
        _id: "u_" + Date.now(),
        isActive: true, // Keep it true so it doesn't show as suspended, but it's pending
        isPending: true,
        activationToken,
        ...args
      };
      globalUsers.push(newUser);
      notifyListeners();
      
      // Simulate Email Notification
      setTimeout(() => {
        toast.info(`📧 Email Sent: Invitation link delivered to ${args.email}`, {
          duration: 6000,
          description: `(MOCK) User must click link: http://localhost:3002/setup-account?token=${activationToken}`
        });
      }, 500);

      return newUser._id;
    }

    // users.activateAccount
    if (mutationName.includes("activateAccount")) {
      const { token, password } = args;
      const userIndex = globalUsers.findIndex(u => u.activationToken === token);
      if (userIndex === -1) {
        throw new Error("Invalid or expired activation link");
      }
      
      // In a real app we'd hash the password and clear the token.
      globalUsers[userIndex] = {
        ...globalUsers[userIndex],
        isPending: false,
        activationToken: undefined
      };
      notifyListeners();
      return { success: true };
    }

    // HR Mutations
    if (mutationName.includes("reviewLeaveRequest")) {
      const { leaveRequestId, status } = args;
      const leave = globalLeaveRequests.find(l => l._id === leaveRequestId);
      if (leave) { leave.status = status; }
      notifyListeners();
      return { success: true };
    }
    if (mutationName.includes("upsertAttendance")) {
      const { userId, date, status } = args;
      const existingIndex = globalAttendance.findIndex(a => a.userId === userId && a.date === date);
      if (existingIndex > -1) {
        globalAttendance[existingIndex].status = status;
      } else {
        globalAttendance.push({ _id: "att_" + Date.now(), userId, date, status, checkIn: "09:00 AM" });
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
      const newItem = { _id: "apt_" + Date.now(), _creationTime: Date.now(), status: "pending", ...args };
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
        message: `${args.clientName} requested an appointment for ${args.practiceArea}.`,
        isRead: false,
        link: "/admin/appointments",
        _creationTime: Date.now()
      });

      notifyListeners();
      return newItem._id;
    }

    if (mutationName.includes("updateAppointmentStatus")) {
      const { id, status, meetingLink } = args;
      const aptIndex = globalAppointments.findIndex(a => a._id === id);
      if (aptIndex > -1) {
        globalAppointments[aptIndex] = { ...globalAppointments[aptIndex], status, meetingLink };
        
        if (status === "confirmed") {
          const apt = globalAppointments[aptIndex];
          // Simulate Email/SMS to user
          toast("📧 Mock Email/SMS Sent", {
            description: `To ${apt.clientName}: Your appointment is CONFIRMED for ${apt.date} at ${apt.timeSlot}.${meetingLink ? ' Link: ' + meetingLink : ''}`,
            duration: 8000,
          });

          // Add a notification for the client (if they have an account, for mock we just assume u_3 is a client)
          globalNotifications.push({
            _id: "notif_" + Date.now(),
            userId: "u_3",
            title: "Appointment Confirmed",
            message: `Your appointment on ${apt.date} at ${apt.timeSlot} has been confirmed.`,
            isRead: false,
            link: "/client/appointments",
            _creationTime: Date.now()
          });
        }
      }
      notifyListeners();
      return { success: true };
    }

    if (mutationName.includes("assignLawyerToAppointment")) {
      const { id, assignedLawyerId } = args;
      const apt = globalAppointments.find(a => a._id === id);
      if (apt) { apt.assignedLawyerId = assignedLawyerId; }
      notifyListeners();
      return { success: true };
    }

    // Notifications
    if (mutationName.includes("notifications.markRead")) {
      const notif = globalNotifications.find(n => n._id === args.notificationId);
      if (notif) { notif.isRead = true; }
      notifyListeners();
      return { success: true };
    }

    if (mutationName.includes("notifications.markAllRead")) {
      // mark all for current user? in mock we mark all true
      globalNotifications.forEach(n => n.isRead = true);
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
      globalTestimonials = globalTestimonials.map(t => t._id === id ? { ...t, ...updates } : t);
      notifyListeners();
      return { success: true };
    }
    if (mutationName.includes("deleteTestimonial")) {
      globalTestimonials = globalTestimonials.filter(t => t._id !== args.id);
      notifyListeners();
      return { success: true };
    }

    // Chatbots / Leads
    if (mutationName.includes("chatbots.submitLead")) {
      const newItem = { 
        _id: "lead_" + Date.now(), 
        _creationTime: Date.now(), 
        status: "new",
        source: "website",
        ...args 
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
      globalPracticeAreas = globalPracticeAreas.map(t => t._id === id ? { ...t, ...updates } : t);
      notifyListeners();
      return { success: true };
    }
    if (mutationName.includes("deletePracticeArea")) {
      globalPracticeAreas = globalPracticeAreas.filter(t => t._id !== args.id);
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
      globalBlogPosts = globalBlogPosts.map(t => t._id === id ? { ...t, ...updates } : t);
      notifyListeners();
      return { success: true };
    }
    if (mutationName.includes("deleteBlogPost")) {
      globalBlogPosts = globalBlogPosts.filter(t => t._id !== args.id);
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
      // Mock validating old password and setting new password
      return { success: true };
    }

    // users.toggle2FA
    if (mutationName.includes("toggle2FA")) {
      const { userId, enabled } = args;
      globalUsers = globalUsers.map((user) => {
        if (user._id === userId) {
          return { ...user, twoFactorEnabled: enabled };
        }
        return user;
      });
      notifyListeners();
      return { success: true };
    }

    // users.revokeSession
    if (mutationName.includes("revokeSession")) {
      const { sessionId } = args;
      globalSessions = globalSessions.filter(s => s._id !== sessionId);
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
      const idx = globalLeads.findIndex(l => l._id === args.leadId);
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
      const idx = globalLeads.findIndex(l => l.intakeToken === args.token);
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
        globalLeads[idx] = { ...lead, intakeSubmitted: true, fullName: args.fullName, email: args.email, phone: args.phone };
        notifyListeners();
        return { success: true };
      }
      throw new Error("Invalid or expired intake token");
    }

    // appointments.bookConsultation
    if (mutationName.includes("bookConsultation")) {
      const newApt: LexAppointment = {
        _id: `apt_${Date.now()}`,
        clientId: args.clientId,
        lawyerId: args.lawyerId,
        date: args.date,
        time: args.time,
        type: args.type,
        status: "scheduled",
        notes: args.notes,
        _creationTime: Date.now(),
      };
      globalAppointments.push(newApt);
      notifyListeners();
      return newApt._id;
    }

    // clients.createClient
    if (mutationName.includes("createClient")) {
      const newClient: LexClient = {
        _id: "c_" + Date.now(),
        kycStatus: "pending",
        isActive: true,
        ...args
      };
      globalClients.push(newClient);
      notifyListeners();
      return newClient._id;
    }

    // cases.markConflictChecked
    if (mutationName.includes("markConflictChecked")) {
      const idx = globalCases.findIndex(c => c._id === args.caseId);
      if (idx !== -1) {
        globalCases[idx] = { ...globalCases[idx], conflictChecked: true, conflictClearedBy: args.clearedBy };
        notifyListeners();
      }
      return { success: true };
    }

    // clients.updateClient
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
        ...args
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
        ...args
      };
      globalHearings.push(newHearing);
      notifyListeners();
      return newHearing._id;
    }

    // hearings.updateHearing
    if (mutationName.includes("updateHearing")) {
      const { hearingId, ...updates } = args;
      const hIndex = globalHearings.findIndex(h => h._id === hearingId);
      if (hIndex === -1) return { success: false };

      globalHearings[hIndex] = { ...globalHearings[hIndex], ...updates };

      // Notification trigger: Alert client when hearing is modified
      const theCase = globalCases.find(c => c._id === globalHearings[hIndex].caseId);
      if (theCase) {
        globalNotifications.push({
          _id: "notif_" + Date.now(),
          userId: theCase.clientId,
          title: "Hearing Updated",
          message: `The hearing for ${theCase.title} has been updated.`,
          type: "alert",
          isRead: false,
          link: "/client/matters",
          _creationTime: Date.now()
        });
      }

      notifyListeners();
      return { success: true };
    }

    // tasks.createTask
    if (mutationName.includes("createTask")) {
      const newTask: LexTask = {
        _id: "t_" + Date.now(),
        status: "todo",
        isRecurring: false,
        createdBy: "u1",
        ...args
      };
      globalTasks.push(newTask);
      notifyListeners();
      return newTask._id;
    }

    // tasks.updateTask
    if (mutationName.includes("updateTask")) {
      const { taskId, ...updates } = args;
      globalTasks = globalTasks.map((t) => {
        if (t._id === taskId) {
          return { ...t, ...updates };
        }
        return t;
      });
      notifyListeners();
      return { success: true };
    }

    // tasks.deleteTask
    if (mutationName.includes("deleteTask")) {
      const { taskId } = args;
      globalTasks = globalTasks.filter((t) => t._id !== taskId);
      notifyListeners();
      return { success: true };
    }

    // timeEntries.createTimeEntry
    if (mutationName.includes("createTimeEntry")) {
      const newEntry: LexTimeEntry = {
        _id: "time_" + Date.now(),
        userId: "u2",
        ...args
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
      const theCase = globalCases.find(c => c._id === args.caseId);
      if (theCase) {
        const sender = globalUsers.find(u => u._id === args.senderId);
        const senderClient = globalClients.find(c => c._id === args.senderId);
        const senderName = sender ? sender.name : (senderClient ? senderClient.fullName : "Someone");
        
        // If staff sent a message, alert the client (unless it's internal)
        if (sender && !args.isInternal) {
          globalNotifications.push({
            _id: "notif_" + Date.now(),
            userId: theCase.clientId,
            title: "New Message",
            message: `${senderName} sent you a message regarding ${theCase.title}.`,
            type: "info",
            isRead: false,
            link: "/client/messages",
            _creationTime: Date.now()
          });
        } 
        // If client sent a message, alert the assigned lawyer
        else if (senderClient) {
          globalNotifications.push({
            _id: "notif_" + Date.now(),
            userId: theCase.assignedLawyerId,
            title: "New Client Message",
            message: `${senderName} sent a message regarding ${theCase.title}.`,
            type: "info",
            isRead: false,
            link: "/staff/cases",
            _creationTime: Date.now()
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
      globalLeads = globalLeads.map((l) => l._id === leadId ? { ...l, ...updates } : l);
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
        l._id === leadId ? { ...l, status: "converted" as const, convertedClientId: newClientId } : l
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
          a.userId === userId && a.date === date ? { ...a, ...rest } : a
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
        lr._id === leaveRequestId ? { ...lr, status, reviewedBy: reviewer._id } : lr
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
        ...args,
      };
      globalDocuments.push(newDoc);
      notifyListeners();
      return newDoc._id;
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
      const unbilled = globalTimeEntries.filter((t) => t.caseId === caseId && t.isBillable && !t.invoiceId);
      if (unbilled.length === 0) return { success: false, message: "No unbilled entries found." };

      const subtotal = unbilled.reduce((sum, t) => sum + (t.minutes / 60) * t.ratePerHour, 0);
      const vatAmount = subtotal * 0.13;
      const total = subtotal + vatAmount;

      const newInvoiceId = "inv_" + Date.now();
      const newInvoice: LexInvoice = {
        _id: newInvoiceId,
        invoiceNumber: "INV-" + new Date().getFullYear() + "-" + String(globalInvoices.length + 1).padStart(3, "0"),
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
        (t.caseId === caseId && t.isBillable && !t.invoiceId) ? { ...t, invoiceId: newInvoiceId } : t
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
      globalInvoices[invoiceIndex] = { ...invoice, status: "paid", paidDate: new Date().toISOString().split("T")[0] };

      // Record Trust Transaction
      const lastTx = globalTrustTransactions.filter(t => t.clientId === invoice.clientId).pop();
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
        approvedBy: "System"
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
        n.userId === userId ? { ...n, isRead: true } : n
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
      globalPracticeAreas = globalPracticeAreas.map(pa => pa._id === args.id ? { ...pa, ...args } : pa);
      notifyListeners();
      return { success: true };
    }

    // cms.deletePracticeArea
    if (mutationName.includes("cms.deletePracticeArea")) {
      globalPracticeAreas = globalPracticeAreas.filter(pa => pa._id !== args.id);
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
      globalBlogPosts = globalBlogPosts.map(bp => bp._id === args.id ? { ...bp, ...args } : bp);
      notifyListeners();
      return { success: true };
    }

    // cms.deleteBlogPost
    if (mutationName.includes("cms.deleteBlogPost")) {
      globalBlogPosts = globalBlogPosts.filter(bp => bp._id !== args.id);
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
      globalTestimonials = globalTestimonials.map(t => t._id === args.id ? { ...t, ...args } : t);
      notifyListeners();
      return { success: true };
    }

    // cms.deleteTestimonial
    if (mutationName.includes("cms.deleteTestimonial")) {
      globalTestimonials = globalTestimonials.filter(t => t._id !== args.id);
      notifyListeners();
      return { success: true };
    }

    // cms.updateTeamMember
    if (mutationName.includes("cms.updateTeamMember")) {
      globalUsers = globalUsers.map(u => u._id === args.id ? { ...u, ...args } : u);
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
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Navigation</span>
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
                    setTimeout(() => { window.location.href = "/client"; }, 50);
                  }}
                  className="px-2.5 py-1.5 rounded-md text-xs text-center font-medium bg-secondary hover:bg-secondary/80 border border-border cursor-pointer"
                >
                  Client Portal
                </button>
                <button
                  onClick={() => {
                    setConfig((prev) => ({ ...prev, activeRole: "partner" }));
                    setTimeout(() => { window.location.href = "/staff"; }, 50);
                  }}
                  className="px-2.5 py-1.5 rounded-md text-xs text-center font-medium bg-secondary hover:bg-secondary/80 border border-border cursor-pointer"
                >
                  Lex Workspace
                </button>
                <button
                  onClick={() => {
                    setConfig((prev) => ({ ...prev, activeRole: "admin" }));
                    setTimeout(() => { window.location.href = "/admin"; }, 50);
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
