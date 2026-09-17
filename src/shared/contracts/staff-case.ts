import type { CaseDto } from "@/shared/contracts/domains";

export interface StaffCasePartyDto {
  id: string;
  _id: string;
  caseId: string;
  name: string;
  side: "our_side" | "opposing" | "other";
  roleLabel: string | null;
  partyType: "person" | "organisation";
  clientId: string | null;
  sortOrder: number;
  clientVisible: boolean;
}

function asId(row: Record<string, unknown>): string {
  return String(row.id ?? row._id ?? "");
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value);
  return text.length === 0 ? null : text;
}

function asIso(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  return String(value);
}

const SIDES = new Set(["our_side", "opposing", "other"]);
const TYPES = new Set(["person", "organisation"]);

export function toStaffPartyDto(row: Record<string, unknown>): StaffCasePartyDto {
  const id = asId(row);
  const side = SIDES.has(String(row.side)) ? (row.side as StaffCasePartyDto["side"]) : "other";
  const partyType = TYPES.has(String(row.partyType))
    ? (row.partyType as StaffCasePartyDto["partyType"])
    : "person";
  return {
    id,
    _id: id,
    caseId: String(row.caseId ?? ""),
    name: String(row.name ?? ""),
    side,
    roleLabel: asNullableString(row.roleLabel),
    partyType,
    clientId: asNullableString(row.clientId),
    sortOrder: Number(row.sortOrder ?? 0),
    clientVisible: Boolean(row.clientVisible),
  };
}

export function toStaffCaseDto(
  row: Record<string, unknown>,
  extras: {
    teamMemberIds: string[];
    parties?: StaffCasePartyDto[];
    nextHearing?: string | null;
    nextTaskDue?: string | null;
    client?: unknown;
    lawyer?: unknown;
  },
): CaseDto {
  const id = asId(row);
  const dto: CaseDto = {
    id,
    _id: id,
    caseNumber: String(row.caseNumber ?? ""),
    title: String(row.title ?? ""),
    description: row.description == null ? undefined : String(row.description),
    clientSummary: row.clientSummary == null ? null : String(row.clientSummary),
    practiceArea: String(row.practiceArea ?? ""),
    status: String(row.status ?? ""),
    closureOutcome: row.closureOutcome == null ? null : String(row.closureOutcome),
    clientId: String(row.clientId ?? ""),
    assignedLawyerId: String(row.assignedLawyerId ?? ""),
    teamMemberIds: extras.teamMemberIds,
    court: asNullableString(row.court),
    judge: asNullableString(row.judge),
    opposingCounsel: asNullableString(row.opposingCounsel),
    filingDate: asIso(row.filingDate),
    closedDate: asIso(row.closedDate),
    createdAt: asIso(row.createdAt) ?? undefined,
    updatedAt: asIso(row.updatedAt) ?? undefined,
    parties: extras.parties ?? [],
    nextHearing: extras.nextHearing ?? null,
    nextTaskDue: extras.nextTaskDue ?? null,
  };
  if (extras.client !== undefined) dto.client = extras.client;
  if (extras.lawyer !== undefined) dto.lawyer = extras.lawyer;
  return dto;
}
