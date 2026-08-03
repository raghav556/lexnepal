/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";
import { useDomainBackend } from "@/client/data/provider";
import { useCurrentIdentityUser } from "./identity";
import { api } from "@/convex/_generated/api.js";
// @ts-ignore
import { useConvex } from "convex/react";

// --- Messages ---
export function useMessages(caseId: string, isInternal?: boolean) {
  const backend = useDomainBackend("messages");
  const convex = useConvex();

  return useQuery({
    queryKey: [...queryKeys.cases.detail(caseId), "messages", isInternal],
    queryFn: async () => {
      if (backend === "convex") {
        return await convex.query(api.messages.listMessages as any, { 
          caseId: caseId as any, 
          isInternal,
          paginationOpts: { numItems: 50, cursor: null }
        });
      } else {
        const res = await fetch(`/api/communication/messages?caseId=${caseId}`);
        if (!res.ok) throw new Error("Failed to fetch messages");
        const data = await res.json();
        return { page: data, isDone: true, continueCursor: "" };
      }
    },
    enabled: !!caseId,
    refetchInterval: 5000, // Poll every 5 seconds per instructions
  });
}

export function useMessageCommands() {
  const backend = useDomainBackend("messages");
  const convex = useConvex();
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async (args: { caseId: string; content: string; isInternal: boolean; attachmentIds?: string[] }) => {
      if (backend === "convex") {
        return await convex.mutation(api.messages.sendMessage as any, {
          caseId: args.caseId as any,
          content: args.content,
          isInternal: args.isInternal,
          attachmentIds: args.attachmentIds || [],
        });
      } else {
        const res = await fetch("/api/communication/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        });
        if (!res.ok) throw new Error("Failed to send message");
        return res.json();
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(variables.caseId) });
    },
  });

  const markMessagesRead = useMutation({
    mutationFn: async (args: { caseId: string }) => {
      if (backend === "convex") {
        return await convex.mutation(api.messages.markMessagesRead as any, { caseId: args.caseId as any });
      } else {
        const res = await fetch("/api/communication/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        });
        if (!res.ok) throw new Error("Failed to mark messages as read");
        return res.json();
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(variables.caseId) });
    },
  });

  return { sendMessage, markMessagesRead };
}

// --- Notifications ---
export function useNotifications() {
  const backend = useDomainBackend("notifications");
  const convex = useConvex();
  const currentUser = useCurrentIdentityUser();

  return useQuery({
    queryKey: ["notifications", currentUser?.id],
    queryFn: async () => {
      if (backend === "convex") {
        return await convex.query(api.notifications.listNotifications as any, {});
      } else {
        const res = await fetch("/api/communication/notifications");
        if (!res.ok) throw new Error("Failed to fetch notifications");
        return res.json();
      }
    },
    enabled: !!currentUser?.id,
    refetchInterval: 10000, // Poll every 10 seconds per instructions
  });
}

export function useNotificationCommands() {
  const backend = useDomainBackend("notifications");
  const convex = useConvex();
  const queryClient = useQueryClient();
  const currentUser = useCurrentIdentityUser();

  const markRead = useMutation({
    mutationFn: async (args: { notificationId: string }) => {
      if (backend === "convex") {
        return await convex.mutation(api.notifications.markRead as any, { notificationId: args.notificationId as any });
      } else {
        const res = await fetch(`/api/communication/notifications/${args.notificationId}`, {
          method: "PATCH",
        });
        if (!res.ok) throw new Error("Failed to mark read");
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", currentUser?.id] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (backend === "convex") {
        return await convex.mutation(api.notifications.markAllRead as any, {});
      } else {
        const res = await fetch("/api/communication/notifications", {
          method: "PATCH",
        });
        if (!res.ok) throw new Error("Failed to mark all read");
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", currentUser?.id] });
    },
  });

  return { markRead, markAllRead };
}
