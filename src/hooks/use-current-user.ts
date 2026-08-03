import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { useCurrentIdentityUser } from "@/client/queries/identity";

export type LexUser = Doc<"users">;
export type UserRole = LexUser["role"];

export const STAFF_ROLES: UserRole[] = [
  "partner",
  "senior_associate",
  "associate",
  "paralegal",
  "intern",
];

export function useCurrentUser(): LexUser | null | undefined {
  return useCurrentIdentityUser() as LexUser | null | undefined;
}

export function getPortalForRole(role: UserRole): "/client" | "/staff" | "/admin" {
  if (role === "admin") return "/admin";
  if (role === "client") return "/client";
  return "/staff";
}
