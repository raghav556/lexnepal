import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { REQUEST_ID_HEADER } from "@/shared/constants/application";
import { findCmsRedirect, normalizeRedirectPath } from "@/server/cms/redirect-cache";

const validRequestId = /^[A-Za-z0-9._:-]{1,128}$/;

export function proxy(request: NextRequest) {
  const incoming = request.headers.get(REQUEST_ID_HEADER);
  const requestId = incoming && validRequestId.test(incoming) ? incoming : crypto.randomUUID();

  const pathname = normalizeRedirectPath(request.nextUrl.pathname);
  if (
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    pathname !== "/favicon.ico"
  ) {
    const hit = findCmsRedirect(pathname);
    if (hit) {
      const target = hit.to.startsWith("http")
        ? hit.to
        : new URL(hit.to, request.nextUrl.origin).toString();
      const response = NextResponse.redirect(target, hit.permanent === false ? 307 : 308);
      response.headers.set(REQUEST_ID_HEADER, requestId);
      return response;
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
