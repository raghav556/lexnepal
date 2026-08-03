export interface DocumentDto {
  _id: string;
  firmId?: string;
  caseId?: string;
  title: string;
  description?: string;
  type: string;
  storageId: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  isTemplate?: boolean;
  isPrivileged?: boolean;
  confidentialityLevel?: string;
  isDeleted?: boolean;
  tags?: string[];
  [key: string]: unknown;
}

export interface CaseDto {
  _id: string;
  firmId?: string;
  caseNumber: string;
  title: string;
  description?: string;
  practiceArea: string;
  status: string;
  clientId: string;
  assignedLawyerId: string;
  teamMemberIds: string[];
  court?: string | null;
  judge?: string | null;
  opposingCounsel?: string | null;
  filingDate?: string | null;
  closedDate?: string | null;
  conflictChecked?: boolean;
  conflictClearedBy?: string | null;
  [key: string]: unknown;
}

export interface ClientDto {
  _id: string;
  userId?: string | null;
  type: "individual" | "corporate";
  fullName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  companyName?: string | null;
  registrationNumber?: string | null;
  kycStatus: "pending" | "submitted" | "verified" | "rejected";
  kycIdNumber?: string | null;
  kycRejectionReason?: string | null;
  notes?: string | null;
  isActive: boolean;
  [key: string]: unknown;
}

export interface ConflictHitDto {
  type: string;
  id: string;
  name: string;
  reason: string;
  caseId?: string;
  caseNumber?: string;
}

export interface TaskDto {
  _id: string;
  firmId?: string;
  caseId?: string;
  title: string;
  description?: string;
  assignedTo: string;
  status: string;
  priority: string;
  archivedAt?: string;
  [key: string]: unknown;
}

export interface ListDocumentsInput {
  caseId?: string;
  isTemplate?: boolean;
  inTrash?: boolean;
}

export interface SearchDocumentsInput {
  query: string;
  caseId?: string;
  type?: string;
  tag?: string;
  generalOnly?: boolean;
}

export interface ListCasesInput {
  status?: string;
  clientId?: string;
  lawyerId?: string;
}

export interface ListTasksInput {
  includeArchived?: boolean;
  caseId?: string;
  assignedTo?: string;
}
