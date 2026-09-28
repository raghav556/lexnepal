import "server-only";

import type { AuditEventDto, ClientOwnAuditEventDto } from "@/shared/contracts/identity";

/** Only verified account actions receive specific Client copy. All other events stay generic. */
const CLIENT_ACTIVITY_LABELS: ReadonlyMap<string, string> = new Map([
  ["users.profile_updated", "Profile updated"],
  ["client.self_updated", "Contact details updated"],
  ["auth.invite_activated", "Account activated"],
  ["auth.login", "Signed in"],
  ["auth.logout", "Signed out"],
  ["auth.login_failed", "Unsuccessful sign-in attempt"],
  ["auth.password_changed", "Password changed"],
  ["auth.mfa_enrolled", "Two-factor authentication enabled"],
  ["sessions.revoked", "Session signed out"],
  ["avatar.upload_completed", "Profile photo upload received"],
  ["avatar.removed", "Profile photo removed"],
]);

export function projectClientOwnAuditEvent(event: AuditEventDto): ClientOwnAuditEventDto {
  return {
    id: event.id,
    action: CLIENT_ACTIVITY_LABELS.get(event.action) ?? "Account activity",
    createdAt: event.createdAt,
  };
}
