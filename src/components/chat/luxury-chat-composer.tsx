"use client";

import React, { useRef, useState, useEffect } from "react";
import { Paperclip, Send, Lock, Globe, Sparkles, X, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { CANNED_LEGAL_TEMPLATES, type CannedLegalTemplate } from "./chat-types";

export interface LuxuryChatComposerProps {
  placeholder?: string;
  isInternal?: boolean;
  canToggleInternal?: boolean;
  onToggleInternal?: (internal: boolean) => void;
  onSendMessage: (content: string, attachmentIds?: string[]) => Promise<void>;
  onAttachFile?: (file: File) => Promise<{ name: string; storageId: string }>;
  disabled?: boolean;
  className?: string;
  appearance?: "default" | "client";
  showTemplates?: boolean;
}

export function LuxuryChatComposer({
  placeholder = "Type your message…",
  isInternal = false,
  canToggleInternal = false,
  onToggleInternal,
  onSendMessage,
  onAttachFile,
  disabled = false,
  className,
  appearance = "default",
  showTemplates = true,
}: LuxuryChatComposerProps) {
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<
    { name: string; storageId: string }[]
  >([]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isClient = appearance === "client";
  const templatesEnabled = showTemplates && !isClient;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [draft]);

  const handleSend = async () => {
    const text = draft.trim();
    if ((!text && pendingAttachments.length === 0) || isSending || disabled) return;

    setIsSending(true);
    try {
      await onSendMessage(
        text || "(attachment)",
        pendingAttachments.map((a) => a.storageId),
      );
      setDraft("");
      setPendingAttachments([]);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !onAttachFile) return;
    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const item = await onAttachFile(files[i]);
        setPendingAttachments((prev) => [...prev, item]);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const applyTemplate = (tpl: CannedLegalTemplate) => {
    setDraft((prev) => (prev ? `${prev}\n\n${tpl.text}` : tpl.text));
    setTemplatesOpen(false);
    textareaRef.current?.focus();
  };

  return (
    <div
      data-appearance={appearance}
      className={cn(
        "relative p-3 border-t transition-colors",
        isClient
          ? "bg-[var(--dashboard-panel)] border-dashboard-border"
          : "bg-slate-900/90 border-slate-800/80 backdrop-blur-md",
        isDragging &&
          (isClient
            ? "bg-dashboard-primary-soft border-dashboard-primary"
            : "bg-blue-950/20 border-blue-500/50"),
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        void handleFileUpload(e.dataTransfer.files);
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        aria-label="Attach documents or files"
        onChange={(e) => void handleFileUpload(e.target.files)}
      />

      {templatesEnabled && templatesOpen && (
        <div className="absolute bottom-full left-3 right-3 mb-2 p-3 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-30 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 text-blue-400">
              <Sparkles className="size-3.5" /> Fast Legal Templates
            </span>
            <button
              type="button"
              onClick={() => setTemplatesOpen(false)}
              className="p-1 hover:text-white text-slate-400 rounded-md"
              aria-label="Close templates"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {CANNED_LEGAL_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="text-left p-2.5 rounded-xl bg-slate-800/70 hover:bg-blue-950/40 hover:border-blue-500/40 border border-slate-700/50 transition-all text-xs group"
              >
                <p className="font-semibold text-slate-200 group-hover:text-blue-300">
                  {tpl.title}
                </p>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                  {tpl.text}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-1">
          {pendingAttachments.map((att, idx) => (
            <div
              key={att.storageId || idx}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs shadow-xs",
                isClient
                  ? "bg-dashboard-neutral-soft border-dashboard-border text-foreground"
                  : "bg-slate-800 border-slate-700 text-slate-200",
              )}
            >
              <FileText
                className={cn(
                  "size-3.5 shrink-0",
                  isClient ? "text-dashboard-primary" : "text-blue-400",
                )}
              />
              <span className="max-w-[150px] truncate">{att.name}</span>
              <button
                type="button"
                onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                className={cn(
                  "p-0.5 rounded-full transition-colors ml-0.5",
                  isClient
                    ? "text-muted-foreground hover:text-dashboard-danger"
                    : "hover:text-rose-400 text-slate-400",
                )}
                aria-label={`Remove ${att.name}`}
                title="Remove"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!isClient && (
        <div className="flex items-center justify-between gap-2 mb-2 px-1 text-[11px]">
          {canToggleInternal ? (
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-800/90 border border-slate-700/70">
              <button
                type="button"
                onClick={() => onToggleInternal?.(false)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium transition-all",
                  !isInternal
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200",
                )}
              >
                <Globe className="size-3" /> Client Visible
              </button>
              <button
                type="button"
                onClick={() => onToggleInternal?.(true)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium transition-all",
                  isInternal
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200",
                )}
              >
                <Lock className="size-3" /> Case Team Only
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400">
              {isInternal ? (
                <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                  <Lock className="size-3" /> Confidential Case Team Stream
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-blue-400 font-medium">
                  <Globe className="size-3" /> Client-Visible Stream
                </span>
              )}
            </div>
          )}

          <span className="hidden sm:inline-block text-[10px] text-slate-500 tracking-wider">
            <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
              ↵
            </kbd>{" "}
            Send &nbsp;
            <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
              ⇧↵
            </kbd>{" "}
            Newline
          </span>
        </div>
      )}

      <div
        className={cn(
          "flex items-end gap-2 border rounded-2xl p-2 transition-all",
          isClient
            ? "bg-dashboard-neutral-soft border-dashboard-border focus-within:border-dashboard-primary focus-within:ring-1 focus-within:ring-dashboard-focus"
            : "bg-slate-950/70 border-slate-800 focus-within:border-blue-500/70 focus-within:ring-1 focus-within:ring-blue-500/30 shadow-inner",
        )}
      >
        {onAttachFile && (
          <button
            type="button"
            disabled={isUploading || disabled}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "size-8 rounded-xl flex items-center justify-center transition-colors shrink-0 disabled:opacity-50",
              isClient
                ? "text-muted-foreground hover:text-dashboard-primary hover:bg-[var(--dashboard-panel)]"
                : "text-slate-400 hover:text-blue-400 hover:bg-slate-800/80",
            )}
            aria-label="Attach documents or files"
            title="Attach documents or files"
          >
            {isUploading ? (
              <Loader2
                className={cn(
                  "size-4 animate-spin",
                  isClient ? "text-dashboard-primary" : "text-blue-400",
                )}
              />
            ) : (
              <Paperclip className="size-4" />
            )}
          </button>
        )}

        {templatesEnabled && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setTemplatesOpen((prev) => !prev)}
            className={cn(
              "size-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 transition-colors shrink-0",
              templatesOpen && "text-amber-400 bg-slate-800",
            )}
            title="Legal response templates"
            aria-label="Legal response templates"
          >
            <Sparkles className="size-4" />
          </button>
        )}

        <label className="sr-only" htmlFor="luxury-chat-composer-input">
          Message
        </label>
        <textarea
          id="luxury-chat-composer-input"
          ref={textareaRef}
          rows={1}
          value={draft}
          disabled={disabled || isSending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isInternal ? "Share a confidential case note with team members…" : placeholder
          }
          aria-label="Message"
          className={cn(
            "flex-1 bg-transparent text-[13px] focus:outline-none resize-none max-h-[140px] py-1 px-1 leading-relaxed min-w-0",
            isClient
              ? "text-foreground placeholder:text-muted-foreground"
              : "text-slate-100 placeholder-slate-500",
          )}
        />

        <button
          type="button"
          disabled={
            (!draft.trim() && pendingAttachments.length === 0) ||
            isSending ||
            isUploading ||
            disabled
          }
          onClick={() => void handleSend()}
          className={cn(
            "size-8 rounded-xl flex items-center justify-center transition-all shrink-0 font-semibold shadow-md",
            (!draft.trim() && pendingAttachments.length === 0) || isSending || disabled
              ? isClient
                ? "bg-dashboard-neutral-soft text-muted-foreground cursor-not-allowed"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
              : isInternal
                ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white hover:brightness-110 shadow-amber-600/20 active:scale-95"
                : isClient
                  ? "bg-dashboard-primary text-dashboard-primary-foreground hover:bg-dashboard-primary-hover active:scale-95"
                  : "bg-gradient-to-br from-blue-600 to-indigo-600 text-white hover:brightness-110 shadow-blue-600/25 active:scale-95",
          )}
          aria-label="Send message"
          title="Send message (Enter)"
        >
          {isSending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isInternal ? (
            <Lock className="size-3.5" />
          ) : (
            <Send className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
