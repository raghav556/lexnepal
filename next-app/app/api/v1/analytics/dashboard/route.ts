import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/runtime";
import { requireFirmContext } from "@/server/policies/authorization";
import { AnalyticsRepository } from "@/server/repositories/analytics-repository";
import { AppError } from "@/shared/errors/api-error";

export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    const { firmId } = requireFirmContext(session);

    // Require admin or partner role for analytics dashboard as per Convex parity
    if (!session.user || !["admin", "partner"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await AnalyticsRepository.getDashboardData(firmId);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    // Also handle generic forbidden/unauthorized exceptions from requireRole if they throw custom errors
    if (error.message && (error.message.includes("role") || error.message.includes("permission"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Dashboard analytics error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
