/** Shared local/demo credentials — safe to import from Playwright (no server-only). */
export const E2E_USERS = {
  admin: {
    email: "admin@srimarlaw.com.np",
    previousEmails: ["e2e-admin@example.invalid"],
    name: "Sangit Dhungana",
    role: "admin" as const,
    password: "admin@1234",
  },
  staff: {
    email: "staff@srimarlaw.com.np",
    previousEmails: ["e2e-staff@example.invalid"],
    name: "Jibachh Yadav",
    role: "associate" as const,
    password: "staff@1234",
  },
  staff2: {
    email: "e2e-staff2@example.invalid",
    previousEmails: [] as string[],
    name: "E2E Staff Two",
    role: "associate" as const,
    password: "E2E-Smoke-Only-2026!",
  },
  client: {
    email: "client@srimarlaw.com.np",
    previousEmails: ["e2e-client@example.invalid"],
    name: "Sarita Ray",
    role: "client" as const,
    password: "client@1234",
  },
} as const;

/** Separate CUI-01 UI-preview Client. Not part of E2E_USERS / smoke identity. */
export const UI_PREVIEW_CLIENT = {
  email: "ravi.sharma.ui-preview@example.invalid",
  previousEmails: [] as string[],
  name: "Ravi Sharma",
  role: "client" as const,
  password: "E2E-UI-Preview-Only-2026!",
} as const;

export function e2ePasswordFor(email: string): string {
  const user =
    Object.values(E2E_USERS).find((item) => item.email === email) ??
    (email === UI_PREVIEW_CLIENT.email ? UI_PREVIEW_CLIENT : undefined);
  if (!user) throw new Error(`Unknown local demo user ${email}`);
  return user.password;
}
