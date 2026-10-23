import { useInfiniteQuery, type QueryKey } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "@/client/api/client";
import { ApiClientError } from "@/client/api/errors";
import type { CollectionPage } from "@/shared/collection-page";
import { decodeMessageCursor } from "@/shared/message-cursor";
import { useAuthContext } from "@/client/auth/auth-provider";

export async function fetchCollectionPage<T>(
  path: string,
  query: Record<string, string | number | boolean | undefined>,
  cursor: string | undefined,
  signal?: AbortSignal,
  scope?: string,
) {
  const page = await apiClient.request<CollectionPage<T>>(path, {
    query: { ...query, page: "true", cursor },
    signal,
    deduplicationKey: scope,
  });
  if (
    !page ||
    !Array.isArray(page.items) ||
    !(page.nextCursor === null || typeof page.nextCursor === "string")
  ) {
    throw new Error("Continuation metadata unavailable. Please retry.");
  }
  if (
    page.items.some((row) => {
      if (!row || typeof row !== "object") return true;
      const id = (row as { id?: unknown }).id ?? (row as { _id?: unknown })._id;
      return typeof id !== "string" || id.length === 0;
    })
  ) {
    throw new Error("Record identity unavailable. Please retry.");
  }
  if (page.nextCursor) {
    const next = decodeMessageCursor(page.nextCursor),
      current = cursor ? decodeMessageCursor(cursor) : null;
    if (
      !next ||
      (current &&
        (next.createdAt > current.createdAt ||
          (next.createdAt.getTime() === current.createdAt.getTime() &&
            next.id.toLowerCase() >= current.id.toLowerCase())))
    ) {
      throw new Error("Invalid continuation progress. Refresh this collection.");
    }
  }
  return page;
}

/** One bounded request per explicit action; no automatic fetch-all loop. */
export function useCollectionScope() {
  const { identityUser: user } = useAuthContext();
  const scope = { firmId: user?.firmId, userId: user?.id, role: user?.role };
  return { scope, enabled: Boolean(user), requestScope: JSON.stringify(scope) };
}

export function useCollectionQuery<T extends { id?: string; _id?: string }>(options: {
  queryKey: QueryKey;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const { scope, enabled: authorized, requestScope } = useCollectionScope();
  const enabled = options.enabled !== false && authorized;
  const next = useInfiniteQuery({
    queryKey: [...options.queryKey, "continued", scope],
    queryFn: ({ pageParam, signal }) =>
      fetchCollectionPage<T>(options.path, options.query ?? {}, pageParam, signal, requestScope),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled,
    refetchInterval: options.refetchInterval,
  });
  const denied =
    next.error instanceof ApiClientError && [401, 403, 404].includes(next.error.status);
  const data = useMemo(() => {
    const byId = new Map<string, T>();
    for (const page of next.data?.pages ?? [])
      for (const row of page.items) {
        const id = row.id ?? row._id;
        if (id && !byId.has(id)) byId.set(id, row);
      }
    return next.data ? [...byId.values()] : undefined;
  }, [next.data]);
  return {
    ...next,
    data: denied || !enabled ? undefined : data,
    hasMore: denied ? false : next.data ? next.hasNextPage : undefined,
    enabled,
  };
}
