import { useEffect } from "react";
import type { BackendKind } from "./backend-config";
import { shadowPayloadsMatch } from "@/shared/shadow/normalize";

/** True when Convex should still be fetched (authority or comparison source). */
export function usesConvexBackend(backend: BackendKind) {
  return backend === "convex" || backend === "shadow";
}

/** True when Next should be fetched (authority or shadow comparison target). */
export function usesNextBackend(backend: BackendKind) {
  return backend === "next" || backend === "shadow";
}

/**
 * In shadow mode, compare Convex vs Next but keep Convex as the served authority.
 * Logs mismatches; does not throw or swap the returned payload.
 */
export function useShadowRead(
  domain: string,
  endpoint: string,
  backend: BackendKind,
  convexData: unknown,
  nextData: unknown,
  isLoading: boolean,
  error: unknown,
) {
  useEffect(() => {
    if (backend !== "shadow") return;
    if (isLoading || convexData === undefined || nextData === undefined) return;

    if (error) {
      console.warn(`[SHADOW ERROR] ${domain} | ${endpoint}: Next.js threw an error`, error);
      return;
    }

    if (!shadowPayloadsMatch(convexData, nextData)) {
      console.warn(
        `[SHADOW MISMATCH] ${domain} | ${endpoint}\nConvex:`,
        convexData,
        `\nNext:`,
        nextData,
      );
    } else {
      console.log(`[SHADOW PARITY] ${domain} | ${endpoint} returned identical results.`);
    }
  }, [backend, convexData, nextData, isLoading, error, domain, endpoint]);
}

/** Value served to the UI: Next only when explicitly authoritative. */
export function authoritativeBackendData<T>(
  backend: BackendKind,
  convexData: T | undefined,
  nextData: T | undefined,
): T | undefined {
  return backend === "next" ? nextData : convexData;
}
