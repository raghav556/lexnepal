export type TrustedOrganizationsSettings = {
  isVisible: boolean;
  sectionTitle: string;
  names: string[];
};

export const DEFAULT_TRUSTED_ORGANIZATIONS: TrustedOrganizationsSettings = {
  isVisible: true,
  sectionTitle: "Trusted By Leading Organizations",
  names: [
    "Himalayan Bank Ltd",
    "Nepal Telecom",
    "Chaudhary Group",
    "Ncell Axiata",
    "Yeti Airlines",
    "Standard Chartered",
    "Surya Nepal",
  ],
};

function asNameList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((name) => name.length > 0)
    .slice(0, 40);
}

export function parseTrustedOrganizations(raw: unknown): TrustedOrganizationsSettings {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_TRUSTED_ORGANIZATIONS,
      names: [...DEFAULT_TRUSTED_ORGANIZATIONS.names],
    };
  }
  const data = raw as Record<string, unknown>;
  const title = String(data.sectionTitle ?? DEFAULT_TRUSTED_ORGANIZATIONS.sectionTitle).trim();
  return {
    isVisible: data.isVisible !== false,
    sectionTitle: title || DEFAULT_TRUSTED_ORGANIZATIONS.sectionTitle,
    names: asNameList(data.names),
  };
}

export function shouldShowTrustedOrganizations(config: TrustedOrganizationsSettings): boolean {
  return config.isVisible && config.names.length > 0;
}
