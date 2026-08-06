import "server-only";

/** Shared helpers for Convex-export → Postgres shadow comparisons (R4.2). */
export type ShadowMismatch = {
  table: string;
  id?: string;
  field: string;
  source: unknown;
  target: unknown;
};

export type DomainShadowReport = {
  domain: string;
  passed: boolean;
  checked: number;
  mismatches: ShadowMismatch[];
};

export function pushMismatch(
  mismatches: ShadowMismatch[],
  table: string,
  id: string | undefined,
  field: string,
  source: unknown,
  target: unknown,
) {
  if (JSON.stringify(source ?? null) !== JSON.stringify(target ?? null)) {
    mismatches.push({ table, id, field, source: source ?? null, target: target ?? null });
  }
}

export function asShadowString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function asShadowBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function moneyString(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}
