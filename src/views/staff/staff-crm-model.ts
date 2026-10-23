import { leadCreateSchema, type LeadCreateInput } from "@/shared/contracts/crm";

export const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "consultation_scheduled", label: "Consultation scheduled" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
] as const;

export const LEAD_TABS = [{ value: "all", label: "All leads" }, ...LEAD_STATUS_OPTIONS] as const;

export const LEAD_SOURCE_OPTIONS: Array<{ value: LeadCreateInput["source"]; label: string }> = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone" },
  { value: "social", label: "Social" },
  { value: "newsletter", label: "Newsletter" },
];

export type StaffLead = {
  id?: string;
  _id?: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  status: string;
  practiceAreaInterest?: string | null;
  message?: string | null;
  notes?: string | null;
  assignedTo?: string | null;
  intakeToken?: string | null;
  intakeSubmitted?: boolean;
  convertedClientId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type StaffAppointment = {
  id?: string;
  _id?: string;
  date?: string | null;
  timeSlot?: string | null;
  status?: string | null;
  practiceArea?: string | null;
};

export function leadKey(lead: StaffLead): string {
  return String(lead.id ?? lead._id ?? "");
}

export function leadInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "—";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function leadStatusLabel(status: string): string {
  return LEAD_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

export function leadSourceLabel(source?: string | null): string {
  if (!source) return "—";
  return LEAD_SOURCE_OPTIONS.find((item) => item.value === source)?.label ?? source;
}

export function leadKpis(leads: StaffLead[]) {
  return {
    total: leads.length,
    fresh: leads.filter((lead) => lead.status === "new").length,
    consultations: leads.filter((lead) => lead.status === "consultation_scheduled").length,
    converted: leads.filter((lead) => lead.status === "converted").length,
  };
}

export function filterStaffLeads(
  leads: StaffLead[],
  filters: { tab: string; practiceArea: string; unassignedOnly: boolean },
): StaffLead[] {
  return leads.filter((lead) => {
    if (filters.tab !== "all" && lead.status !== filters.tab) return false;
    if (
      filters.practiceArea !== "all" &&
      (lead.practiceAreaInterest || "") !== filters.practiceArea
    ) {
      return false;
    }
    if (filters.unassignedOnly && lead.assignedTo) return false;
    return true;
  });
}

const LEAD_FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  practiceAreaInterest: "Practice area",
  message: "Message",
  source: "Source",
  assignedTo: "Assignee",
  notes: "Internal notes",
};

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function buildStaffLeadCreatePayload(
  form: {
    fullName: string;
    email: string;
    phone: string;
    source: string;
    practiceAreaInterest: string;
    assignedTo: string;
    notes: string;
    message: string;
  },
  options: { canAssign: boolean },
): { ok: true; payload: LeadCreateInput } | { ok: false; message: string } {
  const assignedTo = options.canAssign
    ? form.assignedTo === "unassigned" || form.assignedTo === ""
      ? null
      : form.assignedTo
    : undefined;
  const parsed = leadCreateSchema.safeParse({
    fullName: form.fullName.trim(),
    email: optionalText(form.email),
    phone: optionalText(form.phone),
    source: form.source,
    practiceAreaInterest: optionalText(form.practiceAreaInterest),
    assignedTo,
    notes: optionalText(form.notes),
    message: optionalText(form.message),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue?.path[0] ?? "");
    const label = LEAD_FIELD_LABELS[field] ?? "Lead";
    if (field === "assignedTo")
      return { ok: false, message: "Choose a staff member or Unassigned." };
    if (field === "source") return { ok: false, message: "Choose a valid lead source." };
    if (issue?.code === "too_big") {
      return {
        ok: false,
        message: `${label} must be ${String(issue.maximum)} characters or fewer.`,
      };
    }
    if (issue?.code === "too_small") return { ok: false, message: `${label} is required.` };
    return { ok: false, message: `${label} is not valid.` };
  }
  return { ok: true, payload: parsed.data };
}

export function leadCsvRows(leads: StaffLead[], staffName: (id?: string | null) => string) {
  return leads.map((lead) => [
    lead.fullName ?? "",
    lead.email ?? "",
    lead.phone ?? "",
    lead.status ?? "",
    lead.source ?? "",
    lead.practiceAreaInterest ?? "",
    staffName(lead.assignedTo),
    lead.updatedAt || lead.createdAt || "",
    lead.intakeSubmitted ? "submitted" : lead.intakeToken ? "link" : "",
    lead.convertedClientId ?? "",
  ]);
}
