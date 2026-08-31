import { resolvePublicTitle } from "@/shared/leadership";

export type DirectorMessageSettings = {
  isVisible: boolean;
  sectionTitle: string;
  message: string;
  name: string;
  designation: string;
  photoUrl?: string;
  signatureUrl?: string;
  teamMemberId?: string;
  ctaLabel?: string;
};

export const DEFAULT_DIRECTOR_MESSAGE: DirectorMessageSettings = {
  isVisible: true,
  sectionTitle: "Message from Managing Partner",
  message:
    "We believe every client deserves clarity, integrity, and relentless advocacy. " +
    "Our firm combines deep courtroom experience with modern transparency — so you always know where your matter stands.",
  name: "Managing Partner",
  designation: "Managing Partner",
  photoUrl: undefined,
  signatureUrl: undefined,
  ctaLabel: "View Full Profile",
};

type TeamMemberLike = {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  role?: string;
  leadershipTitle?: string | null;
  avatar?: string | null;
  avatarUrl?: string | null;
};

export function parseDirectorMessage(raw: unknown): DirectorMessageSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (!data.message || typeof data.message !== "string") return null;
  return {
    isVisible: data.isVisible !== false,
    sectionTitle: String(data.sectionTitle ?? DEFAULT_DIRECTOR_MESSAGE.sectionTitle),
    message: String(data.message),
    name: String(data.name ?? ""),
    designation: String(data.designation ?? ""),
    photoUrl: data.photoUrl ? String(data.photoUrl) : undefined,
    signatureUrl: data.signatureUrl ? String(data.signatureUrl) : undefined,
    teamMemberId: data.teamMemberId ? String(data.teamMemberId) : undefined,
    ctaLabel: data.ctaLabel ? String(data.ctaLabel) : DEFAULT_DIRECTOR_MESSAGE.ctaLabel,
  };
}

export function resolveDirectorProfile(
  config: DirectorMessageSettings,
  team: TeamMemberLike[] = [],
) {
  const member = config.teamMemberId
    ? team.find((t) => (t._id ?? t.id) === config.teamMemberId)
    : undefined;

  const name = member?.name ?? member?.fullName ?? config.name;
  // Homepage CMS photo wins when set (local upload or URL); fall back to linked team avatar.
  const photoUrl = config.photoUrl ?? member?.avatarUrl ?? member?.avatar ?? undefined;
  const designation =
    config.designation.trim() || resolvePublicTitle(member) || DEFAULT_DIRECTOR_MESSAGE.designation;
  const profileHref = config.teamMemberId ? `/lawyers/${config.teamMemberId}` : "/lawyers";

  return { member, name, photoUrl, designation, profileHref };
}

export { filterLeadershipTeam, isLeadershipRole, resolvePublicTitle } from "@/shared/leadership";
