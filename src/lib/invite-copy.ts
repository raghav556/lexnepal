/** Invite / reset toast copy — Mailpit only on local hostnames. */
export function inviteEmailQueuedMessage(kind: "setup" | "reset" | "resent" = "setup"): string {
  const local =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".local"));

  if (kind === "reset") {
    return local
      ? "Password reset email queued. Check Mailpit for the link."
      : "Password reset email sent.";
  }
  if (kind === "resent") {
    return local
      ? "Setup email resent. Check Mailpit for the activation link."
      : "Setup email resent to the user.";
  }
  return local
    ? "Setup email queued. Check Mailpit for the activation link (/setup-account)."
    : "Invitation sent. The user will receive an email to set up their account.";
}
