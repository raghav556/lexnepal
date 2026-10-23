import { describe, expect, it } from "vitest";
import { AppError } from "@/shared/errors/api-error";
import { resolveCapabilities } from "@/server/auth/capabilities";
import type { AuthPrincipal, AuthUser, UserRole } from "@/server/auth/types";
import {
  assertOwnCmsAssetIntent,
  authorizeCmsAssetAccess,
} from "@/server/policies/cms-asset-access";

function principal(role: UserRole, userId = "user-1", firmId = "firm-1"): AuthPrincipal {
  const user: AuthUser = {
    id: userId,
    firmId,
    tokenIdentifier: `issuer|${userId}`,
    name: null,
    email: null,
    role,
    isActive: true,
    isPending: false,
    avatar: null,
    phone: null,
  };
  return {
    user,
    firmId,
    capabilities: resolveCapabilities(role, undefined),
    sessionId: "session-1",
    authenticationMethod: "session_cookie",
  };
}

describe("CMS asset upload authorization", () => {
  it("lets content submitters upload only blog covers and news images", () => {
    const staff = principal("associate");
    expect(authorizeCmsAssetAccess(staff, "blog_cover").manager).toBe(false);
    expect(authorizeCmsAssetAccess(staff, "news_image").actorId).toBe("user-1");
    expect(() => authorizeCmsAssetAccess(staff, "logo")).toThrow(AppError);
  });

  it("keeps every purpose available to cms.manage", () => {
    const admin = principal("admin");
    expect(authorizeCmsAssetAccess(admin, "logo").manager).toBe(true);
    expect(authorizeCmsAssetAccess(admin, "hero_image").manager).toBe(true);
    expect(authorizeCmsAssetAccess(admin, "blog_cover").manager).toBe(true);
  });

  it("denies users without either CMS capability", () => {
    expect(() => authorizeCmsAssetAccess(principal("paralegal"), "blog_cover")).toThrow(
      /missing permission cms\.manage/,
    );
  });

  it("denies a submitter from another user's intent and allows their own", () => {
    const access = authorizeCmsAssetAccess(principal("associate", "staff-a"));
    expect(() => assertOwnCmsAssetIntent(access, "staff-b")).toThrow(AppError);
    expect(() => assertOwnCmsAssetIntent(access, "staff-a")).not.toThrow();
  });

  it("lets a manager open another user's intent in the same firm", () => {
    const access = authorizeCmsAssetAccess(principal("admin", "admin-1"));
    expect(() => assertOwnCmsAssetIntent(access, "staff-b")).not.toThrow();
  });
});
