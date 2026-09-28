import { describe, expect, it } from "vitest";
import type { AuditEventDto } from "../../src/shared/contracts/identity";
import { projectClientOwnAuditEvent } from "../../src/server/services/client-audit-projection";

function event(action: string, details: string | null = null): AuditEventDto {
  return {
    id: "event-1",
    userId: "client-1",
    action,
    resource: "durable_jobs",
    resourceId: "job-1",
    details,
    ipAddress: "192.0.2.10",
    requestId: "request-1",
    createdAt: "2026-09-28T10:00:00.000Z",
    actorName: "Test client",
    actorRole: "client",
  };
}

describe("Client self-audit projection", () => {
  it("allows only the event ID, time, and a safe label", () => {
    const internalId = "398cd4c7-6170-483e-91c7-9e972b992c23";
    const projected = projectClientOwnAuditEvent(
      event("job.enqueued", `type=document.malware_scan; uploadIntent=${internalId}`),
    );
    expect(projected).toEqual({
      id: "event-1",
      action: "Account activity",
      createdAt: "2026-09-28T10:00:00.000Z",
    });
    expect(JSON.stringify(projected)).not.toContain(internalId);
    expect(JSON.stringify(projected)).not.toContain("job-1");
    expect(JSON.stringify(projected)).not.toContain("request-1");
    expect(JSON.stringify(projected)).not.toContain("192.0.2.10");
  });

  it.each([
    ["users.profile_updated", "Profile updated"],
    ["client.self_updated", "Contact details updated"],
    ["auth.login", "Signed in"],
    ["auth.logout", "Signed out"],
    ["auth.password_changed", "Password changed"],
    ["auth.mfa_enrolled", "Two-factor authentication enabled"],
    ["sessions.revoked", "Session signed out"],
    ["avatar.upload_completed", "Profile photo upload received"],
    ["avatar.removed", "Profile photo removed"],
  ])("maps the known %s action to Client copy", (action, label) => {
    expect(projectClientOwnAuditEvent(event(action)).action).toBe(label);
  });

  it.each(["constructor", "toString", "__proto__", "completely.unknown.action"])(
    "uses the safe fallback for unmapped action %s",
    (action) => {
      const projected = projectClientOwnAuditEvent(event(action, "secret=hidden"));
      expect(projected).toEqual({
        id: "event-1",
        action: "Account activity",
        createdAt: "2026-09-28T10:00:00.000Z",
      });
      expect(Object.keys(projected).sort()).toEqual(["action", "createdAt", "id"]);
      expect(JSON.stringify(projected)).not.toContain("secret=hidden");
    },
  );
});
