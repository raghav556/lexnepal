import { useCollectionQuery } from "@/client/queries/collection";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
import { useCurrentIdentityUser } from "@/client/queries/identity";
import { queryKeys } from "@/client/queries/query-keys";
import { mergeMessagePages } from "@/shared/message-cursor";

export type MessageListPage = {
  page: any[];
  isDone: boolean;
  continueCursor: string;
};

const DEFAULT_MESSAGE_PAGE = 30;

export async function fetchMessagePage(args: {
  caseId: string;
  isInternal?: boolean;
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<MessageListPage> {
  return apiClient.request<MessageListPage>("/api/v1/messages", {
    query: {
      caseId: args.caseId,
      isInternal: args.isInternal === undefined ? undefined : String(args.isInternal),
      cursor: args.cursor,
      limit: args.limit ?? DEFAULT_MESSAGE_PAGE,
    },
    signal: args.signal,
  });
}

/** Latest page poll — existing callers that only need the recent window. */
export function useMessages(caseId: string, isInternal?: boolean, limit = DEFAULT_MESSAGE_PAGE) {
  const next = useQuery({
    queryKey: [...queryKeys.cases.detail(caseId), "messages", isInternal, limit],
    queryFn: ({ signal }) => fetchMessagePage({ caseId, isInternal, limit, signal }),
    enabled: !!caseId,
    refetchInterval: 5000,
  });
  return {
    data: next.data,
    isLoading: next.isLoading,
    isError: next.isError,
    error: next.error,
    isFetching: next.isFetching,
    refetch: next.refetch,
  };
}

type HistoryBucket = {
  key: string;
  older: any[];
  continueCursor: string;
  hasMore: boolean | null;
};

/**
 * Accumulating matter history: keeps earlier pages across polls, supports
 * "Load earlier messages", and never drops already-loaded messages.
 */
export function useMatterMessageHistory(
  caseId: string,
  isInternal?: boolean,
  limit = DEFAULT_MESSAGE_PAGE,
) {
  const latest = useMessages(caseId, isInternal, limit);
  const streamKey = `${caseId}:${String(isInternal)}:${limit}`;
  const [bucket, setBucket] = useState<HistoryBucket>({
    key: streamKey,
    older: [],
    continueCursor: "",
    hasMore: null,
  });

  if (bucket.key !== streamKey) {
    setBucket({ key: streamKey, older: [], continueCursor: "", hasMore: null });
  }

  const active = bucket.key === streamKey ? bucket : { key: streamKey, older: [], continueCursor: "", hasMore: null };

  const messages = useMemo(
    () => mergeMessagePages(active.older, latest.data?.page ?? []),
    [active.older, latest.data?.page],
  );

  const continueCursor =
    active.older.length === 0
      ? latest.data?.continueCursor || ""
      : active.continueCursor;
  const hasMore =
    active.older.length === 0
      ? latest.data
        ? !latest.data.isDone
        : false
      : Boolean(active.hasMore);

  const loadEarlier = useCallback(async () => {
    if (!caseId || !continueCursor) return;
    const page = await fetchMessagePage({
      caseId,
      isInternal,
      cursor: continueCursor,
      limit,
    });
    setBucket((prev) => {
      const older = prev.key === streamKey ? prev.older : [];
      return {
        key: streamKey,
        older: mergeMessagePages(page.page, older),
        continueCursor: page.continueCursor || "",
        hasMore: !page.isDone,
      };
    });
  }, [caseId, continueCursor, isInternal, limit, streamKey]);

  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [earlierError, setEarlierError] = useState<string | null>(null);

  const loadEarlierSafe = useCallback(async () => {
    if (!continueCursor || loadingEarlier) return;
    setLoadingEarlier(true);
    setEarlierError(null);
    try {
      await loadEarlier();
    } catch (error) {
      setEarlierError(error instanceof Error ? error.message : "Could not load earlier messages.");
    } finally {
      setLoadingEarlier(false);
    }
  }, [continueCursor, loadEarlier, loadingEarlier]);

  return {
    messages,
    isLoading: latest.isLoading && messages.length === 0,
    isError: latest.isError,
    error: latest.error,
    isFetching: latest.isFetching,
    refetch: latest.refetch,
    hasMore,
    continueCursor,
    loadingEarlier,
    earlierError,
    loadEarlier: loadEarlierSafe,
  };
}

export function useUnreadMessageCounts(caseIds: string[]) {
  const key = [...caseIds].sort().join(",");
  const next = useQuery({
    queryKey: ["messages", "unread", key],
    queryFn: ({ signal }) =>
      apiClient.request<Record<string, number>>("/api/v1/messages/unread", {
        query: { caseIds: key },
        signal,
      }),
    enabled: caseIds.length > 0,
    refetchInterval: 10_000,
  });
  return {
    data: next.data ?? {},
    hasData: next.data !== undefined,
    isLoading: next.isLoading,
    isFetched: next.isFetched,
    isError: next.isError,
    error: next.error,
    isFetching: next.isFetching,
    refetch: next.refetch,
  };
}

export function useMessageCommands() {
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async (args: {
      caseId: string;
      content: string;
      isInternal: boolean;
      attachmentIds?: string[];
    }) => {
      try {
        return await apiClient.request("/api/v1/messages", {
          method: "POST",
          body: {
            caseId: args.caseId,
            content: args.content,
            isInternal: args.isInternal,
            attachmentIds: args.attachmentIds,
          },
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(variables.caseId) });
      queryClient.invalidateQueries({ queryKey: ["messages", "unread"] });
    },
  });

  const markMessagesRead = useMutation({
    mutationFn: async (args: { caseId: string }) => {
      try {
        return await apiClient.request("/api/v1/messages/read", {
          method: "POST",
          body: { caseId: args.caseId },
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(variables.caseId) });
      queryClient.invalidateQueries({ queryKey: ["messages", "unread"] });
    },
  });

  return { sendMessage, markMessagesRead };
}

export function useNotifications() {
  const currentUser = useCurrentIdentityUser();
  const next = useCollectionQuery<any>({
    queryKey: ["notifications", currentUser?.id], path: "/api/v1/notifications",
    enabled: !!currentUser?.id, refetchInterval: 10_000,
  });
  return {
    ...next,
    data: next.data ?? [],
    hasData: next.data !== undefined,
    isLoading: next.isLoading,
    isFetching: next.isFetching,
    isError: next.isError,
    error: next.error,
    refetch: next.refetch,
  };
}

export function useNotificationCommands() {
  const queryClient = useQueryClient();
  const currentUser = useCurrentIdentityUser();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["notifications", currentUser?.id] });

  const markRead = useMutation({
    mutationFn: async (args: { notificationId: string }) => {
      try {
        return await apiClient.request(`/api/v1/notifications/${args.notificationId}`, {
          method: "PATCH",
          body: {},
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      try {
        return await apiClient.request("/api/v1/notifications", { method: "PATCH", body: {} });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  return { markRead, markAllRead };
}

export function useEmailCommands() {
  const sendEmail = useMutation({
    mutationFn: async (args: { to: string; subject: string; body: string; relatedId?: string }) => {
      try {
        return await apiClient.request("/api/v1/communications/email", {
          method: "POST",
          body: args,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  });

  return { sendEmail };
}
