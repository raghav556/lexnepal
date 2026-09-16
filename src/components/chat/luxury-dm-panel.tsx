"use client";

import React, { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useDmMessages, useDmCommands } from "@/client/queries/dm";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
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
  className?: string;
  showBack?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  bordered?: boolean;
}

function formatDateSeparator(dateInput?: string | Date): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function LuxuryDmPanel({
  threadId,
  peerName,
  peerRole,
  peerPresence = "Active now",
  className,
  showBack,
  onBack,
  onClose,
  bordered = true,
}: LuxuryDmPanelProps) {
  const currentUser = useCurrentUser();
  const myId = currentUser?._id || currentUser?.id;

  const { data: messages = [], isLoading } = useDmMessages(threadId);
  const { sendMessage, markRead } = useDmCommands();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (threadId) markRead.mutate(threadId);
  }, [threadId, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (content: string, attachmentIds?: string[]) => {
    if (!threadId) return;
    try {
      await sendMessage.mutateAsync({
        threadId,
        content,
        attachmentIds: attachmentIds && attachmentIds.length > 0 ? attachmentIds : undefined,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
      throw err;
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full min-h-[360px] bg-slate-950 text-slate-100 overflow-hidden",
        bordered && "border border-slate-800 rounded-2xl shadow-xl",
        className,
      )}
    >
      {/* Header */}
      <LuxuryChatHeader
        type="dm"
        title={peerName}
        subtitle={
          peerRole
            ? `${peerRole.replace(/_/g, " ").toUpperCase()} · Staff DM`
            : "Staff Direct Message"
        }
        presence={peerPresence}
        showBack={showBack}
        onBack={onBack}
        onClose={onClose}
      />

      {/* Message Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950">
        {messages.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-3">
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
                id: msg._id || msg.id,
                senderId: msg.senderId,
                senderName: isMe ? "You" : peerName,
                senderRole: isMe ? currentUser?.role : peerRole,
                content: msg.content,
                createdAt: dateObj,
                isMe,
                attachments,
                status: "read",
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

      {/* Composer */}
      <LuxuryChatComposer onSendMessage={handleSendMessage} placeholder={`Message ${peerName}…`} />
    </div>
  );
}
