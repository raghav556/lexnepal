import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { queryKeys } from "@/client/queries/query-keys";
import type { AnalyticsDashboardDto } from "@/shared/contracts/analytics";

export function useDashboardData(): AnalyticsDashboardDto | undefined {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard,
    queryFn: ({ signal }) =>
      apiClient.request<AnalyticsDashboardDto>("/api/v1/analytics/dashboard", { signal }),
  }).data;
}
