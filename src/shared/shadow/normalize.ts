/**
 * Shared shadow-read normalization: strip non-deterministic fields so Convex vs Next
 * payloads can be compared without treating Next as the served authority.
 */
export function shouldNormalizeShadowKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    key === "id" ||
    key === "_id" ||
    key === "_creationTime" ||
    lower.endsWith("at") ||
    lower.endsWith("date") ||
    lower.includes("timestamp")
  );
}

export function shadowJsonReplacer(key: string, value: unknown): unknown {
  if (shouldNormalizeShadowKey(key)) return "[NORMALIZED]";
  return value;
}

export function normalizeShadowPayload(value: unknown): string {
  return JSON.stringify(value, shadowJsonReplacer);
}

export function shadowPayloadsMatch(left: unknown, right: unknown): boolean {
  return normalizeShadowPayload(left) === normalizeShadowPayload(right);
}
