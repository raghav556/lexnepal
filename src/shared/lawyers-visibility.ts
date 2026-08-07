/**
 * Our Team / Lawyers visibility matrix (LW-0)
 *
 * | Surface                 | Rule                                                         |
 * |-------------------------|--------------------------------------------------------------|
 * | /lawyers                | isPublicFacing && isActive && !deleted                       |
 * | /lawyers/[id]           | same; else 404                                               |
 * | Home team section       | same roster (all featured), ordered by displayOrder          |
 * | Practice area sidebar   | featured + practiceArea tag match                            |
 * | Sitemap                 | each featured lawyer /lawyers/{id}                           |
 * | Consultation ?lawyerId= | must resolve to featured public profile                      |
 *
 * Public API never returns: internal email, phone, isPending, isActive.
 * Public may return: publicEmail, publicPhone, barCouncil*, languages, yearsExperience.
 *
 * Owner acceptance:
 * 1. Admin edits practice areas / education / years → same on /lawyers cards (no fake specialties).
 * 2. Profile: breadcrumbs, sidebar Book, related colleagues, ribbons.
 * 3. Book from profile → consultation shows “Booking with {Name}”.
 * 4. Public team JSON has no internal email.
 * 5. Hidden/non-public id → 404 on GET /team/[id] and profile page.
 */

export const PUBLIC_TEAM_ROLES = [
  "partner",
  "senior_associate",
  "associate",
  "paralegal",
] as const;

export type PublicTeamRole = (typeof PUBLIC_TEAM_ROLES)[number];

export function isPublicTeamRole(role: string): role is PublicTeamRole {
  return (PUBLIC_TEAM_ROLES as readonly string[]).includes(role);
}

export function consultationHrefForLawyer(lawyerId: string, practiceArea?: string | null): string {
  const params = new URLSearchParams();
  params.set("lawyerId", lawyerId);
  if (practiceArea?.trim()) params.set("practiceArea", practiceArea.trim());
  return `/consultation?${params.toString()}`;
}
