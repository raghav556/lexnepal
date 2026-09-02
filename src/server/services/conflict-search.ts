import "server-only";
import { and, eq, isNull, like, or, sql } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { appointments, cases, clients, leads } from "@/server/db/schema";
import type {
  ConflictHitDto,
  ConflictHitSeverity,
  ConflictSearchResultDto,
  ConflictSearchScope,
} from "@/shared/contracts/conflicts";

const DEFAULT_SCOPE: ConflictSearchScope = {
  clients: true,
  cases: true,
  leads: true,
  appointments: true,
};

export function escapeLike(value: string) {
  return value.replace(/[%_\\]/g, "\\$&");
}

export function normalizeConflictQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}

function summarizeHits(hits: ConflictHitDto[]): ConflictSearchResultDto["summary"] {
  return {
    total: hits.length,
    high: hits.filter((h) => h.severity === "high").length,
    medium: hits.filter((h) => h.severity === "medium").length,
    low: hits.filter((h) => h.severity === "low").length,
  };
}

function dedupeHits(hits: ConflictHitDto[]) {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    const key = `${hit.type}:${hit.id}:${hit.caseId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rankHits(hits: ConflictHitDto[]) {
  const order: Record<ConflictHitSeverity, number> = { high: 0, medium: 1, low: 2 };
  return [...hits].sort(
    (a, b) => order[a.severity] - order[b.severity] || a.name.localeCompare(b.name),
  );
}

export async function runConflictSearch(
  firmId: string,
  rawQuery: string,
  scopeInput?: Partial<ConflictSearchScope>,
): Promise<ConflictSearchResultDto> {
  const query = normalizeConflictQuery(rawQuery);
  const scope = { ...DEFAULT_SCOPE, ...scopeInput };
  const pattern = `%${escapeLike(query)}%`;
  const tokens = query.split(" ").filter(Boolean);
  const tokenPatterns = tokens.map((t) => `%${escapeLike(t)}%`);
  const database = getDatabase();

  const hits: ConflictHitDto[] = [];

  const clientCaseCounts = new Map<string, number>();
  if (scope.clients || scope.cases) {
    const activeCases = await database
      .select({ clientId: cases.clientId, count: sql<number>`cast(count(*) as signed)` })
      .from(cases)
      .where(
        and(
          eq(cases.firmId, firmId),
          isNull(cases.deletedAt),
          sql`${cases.status} in ('inquiry', 'active', 'on_hold')`,
        ),
      )
      .groupBy(cases.clientId);
    for (const row of activeCases) {
      if (row.clientId) clientCaseCounts.set(row.clientId, row.count);
    }
  }

  if (scope.clients) {
    const clientRows = await database
      .select({
        id: clients.id,
        fullName: clients.fullName,
        companyName: clients.companyName,
        email: clients.email,
        phone: clients.phone,
        registrationNumber: clients.registrationNumber,
        kycIdNumber: clients.kycIdNumber,
        notes: clients.notes,
        isActive: clients.isActive,
      })
      .from(clients)
      .where(
        and(
          eq(clients.firmId, firmId),
          isNull(clients.deletedAt),
          or(
            like(clients.fullName, pattern),
            like(clients.companyName, pattern),
            like(clients.email, pattern),
            like(clients.phone, pattern),
            like(clients.registrationNumber, pattern),
            like(clients.kycIdNumber, pattern),
            like(clients.notes, pattern),
            ...(tokenPatterns.length > 1
              ? [
                  and(
                    ...tokenPatterns.map((tp) =>
                      or(
                        like(clients.fullName, tp),
                        like(clients.companyName, tp),
                        like(clients.email, tp),
                      ),
                    ),
                  ),
                ]
              : []),
          ),
        ),
      )
      .limit(100);

    for (const row of clientRows) {
      const matchedField = matchClientField(row, query, pattern);
      const relatedCaseCount = clientCaseCounts.get(row.id) ?? 0;
      hits.push({
        type: "Existing Client",
        id: row.id,
        clientId: row.id,
        name: row.companyName?.trim() || row.fullName,
        reason: row.companyName ? `${row.fullName} · ${row.companyName}` : row.fullName,
        matchedField,
        severity: relatedCaseCount > 0 ? "high" : row.isActive ? "medium" : "low",
        href: `/staff/clients`,
        recordStatus: row.isActive ? "Active client" : "Inactive client",
        relatedCaseCount,
      });

      if (row.kycIdNumber && row.kycIdNumber.toLowerCase().includes(query.toLowerCase())) {
        hits.push({
          type: "KYC Identity",
          id: row.id,
          clientId: row.id,
          name: row.fullName,
          reason: `KYC ID ending …${row.kycIdNumber.slice(-4)}`,
          matchedField: "kycIdNumber",
          severity: "high",
          href: `/staff/clients`,
          recordStatus: "Verified identity on file",
          relatedCaseCount,
        });
      }
    }
  }

  if (scope.cases) {
    const caseRows = await database
      .select({
        id: cases.id,
        clientId: cases.clientId,
        title: cases.title,
        caseNumber: cases.caseNumber,
        opposingCounsel: cases.opposingCounsel,
        judge: cases.judge,
        court: cases.court,
        description: cases.description,
        status: cases.status,
      })
      .from(cases)
      .where(
        and(
          eq(cases.firmId, firmId),
          isNull(cases.deletedAt),
          or(
            like(cases.title, pattern),
            like(cases.caseNumber, pattern),
            like(cases.opposingCounsel, pattern),
            like(cases.judge, pattern),
            like(cases.court, pattern),
            like(cases.description, pattern),
          ),
        ),
      )
      .limit(100);

    for (const row of caseRows) {
      const counselMatch = row.opposingCounsel?.toLowerCase().includes(query.toLowerCase());
      const isActive = ["inquiry", "active", "on_hold"].includes(row.status);
      hits.push({
        type: counselMatch ? "Opposing Counsel" : "Existing Case",
        id: row.id,
        caseId: row.id,
        clientId: row.clientId,
        caseNumber: row.caseNumber,
        name: counselMatch ? (row.opposingCounsel ?? row.title) : row.title,
        reason: counselMatch
          ? `Listed as opposing counsel on ${row.caseNumber}`
          : [row.court, row.judge].filter(Boolean).join(" · ") || "Matter record",
        matchedField: counselMatch
          ? "opposingCounsel"
          : row.caseNumber?.toLowerCase().includes(query.toLowerCase())
            ? "caseNumber"
            : "title",
        severity: counselMatch && isActive ? "high" : isActive ? "medium" : "low",
        href: `/staff/cases/${row.id}`,
        recordStatus: formatCaseStatus(row.status),
      });
    }
  }

  if (scope.leads) {
    const leadRows = await database
      .select({
        id: leads.id,
        fullName: leads.fullName,
        email: leads.email,
        phone: leads.phone,
        message: leads.message,
        status: leads.status,
        practiceAreaInterest: leads.practiceAreaInterest,
      })
      .from(leads)
      .where(
        and(
          eq(leads.firmId, firmId),
          isNull(leads.deletedAt),
          or(
            like(leads.fullName, pattern),
            like(leads.email, pattern),
            like(leads.phone, pattern),
            like(leads.message, pattern),
            like(leads.practiceAreaInterest, pattern),
          ),
        ),
      )
      .limit(50);

    for (const row of leadRows) {
      hits.push({
        type: "Lead / Inquiry",
        id: row.id,
        name: row.fullName,
        reason: row.practiceAreaInterest || row.message?.slice(0, 80) || "CRM lead",
        matchedField: matchLeadField(row, query),
        severity: row.status === "converted" ? "medium" : "low",
        href: `/admin/crm`,
        recordStatus: `Lead · ${row.status.replaceAll("_", " ")}`,
      });
    }
  }

  if (scope.appointments) {
    const appointmentRows = await database
      .select({
        id: appointments.id,
        clientName: appointments.clientName,
        clientEmail: appointments.clientEmail,
        clientPhone: appointments.clientPhone,
        practiceArea: appointments.practiceArea,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.firmId, firmId),
          isNull(appointments.deletedAt),
          or(
            like(appointments.clientName, pattern),
            like(appointments.clientEmail, pattern),
            like(appointments.clientPhone, pattern),
          ),
        ),
      )
      .limit(50);

    for (const row of appointmentRows) {
      hits.push({
        type: "Consultation Request",
        id: row.id,
        name: row.clientName,
        reason: `${row.practiceArea} consultation`,
        matchedField: "clientName",
        severity: "low",
        href: `/admin/appointments`,
        recordStatus: `Appointment · ${row.status.replaceAll("_", " ")}`,
      });
    }
  }

  const ranked = rankHits(dedupeHits(hits));
  return {
    hits: ranked,
    summary: summarizeHits(ranked),
    query,
    searchedAt: new Date().toISOString(),
  };
}

function matchClientField(
  row: {
    fullName: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    registrationNumber: string | null;
    kycIdNumber: string | null;
    notes: string | null;
  },
  query: string,
  _pattern: string,
) {
  const q = query.toLowerCase();
  if (row.fullName?.toLowerCase().includes(q)) return "fullName";
  if (row.companyName?.toLowerCase().includes(q)) return "companyName";
  if (row.email?.toLowerCase().includes(q)) return "email";
  if (row.phone?.toLowerCase().includes(q)) return "phone";
  if (row.registrationNumber?.toLowerCase().includes(q)) return "registrationNumber";
  if (row.kycIdNumber?.toLowerCase().includes(q)) return "kycIdNumber";
  if (row.notes?.toLowerCase().includes(q)) return "notes";
  return "fullName";
}

function matchLeadField(
  row: { fullName: string; email: string | null; phone: string | null; message: string | null },
  query: string,
) {
  const q = query.toLowerCase();
  if (row.fullName?.toLowerCase().includes(q)) return "fullName";
  if (row.email?.toLowerCase().includes(q)) return "email";
  if (row.phone?.toLowerCase().includes(q)) return "phone";
  if (row.message?.toLowerCase().includes(q)) return "message";
  return "fullName";
}

function formatCaseStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildMatterSearchQueries(context?: {
  clientName?: string;
  opposingCounsel?: string;
  caseNumber?: string;
}) {
  const queries = new Set<string>();
  if (context?.clientName?.trim()) queries.add(normalizeConflictQuery(context.clientName));
  if (context?.opposingCounsel?.trim())
    queries.add(normalizeConflictQuery(context.opposingCounsel));
  if (context?.caseNumber?.trim()) queries.add(normalizeConflictQuery(context.caseNumber));
  return [...queries];
}

export async function runMatterBundleSearch(
  firmId: string,
  primaryQuery: string,
  matterContext?: { clientName?: string; opposingCounsel?: string; caseNumber?: string },
  scope?: Partial<ConflictSearchScope>,
): Promise<ConflictSearchResultDto> {
  const queries = [
    normalizeConflictQuery(primaryQuery),
    ...buildMatterSearchQueries(matterContext),
  ].filter(Boolean);
  const uniqueQueries = [...new Set(queries)];

  const combined: ConflictHitDto[] = [];
  for (const q of uniqueQueries) {
    const result = await runConflictSearch(firmId, q, scope);
    combined.push(...result.hits);
  }

  const hits = rankHits(dedupeHits(combined));
  return {
    hits,
    summary: summarizeHits(hits),
    query: normalizeConflictQuery(primaryQuery),
    searchedAt: new Date().toISOString(),
  };
}
