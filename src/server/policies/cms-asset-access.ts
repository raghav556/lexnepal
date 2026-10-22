import "server-only";
import { AppError } from "@/shared/errors/api-error";
import type { CmsAssetPurpose } from "@/shared/cms-assets";
import type { AuthPrincipal } from "@/server/auth/types";
import { requireFirmContext } from "@/server/policies/authorization";

const STAFF_CONTENT_PURPOSES = new Set<CmsAssetPurpose>(["blog_cover", "news_image"]);

export interface CmsAssetAccess {
  firmId: string;
  actorId: string;
  manager: boolean;
}

export function authorizeCmsAssetAccess(
  principal: AuthPrincipal,
  purpose?: CmsAssetPurpose,
): CmsAssetAccess {
  const context = requireFirmContext(principal);
  const manager = principal.capabilities.has("cms.manage");
  const submitter = principal.capabilities.has("cms.content_submit");
  if (!manager && !submitter) {
    throw new AppError("FORBIDDEN", "Access denied: missing permission cms.manage", 403);
  }
  if (!manager && purpose && !STAFF_CONTENT_PURPOSES.has(purpose)) {
    throw new AppError("FORBIDDEN", "Access denied: missing permission cms.manage", 403);
  }
  return { ...context, manager };
}

export function assertOwnCmsAssetIntent(access: CmsAssetAccess, createdBy: string): void {
  if (!access.manager && createdBy !== access.actorId) {
    throw new AppError("FORBIDDEN", "Access denied: missing permission cms.manage", 403);
  }
}
