/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
import { mergeMessagePages } from "@/shared/message-cursor";

export type DmThreadDto = {
  _id: string;
  peerUserId: string;
  peerName: string;
  peerRole?: string;
  lastMessage?: { content: string; senderId: string; createdAt: string } | null;
  unreadCount?: number;
  lastMessageAt?: string | null;
};

export type DmMessageListPage = {
  page: any[];
  isDone: boolean;
  continueCursor: string;
};

const DEFAULT_DM_PAGE = 30;

export async function fetchDmMessagePage(args: {
  threadId: string;
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<DmMessageListPage> {
  return apiClient.request<DmMessageListPage>(`/api/v1/dm/threads/${args.threadId}/messages`, {
    query: {
      cursor: args.cursor,
      limit: args.limit ?? DEFAULT_DM_PAGE,
    },
    signal: args.signal,
  });
}

export function useDmThreads() {
  const next = useQuery({
    queryKey: ["dm", "threads"],
    queryFn: ({ signal }) => apiClient.request<DmThreadDto[]>("/api/v1/dm/threads", { signal }),
    refetchInterval: 8_000,
  });
  return { data: next.data ?? [], isLoading: next.isLoading };
}

export function useDmMessages(threadId: string | null, limit = DEFAULT_DM_PAGE) {
  const next = useQuery({
    queryKey: ["dm", "threads", threadId, "messages", limit],
    queryFn: ({ signal }) => fetchDmMessagePage({ threadId: threadId!, limit, signal }),
    enabled: !!threadId,
    refetchInterval: 4_000,
  });
  return {
    data: next.data?.page ?? [],
    page: next.data,
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

export function useDmMessageHistory(threadId: string | null, limit = DEFAULT_DM_PAGE) {
  const latest = useDmMessages(threadId, limit);
  const streamKey = `${threadId ?? ""}:${limit}`;
  const [bucket, setBucket] = useState<HistoryBucket>({
    key: streamKey,
    older: [],
    continueCursor: "",
    hasMore: null,
  });

  if (bucket.key !== streamKey) {
    setBucket({ key: streamKey, older: [], continueCursor: "", hasMore: null });
  }

  const active =
    bucket.key === streamKey
      ? bucket
      : { key: streamKey, older: [], continueCursor: "", hasMore: null };

  const messages = useMemo(
    () => mergeMessagePages(active.older, latest.data),
    [active.older, latest.data],
  );

  const continueCursor =
    active.older.length === 0 ? latest.page?.continueCursor || "" : active.continueCursor;
  const hasMore =
    active.older.length === 0
      ? latest.page
        ? !latest.page.isDone
        : false
      : Boolean(active.hasMore);

  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [earlierError, setEarlierError] = useState<string | null>(null);

  const loadEarlier = useCallback(async () => {
    if (!threadId || !continueCursor || loadingEarlier) return;
    setLoadingEarlier(true);
    setEarlierError(null);
    try {
      const page = await fetchDmMessagePage({
        threadId,
        cursor: continueCursor,
        limit,
      });
      setBucket({
        key: streamKey,
        older: mergeMessagePages(page.page, active.older),
        continueCursor: page.continueCursor || "",
        hasMore: !page.isDone,
      });
    } catch (error) {
      setEarlierError(error instanceof Error ? error.message : "Could not load earlier messages.");
    } finally {
      setLoadingEarlier(false);
    }
  }, [active.older, continueCursor, limit, loadingEarlier, streamKey, threadId]);

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
    loadEarlier,
  };
}

export function useDmCommands() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["dm"] });
  };

  const openThread = useMutation({
    mutationFn: async (peerUserId: string) => {
      try {
        return await apiClient.request<DmThreadDto>("/api/v1/dm/threads", {
          method: "POST",
          body: { peerUserId },
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const sendMessage = useMutation({
    mutationFn: async (args: { threadId: string; content: string; attachmentIds?: string[] }) => {
      try {
        return await apiClient.request(`/api/v1/dm/threads/${args.threadId}/messages`, {
          method: "POST",
          body: { content: args.content, attachmentIds: args.attachmentIds },
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const markRead = useMutation({
    mutationFn: async (threadId: string) => {
      try {
        return await apiClient.request(`/api/v1/dm/threads/${threadId}/read`, {
          method: "POST",
          body: {},
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  return { openThread, sendMessage, markRead };
}
