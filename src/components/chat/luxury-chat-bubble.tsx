"use client";

import React from "react";
import {
  Lock,
  FileText,
  Paperclip,
  Check,
  CheckCheck,
  Download,
  Image as ImageIcon,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import type { UnifiedChatMessage, ChatAttachment } from "./chat-types";

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext || "")) {
    return ImageIcon;
  }
  if (["xls", "xlsx", "csv"].includes(ext || "")) {
    return FileSpreadsheet;
  }
  return FileText;
}

function getRoleBadge(role?: string) {
  switch (role) {
    case "partner":
      return { label: "Partner", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
    case "senior_associate":
      return { label: "Sr. Associate", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" };
    case "associate":
      return { label: "Associate", color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" };
    case "admin":
      return { label: "Admin", color: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
    case "client":
      return { label: "Client", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
    default:
      return null;
  }
}

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function LuxuryChatBubble({ message }: { message: UnifiedChatMessage }) {
  const { isMe, isInternal, content, createdAt, senderName, senderRole, attachments, status } =
    message;

  const roleBadge = getRoleBadge(senderRole);
  const timeStr =
    createdAt instanceof Date
      ? createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className={cn(
        "group flex w-full gap-2.5 my-1.5 transition-all",
        isMe ? "justify-end pl-10" : "justify-start pr-10",
      )}
    >
      {/* Incoming Avatar */}
      {!isMe && (
        <div className="relative shrink-0 mt-0.5">
          <div className="size-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/80 flex items-center justify-center text-xs font-bold text-slate-200 shadow-sm">
            {getInitials(senderName)}
          </div>
          <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
        </div>
      )}

      {/* Message Content Container */}
      <div
        className={cn(
          "flex flex-col max-w-[85%] sm:max-w-[75%]",
          isMe ? "items-end" : "items-start",
        )}
      >
        {/* Sender Name & Role (for incoming or internal messages) */}
        {!isMe && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span className="text-[12px] font-semibold text-slate-200 tracking-tight">
              {senderName}
            </span>
            {roleBadge && (
              <span
                className={cn(
                  "text-[9.5px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full border",
                  roleBadge.color,
                )}
              >
                {roleBadge.label}
              </span>
            )}
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "relative text-[13px] leading-relaxed break-words shadow-sm transition-all",
            isInternal
              ? "bg-amber-950/30 border border-amber-500/40 text-amber-100 rounded-2xl px-4 py-3 shadow-amber-900/10"
              : isMe
                ? "bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white border border-blue-500/30 rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-md shadow-blue-600/15"
                : "bg-slate-800/95 border border-slate-700/70 text-slate-100 rounded-2xl rounded-tl-xs px-4 py-2.5",
          )}
        >
          {/* Internal Note Banner */}
          {isInternal && (
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-amber-300 pb-1.5 mb-2 border-b border-amber-500/30">
              <Lock className="size-3 text-amber-400" />
              <span>Confidential Case Team Note · Hidden From Client</span>
            </div>
          )}

          {/* Text Content */}
          <p className="whitespace-pre-wrap">{content}</p>

          {/* Attachments */}
          {attachments && attachments.length > 0 && (
            <div className="mt-2.5 space-y-1.5 pt-1.5 border-t border-white/10">
              {attachments.map((att, idx) => {
                const Icon = getFileIcon(att.name);
                return (
                  <div
                    key={att.id || idx}
                    className={cn(
                      "flex items-center justify-between gap-3 p-2 rounded-xl text-xs transition-colors",
                      isMe
                        ? "bg-white/10 hover:bg-white/15 border border-white/15"
                        : "bg-slate-900/60 hover:bg-slate-900/80 border border-slate-700/60",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          "size-7 rounded-lg flex items-center justify-center shrink-0",
                          isMe ? "bg-white/20 text-white" : "bg-blue-500/20 text-blue-400",
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-[200px] sm:max-w-[260px]">
                          {att.name}
                        </p>
                        {att.sizeBytes && (
                          <p className="text-[10px] opacity-70">
                            {(att.sizeBytes / 1024).toFixed(0)} KB
                          </p>
                        )}
                      </div>
                    </div>
                    {att.url && (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 hover:opacity-80 transition-opacity"
                        title="Download file"
                      >
                        <Download className="size-3.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Timestamp & Status info */}
          <div
            className={cn(
              "flex items-center justify-end gap-1 mt-1 text-[10px]",
              isMe ? "text-blue-100/75" : "text-slate-400",
            )}
          >
            <span>{timeStr}</span>
            {isMe && (
              <span className="inline-flex items-center ml-0.5" title="Delivered">
                {status === "read" ? (
                  <CheckCheck className="size-3.5 text-cyan-300" />
                ) : (
                  <Check className="size-3.5 opacity-80" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
