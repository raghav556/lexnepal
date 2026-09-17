/**
 * Client portal projections. These are allowlists, not Staff DTOs with fields deleted.
 * Anything omitted is private. Do not spread source rows into these objects.
 */

export interface ClientAdvocateDto {
  id: string;
  name: string | null;
  email: string | null;
}

export interface ClientPartyDto {
  id: string;
  name: string;
  side: "our_side" | "opposing" | "other";
  roleLabel: string | null;
  partyType: "person" | "organisation";
}

export interface ClientCaseDto {
  id: string;
  _id: string;
  caseNumber: string;
  title: string;
  clientSummary: string | null;
  status: string;
  practiceArea: string;
  court: string | null;
  assignedLawyerId: string;
  advocate: ClientAdvocateDto;
  parties: ClientPartyDto[];
}

export interface ClientCrmDto {
  id: string;
  _id: string;
  type: "individual" | "corporate";
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  companyName: string | null;
  kycStatus: "pending" | "submitted" | "verified" | "rejected";
  kycRejectionReason: string | null;
}

export const CLIENT_CASE_KEYS = [
  "id",
  "_id",
  "caseNumber",
  "title",
  "clientSummary",
  "status",
  "practiceArea",
  "court",
  "assignedLawyerId",
  "advocate",
  "parties",
] as const;

export const CLIENT_CRM_KEYS = [
  "id",
  "_id",
  "type",
  "fullName",
  "email",
  "phone",
  "address",
  "companyName",
  "kycStatus",
  "kycRejectionReason",
] as const;

export const CLIENT_CASE_FORBIDDEN_KEYS = [
  "description",
  "notes",
  "teamMemberIds",
  "opposingCounsel",
  "judge",
  "clientId",
  "filingDate",
  "closedDate",
  "closureOutcome",
  "client",
  "lawyer",
] as const;

export const CLIENT_CRM_FORBIDDEN_KEYS = [
  "notes",
  "kycIdNumber",
  "kycConsentVersion",
  "kycConsentAt",
  "registrationNumber",
  "userId",
  "isActive",
] as const;

function asId(row: Record<string, unknown>): string {
  return String(row.id ?? row._id ?? "");
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value);
  return text.length === 0 ? null : text;
}

export function toClientPartyDto(row: Record<string, unknown>): ClientPartyDto {
  const side =
    row.side === "our_side" || row.side === "opposing" || row.side === "other" ? row.side : "other";
  const partyType = row.partyType === "organisation" ? "organisation" : "person";
  return {
    id: asId(row),
    name: String(row.name ?? ""),
    side,
    roleLabel: asNullableString(row.roleLabel),
    partyType,
  };
}

export function toClientCaseDto(
  row: Record<string, unknown>,
  advocate?: { id?: string; _id?: string; name?: string | null; email?: string | null } | null,
  parties: readonly ClientPartyDto[] = [],
): ClientCaseDto {
  const id = asId(row);
  const assignedLawyerId = String(row.assignedLawyerId ?? advocate?.id ?? advocate?._id ?? "");
  const advocateId = String(advocate?.id ?? advocate?._id ?? assignedLawyerId);
  const rawStatus = String(row.status ?? "");
  return {
    id,
    _id: id,
    caseNumber: String(row.caseNumber ?? ""),
    title: String(row.title ?? ""),
    clientSummary: row.clientSummary == null ? null : String(row.clientSummary),
    status: rawStatus === "closed_won" || rawStatus === "closed_lost" ? "closed" : rawStatus,
    practiceArea: String(row.practiceArea ?? ""),
    court: asNullableString(row.court),
    assignedLawyerId,
    advocate: {
      id: advocateId,
      name: advocate?.name ?? null,
      email: advocate?.email ?? null,
    },
    parties: parties.map((party) => toClientPartyDto(party as unknown as Record<string, unknown>)),
  };
}

const KYC_STATUSES = new Set(["pending", "submitted", "verified", "rejected"]);

export function toClientCrmDto(row: Record<string, unknown>): ClientCrmDto {
  const id = asId(row);
  const type = row.type === "corporate" ? "corporate" : "individual";
  const kycStatus = KYC_STATUSES.has(String(row.kycStatus))
    ? (row.kycStatus as ClientCrmDto["kycStatus"])
    : "pending";
  return {
    id,
    _id: id,
    type,
    fullName: String(row.fullName ?? ""),
    email: asNullableString(row.email),
    phone: asNullableString(row.phone),
    address: asNullableString(row.address),
    companyName: asNullableString(row.companyName),
    kycStatus,
    kycRejectionReason: asNullableString(row.kycRejectionReason),
  };
}
