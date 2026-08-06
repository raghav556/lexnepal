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
    "At Srimar Law, we believe every client deserves clarity, integrity, and relentless advocacy. " +
    "Our firm combines deep courtroom experience with modern transparency — so you always know where your matter stands.",
  name: "Adv. Rajesh Sharma",
  designation: "Managing Partner",
  photoUrl:
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80",
  signatureUrl:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Joe_Biden_signature.svg/320px-Joe_Biden_signature.svg.png",
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
  const photoUrl =
    member?.avatarUrl ?? member?.avatar ?? config.photoUrl ?? undefined;
  const designation =
    config.designation.trim() || resolvePublicTitle(member) || DEFAULT_DIRECTOR_MESSAGE.designation;
  const profileHref = config.teamMemberId ? `/lawyers/${config.teamMemberId}` : "/lawyers";

  return { member, name, photoUrl, designation, profileHref };
}

export { filterLeadershipTeam, isLeadershipRole, resolvePublicTitle } from "@/shared/leadership";
