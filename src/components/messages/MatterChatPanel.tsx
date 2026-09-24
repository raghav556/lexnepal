"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageSquare, Lock, Globe } from "lucide-react";
import { toast } from "sonner";
import { useMessages, useMessageCommands } from "@/client/queries/communication";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import { computeSHA256 } from "@/lib/document-utils.ts";
import { apiClient } from "@/client/api/client";
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
  externalLink?: string;
  externalLinkLabel?: string;
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
  externalLink,
  externalLinkLabel,
}: MatterChatPanelProps) {
  const currentUser = useCurrentUser();
  const isClientAppearance = appearance === "client";
  const listFilter =
    mode === "client" ? false : stream === "team" ? true : stream === "client" ? false : undefined;

  const { data: messagesResponse, isLoading } = useMessages(caseId, listFilter);
  const messages = messagesResponse?.page || [];
  const { sendMessage, markMessagesRead } = useMessageCommands();

  const forcedInternal = mode === "staff" && stream === "team";
  const forcedClient = mode === "client" || (mode === "staff" && stream === "client");

  const [isInternal, setIsInternal] = useState(forcedInternal);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsInternal(forcedInternal);
  }, [forcedInternal, caseId, stream]);

  useEffect(() => {
    if (caseId) markMessagesRead.mutate({ caseId });
  }, [caseId, messages.length]);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    messagesEndRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [messages]);

  const uid = currentUser?._id || currentUser?.id;
  const sendAsInternal = forcedClient ? false : forcedInternal ? true : isInternal;

  const handleAttachFile = async (file: File) => {
    if (!caseId) throw new Error("No active matter");
    const storageId = await uploadAttachmentStorageId(file, caseId);
    return { name: file.name, storageId };
  };

  const handleSendMessage = async (content: string, attachmentIds?: string[]) => {
    if (!caseId) return;
    try {
      await sendMessage.mutateAsync({
        caseId,
        content: content || "(attachment)",
        isInternal: mode === "staff" ? sendAsInternal : false,
        attachmentIds: attachmentIds && attachmentIds.length > 0 ? attachmentIds : undefined,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send message.");
      throw err;
    }
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
        "flex flex-col h-full min-h-[360px] overflow-hidden",
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
        <div className="px-4 py-1.5 bg-amber-950/40 border-b border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5 font-medium shrink-0">
          <Lock className="size-3 text-amber-400 shrink-0" />
          <span>Case Team Confidential Room — Messages here are invisible to clients.</span>
        </div>
      )}
      {stream === "client" && mode === "staff" && (
        <div className="px-4 py-1.5 bg-blue-950/40 border-b border-blue-500/20 text-[11px] text-blue-300 flex items-center gap-1.5 font-medium shrink-0">
          <Globe className="size-3 text-blue-400 shrink-0" />
          <span>Client Channel — Messages sent here are directly visible to the client.</span>
        </div>
      )}

      <div
        className={cn(
          "flex-1 p-4 overflow-y-auto space-y-2 min-h-0",
          isClientAppearance
            ? "bg-[var(--dashboard-neutral-soft)]"
            : "bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950",
        )}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={isLoading || undefined}
        aria-label={title ? `${title} messages` : "Matter messages"}
      >
        {messages.length === 0 ? (
          <div
            className={cn(
              "h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 gap-3",
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
                id: msg._id || msg.id,
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
                // Decorative only — hide unsupported read receipts in Client appearance.
                status: isClientAppearance ? undefined : "read",
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
        isInternal={sendAsInternal}
        canToggleInternal={mode === "staff" && stream === "all"}
        onToggleInternal={setIsInternal}
        onSendMessage={handleSendMessage}
        onAttachFile={handleAttachFile}
        showTemplates={!isClientAppearance}
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
