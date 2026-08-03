import { describe, expect, it } from "vitest";
import { AppError } from "@/shared/errors/api-error";
import { withApiHandler } from "@/server/http/handler";

describe("API error boundary", () => {
  it("returns the stable structured error contract", async () => {
    const handler = withApiHandler("/test", () => {
      throw new AppError("VALIDATION_FAILED", "Invalid request", 422, { field: "title" });
    });
    const response = await handler(
      new Request("http://localhost/test", { headers: { "x-request-id": "request-123" } }),
    );

    expect(response.status).toBe(422);
    expect(response.headers.get("x-request-id")).toBe("request-123");
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_FAILED",
        message: "Invalid request",
        requestId: "request-123",
        details: { field: "title" },
      },
    });
  });

  it("does not leak unexpected error details", async () => {
    const handler = withApiHandler("/test", () => {
      throw new Error("database password leaked");
    });
    const response = await handler(new Request("http://localhost/test"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("database password leaked");
  });
});
