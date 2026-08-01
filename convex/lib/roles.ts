import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel.d.ts";

export type UserRole = Doc<"users">["role"];

export const STAFF_ROLES: UserRole[] = [
  "partner", "senior_associate", "associate", "paralegal", "intern",
];

export function isStaffOrAdmin(role: string) {
  return STAFF_ROLES.includes(role as any) || role === "admin";
}

export type Capability =
  | "users.manage"
  | "users.view_directory"
  | "cases.view_all"
  | "cases.manage"
  | "finance.manage"
  | "hr.manage"
  | "cms.manage"
  | "audit.view"
  | "settings.manage";

/** Default role → capability matrix (overridable via firmSettings key rolePermissions) */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Capability[]> = {
  admin: [
    "users.manage", "users.view_directory", "cases.view_all", "cases.manage",
    "finance.manage", "hr.manage", "cms.manage", "audit.view", "settings.manage",
  ],
  partner: [
    "users.view_directory", "cases.view_all", "cases.manage",
    "finance.manage", "hr.manage", "audit.view",
  ],
  senior_associate: [
    "users.view_directory", "cases.view_all", "cases.manage",
  ],
  associate: ["users.view_directory", "cases.manage"],
  paralegal: ["users.view_directory", "cases.manage"],
  intern: ["users.view_directory"],
  client: [],
};

async function getUserByIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  if (!user.isActive) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Account is suspended" });
  }
  if (user.isPending) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Account invitation is pending activation" });
  }
  return user;
}

export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  return getUserByIdentity(ctx);
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: UserRole[],
): Promise<Doc<"users">> {
  const user = await getUserByIdentity(ctx);
  if (!allowedRoles.includes(user.role)) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Access denied: insufficient role" });
  }
  return user;
}

export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  capability: Capability,
): Promise<Doc<"users">> {
  const user = await getUserByIdentity(ctx);
  if (user.role === "admin") return user;

  const override = await ctx.db
    .query("firmSettings")
    .withIndex("by_key", (q) => q.eq("key", "rolePermissions"))
    .first();
  const matrix = (override?.value as Record<string, Capability[]> | undefined) || DEFAULT_ROLE_PERMISSIONS;
  const caps = matrix[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role] || [];
  if (!caps.includes(capability)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `Access denied: missing permission ${capability}`,
    });
  }
  return user;
}

export async function writeUserAudit(
  ctx: MutationCtx,
  actorId: Doc<"users">["_id"],
  action: string,
  resourceId: string,
  details?: string,
) {
  await ctx.db.insert("auditLog", {
    userId: actorId,
    action,
    resource: "users",
    resourceId,
    details,
  });
}
