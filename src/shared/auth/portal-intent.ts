export const PORTAL_INTENTS = ["client", "staff", "admin"] as const;
export type PortalIntent = (typeof PORTAL_INTENTS)[number];

export const PORTAL_HOME: Record<PortalIntent, string> = {
  client: "/client",
  staff: "/staff",
  admin: "/admin",
};

export const PORTAL_LABELS: Record<PortalIntent, string> = {
  client: "Client",
  staff: "Staff",
  admin: "Admin",
};

export const PORTAL_DESCRIPTIONS: Record<PortalIntent, string> = {
  client: "View cases, documents, billing, and messages.",
  staff: "Manage matters, clients, hearings, and firm work.",
  admin: "Firm operations, users, CMS, finance, and settings.",
};

export function parsePortalIntent(raw: string | null | undefined): PortalIntent | null {
  if (raw === "client" || raw === "staff" || raw === "admin") return raw;
  return null;
}

export function signInPathForPortal(portal: PortalIntent, next?: string | null): string {
  const base = `/sign-in/${portal}`;
  if (!next) return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}
