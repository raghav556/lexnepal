import "server-only";
import { APPLICATION_NAME } from "@/shared/constants/application";
import { getServerEnvironment } from "@/server/env";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

const severity: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const sensitiveKey = /authorization|cookie|password|secret|token|database_url/i;

function redact(value: unknown, key = "", seen = new WeakSet<object>()): unknown {
  if (sensitiveKey.test(key)) return "[REDACTED]";
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, key, seen));
  return Object.fromEntries(
    Object.entries(value).map(([childKey, child]) => [childKey, redact(child, childKey, seen)]),
  );
}

function write(level: LogLevel, event: string, fields: LogFields): void {
  let environmentName = "unknown";
  let minimumLevel: LogLevel = "info";
  try {
    const environment = getServerEnvironment();
    environmentName = environment.NODE_ENV;
    minimumLevel = environment.LOG_LEVEL;
  } catch {
    // Logging must remain available when environment validation is the failure being reported.
    environmentName = process.env.NODE_ENV ?? "unknown";
  }
  if (severity[level] < severity[minimumLevel]) return;
  const safeFields = redact(fields) as LogFields;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: APPLICATION_NAME,
    environment: environmentName,
    event,
    ...safeFields,
  };
  const serialized = JSON.stringify(entry);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

export interface Logger {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

export function createLogger(context: LogFields = {}): Logger {
  return {
    debug: (event, fields = {}) => write("debug", event, { ...context, ...fields }),
    info: (event, fields = {}) => write("info", event, { ...context, ...fields }),
    warn: (event, fields = {}) => write("warn", event, { ...context, ...fields }),
    error: (event, fields = {}) => write("error", event, { ...context, ...fields }),
  };
}
