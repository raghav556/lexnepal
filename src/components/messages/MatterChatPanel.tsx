"use client";
import { relativeNepalDay } from "@/lib/nepali-calendar";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MessageSquare, Lock, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMatterMessageHistory, useMessageCommands } from "@/client/queries/communication";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import { computeSHA256 } from "@/lib/document-utils.ts";
import { apiClient } from "@/client/api/client";
import { ClientQueryError } from "@/components/dashboard/client-query-error";
import { messageIdOf } from "@/shared/message-cursor";
import {
  LuxuryChatBubble,
  LuxuryChatComposer,
  LuxuryChatHeader,
  type UnifiedChatMessage,
} from "@/components/chat";

type DirectoryUser = { _id?: string; id?: string; name?: string | null; role?: string };

export type MatterChatPanelProps = {
  caseId: string;
  title?: string;
  subtitle?: string;
  caseNumber?: string;
  mode: "client" | "staff";
  /**
   * Staff stream filter:
   * - client: only client-visible messages (force Client Reply)
   * - team: only internal case-team messages (force Internal)
   * - all: mixed list with toggle
   */
  stream?: "client" | "team" | "all";
  onStreamChange?: (stream: "client" | "team") => void;
  users?: DirectoryUser[];
  className?: string;
  showBack?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  bordered?: boolean;
  /** Client portal light presentation. Default preserves Staff dark appearance. */
  appearance?: "default" | "client";
  /** Opt-in keyboard access to the message log; existing consumers keep their tab order. */
  keyboardScrollable?: boolean;
  externalLink?: string;
  externalLinkLabel?: string;
  /** Existing composer snippets. Defaults to the current staff behavior. */
  showTemplates?: boolean;
};

async function uploadAttachmentStorageId(file: File, caseId: string): Promise<string> {
  const sha256 = await computeSHA256(file);
  const intent = await apiClient.request<{
    intentId: string;
    upload: { url: string; fields: Record<string, string> };
  }>("/api/v1/document-upload-intents", {
    method: "POST",
    body: {
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      sha256,
      caseId,
    },
  });
  const form = new FormData();
  Object.entries(intent.upload.fields).forEach(([key, value]) => form.append(key, value));
  form.append("file", file);
  const uploaded = await fetch(intent.upload.url, { method: "POST", body: form });
  if (!uploaded.ok) throw new Error("Attachment upload rejected by storage");
  await apiClient.request(`/api/v1/document-upload-intents/${intent.intentId}/complete`, {
    method: "POST",
    body: {},
  });
  return (
    intent.upload.fields.key ||
    intent.upload.fields.Key ||
    `quarantine-attachment:${intent.intentId}`
  );
}

function formatDateSeparator(dateInput?: string | Date): string { return dateInput ? relativeNepalDay(dateInput) : ""; }

export function MatterChatPanel({
  caseId,
  title = "Matter Chat",
  subtitle,
  caseNumber,
  mode,
  stream = "all",
  onStreamChange,
  users = [],
  className,
  showBack,
  onBack,
  onClose,
  bordered = true,
  appearance = "default",
  keyboardScrollable = false,
  externalLink,
  externalLinkLabel,
  showTemplates,
}: MatterChatPanelProps) {
  const currentUser = useCurrentUser();
  const isClientAppearance = appearance === "client";
  const listFilter =
    mode === "client" ? false : stream === "team" ? true : stream === "client" ? false : undefined;

  const {
    messages,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    hasMore,
    loadingEarlier,
    earlierError,
    loadEarlier,
  } = useMatterMessageHistory(caseId, listFilter);
  const errorStatus = (error as { status?: number } | null)?.status;
  const clientAccessDenied =
    isClientAppearance && isError && [401, 403, 404].includes(errorStatus ?? 0);
  const { sendMessage, markMessagesRead } = useMessageCommands();

  const forcedInternal = mode === "staff" && stream === "team";
  const forcedClient = mode === "client" || (mode === "staff" && stream === "client");

  const [isInternal, setIsInternal] = useState(forcedInternal);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const pendingPrependRef = useRef<{ height: number; top: number } | null>(null);
  const justSentRef = useRef(false);
  const openedKeyRef = useRef("");

  useEffect(() => {
    setIsInternal(forcedInternal);
  }, [forcedInternal, caseId, stream]);

  const markRead = markMessagesRead.mutate;
  useEffect(() => {
    if (caseId) markRead({ caseId });
  }, [caseId, stream, markRead]);

  useEffect(() => {
    const key = `${caseId}:${String(listFilter)}`;
    if (openedKeyRef.current !== key) {
      openedKeyRef.current = key;
      stickToBottomRef.current = true;
    }
  }, [caseId, listFilter]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (pendingPrependRef.current && scroller) {
      const { height, top } = pendingPrependRef.current;
      scroller.scrollTop = top + (scroller.scrollHeight - height);
      pendingPrependRef.current = null;
      return;
    }
    if (!stickToBottomRef.current && !justSentRef.current) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    messagesEndRef.current?.scrollIntoView({
      behavior: justSentRef.current && !reduceMotion ? "smooth" : "auto",
    });
    justSentRef.current = false;
  }, [messages]);

  const uid = currentUser?._id || currentUser?.id;
  const audienceLabel =
    stream === "team"
      ? "Confidential — hidden from clients"
      : stream === "client"
        ? "Client-visible — the client can read this"
        : undefined;
  const sendAsInternal = forcedClient ? false : forcedInternal ? true : isInternal;

  const handleAttachFile = async (file: File) => {
    if (!caseId) throw new Error("No active matter");
    const storageId = await uploadAttachmentStorageId(file, caseId);
    return { name: file.name, storageId };
  };

  const handleSendMessage = async (content: string, attachmentIds?: string[]) => {
    if (!caseId) return;
    try {
      justSentRef.current = true;
      stickToBottomRef.current = true;
      await sendMessage.mutateAsync({
        caseId,
        content: content || "(attachment)",
        isInternal: mode === "staff" ? sendAsInternal : false,
        attachmentIds: attachmentIds && attachmentIds.length > 0 ? attachmentIds : undefined,
      });
    } catch (err: unknown) {
      justSentRef.current = false;
      toast.error(err instanceof Error ? err.message : "Failed to send message.");
      throw err;
    }
  };

  const handleLoadEarlier = async () => {
    const scroller = scrollerRef.current;
    if (scroller) {
      pendingPrependRef.current = { height: scroller.scrollHeight, top: scroller.scrollTop };
    }
    stickToBottomRef.current = false;
    await loadEarlier();
  };

  const emptyCopy =
    stream === "team"
      ? "No confidential case team notes yet. Share internal strategy and litigation notes here — clients cannot see this thread."
      : stream === "client"
        ? "No client-visible messages yet. Reply here to communicate directly with the client."
        : "No messages yet. Send an update or document to start this matter conversation.";

  return (
    <div
      data-appearance={appearance}
      className={cn(
        "flex flex-col h-full min-h-0 overflow-hidden",
        isClientAppearance
          ? "matter-chat-appearance-client bg-[var(--dashboard-panel)] text-foreground"
          : "bg-slate-950 text-slate-100",
        bordered &&
          (isClientAppearance
            ? "border border-dashboard-border rounded-xl shadow-sm"
            : "border border-slate-800 rounded-2xl shadow-xl"),
        className,
      )}
    >
      <LuxuryChatHeader
        type="matter"
        appearance={appearance}
        title={title}
        subtitle={
          subtitle ||
          (caseNumber
            ? `Matter ${caseNumber}`
            : isClientAppearance
              ? "Legal team conversation"
              : "Client & Team Messaging")
        }
        badge={caseNumber}
        stream={stream}
        onStreamChange={onStreamChange}
        showBack={showBack}
        onBack={onBack}
        onClose={onClose}
        externalLink={externalLink}
        externalLinkLabel={externalLinkLabel}
      />

      {stream === "team" && (
        <div className="staff-chat-banner staff-chat-banner-team px-4 py-2 border-b text-[11px] font-medium flex items-center gap-1.5 shrink-0">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          <span>Case Team Confidential Room — Messages here are invisible to clients.</span>
        </div>
      )}
      {stream === "client" && mode === "staff" && (
        <div className="staff-chat-banner staff-chat-banner-client px-4 py-2 border-b text-[11px] font-medium flex items-center gap-1.5 shrink-0">
          <Globe className="size-3.5 shrink-0" aria-hidden />
          <span>Client Channel — Messages sent here are directly visible to the client.</span>
        </div>
      )}

      <div
        ref={scrollerRef}
        className={cn(
          "flex-1 p-4 overflow-y-auto overflow-x-hidden space-y-2 min-h-0",
          isClientAppearance
            ? "bg-[var(--dashboard-neutral-soft)]"
            : "bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950",
        )}
        role="log"
        tabIndex={keyboardScrollable ? 0 : undefined}
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={isLoading || undefined}
        aria-label={title ? `${title} messages` : "Matter messages"}
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 72;
        }}
      >
        {hasMore || loadingEarlier || earlierError ? (
          <div className="staff-chat-load-earlier-wrap">
            {earlierError ? (
              <p className="text-xs text-dashboard-danger text-center" role="alert">
                {earlierError}
              </p>
            ) : null}
            {hasMore || loadingEarlier ? (
              <button
                type="button"
                className="staff-chat-load-earlier"
                disabled={loadingEarlier || !hasMore}
                onClick={() => void handleLoadEarlier()}
              >
                {loadingEarlier ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Loading earlier messages…
                  </>
                ) : (
                  "Load earlier messages"
                )}
              </button>
            ) : null}
            {!hasMore && !loadingEarlier && messages.length > 0 ? (
              <p className="text-[11px] text-muted-foreground">Beginning of conversation</p>
            ) : null}
          </div>
        ) : messages.length > 0 ? (
          <p className="text-[11px] text-muted-foreground text-center pb-2">Beginning of conversation</p>
        ) : null}

        {isError ? (
          <ClientQueryError
            title="Unable to load messages"
            onRetry={() => {
              void refetch();
            }}
            retrying={isFetching}
          />
        ) : isLoading && messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground" role="status">
            Loading messages…
          </p>
        ) : messages.length === 0 ? (
          <div
            className={cn(
              "h-full min-h-[12rem] flex flex-col items-center justify-center text-center p-6 gap-3",
              isClientAppearance ? "text-muted-foreground" : "text-slate-400",
            )}
          >
            <div
              className={cn(
                "size-12 rounded-2xl border flex items-center justify-center shadow-inner",
                isClientAppearance
                  ? "bg-[var(--dashboard-panel)] border-dashboard-border text-dashboard-neutral"
                  : "bg-slate-900 border-slate-800 text-slate-500",
              )}
            >
              <MessageSquare className="size-6" />
            </div>
            <p
              className={cn(
                "text-xs font-medium max-w-sm leading-relaxed",
                isClientAppearance ? "text-muted-foreground" : "text-slate-400",
              )}
            >
              {isClientAppearance
                ? "No messages yet. Send a note or document to begin this conversation."
                : emptyCopy}
            </p>
          </div>
        ) : (
          (() => {
            let lastDate = "";
            return messages.map((msg: any) => {
              const sender = users.find((u) => u._id === msg.senderId || u.id === msg.senderId);
              const isMe = msg.senderId === uid;
              const dateObj = new Date(msg._creationTime || msg.createdAt);
              const dateStr = formatDateSeparator(dateObj);
              const showDateSep = dateStr !== lastDate;
              if (showDateSep) lastDate = dateStr;

              const attachments = (msg.attachmentIds || []).map((id: string) => ({
                id,
                name: id.split("/").pop() || "Attached file",
                url: `/api/v1/documents/${id}/download`,
              }));

              const unifiedMsg: UnifiedChatMessage = {
                id: messageIdOf(msg),
                senderId: msg.senderId,
                senderName: isMe
                  ? "You"
                  : sender?.name || (mode === "client" ? "Legal Team" : "Staff"),
                senderRole: isMe ? currentUser?.role : sender?.role,
                content: msg.content,
                createdAt: dateObj,
                isInternal: Boolean(msg.isInternal),
                isMe,
                attachments,
                // No delivery/read API — never imply confirmation.
                status: undefined,
              };

              return (
                <React.Fragment key={unifiedMsg.id}>
                  {showDateSep && (
                    <div className="flex items-center my-3 select-none" role="separator">
                      <div
                        className={cn(
                          "h-px flex-1",
                          isClientAppearance ? "bg-dashboard-border" : "bg-slate-800",
                        )}
                      />
                      <span
                        className={cn(
                          "px-3 text-[10px] font-bold uppercase tracking-widest",
                          isClientAppearance ? "text-muted-foreground" : "text-slate-400",
                        )}
                      >
                        {dateStr}
                      </span>
                      <div
                        className={cn(
                          "h-px flex-1",
                          isClientAppearance ? "bg-dashboard-border" : "bg-slate-800",
                        )}
                      />
                    </div>
                  )}
                  <LuxuryChatBubble message={unifiedMsg} appearance={appearance} />
                </React.Fragment>
              );
            });
          })()
        )}
        <div ref={messagesEndRef} />
      </div>

      <LuxuryChatComposer
        appearance={appearance}
        disabled={isClientAppearance && (isLoading || clientAccessDenied)}
        isInternal={sendAsInternal}
        audienceLabel={audienceLabel}
        canToggleInternal={mode === "staff" && stream === "all"}
        onToggleInternal={setIsInternal}
        onSendMessage={handleSendMessage}
        onAttachFile={handleAttachFile}
        showTemplates={showTemplates ?? !isClientAppearance}
        placeholder={
          sendAsInternal
            ? "Share internal strategy or confidential case notes…"
            : mode === "staff"
              ? "Reply to client with legal advice, updates, or instructions…"
              : "Type your message…"
        }
      />
    </div>
  );
}
