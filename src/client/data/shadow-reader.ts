import { useEffect } from "react";
import { BackendKind } from "./backend-config";

export function useShadowRead(
  domain: string,
  endpoint: string,
  backend: BackendKind,
  convexData: any,
  nextData: any,
  isLoading: boolean,
  error: any
) {
  useEffect(() => {
    if (backend !== "shadow") return;
    
    if (isLoading || convexData === undefined || nextData === undefined) return;
    
    if (error) {
      console.warn(`[SHADOW ERROR] ${domain} | ${endpoint}: Next.js threw an error`, error);
      return;
    }

    // Basic comparison logic - normalize out timestamps and ids if needed
    const cString = JSON.stringify(convexData, replacer);
    const nString = JSON.stringify(nextData, replacer);

    if (cString !== nString) {
      console.warn(`[SHADOW MISMATCH] ${domain} | ${endpoint}\nConvex:`, convexData, `\nNext:`, nextData);
    } else {
      console.log(`[SHADOW PARITY] ${domain} | ${endpoint} returned identical results.`);
    }
  }, [backend, convexData, nextData, isLoading, error]);
}

// Strip out non-deterministic fields for comparison
function replacer(key: string, value: any) {
  if (key.toLowerCase().includes("at") || key === "id" || key === "_id" || key === "_creationTime") {
    // Ignore date strings or ids
    return "[NORMALIZED]";
  }
  return value;
}
