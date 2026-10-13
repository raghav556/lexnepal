"use client";

import type { ReactNode } from "react";
import { ClientQueryError } from "./client-query-error";

export type ClientSectionQuery = {
  data?: unknown;
  /** Wrappers that default missing data to [] or {} must retain this distinction. */
  hasData?: boolean;
  isError: boolean;
  error?: unknown;
  isFetching?: boolean;
  refetch: () => unknown;
};

export function clientQueryHasData(query: ClientSectionQuery): boolean {
  const status = (query.error as { status?: number } | null)?.status;
  // Cached information must not bypass a revoked session or access denial.
  if (query.isError && (status === 401 || status === 403 || status === 404)) return false;
  return query.hasData ?? query.data !== undefined;
}

/** Client-only section feedback. Cached results survive ordinary refetch failures. */
export function ClientQueryBoundary({
  query,
  title,
  loadingLabel,
  children,
}: {
  query: ClientSectionQuery;
  title: string;
  loadingLabel: string;
  children?: ReactNode;
}) {
  const available = clientQueryHasData(query);
  return (
    <>
      {query.isError ? (
        <ClientQueryError
          title={title}
          onRetry={() => {
            void query.refetch();
          }}
          retrying={query.isFetching}
        />
      ) : !available ? (
        <p role="status" className="text-sm text-muted-foreground">
          {loadingLabel}
        </p>
      ) : null}
      {available ? children : null}
    </>
  );
}

export function clientQuerySummary(
  query: ClientSectionQuery,
  empty: string,
  loading: string,
  unavailable: string,
): string {
  return clientQueryHasData(query) ? empty : query.isError ? unavailable : loading;
}
