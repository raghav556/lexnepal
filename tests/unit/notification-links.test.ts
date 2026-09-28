import { describe, expect, it } from "vitest";
import { safeNotificationPath } from "../../src/shared/notification-links";

describe("notification navigation boundary", () => {
  it.each([
    ["client", "/client", "/client"],
    ["client", "/client/messages", "/client/messages"],
    ["client", "/client/signatures?envelope=abc#review", "/client/signatures?envelope=abc#review"],
    ["partner", "/staff/cases/123?tab=messages", "/staff/cases/123?tab=messages"],
    ["senior_associate", "/staff/messages", "/staff/messages"],
    ["associate", "/staff/messages", "/staff/messages"],
    ["paralegal", "/staff/messages", "/staff/messages"],
    ["intern", "/staff/messages", "/staff/messages"],
    ["admin", "/admin/users?status=active", "/admin/users?status=active"],
  ] as const)("allows %s to navigate to %s", (role, raw, expected) => {
    expect(safeNotificationPath(raw, role)).toBe(expected);
  });

  it.each([
    "https://evil.example",
    "http://evil.example",
    "//evil.example/client/messages",
    "javascript:alert(1)",
    "data:text/html,hi",
    "mailto:help@example.invalid",
    "tel:+123456789",
    "\\\\evil.example\\client",
    "/client\\@evil.example",
    "/client/%5cevil.example",
    "/client/%2f%2fevil.example",
    "/client/../staff/messages",
    "/client/%2e%2e/staff/messages",
    "/client/%0aattack",
    "",
    "   ",
    " /client/messages",
    "/client/messages ",
  ])("rejects unsafe destination %s", (raw) => {
    expect(safeNotificationPath(raw, "client")).toBeNull();
  });

  it.each([
    ["client", "/staff/messages"],
    ["client", "/admin"],
    ["client", "/clientish/messages"],
    ["partner", "/client/messages"],
    ["associate", "/admin/users"],
    ["admin", "/client/messages"],
    ["admin", "/staff/cases"],
  ] as const)("rejects %s navigating to %s", (role, path) => {
    expect(safeNotificationPath(path, role)).toBeNull();
  });

  it("fails closed without a recognized authenticated role", () => {
    expect(safeNotificationPath("/client/messages", undefined)).toBeNull();
    expect(safeNotificationPath("/client/messages", "unknown" as "client")).toBeNull();
    expect(safeNotificationPath(null, "client")).toBeNull();
  });
});
