/**
 * CUI-03 Client master-shell navigation.
 * Explicit active-route mapping — do not use generic pathname.startsWith(href).
 * Contextual Matter routes (hearings, checklist, matter detail) own My Matters.
 */

export type ClientDesktopNavId =
  | "home"
  | "my-matters"
  | "documents"
  | "messages"
  | "appointments"
  | "identity-verification"
  | "sign-documents"
  | "notifications"
  | "profile";

export type ClientMobileNavId = "home" | "matters" | "documents" | "messages" | "more";

export type ClientDesktopNavItem = {
  id: ClientDesktopNavId;
  href: string;
  label: string;
  i18nKey: string;
  group: "primary" | "secondary";
};

export const CLIENT_DESKTOP_NAV: ClientDesktopNavItem[] = [
  { id: "home", href: "/client", label: "Home", i18nKey: "nav.home", group: "primary" },
  {
    id: "my-matters",
    href: "/client/cases",
    label: "My Matters",
    i18nKey: "nav.my_matters",
    group: "primary",
  },
  {
    id: "documents",
    href: "/client/documents",
    label: "Documents",
    i18nKey: "nav.documents",
    group: "primary",
  },
  {
    id: "messages",
    href: "/client/messages",
    label: "Messages",
    i18nKey: "nav.messages",
    group: "primary",
  },
  {
    id: "appointments",
    href: "/client/booking",
    label: "Appointments",
    i18nKey: "nav.appointments",
    group: "primary",
  },
  {
    id: "identity-verification",
    href: "/client/kyc",
    label: "Identity Verification",
    i18nKey: "nav.identity_verification",
    group: "secondary",
  },
  {
    id: "sign-documents",
    href: "/client/signatures",
    label: "Sign Documents",
    i18nKey: "nav.sign_documents",
    group: "secondary",
  },
  {
    id: "notifications",
    href: "/client/notifications",
    label: "Notifications",
    i18nKey: "nav.notifications",
    group: "secondary",
  },
  {
    id: "profile",
    href: "/client/profile",
    label: "Profile",
    i18nKey: "nav.client_profile",
    group: "secondary",
  },
];

export const CLIENT_DESKTOP_PRIMARY = CLIENT_DESKTOP_NAV.filter((item) => item.group === "primary");
export const CLIENT_DESKTOP_SECONDARY = CLIENT_DESKTOP_NAV.filter(
  (item) => item.group === "secondary",
);

export const CLIENT_MOBILE_PRIMARY: Array<{
  id: Exclude<ClientMobileNavId, "more">;
  href: string;
  label: string;
  i18nKey: string;
}> = [
  { id: "home", href: "/client", label: "Home", i18nKey: "nav.home" },
  { id: "matters", href: "/client/cases", label: "Matters", i18nKey: "nav.matters" },
  { id: "documents", href: "/client/documents", label: "Documents", i18nKey: "nav.documents" },
  { id: "messages", href: "/client/messages", label: "Messages", i18nKey: "nav.messages" },
];

/** Contextual Matter routes remain reachable; they are not permanent nav items. */
export const CLIENT_CONTEXTUAL_MATTER_PATHS = ["/client/hearings", "/client/checklist"] as const;

export const CLIENT_SEARCH_PAGES: Array<{
  title: string;
  subtitle: string;
  href: string;
  keywords: string[];
}> = [
  {
    title: "Home",
    subtitle: "Your Client Portal overview",
    href: "/client",
    keywords: ["dashboard", "home"],
  },
  {
    title: "My Matters",
    subtitle: "Your legal matters",
    href: "/client/cases",
    keywords: ["cases", "matters"],
  },
  {
    title: "Documents",
    subtitle: "Files shared with you",
    href: "/client/documents",
    keywords: ["files", "upload"],
  },
  {
    title: "Messages",
    subtitle: "Conversations with your legal team",
    href: "/client/messages",
    keywords: ["chat", "inbox"],
  },
  {
    title: "Appointments",
    subtitle: "Book a consultation",
    href: "/client/booking",
    keywords: ["booking", "calendar"],
  },
  {
    title: "Identity Verification",
    subtitle: "KYC documents and verification status",
    href: "/client/kyc",
    keywords: ["kyc", "identity"],
  },
  {
    title: "Sign Documents",
    subtitle: "Review and sign documents",
    href: "/client/signatures",
    keywords: ["esign", "signature"],
  },
  {
    title: "Notifications",
    subtitle: "Alerts from your legal team",
    href: "/client/notifications",
    keywords: ["alerts", "bell"],
  },
  {
    title: "Profile",
    subtitle: "Account and preferences",
    href: "/client/profile",
    keywords: ["settings", "account"],
  },
  {
    title: "Hearings",
    subtitle: "Upcoming court appearances for your matters",
    href: "/client/hearings",
    keywords: ["court", "pesi"],
  },
  {
    title: "Checklist",
    subtitle: "Action items shared by your legal team",
    href: "/client/checklist",
    keywords: ["tasks", "actions"],
  },
];

export const CLIENT_UNSUPPORTED_FOOTER_CLAIMS = [
  "AES",
  "bank-grade",
  "fully compliant",
  "100% secure",
  "military-grade",
] as const;

function normalizePathname(pathname: string): string {
  if (!pathname) return "/";
  const trimmed = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const [withoutQuery] = trimmed.split(/[?#]/);
  return withoutQuery || "/";
}

function matchesPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isClientPortalPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return path === "/client" || path.startsWith("/client/");
}

/**
 * Single explicit desktop mapping. Nested screen paths resolve to that screen.
 * /client/hearings and /client/checklist MUST activate My Matters, never Appointments.
 */
export function resolveClientDesktopNav(pathname: string): ClientDesktopNavId | null {
  const path = normalizePathname(pathname);
  if (!isClientPortalPath(path)) return null;
  if (path === "/client") return "home";
  if (matchesPath(path, "/client/cases")) return "my-matters";
  if (matchesPath(path, "/client/hearings")) return "my-matters";
  if (matchesPath(path, "/client/checklist")) return "my-matters";
  if (matchesPath(path, "/client/documents")) return "documents";
  if (matchesPath(path, "/client/messages")) return "messages";
  if (matchesPath(path, "/client/booking")) return "appointments";
  if (matchesPath(path, "/client/kyc")) return "identity-verification";
  if (matchesPath(path, "/client/signatures")) return "sign-documents";
  if (matchesPath(path, "/client/notifications")) return "notifications";
  if (matchesPath(path, "/client/profile")) return "profile";
  return null;
}

/** Mobile mapping is derived from the desktop mapping so the two cannot contradict. */
export function resolveClientMobileNav(pathname: string): ClientMobileNavId | null {
  const desktop = resolveClientDesktopNav(pathname);
  if (!desktop) return null;
  switch (desktop) {
    case "home":
      return "home";
    case "my-matters":
      return "matters";
    case "documents":
      return "documents";
    case "messages":
      return "messages";
    default:
      return "more";
  }
}

export function isClientDesktopNavActive(pathname: string, href: string): boolean {
  const activeId = resolveClientDesktopNav(pathname);
  if (!activeId) return false;
  return CLIENT_DESKTOP_NAV.some((item) => item.id === activeId && item.href === href);
}
