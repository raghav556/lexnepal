import { useQuery as useTanstackQuery } from "@tanstack/react-query";
import { anyApi as api } from "convex/server";
import { useQuery as useConvexQuery } from "@/client/data/convex-bridge";
import { apiClient } from "@/client/api/client";
import { useDomainBackend } from "@/client/data/provider";
import { queryKeys } from "@/client/queries/query-keys";
import type { AnalyticsDashboardDto } from "@/shared/contracts/analytics";

export function useDashboardData(): AnalyticsDashboardDto | undefined {
  const backend = useDomainBackend("analytics");
  const convex = useConvexQuery(
    (api as any).analytics.getDashboardData,
    backend === "convex" ? {} : "skip",
  ) as AnalyticsDashboardDto | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.analytics.dashboard,
    queryFn: ({ signal }) =>
      apiClient.request<AnalyticsDashboardDto>("/api/v1/analytics/dashboard", { signal }),
    enabled: backend === "next",
  });
  return backend === "convex" ? convex : next.data;
}
