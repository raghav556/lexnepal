import type { UserDto } from "@/shared/contracts/identity";

type NotificationRole = UserDto["role"] | null | undefined;

/** A notification may navigate only within its recipient's own portal. */
export function safeNotificationPath(raw: unknown, role: NotificationRole): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw !== raw.trim() || /[\s\\\u0000-\u001f\u007f]/u.test(raw)) return null;

  let portal: "/client" | "/staff" | "/admin";
  switch (role) {
    case "client":
      portal = "/client";
      break;
    case "admin":
      portal = "/admin";
      break;
    case "partner":
    case "senior_associate":
    case "associate":
    case "paralegal":
    case "intern":
      portal = "/staff";
      break;
    default:
      return null;
  }

  const path = raw.split(/[?#]/, 1)[0];
  // Encoded separators/control bytes can be interpreted differently by a router.
  if (/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/iu.test(path)) return null;

  try {
    const url = new URL(raw, "https://notification.invalid");
    if (url.origin !== "https://notification.invalid") return null;
    if (url.pathname !== portal && !url.pathname.startsWith(`${portal}/`)) return null;
    // Reject dot-segment and encoding normalization rather than trusting a second parser.
    if (`${url.pathname}${url.search}${url.hash}` !== raw) return null;
    return raw;
  } catch {
    return null;
  }
}
