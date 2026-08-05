"use client";

import {
  Link as RouterLink,
  useNavigate as useRRNavigate,
  useParams as useRRParams,
  useLocation,
  useSearchParams as useRRSearchParams,
} from "react-router-dom";
import type { AppLinkProps, NavigateFunction, SearchParamsTuple } from "./types";

export function Link({ href, children, replace, prefetch: _prefetch, ...rest }: AppLinkProps) {
  return (
    <RouterLink to={href} replace={replace} {...rest}>
      {children}
    </RouterLink>
  );
}

export function useNavigate(): NavigateFunction {
  const navigate = useRRNavigate();
  return (to, options) => {
    navigate(to, { replace: options?.replace });
  };
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return useRRParams() as T;
}

export function usePathname(): string {
  return useLocation().pathname;
}

export function useSearchParams(): SearchParamsTuple {
  const [params, setParams] = useRRSearchParams();
  return [
    params,
    (nextInit) => {
      setParams(nextInit);
    },
  ];
}

export type { AppLinkProps, NavigateFunction, NavigateOptions, SearchParamsTuple } from "./types";
