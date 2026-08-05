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

/**
 * Static `process.env.VITE_BACKEND_*` reads so Next can inline them into the client bundle.
 * Dynamic `process.env[key]` is opaque to the bundler and defaults every domain to Convex.
 */
function readInlinedBackendEnv(): Record<string, string | undefined> {
  return {
    VITE_USE_MOCK: process.env.VITE_USE_MOCK,
    NEXT_PUBLIC_VITE_USE_MOCK: process.env.NEXT_PUBLIC_VITE_USE_MOCK,
    VITE_BACKEND_IDENTITY: process.env.VITE_BACKEND_IDENTITY,
    VITE_BACKEND_DOCUMENTS: process.env.VITE_BACKEND_DOCUMENTS,
    VITE_BACKEND_CASES: process.env.VITE_BACKEND_CASES,
    VITE_BACKEND_TASKS: process.env.VITE_BACKEND_TASKS,
    VITE_BACKEND_CLIENTS: process.env.VITE_BACKEND_CLIENTS,
    VITE_BACKEND_HEARINGS: process.env.VITE_BACKEND_HEARINGS,
    VITE_BACKEND_FINANCE: process.env.VITE_BACKEND_FINANCE,
    VITE_BACKEND_MESSAGES: process.env.VITE_BACKEND_MESSAGES,
    VITE_BACKEND_NOTIFICATIONS: process.env.VITE_BACKEND_NOTIFICATIONS,
    VITE_BACKEND_APPOINTMENTS: process.env.VITE_BACKEND_APPOINTMENTS,
    VITE_BACKEND_CMS: process.env.VITE_BACKEND_CMS,
    VITE_BACKEND_HR: process.env.VITE_BACKEND_HR,
    VITE_BACKEND_RESEARCH: process.env.VITE_BACKEND_RESEARCH,
    VITE_BACKEND_LEADS: process.env.VITE_BACKEND_LEADS,
    VITE_BACKEND_ENVELOPES: process.env.VITE_BACKEND_ENVELOPES,
    VITE_BACKEND_ANALYTICS: process.env.VITE_BACKEND_ANALYTICS,
    NEXT_PUBLIC_BACKEND_IDENTITY: process.env.NEXT_PUBLIC_BACKEND_IDENTITY,
    NEXT_PUBLIC_BACKEND_DOCUMENTS: process.env.NEXT_PUBLIC_BACKEND_DOCUMENTS,
    NEXT_PUBLIC_BACKEND_CASES: process.env.NEXT_PUBLIC_BACKEND_CASES,
    NEXT_PUBLIC_BACKEND_TASKS: process.env.NEXT_PUBLIC_BACKEND_TASKS,
    NEXT_PUBLIC_BACKEND_CLIENTS: process.env.NEXT_PUBLIC_BACKEND_CLIENTS,
    NEXT_PUBLIC_BACKEND_HEARINGS: process.env.NEXT_PUBLIC_BACKEND_HEARINGS,
    NEXT_PUBLIC_BACKEND_FINANCE: process.env.NEXT_PUBLIC_BACKEND_FINANCE,
    NEXT_PUBLIC_BACKEND_MESSAGES: process.env.NEXT_PUBLIC_BACKEND_MESSAGES,
    NEXT_PUBLIC_BACKEND_NOTIFICATIONS: process.env.NEXT_PUBLIC_BACKEND_NOTIFICATIONS,
    NEXT_PUBLIC_BACKEND_APPOINTMENTS: process.env.NEXT_PUBLIC_BACKEND_APPOINTMENTS,
    NEXT_PUBLIC_BACKEND_CMS: process.env.NEXT_PUBLIC_BACKEND_CMS,
    NEXT_PUBLIC_BACKEND_HR: process.env.NEXT_PUBLIC_BACKEND_HR,
    NEXT_PUBLIC_BACKEND_RESEARCH: process.env.NEXT_PUBLIC_BACKEND_RESEARCH,
    NEXT_PUBLIC_BACKEND_LEADS: process.env.NEXT_PUBLIC_BACKEND_LEADS,
    NEXT_PUBLIC_BACKEND_ENVELOPES: process.env.NEXT_PUBLIC_BACKEND_ENVELOPES,
    NEXT_PUBLIC_BACKEND_ANALYTICS: process.env.NEXT_PUBLIC_BACKEND_ANALYTICS,
  };
}

function mergeDefinedEnv(
  ...sources: Array<Record<string, string | undefined>>
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      // Later sources win only when defined — avoids import.meta.env undefined
      // overwriting Next `env` inlines (VITE_BACKEND_* → client bundle).
      if (value !== undefined) out[key] = value;
    }
  }
  return out;
}

export function readBuildBackendFlags(): BackendFlags {
  const viteEnvironment =
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
  return resolveBackendFlags(mergeDefinedEnv(viteEnvironment, readInlinedBackendEnv()));
}
