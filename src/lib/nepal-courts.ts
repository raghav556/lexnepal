import records from "./nepal-courts.json";

export type CourtCategory = "supreme" | "high" | "bench" | "district" | "specialized" | "tribunal";
type Bilingual = Readonly<{ en: string; ne: string }>;
export interface NepalCourt {
  readonly id: string;
  readonly name: Bilingual;
  readonly englishNameKind: "official" | "identified-transliteration";
  /** Verified display correction; the original judiciary string stays on the wire. */
  readonly submissionValue?: string;
  readonly englishNameNote?: string;
  readonly category: CourtCategory;
  readonly province: Bilingual & { readonly code: number };
  readonly district: Bilingual & { readonly code: number };
  readonly location: Bilingual;
  readonly parentId: string | null;
  readonly temporary: boolean;
  readonly aliases: readonly string[];
  /** Place variants are searchable, never enough to establish a court identity. */
  readonly searchAliases: readonly string[];
  readonly status: "operational";
  readonly sources: readonly string[];
  readonly checkedOn: string;
}

/** Sole registry: JSON is reviewed data, not a second list generated in a route. */
export const NEPAL_COURTS: readonly NepalCourt[] = records as readonly NepalCourt[];
export const COURT_CATEGORIES: Readonly<Record<CourtCategory, Bilingual>> = {
  supreme: { en: "Supreme Court", ne: "सर्वोच्च अदालत" },
  high: { en: "Principal High Courts", ne: "उच्च अदालतहरू" },
  bench: { en: "High Court benches", ne: "उच्च अदालतका इजलासहरू" },
  district: { en: "District Courts", ne: "जिल्ला अदालतहरू" },
  specialized: { en: "Specialized courts", ne: "विशिष्टीकृत अदालतहरू" },
  tribunal: { en: "Tribunals", ne: "न्यायाधिकरणहरू" },
};

/** Whitespace/dash/case variants do not change an identity; no fuzzy replacement. */
export function normalizeCourtText(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("en").replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/[—–,،]/g, " ").replace(/\s+/g, " ").trim();
}
const identities = new Map<string, NepalCourt[]>();
for (const court of NEPAL_COURTS) {
  for (const name of new Set([court.id, court.name.en, court.name.ne, court.submissionValue ?? court.name.en, ...court.aliases].map(normalizeCourtText))) {
    identities.set(name, [...(identities.get(name) ?? []), court]);
  }
}
/** Ambiguous/unrecognized legacy strings stay unresolved, never guessed. */
export function resolveCourt(value?: string | null): NepalCourt | undefined {
  const matches = identities.get(normalizeCourtText(value ?? ""));
  return matches?.length === 1 ? matches[0] : undefined;
}
export function officialCourtValue(value?: string | null): string | undefined {
  const court = resolveCourt(value);
  return court?.submissionValue ?? court?.name.en;
}
export function formatCourtName(value?: string | null, language: "en" | "ne" = "en"): string {
  if (!value) return language === "ne" ? "अदालत तोकिएको छैन" : "Court not set";
  return resolveCourt(value)?.name[language] ?? `${value} — ${language === "ne" ? "प्रमाणीकरण आवश्यक" : "Needs verification"}`;
}
const searchIndex = new Map(NEPAL_COURTS.map(court => [court.id, normalizeCourtText([
  court.name.en, court.name.ne, ...court.aliases, ...court.searchAliases, court.province.en, court.province.ne,
  court.district.en, court.district.ne, court.location.en, court.location.ne,
  COURT_CATEGORIES[court.category].en, COURT_CATEGORIES[court.category].ne,
].join(" "))]));
export function searchCourts(query: string): readonly NepalCourt[] {
  const tokens = normalizeCourtText(query).split(" ").filter(Boolean);
  return NEPAL_COURTS.filter(court => tokens.every(token => searchIndex.get(court.id)!.includes(token)));
}
/** Read/search the original text as well as the verified bilingual identity. */
export function courtMatchesSearch(value: string | null | undefined, query: string): boolean {
  const court = resolveCourt(value), normalized = normalizeCourtText(query);
  return normalizeCourtText(value ?? "").includes(normalized) || Boolean(court && searchIndex.get(court.id)!.includes(normalized));
}
export function sameCourt(left: string, right: string): boolean {
  const a = resolveCourt(left), b = resolveCourt(right);
  return a && b ? a.id === b.id : left === right;
}
