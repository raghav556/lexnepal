import type { UserDto } from "@/shared/contracts/identity";
import { useCurrentIdentityUser } from "@/client/queries/identity";

export type LexUser = UserDto;
export type UserRole = LexUser["role"];

export const STAFF_ROLES: UserRole[] = [
  "partner",
  "senior_associate",
  "associate",
  "paralegal",
  "intern",
];

export function useCurrentUser(): LexUser | null | undefined {
  return useCurrentIdentityUser();
}

export function getPortalForRole(role: UserRole): "/client" | "/staff" | "/admin" {
  if (role === "admin") return "/admin";
  if (role === "client") return "/client";
  return "/staff";
}
