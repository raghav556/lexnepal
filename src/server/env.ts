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
  APP_PUBLIC_URL: optionalUrl.default("http://localhost:3002"),
  PUBLIC_FIRM_SLUG: z.string().trim().min(1).default("phase-6-firm-a"),
  SMTP_HOST: z.string().min(1).default("127.0.0.1"),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  SMTP_FROM: z.string().email().default("noreply@lexnepal.local"),
  OBJECT_STORAGE_BUCKET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(3).optional(),
  ),
  OBJECT_STORAGE_REGION: z.string().min(1).default("ap-south-1"),
  OBJECT_STORAGE_ENDPOINT: optionalUrl,
  OBJECT_STORAGE_PROVIDER: z.enum(["aws-s3", "minio"]).default("aws-s3"),
  OBJECT_STORAGE_SSE: z.enum(["none", "aes256"]).default("aes256"),
  OBJECT_STORAGE_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  UPLOAD_INTENT_TTL_SECONDS: z.coerce.number().int().min(300).max(86_400).default(3_600),
  UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3_600).default(600),
  DOWNLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(900).default(300),
  CLAMAV_HOST: z.string().min(1).default("127.0.0.1"),
  CLAMAV_PORT: z.coerce.number().int().min(1).max(65_535).default(3310),
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
  cachedEnvironment = parsed.data;
  return cachedEnvironment;
}

export function resetServerEnvironmentForTests(): void {
  if (process.env.NODE_ENV !== "test")
    throw new Error("Environment cache can only be reset in tests");
  cachedEnvironment = undefined;
}
