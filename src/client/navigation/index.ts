/**
 * Default entry for typecheckers; bundlers alias `@/client/navigation`
 * to `vite.ts` or `next.ts`. Prefer importing from `@/client/navigation`.
 */
export { Link, useNavigate, useParams, usePathname, useSearchParams } from "./next";
export type { AppLinkProps, NavigateFunction, NavigateOptions, SearchParamsTuple } from "./types";
