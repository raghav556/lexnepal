export const BACKEND_DOMAINS = [
  "identity",
  "documents",
  "cases",
  "tasks",
  "clients",
  "hearings",
  "finance",
  "messages",
  "notifications",
  "appointments",
  "cms",
  "hr",
  "research",
  "leads",
  "envelopes",
  "analytics",
] as const;

export type BackendDomain = (typeof BACKEND_DOMAINS)[number];
export type BackendKind = "convex" | "next" | "shadow";
export type BackendFlags = Readonly<Record<BackendDomain, BackendKind>>;

const flagNames: Record<BackendDomain, string> = {
  identity: "BACKEND_IDENTITY",
  documents: "BACKEND_DOCUMENTS",
  cases: "BACKEND_CASES",
  tasks: "BACKEND_TASKS",
  clients: "BACKEND_CLIENTS",
  hearings: "BACKEND_HEARINGS",
  finance: "BACKEND_FINANCE",
  messages: "BACKEND_MESSAGES",
  notifications: "BACKEND_NOTIFICATIONS",
  appointments: "BACKEND_APPOINTMENTS",
  cms: "BACKEND_CMS",
  hr: "BACKEND_HR",
  research: "BACKEND_RESEARCH",
  leads: "BACKEND_LEADS",
  envelopes: "BACKEND_ENVELOPES",
  analytics: "BACKEND_ANALYTICS",
};

export function resolveBackendFlags(environment: Record<string, string | undefined>): BackendFlags {
  // Offline mock auth cannot satisfy Next API sessions — keep domains on Convex mock data.
  const useMock = environment.VITE_USE_MOCK === "true" || environment.NEXT_PUBLIC_VITE_USE_MOCK === "true";
  if (useMock) {
    return Object.fromEntries(BACKEND_DOMAINS.map((domain) => [domain, "convex"])) as unknown as BackendFlags;
  }

  return Object.fromEntries(
    BACKEND_DOMAINS.map((domain) => {
      const raw =
        environment[`VITE_${flagNames[domain]}`] ?? environment[`NEXT_PUBLIC_${flagNames[domain]}`];
      return [domain, raw === "next" ? "next" : raw === "shadow" ? "shadow" : "convex"];
    }),
  ) as unknown as BackendFlags;
}

export function readBuildBackendFlags(): BackendFlags {
  const viteEnvironment =
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
  const nextEnvironment = typeof process === "undefined" ? {} : process.env;
  return resolveBackendFlags({ ...nextEnvironment, ...viteEnvironment });
}
