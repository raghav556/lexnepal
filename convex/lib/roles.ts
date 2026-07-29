import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel.d.ts";

export type UserRole = Doc<"users">["role"];

export const STAFF_ROLES: UserRole[] = ["partner", "senior_associate", "associate", "paralegal", "intern"];

// Returns the authenticated user if their role is in allowedRoles, otherwise throws
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: UserRole[],
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  if (!allowedRoles.includes(user.role)) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Access denied: insufficient role" });
  }
  return user;
}

// Returns the authenticated user regardless of role (just checks auth + user exists)
export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  return user;
}
