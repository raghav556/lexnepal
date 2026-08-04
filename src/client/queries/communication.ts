/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { anyApi as api } from "convex/server";
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "@/client/data/convex-bridge";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
import { useDomainBackend } from "@/client/data/provider";
import { useCurrentIdentityUser } from "@/client/queries/identity";
import { queryKeys } from "@/client/queries/query-keys";

export function useMessages(caseId: string, isInternal?: boolean) {
  const backend = useDomainBackend("messages");
  const convex = useConvexQuery(
    api.messages.listMessages as any,
    backend === "convex" && caseId
      ? ({ caseId, isInternal, paginationOpts: { numItems: 50, cursor: null } } as any)
      : "skip",
  );
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
    enabled: backend === "next" && !!caseId,
    refetchInterval: 5000,
  });
  return {
    data: backend === "convex" ? convex : next.data,
    isLoading: backend === "next" ? next.isLoading : convex === undefined,
  };
}

export function useMessageCommands() {
  const backend = useDomainBackend("messages");
  const queryClient = useQueryClient();
  const convexSend = useConvexMutation(api.messages.sendMessage as any);
  const convexMarkRead = useConvexMutation(api.messages.markMessagesRead as any);

  const sendMessage = useMutation({
    mutationFn: async (args: {
      caseId: string;
      content: string;
      isInternal: boolean;
      attachmentIds?: string[];
    }) => {
      try {
        if (backend === "convex") {
          return await convexSend({
            caseId: args.caseId,
            content: args.content,
            isInternal: args.isInternal,
            attachmentIds: args.attachmentIds || [],
          });
        }
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
    },
  });

  const markMessagesRead = useMutation({
    mutationFn: async (args: { caseId: string }) => {
      try {
        if (backend === "convex") return await convexMarkRead({ caseId: args.caseId });
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
    },
  });

  return { sendMessage, markMessagesRead };
}

export function useNotifications() {
  const backend = useDomainBackend("notifications");
  const currentUser = useCurrentIdentityUser();
  const convex = useConvexQuery(
    api.notifications.listNotifications as any,
    backend === "convex" && currentUser?.id ? {} : "skip",
  );
  const next = useQuery({
    queryKey: ["notifications", currentUser?.id],
    queryFn: ({ signal }) => apiClient.request<any[]>("/api/v1/notifications", { signal }),
    enabled: backend === "next" && !!currentUser?.id,
    refetchInterval: 10_000,
  });
  return {
    data: (backend === "convex" ? convex : next.data) ?? [],
    isLoading: backend === "next" ? next.isLoading : convex === undefined,
  };
}

export function useNotificationCommands() {
  const backend = useDomainBackend("notifications");
  const queryClient = useQueryClient();
  const currentUser = useCurrentIdentityUser();
  const convexMarkRead = useConvexMutation(api.notifications.markRead as any);
  const convexMarkAll = useConvexMutation(api.notifications.markAllRead as any);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["notifications", currentUser?.id] });

  const markRead = useMutation({
    mutationFn: async (args: { notificationId: string }) => {
      try {
        if (backend === "convex") {
          return await convexMarkRead({ notificationId: args.notificationId });
        }
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
        if (backend === "convex") return await convexMarkAll({});
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
  const backend = useDomainBackend("messages");
  const convexSend = useConvexMutation(api.communications.sendEmail as any);

  const sendEmail = useMutation({
    mutationFn: async (args: {
      to: string;
      subject: string;
      body: string;
      relatedId?: string;
    }) => {
      try {
        if (backend === "convex") return await convexSend(args);
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
