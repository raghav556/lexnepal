import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

export type LexUser = Doc<"users">;
export type UserRole = LexUser["role"];

export const STAFF_ROLES: UserRole[] = [
  "partner", "senior_associate", "associate", "paralegal", "intern",
];

/** Returns undefined while loading, null if unauthenticated, or the full user document */
export function useCurrentUser(): LexUser | null | undefined {
  return useQuery(api.users.getCurrentUser, {});
}

/** Maps a role to the portal path it belongs to */
export function getPortalForRole(role: UserRole): "/client" | "/staff" | "/admin" {
  if (role === "admin") return "/admin";
  if (role === "client") return "/client";
  return "/staff";
}
