/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";

export type DmThreadDto = {
  _id: string;
  peerUserId: string;
  peerName: string;
  peerRole?: string;
  lastMessage?: { content: string; senderId: string; createdAt: string } | null;
  unreadCount?: number;
  lastMessageAt?: string | null;
};

export function useDmThreads() {
  const next = useQuery({
    queryKey: ["dm", "threads"],
    queryFn: ({ signal }) => apiClient.request<DmThreadDto[]>("/api/v1/dm/threads", { signal }),
    refetchInterval: 8_000,
  });
  return { data: next.data ?? [], isLoading: next.isLoading };
}

export function useDmMessages(threadId: string | null) {
  const next = useQuery({
    queryKey: ["dm", "threads", threadId, "messages"],
    queryFn: ({ signal }) =>
      apiClient.request<{ page: any[] }>(`/api/v1/dm/threads/${threadId}/messages`, { signal }),
    enabled: !!threadId,
    refetchInterval: 4_000,
  });
  return { data: next.data?.page ?? [], isLoading: next.isLoading };
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
