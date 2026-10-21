"use client";
import { relativeNepalDay } from "@/lib/nepali-calendar";

import React, { useEffect, useLayoutEffect, useRef } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDmMessageHistory, useDmCommands } from "@/client/queries/dm";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import { messageIdOf } from "@/shared/message-cursor";
import {
  LuxuryChatBubble,
  LuxuryChatComposer,
  LuxuryChatHeader,
  type UnifiedChatMessage,
} from "@/components/chat";

export interface LuxuryDmPanelProps {
  threadId: string;
  peerName: string;
  peerRole?: string;
  peerPresence?: string;
  subtitle?: string;
  className?: string;
  showBack?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  bordered?: boolean;
  showTemplates?: boolean;
}

function formatDateSeparator(dateInput?: string | Date): string { return dateInput ? relativeNepalDay(dateInput) : ""; }

export function LuxuryDmPanel({
  threadId,
  peerName,
  peerRole,
  peerPresence = "",
  subtitle,
  className,
  showBack,
  onBack,
  onClose,
  bordered = true,
  showTemplates = true,
}: LuxuryDmPanelProps) {
  const currentUser = useCurrentUser();
  const myId = currentUser?._id || currentUser?.id;

  const {
    messages,
    isLoading,
    hasMore,
    loadingEarlier,
    earlierError,
    loadEarlier,
  } = useDmMessageHistory(threadId);
  const { sendMessage, markRead } = useDmCommands();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const pendingPrependRef = useRef<{ height: number; top: number } | null>(null);
  const justSentRef = useRef(false);
  const openedThreadRef = useRef("");

  const markThreadRead = markRead.mutate;
  useEffect(() => {
    if (threadId) markThreadRead(threadId);
  }, [threadId, markThreadRead]);

  useEffect(() => {
    if (openedThreadRef.current !== threadId) {
      openedThreadRef.current = threadId;
      stickToBottomRef.current = true;
    }
  }, [threadId]);

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

  const handleSendMessage = async (content: string, attachmentIds?: string[]) => {
    if (!threadId) return;
    try {
      justSentRef.current = true;
      stickToBottomRef.current = true;
      await sendMessage.mutateAsync({
        threadId,
        content,
        attachmentIds: attachmentIds && attachmentIds.length > 0 ? attachmentIds : undefined,
      });
    } catch (err: unknown) {
      justSentRef.current = false;
      toast.error(err instanceof Error ? err.message : "Failed to send message");
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

  return (
    <div
      className={cn(
        "flex flex-col h-full min-h-0 bg-slate-950 text-slate-100 overflow-hidden",
        bordered && "border border-slate-800 rounded-2xl shadow-xl",
        className,
      )}
    >
      <LuxuryChatHeader
        type="dm"
        title={peerName}
        subtitle={
          subtitle ||
          (peerRole
            ? `${peerRole.replace(/_/g, " ")} · Private staff conversation`
            : "Private staff conversation")
        }
        presence={peerPresence}
        showBack={showBack}
        onBack={onBack}
        onClose={onClose}
      />

      <div
        ref={scrollerRef}
        className="flex-1 p-4 overflow-y-auto overflow-x-hidden space-y-2 min-h-0 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950"
        role="log"
        aria-label={`Conversation with ${peerName}`}
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

        {isLoading && messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground" role="status">
            Loading messages…
          </p>
        ) : messages.length === 0 ? (
          <div className="h-full min-h-[12rem] flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-3">
            <div className="size-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
              <MessageSquare className="size-6" />
            </div>
            <p className="text-xs font-medium max-w-sm leading-relaxed text-slate-400">
              No messages in this private staff thread yet. Say hello or share matter insights to
              start the discussion.
            </p>
          </div>
        ) : (
          (() => {
            let lastDate = "";
            return messages.map((msg: any) => {
              const isMe = msg.senderId === myId;
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
                senderName: isMe ? "You" : peerName,
                senderRole: isMe ? currentUser?.role : peerRole,
                content: msg.content,
                createdAt: dateObj,
                isMe,
                attachments,
                status: undefined,
              };

              return (
                <React.Fragment key={unifiedMsg.id}>
                  {showDateSep && (
                    <div className="flex items-center my-3 select-none">
                      <div className="h-px bg-slate-800 flex-1" />
                      <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {dateStr}
                      </span>
                      <div className="h-px bg-slate-800 flex-1" />
                    </div>
                  )}
                  <LuxuryChatBubble message={unifiedMsg} />
                </React.Fragment>
              );
            });
          })()
        )}
        <div ref={messagesEndRef} />
      </div>

      <LuxuryChatComposer
        onSendMessage={handleSendMessage}
        placeholder={`Message ${peerName}…`}
        showTemplates={showTemplates}
        audienceLabel="Private staff conversation"
      />
    </div>
  );
}
