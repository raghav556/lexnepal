import type { UserDto } from "@/shared/contracts/identity";
import { useAuthContext } from "@/client/auth/auth-provider";

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
  return useAuthContext().identityUser;
}

export function getPortalForRole(role: UserRole): "/client" | "/staff" | "/admin" {
  if (role === "admin") return "/admin";
  if (role === "client") return "/client";
  return "/staff";
}
