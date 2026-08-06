/** Roles eligible to be featured as firm leadership on the homepage director message. */
export const LEADERSHIP_ROLES = ["partner", "senior_associate"] as const;

export type LeadershipRole = (typeof LEADERSHIP_ROLES)[number];

export const LEADERSHIP_TITLE_EXAMPLES = [
  "Managing Partner",
  "Senior Partner",
  "Founding Partner",
  "Director of Litigation",
  "Head of Corporate Practice",
] as const;

type MemberLike = {
  role?: string;
  leadershipTitle?: string | null;
};

export function isLeadershipRole(role?: string): role is LeadershipRole {
  return LEADERSHIP_ROLES.includes(role as LeadershipRole);
}

export function formatPublicRole(role?: string) {
  if (!role) return "Advocate";
  return role.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Public-facing title: custom leadership title wins over formatted system role. */
export function resolvePublicTitle(member: MemberLike | null | undefined) {
  const title = member?.leadershipTitle?.trim();
  if (title) return title;
  return formatPublicRole(member?.role);
}

export function filterLeadershipTeam<T extends MemberLike>(team: T[] = []) {
  return team.filter((member) => isLeadershipRole(member.role));
}
