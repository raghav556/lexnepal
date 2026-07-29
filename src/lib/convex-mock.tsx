import React, { createContext, useContext, useState, useEffect } from "react";
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

// Initial mock databases
const INITIAL_USERS: LexUser[] = [
  { _id: "u1", name: "Ram Chandra", email: "ram@lexnepal.com", role: "partner", isActive: true, phone: "+977 9851012345", barCouncilNumber: "NPC-001234", barCouncilExpiry: "2083-05-15" },
  { _id: "u2", name: "Sita Thapa", email: "sita@lexnepal.com", role: "associate", isActive: true, phone: "+977 9841054321", barCouncilNumber: "NPC-005678", barCouncilExpiry: "2082-12-30" },
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
  { _id: "case1", caseNumber: "KTM/2081/234", title: "Property Dispute \u2014 Bhaktapur Plot 234", practiceArea: "Property Law", status: "active", clientId: "c1", assignedLawyerId: "u2", teamMemberIds: ["u2", "u1"], court: "District Court — Kathmandu", filingDate: "2026-01-10", conflictChecked: true },
  { _id: "case2", caseNumber: "PAT/2081/582", title: "Company Registration \u2014 TechVenture Pvt. Ltd.", practiceArea: "Corporate Law", status: "active", clientId: "c2", assignedLawyerId: "u1", teamMemberIds: ["u1"], court: "High Court — Patan", filingDate: "2026-02-15", conflictChecked: true },
  { _id: "case3", caseNumber: "KTM/2081/999", title: "Sharma vs. Kathmandu Municipality", practiceArea: "Civil Litigation", status: "on_hold", clientId: "c1", assignedLawyerId: "u2", teamMemberIds: ["u2"], court: "Supreme Court of Nepal", filingDate: "2026-03-01", conflictChecked: true }
];

const INITIAL_HEARINGS: LexHearing[] = [
  { _id: "h1", caseId: "case3", court: "Supreme Court of Nepal", dateGregorian: "2026-11-28", dateBs: "15 Mangsir 2083", time: "10:00 AM", purpose: "Final Hearing", status: "scheduled", notes: "Ensure all primary files are in order." },
  { _id: "h2", caseId: "case2", court: "High Court — Patan", dateGregorian: "2026-11-28", dateBs: "15 Mangsir 2083", time: "02:00 PM", purpose: "Interim Order Debate", status: "scheduled" },
  { _id: "h3", caseId: "case1", court: "District Court — Kathmandu", dateGregorian: "2026-11-29", dateBs: "16 Mangsir 2083", time: "11:00 AM", purpose: "Evidence Submission", status: "scheduled" }
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
  { _id: "lead2", fullName: "Srijana Thapa", phone: "+977 9851234567", email: "srijana@email.com", practiceAreaInterest: "Family Law", source: "referral", status: "contacted", _creationTime: Date.now() - 86400000 * 3 },
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
  { _id: "lr1", userId: "u2", type: "sick", fromDate: "2026-07-28", toDate: "2026-07-30", reason: "Medical leave — fever", status: "approved", reviewedBy: "u4" },
  { _id: "lr2", userId: "u5", type: "annual", fromDate: "2026-08-03", toDate: "2026-08-05", reason: "Family event", status: "pending" }
];

const INITIAL_AUDIT_LOG: LexAuditLog[] = [
  { _id: "al1", userId: "u2", action: "VIEW", resource: "documents", resourceId: "DOC-001", details: "Viewed: Property Title Deed — Plot 234", ipAddress: "192.168.1.14", _creationTime: Date.now() - 3600000 * 2 },
  { _id: "al2", userId: "u1", action: "CREATE", resource: "cases", resourceId: "KTM/2081/234", details: "Created new case: Property Dispute — Bhaktapur Plot 234", ipAddress: "192.168.1.10", _creationTime: Date.now() - 3600000 * 4 },
  { _id: "al3", userId: "u4", action: "UPDATE", resource: "users", resourceId: "u5", details: "Changed role: intern → paralegal", ipAddress: "192.168.1.1", _creationTime: Date.now() - 3600000 * 8 },
  { _id: "al4", userId: "u1", action: "SEND", resource: "invoices", resourceId: "INV-2081-001", details: "Sent invoice INV-2081-001 to Hari Prasad", ipAddress: "192.168.1.10", _creationTime: Date.now() - 86400000 },
  { _id: "al5", userId: "u2", action: "UPLOAD", resource: "documents", resourceId: "DOC-089", details: "Uploaded: Court Notice — Hearing 15 Mangsir", ipAddress: "192.168.1.14", _creationTime: Date.now() - 86400000 * 2 },
  { _id: "al6", userId: "u4", action: "DELETE", resource: "leads", resourceId: "lead5", details: "Marked lead Sunita Gurung as lost", ipAddress: "192.168.1.1", _creationTime: Date.now() - 86400000 * 3 }
];

const INITIAL_DOCUMENTS: LexDocument[] = [
  { _id: "doc1", caseId: "case1", title: "Sharma Appeal Petition", type: "pleading", storageId: "mock-storage-1", mimeType: "application/pdf", sizeBytes: 340000, tags: [], uploadedBy: "u2", isTemplate: false, isPrivileged: false, version: 2, _creationTime: Date.now() - 86400000 * 10 },
  { _id: "doc2", caseId: "case1", title: "Property Title Deed (Exhibit A)", type: "evidence", storageId: "mock-storage-2", mimeType: "image/jpeg", sizeBytes: 2100000, tags: [], uploadedBy: "u1", isTemplate: false, isPrivileged: false, version: 1, _creationTime: Date.now() - 86400000 * 5 },
  { _id: "doc3", caseId: "case1", title: "Client Retainer Agreement", type: "contract", storageId: "mock-storage-3", mimeType: "application/pdf", sizeBytes: 180000, tags: [], uploadedBy: "u4", isTemplate: false, isPrivileged: true, version: 1, _creationTime: Date.now() - 86400000 * 30 },
  { _id: "doc4", caseId: "case2", title: "TechVenture Trademark Certificate", type: "evidence", storageId: "mock-storage-4", mimeType: "application/pdf", sizeBytes: 890000, tags: [], uploadedBy: "u1", isTemplate: false, isPrivileged: false, version: 1, _creationTime: Date.now() - 86400000 * 20 }
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
  const stored = localStorage.getItem("lexnepal_preview_config");
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
  localStorage.setItem("lexnepal_preview_config", JSON.stringify(config));
};

// React Context for Preview Settings
const PreviewContext = createContext<{
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
export function useQuery(queryFunc: any, args: any): any {
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
    if (args?.clientId) {
      filtered = filtered.filter((i) => i.clientId === args.clientId);
    }
    if (args?.caseId) {
      filtered = filtered.filter((i) => i.caseId === args.caseId);
    }
    return filtered;
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
  if (queryName.includes("getDocument")) {
    return globalDocuments.find((d) => d._id === args?.documentId) || null;
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
      globalHearings = globalHearings.map((h) => {
        if (h._id === hearingId) {
          return { ...h, ...updates };
        }
        return h;
      });
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
      const config = getStoredConfig();
      const user = globalUsers.find((u) => u.role === config.activeRole) || globalUsers[0];
      const newMsg: LexMessage = {
        ...args,
        _id: "msg_" + Date.now(),
        senderId: user._id,
        readBy: [user._id],
        _creationTime: Date.now()
      };
      globalMessages.push(newMsg);
      notifyListeners();
      return newMsg._id;
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

    // leads.convertToClient — creates a client record and marks lead as converted
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
                <a
                  href="/client"
                  className="px-2.5 py-1.5 rounded-md text-xs text-center font-medium bg-secondary hover:bg-secondary/80 border border-border"
                >
                  Client Portal
                </a>
                <a
                  href="/staff"
                  className="px-2.5 py-1.5 rounded-md text-xs text-center font-medium bg-secondary hover:bg-secondary/80 border border-border"
                >
                  Staff Portal
                </a>
                <a
                  href="/admin"
                  className="px-2.5 py-1.5 rounded-md text-xs text-center font-medium bg-secondary hover:bg-secondary/80 border border-border"
                >
                  Admin Console
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
