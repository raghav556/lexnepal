import "server-only";
import type { AuthPrincipal } from "@/server/auth/types";
import { requireFirmContext } from "@/server/policies/authorization";
import { AnalyticsRepository } from "@/server/repositories/analytics-repository";
import { AppError } from "@/shared/errors/api-error";
import type { AnalyticsDashboardDto } from "@/shared/contracts/analytics";

export class AnalyticsService {
  async getDashboard(principal: AuthPrincipal): Promise<AnalyticsDashboardDto> {
    if (!["admin", "partner"].includes(principal.user.role)) {
      throw new AppError("FORBIDDEN", "Analytics dashboard requires admin or partner role", 403);
    }
    const { firmId } = requireFirmContext(principal);
    return AnalyticsRepository.getDashboardData(firmId);
  }
}

let service: AnalyticsService | undefined;
export function getAnalyticsService() {
  service ??= new AnalyticsService();
  return service;
}
