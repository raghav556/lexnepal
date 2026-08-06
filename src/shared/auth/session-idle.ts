/** Client-side idle timeout defaults: warn at 25 min, sign out at 30 min. */
export const DEFAULT_IDLE_WARNING_MS = 25 * 60 * 1000;
export const DEFAULT_IDLE_LOGOUT_MS = 30 * 60 * 1000;

export type IdleTimeoutConfig = {
  warningMs: number;
  logoutMs: number;
};

export function getIdleTimeoutConfig(): IdleTimeoutConfig {
  const warningMs = parsePositiveInt(
    process.env.NEXT_PUBLIC_IDLE_WARNING_MS,
    DEFAULT_IDLE_WARNING_MS,
  );
  const logoutMs = parsePositiveInt(process.env.NEXT_PUBLIC_IDLE_LOGOUT_MS, DEFAULT_IDLE_LOGOUT_MS);
  return {
    warningMs: Math.min(warningMs, logoutMs - 1000),
    logoutMs: Math.max(logoutMs, warningMs + 1000),
  };
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function formatIdleCountdown(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
