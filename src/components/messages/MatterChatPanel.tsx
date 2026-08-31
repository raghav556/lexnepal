"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Lock, MessageCircle, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useMessages, useMessageCommands } from "@/client/queries/communication";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import { apiClient } from "@/client/api/client";

type DirectoryUser = { _id?: string; id?: string; name?: string | null };

type MatterChatPanelProps = {
  caseId: string;
  title?: string;
  mode: "client" | "staff";
  /**
   * Staff stream filter:
   * - client: only client-visible messages (force Client Reply)
   * - team: only internal case-team messages (force Internal)
   * - all: mixed list with toggle (legacy Command Center)
   */
  stream?: "client" | "team" | "all";
  users?: DirectoryUser[];
  className?: string;
  showBack?: boolean;
  onBack?: () => void;
  bordered?: boolean;
};

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Upload a file via document-upload intents; returns storage object key for messageAttachments. */
async function uploadAttachmentStorageId(file: File, caseId: string): Promise<string> {
  const sha256 = await sha256Hex(file);
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
  const storageId =
    intent.upload.fields.key ||
    intent.upload.fields.Key ||
    `quarantine-attachment:${intent.intentId}`;
  return storageId;
}

export function MatterChatPanel({
  caseId,
  title = "Chat",
  mode,
  stream = "all",
  users = [],
  className,
  showBack,
  onBack,
  bordered = true,
}: MatterChatPanelProps) {
  const currentUser = useCurrentUser();
  const listFilter =
    mode === "client" ? false : stream === "team" ? true : stream === "client" ? false : undefined;
  const { data: messagesResponse } = useMessages(caseId, listFilter);
  const messages = messagesResponse?.page || [];
  const { sendMessage, markMessagesRead } = useMessageCommands();

  const forcedInternal = mode === "staff" && stream === "team";
  const forcedClient = mode === "client" || (mode === "staff" && stream === "client");

  const [draft, setDraft] = useState("");
  const [isInternal, setIsInternal] = useState(forcedInternal);
  const [pendingAttachments, setPendingAttachments] = useState<
    { name: string; storageId: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsInternal(forcedInternal);
  }, [forcedInternal, caseId, stream]);

  useEffect(() => {
    if (caseId) markMessagesRead.mutate({ caseId });
  }, [caseId, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const uid = currentUser?._id || currentUser?.id;
  const sendAsInternal = forcedClient ? false : forcedInternal ? true : isInternal;

  const handleAttach = async (file: File | null) => {
    if (!file || !caseId) return;
    setUploading(true);
    try {
      const storageId = await uploadAttachmentStorageId(file, caseId);
      setPendingAttachments((prev) => [...prev, { name: file.name, storageId }]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to attach file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (!caseId || (!draft.trim() && pendingAttachments.length === 0)) return;
    try {
      await sendMessage.mutateAsync({
        caseId,
        content: draft.trim() || "(attachment)",
        isInternal: mode === "staff" ? sendAsInternal : false,
        attachmentIds: pendingAttachments.map((a) => a.storageId),
      });
      setDraft("");
      setPendingAttachments([]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send message.");
    }
  };

  const emptyCopy =
    stream === "team"
      ? "No case team messages yet. Discuss strategy here — clients cannot see this thread."
      : stream === "client"
        ? "No client-visible messages yet. Reply here to message the client."
        : "No messages yet. Send a message to start the conversation.";

  const body = (
    <>
      <CardHeader className="pb-3 border-b border-border bg-card flex flex-row items-center gap-2 shrink-0">
        {showBack ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="md:hidden p-1 h-auto"
            onClick={onBack}
            aria-label="Back to threads"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        ) : null}
        <CardTitle className="text-sm font-semibold text-primary font-serif flex-1 truncate">
          {title}
        </CardTitle>
        {stream === "team" ? (
          <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
            <Lock className="w-3 h-3" /> Team only
          </span>
        ) : null}
      </CardHeader>

      <div className="flex-1 p-4 space-y-3.5 overflow-y-auto bg-secondary/15 flex flex-col justify-end min-h-0">
        <div className="space-y-3.5 overflow-y-auto max-h-full">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground gap-2">
              <MessageCircle className="w-8 h-8 text-muted-foreground/50" />
              <p className="text-xs max-w-xs">{emptyCopy}</p>
            </div>
          ) : (
            messages.map((msg: any) => {
              const sender = users.find((u) => u._id === msg.senderId || u.id === msg.senderId);
              const isMe = msg.senderId === uid;
              const dateObj = new Date(msg._creationTime || msg.createdAt);
              const formattedTime = dateObj.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const attachments: string[] = msg.attachmentIds || [];

              return (
                <div
                  key={msg._id || msg.id}
                  className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "rounded-xl px-3.5 py-2.5 max-w-[85%] text-xs shadow-2xs border",
                      msg.isInternal
                        ? "bg-muted text-foreground border-border"
                        : isMe
                          ? "bg-primary text-primary-foreground border-primary rounded-tr-none"
                          : "bg-card text-foreground border-border rounded-tl-none",
                    )}
                  >
                    {msg.isInternal && mode === "staff" ? (
                      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5 pb-1 border-b border-border/50">
                        <Lock className="w-3 h-3" /> Case team
                      </div>
                    ) : null}
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {attachments.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {attachments.map((id) => (
                          <div
                            key={id}
                            className="text-[10px] font-medium opacity-80 truncate flex items-center gap-1"
                          >
                            <Paperclip className="w-3 h-3 shrink-0" />
                            {id.split("/").pop()}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        "text-[9px] mt-1 opacity-75 font-semibold",
                        isMe && !msg.isInternal
                          ? "text-primary-foreground/90"
                          : "text-muted-foreground",
                      )}
                    >
                      {isMe
                        ? "You"
                        : sender?.name || (mode === "client" ? "Legal team" : "Unknown")}{" "}
                      &bull; {formattedTime}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-3 border-t border-border bg-card space-y-2 shrink-0">
        {pendingAttachments.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {pendingAttachments.map((a) => (
              <span
                key={a.storageId}
                className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground truncate max-w-[160px]"
              >
                {a.name}
              </span>
            ))}
          </div>
        ) : null}
        {mode === "staff" && stream === "all" ? (
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              className="rounded border-border"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {isInternal ? "Internal note (hidden from client)" : "Client reply (visible)"}
            </span>
          </label>
        ) : null}
        <div className="flex gap-2 items-center">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => void handleAttach(e.target.files?.[0] || null)}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              sendAsInternal
                ? "Message the case team (hidden from client)..."
                : mode === "staff"
                  ? "Reply to client..."
                  : "Type your message to advocate..."
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button
            size="sm"
            onClick={() => void handleSend()}
            disabled={(!draft.trim() && pendingAttachments.length === 0) || uploading}
          >
            {sendAsInternal ? <Lock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </>
  );

  if (!bordered) {
    return (
      <div
        className={cn(
          "flex flex-col h-full min-h-[320px] border rounded-xl overflow-hidden",
          className,
        )}
      >
        {body}
      </div>
    );
  }

  return (
    <Card className={cn("flex flex-col border overflow-hidden h-full", className)}>{body}</Card>
  );
}
