import { clientCreateSchema, clientStaffUpdateSchema } from "@/shared/contracts/matters";

export const CLIENT_KYC_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
] as const;

export const CLIENT_STATUS_CHIPS = [
  { value: "all", label: "All clients" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export type StaffClient = {
  id?: string;
  _id?: string;
  type: "individual" | "corporate";
  fullName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  companyName?: string | null;
  registrationNumber?: string | null;
  kycStatus: "pending" | "submitted" | "verified" | "rejected";
  kycRejectionReason?: string | null;
  notes?: string | null;
  isActive?: boolean;
  userId?: string | null;
  createdAt?: string | null;
};

export type StaffClientMatter = {
  id?: string;
  _id?: string;
  clientId?: string | null;
  title?: string | null;
  caseNumber?: string | null;
  status?: string | null;
  practiceArea?: string | null;
};

export type StaffClientAppointment = {
  date?: string | null;
  timeSlot?: string | null;
  status?: string | null;
  practiceArea?: string | null;
};

export type StaffClientForm = {
  fullName: string;
  type: "individual" | "corporate";
  email: string;
  phone: string;
  address: string;
  companyName: string;
  registrationNumber: string;
  notes: string;
};

export type StaffClientFilters = {
  query: string;
  type: "all" | "individual" | "corporate";
  status: "all" | "active" | "inactive";
  kyc: "all" | StaffClient["kycStatus"];
  portal: "all" | "linked" | "none";
  practiceArea: string;
};

const FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  address: "Address",
  companyName: "Company name",
  registrationNumber: "Registration number",
  notes: "Internal notes",
  type: "Client type",
};

export function emptyStaffClientForm(): StaffClientForm {
  return {
    fullName: "",
    type: "individual",
    email: "",
    phone: "",
    address: "",
    companyName: "",
    registrationNumber: "",
    notes: "",
  };
}

export function staffClientForm(client: StaffClient): StaffClientForm {
  return {
    fullName: client.fullName ?? "",
    type: client.type === "corporate" ? "corporate" : "individual",
    email: client.email ?? "",
    phone: client.phone ?? "",
    address: client.address ?? "",
    companyName: client.companyName ?? "",
    registrationNumber: client.registrationNumber ?? "",
    notes: client.notes ?? "",
  };
}

export function clientKey(client: { id?: string; _id?: string }): string {
  return String(client.id ?? client._id ?? "");
}

export function matterKey(matter: StaffClientMatter): string {
  return String(matter.id ?? matter._id ?? "");
}

export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "—";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function clientKycLabel(status: string): string {
  return CLIENT_KYC_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

export function clientIsActive(client: StaffClient): boolean {
  return client.isActive !== false;
}

export function activeMatterCounts(matters: StaffClientMatter[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const matter of matters) {
    if (matter.status !== "active") continue;
    const id = String(matter.clientId ?? "");
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export function clientPracticeAreas(matters: StaffClientMatter[]): string[] {
  return [
    ...new Set(matters.map((matter) => matter.practiceArea?.trim() ?? "").filter(Boolean)),
  ].sort((left, right) => left.localeCompare(right));
}

export function mattersForClient(
  matters: StaffClientMatter[],
  clientId: string,
): StaffClientMatter[] {
  return matters.filter((matter) => String(matter.clientId ?? "") === clientId);
}

export function filterStaffClients(
  clients: StaffClient[],
  matters: StaffClientMatter[],
  filters: StaffClientFilters,
): StaffClient[] {
  const query = filters.query.trim().toLowerCase();
  const practiceByClient = new Map<string, Set<string>>();
  if (filters.practiceArea !== "all") {
    for (const matter of matters) {
      const id = String(matter.clientId ?? "");
      const area = matter.practiceArea?.trim() ?? "";
      if (!id || !area) continue;
      const areas = practiceByClient.get(id) ?? new Set<string>();
      areas.add(area);
      practiceByClient.set(id, areas);
    }
  }
  return clients.filter((client) => {
    const id = clientKey(client);
    if (query) {
      const haystack = [
        client.fullName,
        client.email,
        client.phone,
        client.address,
        client.companyName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (filters.type !== "all" && client.type !== filters.type) return false;
    if (filters.status === "active" && !clientIsActive(client)) return false;
    if (filters.status === "inactive" && clientIsActive(client)) return false;
    if (filters.kyc !== "all" && client.kycStatus !== filters.kyc) return false;
    if (filters.portal === "linked" && !client.userId) return false;
    if (filters.portal === "none" && client.userId) return false;
    if (filters.practiceArea !== "all" && !practiceByClient.get(id)?.has(filters.practiceArea))
      return false;
    return true;
  });
}

export function clientKpis(clients: StaffClient[], matters: StaffClientMatter[], now = new Date()) {
  const counts = activeMatterCounts(matters);
  const month = now.getMonth();
  const year = now.getFullYear();
  let activeMatters = 0;
  let kycPending = 0;
  let createdThisMonth = 0;
  for (const client of clients) {
    activeMatters += counts.get(clientKey(client)) ?? 0;
    if (client.kycStatus === "pending") kycPending += 1;
    if (!client.createdAt) continue;
    const created = new Date(client.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    if (created.getFullYear() === year && created.getMonth() === month) createdThisMonth += 1;
  }
  return {
    total: clients.length,
    activeMatters,
    kycPending,
    createdThisMonth,
  };
}

export function nextClientAppointment(
  appointments: StaffClientAppointment[],
  today: string,
): StaffClientAppointment | null {
  const upcoming = appointments
    .filter((item) => {
      if (!item.date || item.date < today) return false;
      return item.status !== "cancelled" && item.status !== "completed";
    })
    .sort((left, right) =>
      `${left.date ?? ""} ${left.timeSlot ?? ""}`.localeCompare(
        `${right.date ?? ""} ${right.timeSlot ?? ""}`,
      ),
    );
  return upcoming[0] ?? null;
}

export const CLIENT_CSV_HEADERS = [
  "Name",
  "Type",
  "Email",
  "Phone",
  "Address",
  "Company",
  "Registration",
  "KYC",
  "Portal",
  "Active matters",
  "Status",
] as const;

export function clientCsvRows(clients: StaffClient[], matters: StaffClientMatter[]): string[][] {
  const counts = activeMatterCounts(matters);
  return clients.map((client) => [
    client.fullName ?? "",
    client.type ?? "",
    client.email ?? "",
    client.phone ?? "",
    client.address ?? "",
    client.companyName ?? "",
    client.registrationNumber ?? "",
    client.kycStatus ?? "",
    client.userId ? "linked" : "none",
    String(counts.get(clientKey(client)) ?? 0),
    clientIsActive(client) ? "active" : "inactive",
  ]);
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function validationMessage(
  field: string,
  issue: { code?: string; maximum?: unknown; message?: string },
): string {
  const label = FIELD_LABELS[field] ?? "Client";
  if (field === "companyName") return "Company name is required for a corporate client.";
  if (field === "email") return "Enter a valid email address.";
  if (issue.code === "too_big") {
    const maximum = typeof issue.maximum === "number" ? String(issue.maximum) : "the limit";
    return `${label} must be ${maximum} characters or fewer.`;
  }
  if (issue.code === "too_small") return `${label} is required.`;
  return issue.message ? `${label}: ${issue.message}` : `${label} is not valid.`;
}

export function buildStaffClientCreatePayload(
  form: StaffClientForm,
): { ok: true; payload: Record<string, unknown> } | { ok: false; field: string; message: string } {
  const parsed = clientCreateSchema.safeParse({
    type: form.type,
    fullName: form.fullName.trim(),
    email: optionalText(form.email),
    phone: optionalText(form.phone),
    address: optionalText(form.address),
    companyName: form.type === "corporate" ? optionalText(form.companyName) : undefined,
    registrationNumber:
      form.type === "corporate" ? optionalText(form.registrationNumber) : undefined,
    notes: optionalText(form.notes),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue?.path[0] ?? "fullName");
    return { ok: false, field, message: validationMessage(field, issue ?? {}) };
  }
  return { ok: true, payload: parsed.data };
}

export function buildStaffClientUpdatePayload(
  form: StaffClientForm,
): { ok: true; payload: Record<string, unknown> } | { ok: false; field: string; message: string } {
  if (form.type === "corporate" && !form.companyName.trim()) {
    return {
      ok: false,
      field: "companyName",
      message: "Company name is required for a corporate client.",
    };
  }
  const parsed = clientStaffUpdateSchema.safeParse({
    type: form.type,
    fullName: form.fullName.trim(),
    email: form.email.trim() ? form.email.trim() : null,
    phone: form.phone.trim() ? form.phone.trim() : null,
    address: form.address.trim() ? form.address.trim() : null,
    notes: form.notes.trim() ? form.notes.trim() : null,
    companyName: form.type === "corporate" ? form.companyName.trim() : null,
    registrationNumber: form.type === "corporate" ? form.registrationNumber.trim() || null : null,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue?.path[0] ?? "fullName");
    return { ok: false, field, message: validationMessage(field, issue ?? {}) };
  }
  return { ok: true, payload: parsed.data };
}
