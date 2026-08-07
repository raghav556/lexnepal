/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
import { useCurrentIdentityUser } from "@/client/queries/identity";
import { queryKeys } from "@/client/queries/query-keys";

export function useMessages(caseId: string, isInternal?: boolean) {
  const next = useQuery({
    queryKey: [...queryKeys.cases.detail(caseId), "messages", isInternal],
    queryFn: ({ signal }) =>
      apiClient.request<{ page: any[]; isDone: boolean; continueCursor: string }>(
        "/api/v1/messages",
        {
          query: {
            caseId,
            isInternal: isInternal === undefined ? undefined : String(isInternal),
          },
          signal,
        },
      ),
    enabled: !!caseId,
    refetchInterval: 5000,
  });
  return { data: next.data, isLoading: next.isLoading };
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
  return { data: next.data ?? {}, isLoading: next.isLoading };
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
  const next = useQuery({
    queryKey: ["notifications", currentUser?.id],
    queryFn: ({ signal }) => apiClient.request<any[]>("/api/v1/notifications", { signal }),
    enabled: !!currentUser?.id,
    refetchInterval: 10_000,
  });
  return { data: next.data ?? [], isLoading: next.isLoading };
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
    mutationFn: async (args: {
      to: string;
      subject: string;
      body: string;
      relatedId?: string;
    }) => {
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
