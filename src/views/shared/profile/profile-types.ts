export type ProfileVariant = "client" | "staff" | "admin";

export const PROFILE_COPY: Record<
  ProfileVariant,
  { title: string; subtitle: string }
> = {
  client: {
    title: "My Account",
    subtitle: "Your cases, identity verification, billing, and secure account settings.",
  },
  staff: {
    title: "My Profile",
    subtitle: "Professional details, public presence, and workspace security.",
  },
  admin: {
    title: "Administrator Profile",
    subtitle: "Firm context, admin shortcuts, and account security.",
  },
};

export function formatMemberSince(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function formatLastLogin(iso: string | null | undefined): string {
  if (!iso) return "No recent login recorded";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
