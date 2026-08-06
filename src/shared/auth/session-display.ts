import type { SessionDto } from "@/shared/contracts/identity";

export type SessionDisplay = {
  id: string;
  deviceLabel: string;
  browserLabel: string;
  locationHint: string;
  isCurrent: boolean;
  lastActive: string;
  ipAddress: string;
};

function deviceFromUserAgent(ua: string | null): "mobile" | "tablet" | "desktop" {
  const haystack = (ua ?? "").toLowerCase();
  if (/iphone|android.+mobile|mobile/.test(haystack)) return "mobile";
  if (/ipad|android(?!.*mobile)|tablet/.test(haystack)) return "tablet";
  return "desktop";
}

function browserFromUserAgent(ua: string | null): string {
  const uaString = ua ?? "";
  if (/Edg\//.test(uaString)) return "Microsoft Edge";
  if (/Chrome\//.test(uaString) && !/Edg\//.test(uaString)) return "Chrome";
  if (/Firefox\//.test(uaString)) return "Firefox";
  if (/Safari\//.test(uaString) && !/Chrome\//.test(uaString)) return "Safari";
  return "Web browser";
}

function locationHint(ip: string): string {
  if (!ip || ip === "unknown") return "Location unknown";
  if (ip === "127.0.0.1" || ip.startsWith("::ffff:127.") || ip === "::1") {
    return "Local device · Kathmandu area (estimated)";
  }
  if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    return "Private network · Nepal (estimated)";
  }
  return `Network ${ip}`;
}

export function toSessionDisplay(session: SessionDto): SessionDisplay {
  const deviceKind = deviceFromUserAgent(session.userAgent);
  const deviceLabel =
    deviceKind === "mobile" ? "Mobile device" : deviceKind === "tablet" ? "Tablet" : "Desktop";
  const browserLabel =
    session.browser && session.browser !== "local-auth"
      ? session.browser
      : browserFromUserAgent(session.userAgent);

  return {
    id: session.id,
    deviceLabel,
    browserLabel,
    locationHint: locationHint(session.ipAddress),
    isCurrent: session.isCurrent,
    lastActive: session.lastActive,
    ipAddress: session.ipAddress,
  };
}

export type PasswordStrength = "weak" | "fair" | "good" | "strong";

export function scorePassword(password: string): {
  score: PasswordStrength;
  label: string;
  percent: number;
} {
  if (!password) return { score: "weak", label: "Enter a password", percent: 0 };

  let points = 0;
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;

  if (points <= 1) return { score: "weak", label: "Weak — add length and mixed characters", percent: 25 };
  if (points === 2) return { score: "fair", label: "Fair — consider a longer passphrase", percent: 50 };
  if (points === 3 || points === 4) return { score: "good", label: "Good password", percent: 75 };
  return { score: "strong", label: "Strong password", percent: 100 };
}
