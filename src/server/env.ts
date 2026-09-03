import "server-only";
import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);

const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_VERSION: z.string().min(1).default("0.1.0"),
  GIT_SHA: z.string().min(1).default("local"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  READINESS_REQUIRE_DATABASE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  DATABASE_URL: optionalUrl,
  DATABASE_POOL_CONNECTION_LIMIT: z
    .coerce.number()
    .int()
    .min(1)
    .max(100)
    .default(4),
  AUTH_PROVIDER: z.enum(["local", "hercules"]).default("local"),
  HERCULES_OIDC_AUTHORITY: optionalUrl,
  HERCULES_OIDC_CLIENT_ID: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  AUTH_SESSION_COOKIE_NAME: z.string().min(1).default("lexnepal_session"),
  AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().min(300).max(2_592_000).default(28_800),
  BETTER_AUTH_SECRET: z.string().min(32).default("lexnepal-local-development-secret-change-me"),
  BETTER_AUTH_URL: optionalUrl.default("http://localhost:3001"),
  APP_PUBLIC_URL: optionalUrl.default("http://localhost:3001"),
  PUBLIC_FIRM_SLUG: z.string().trim().min(1).default("srimar-law"),
  SMTP_HOST: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  SMTP_FROM: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().email().optional(),
  ),
  STORAGE_ROOT: z.string().min(1).default("./.local/storage"),
  STORAGE_DOWNLOAD_TOKEN_SECRET: z
    .string()
    .min(32)
    .default("lexnepal-local-storage-download-secret-change-me"),
  UPLOAD_INTENT_TTL_SECONDS: z.coerce.number().int().min(300).max(86_400).default(3_600),
  UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3_600).default(600),
  DOWNLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(900).default(300),
  CLAMAV_HOST: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  CLAMAV_PORT: z.coerce.number().int().min(1).max(65_535).default(3310),
  LEXNEPAL_SKIP_LOCAL_CLAMAV: z
    .enum(["0", "1"])
    .default("0")
    .transform((value) => value === "1"),
  LEXNEPAL_SKIP_SMTP: z
    .enum(["0", "1"])
    .default("0")
    .transform((value) => value === "1"),
  CDR_ENDPOINT: optionalUrl,
  CDR_API_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  JOB_WORKER_POLL_MS: z.coerce.number().int().min(100).max(60_000).default(1_000),
  JOB_SCHEDULER_POLL_MS: z.coerce.number().int().min(1_000).max(300_000).default(15_000),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

let cachedEnvironment: ServerEnvironment | undefined;

export function getServerEnvironment(): ServerEnvironment {
  if (cachedEnvironment) return cachedEnvironment;
  const parsed = serverEnvironmentSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".") || "environment");
    throw new Error(`Invalid server environment fields: ${[...new Set(fields)].join(", ")}`);
  }
  if (
    parsed.data.NODE_ENV === "production" &&
    parsed.data.AUTH_PROVIDER === "local" &&
    parsed.data.BETTER_AUTH_SECRET === "lexnepal-local-development-secret-change-me"
  ) {
    throw new Error("BETTER_AUTH_SECRET must be replaced before production startup");
  }
  if (
    parsed.data.NODE_ENV === "production" &&
    parsed.data.STORAGE_DOWNLOAD_TOKEN_SECRET === "lexnepal-local-storage-download-secret-change-me"
  ) {
    throw new Error("STORAGE_DOWNLOAD_TOKEN_SECRET must be replaced before production startup");
  }
  if (parsed.data.NODE_ENV === "production") {
    for (const [name, value] of [
      ["BETTER_AUTH_URL", parsed.data.BETTER_AUTH_URL],
      ["APP_PUBLIC_URL", parsed.data.APP_PUBLIC_URL],
    ] as const) {
      if (!value) continue;
      const isLocalHttp =
        value.startsWith("http://localhost") || value.startsWith("http://127.0.0.1");
      if (!value.startsWith("https://") && !isLocalHttp) {
        throw new Error(
          `${name} must use https:// in production (localhost HTTP is allowed for local start)`,
        );
      }
    }
  }
  cachedEnvironment = parsed.data;
  return cachedEnvironment;
}

export function isClamAvConfigured(): boolean {
  const env = getServerEnvironment();
  if (env.LEXNEPAL_SKIP_LOCAL_CLAMAV) return false;
  const host = env.CLAMAV_HOST?.trim();
  if (!host) return false;
  return true;
}

export function isSmtpConfigured(): boolean {
  const env = getServerEnvironment();
  if (env.LEXNEPAL_SKIP_SMTP) return false;
  const host = env.SMTP_HOST?.trim();
  const from = env.SMTP_FROM?.trim();
  if (!host || !from) return false;
  return true;
}

export function resetServerEnvironmentForTests(): void {
  if (process.env.NODE_ENV !== "test")
    throw new Error("Environment cache can only be reset in tests");
  cachedEnvironment = undefined;
}
