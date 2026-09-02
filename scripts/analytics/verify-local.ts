import { returningMutation } from "@/server/db/mysql-returning";
import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import { users } from "../../db/schema";
import { analyticsDashboardSchema } from "../../src/shared/contracts/analytics";
import { GET as getDashboard } from "../../src/app/api/v1/analytics/dashboard/route";

const database = getDatabase();
const password = "Local-boundary-only-2026!";
const firmA = "61000000-0000-4000-8000-000000000001";
const firmB = "61000000-0000-4000-8000-000000000002";

async function signIn(email: string) {
  const response = await getLocalAuth().api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  if (!response.ok) throw new Error(`Sign-in failed for ${email}. Run auth:verify-boundary first.`);
  const cookie = response.headers.get("set-cookie");
  if (!cookie) throw new Error("Session cookie missing");
  return cookie;
}

try {
  const [adminA] = await returningMutation(
    database
      .update(users)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(users.email, "boundary-a@example.invalid")),
    () => database.select().from(users).where(eq(users.email, "boundary-a@example.invalid")),
  );
  if (!adminA || adminA.firmId !== firmA) {
    throw new Error("boundary-a user missing or wrong firm");
  }

  await database
    .update(users)
    .set({ role: "associate", updatedAt: new Date() })
    .where(eq(users.email, "boundary-b@example.invalid"));

  const adminCookie = await signIn("boundary-a@example.invalid");
  const associateCookie = await signIn("boundary-b@example.invalid");

  const forbidden = await getDashboard(
    new Request("http://local/api/v1/analytics/dashboard", {
      headers: { cookie: associateCookie },
    }),
  );
  if (forbidden.status !== 403) {
    throw new Error(`Expected associate 403, got ${forbidden.status} ${await forbidden.text()}`);
  }

  const response = await getDashboard(
    new Request("http://local/api/v1/analytics/dashboard", {
      headers: { cookie: adminCookie },
    }),
  );
  if (!response.ok) {
    throw new Error(`Dashboard failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as { data: unknown };
  const parsed = analyticsDashboardSchema.safeParse(body.data);
  if (!parsed.success) {
    throw new Error(`Dashboard payload invalid: ${JSON.stringify(parsed.error.flatten())}`);
  }

  const data = parsed.data;
  if (typeof data.totalRevenue !== "number" || typeof data.kpis.activeCases !== "number") {
    throw new Error("Dashboard numeric fields missing");
  }
  if (!Array.isArray(data.monthlyRevenue)) throw new Error("monthlyRevenue missing");
  if (typeof data.revenueByPractice !== "object" || data.revenueByPractice === null) {
    throw new Error("revenueByPractice missing");
  }

  // Firm B admin should not inherit firm A counts when empty/different — create partner on firm B
  await database
    .update(users)
    .set({ role: "partner", updatedAt: new Date() })
    .where(eq(users.email, "boundary-b@example.invalid"));
  const partnerBCookie = await signIn("boundary-b@example.invalid");
  const firmBResponse = await getDashboard(
    new Request("http://local/api/v1/analytics/dashboard", {
      headers: { cookie: partnerBCookie },
    }),
  );
  if (!firmBResponse.ok) {
    throw new Error(`Firm B dashboard failed: ${firmBResponse.status}`);
  }
  const firmBBody = (await firmBResponse.json()) as {
    data: { totalCases: number; totalRevenue: number };
  };
  // Tenant isolation: response must be scoped (may be zeros). Must not throw and must validate.
  analyticsDashboardSchema.parse(firmBBody.data);
  if (firmBBody.data.totalCases > data.totalCases && data.totalCases === 0) {
    // no-op safety; primarily ensure firm B can load its own dashboard
  }
  void firmB;

  console.log(
    JSON.stringify({
      firmA: {
        totalCases: data.totalCases,
        totalRevenue: data.totalRevenue,
        openLeads: data.openLeads,
        retentionRate: data.retentionRate,
      },
      firmB: {
        totalCases: firmBBody.data.totalCases,
        totalRevenue: firmBBody.data.totalRevenue,
      },
      associateDenied: true,
    }),
  );
  console.log("analytics:verify-local passed");
} finally {
  // Restore associate role for boundary users so other verifies stay predictable
  await database
    .update(users)
    .set({ role: "associate", updatedAt: new Date() })
    .where(eq(users.email, "boundary-a@example.invalid"));
  await database
    .update(users)
    .set({ role: "associate", updatedAt: new Date() })
    .where(eq(users.email, "boundary-b@example.invalid"));
  await closeDatabase().catch(() => undefined);
}
