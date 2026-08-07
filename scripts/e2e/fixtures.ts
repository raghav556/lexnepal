/** Shared E2E credentials — safe to import from Playwright (no server-only). */
export const E2E_PASSWORD = "E2E-Smoke-Only-2026!";

export const E2E_USERS = {
  admin: {
    email: "e2e-admin@example.invalid",
    name: "E2E Admin",
    role: "admin" as const,
  },
  staff: {
    email: "e2e-staff@example.invalid",
    name: "E2E Staff",
    role: "associate" as const,
  },
  staff2: {
    email: "e2e-staff2@example.invalid",
    name: "E2E Staff Two",
    role: "associate" as const,
  },
  client: {
    email: "e2e-client@example.invalid",
    name: "E2E Client",
    role: "client" as const,
  },
} as const;
