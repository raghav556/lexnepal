import { join } from "node:path";
import { readFileSync } from "node:fs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
const REQUEST_ID_HEADER = "x-request-id";
const REDIRECTS_FILE = join(process.cwd(), ".local", "cms-redirects.json");
function readCmsRedirects(): Array<{ from: string; to: string; permanent?: boolean }> {
  try {
    return JSON.parse(readFileSync(REDIRECTS_FILE, "utf8"));
  } catch {
    return [];
  }
}
function normalizeRedirectPath(pathname: string): string {
  if (!pathname) return "/";
  const noQuery = pathname.split("?")[0] || "/";
  if (noQuery.length > 1 && noQuery.endsWith("/")) return noQuery.slice(0, -1);
  return noQuery;
}
function findCmsRedirect(pathname: string) {
  const from = normalizeRedirectPath(pathname);
  return readCmsRedirects().find((r) => normalizeRedirectPath(r.from) === from);
}
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
