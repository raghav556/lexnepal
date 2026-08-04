import { useQuery } from "@tanstack/react-query";
import { anyApi as api } from "convex/server";
import { useDomainBackend } from "@/client/data/provider";
import { apiClient } from "@/client/api/client";
import { queryKeys } from "@/client/queries/query-keys";
import { useQuery as useConvexQuery } from "convex/react";

export function useDashboardData() {
  const backend = useDomainBackend("analytics");
  
  // NOTE: Assuming the Convex api shape matches what we found earlier
  // If api.analytics doesn't exist on the client side perfectly typed, we can cast it
  const convexData = useConvexQuery((api as any).analytics.getDashboardData);
  
  const nextData = useQuery({
    queryKey: queryKeys.analytics?.dashboard || ["analytics", "dashboard"],
    queryFn: () => apiClient.request("/api/v1/analytics/dashboard"),
    enabled: backend === "next",
  });

  return {
    data: backend === "convex" ? convexData : nextData.data,
    isLoading: backend === "convex" ? convexData === undefined : nextData.isLoading,
    error: backend === "convex" ? null : nextData.error,
  };
}
