import { beforeEach, describe, expect, it } from "vitest";
import {
  healthResponseSchema,
  readinessResponseSchema,
  versionResponseSchema,
} from "@/shared/contracts/operations";
import { resetServerEnvironmentForTests } from "@/server/env";
import { GET as health } from "../../src/app/api/v1/health/route";
import { GET as readiness } from "../../src/app/api/v1/readiness/route";
import { GET as version } from "../../src/app/api/v1/version/route";

beforeEach(() => {
  Object.assign(process.env, { NODE_ENV: "test" });
  process.env.READINESS_REQUIRE_DATABASE = "false";
  delete process.env.DATABASE_URL;
  resetServerEnvironmentForTests();
});

describe("operational Route Handlers", () => {
  it("serves liveness with a request ID", async () => {
    const response = await health(new Request("http://localhost/api/v1/health"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(healthResponseSchema.safeParse(await response.json()).success).toBe(true);
  });

  it("reports readiness honestly in foundation mode", async () => {
    const response = await readiness(new Request("http://localhost/api/v1/readiness"));
    const body = readinessResponseSchema.parse(await response.json());
    expect(response.status).toBe(200);
    expect(body.mode).toBe("foundation");
    expect(body.checks.database).toContain("not required");
  });

  it("fails readiness when database mode lacks configuration", async () => {
    process.env.READINESS_REQUIRE_DATABASE = "true";
    resetServerEnvironmentForTests();
    const response = await readiness(new Request("http://localhost/api/v1/readiness"));
    const body = readinessResponseSchema.parse(await response.json());
    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
  });

  it("returns a safe structured error for an invalid environment", async () => {
    process.env.READINESS_REQUIRE_DATABASE = "invalid";
    resetServerEnvironmentForTests();
    const response = await readiness(
      new Request("http://localhost/api/v1/readiness", {
        headers: { "x-request-id": "invalid-environment" },
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        requestId: "invalid-environment",
      },
    });
    expect(JSON.stringify(body)).not.toContain("DATABASE_URL");
  });

  it("serves version metadata without exposing environment values", async () => {
    process.env.APP_VERSION = "0.1.0-test";
    process.env.GIT_SHA = "abc123";
    resetServerEnvironmentForTests();
    const response = await version(
      new Request("http://localhost/api/v1/version", {
        headers: { "x-request-id": "version-test" },
      }),
    );
    const body = versionResponseSchema.parse(await response.json());
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      service: "lexnepal",
      apiVersion: "v1",
      applicationVersion: "0.1.0-test",
      gitSha: "abc123",
    });
    expect(response.headers.get("x-request-id")).toBe("version-test");
  });
});
