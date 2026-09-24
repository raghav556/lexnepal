"use client";

import React from "react";
import {
  Lock,
  FileText,
  Check,
  CheckCheck,
  Download,
  Image as ImageIcon,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import type { UnifiedChatMessage } from "./chat-types";

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

function getRoleBadge(role?: string, appearance: "default" | "client" = "default") {
  if (appearance === "client") {
    switch (role) {
      case "partner":
        return {
          label: "Partner",
          color: "bg-dashboard-warning-soft text-dashboard-warning border-dashboard-border",
        };
      case "senior_associate":
      case "associate":
        return {
          label: role === "senior_associate" ? "Sr. Associate" : "Associate",
          color: "bg-dashboard-primary-soft text-dashboard-primary border-dashboard-border",
        };
      case "admin":
        return {
          label: "Admin",
          color: "bg-dashboard-danger-soft text-dashboard-danger border-dashboard-border",
        };
      case "client":
        return {
          label: "Client",
          color: "bg-dashboard-success-soft text-dashboard-success border-dashboard-border",
        };
      default:
        return null;
    }
  }
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

export function LuxuryChatBubble({
  message,
  appearance = "default",
}: {
  message: UnifiedChatMessage;
  appearance?: "default" | "client";
}) {
  const { isMe, isInternal, content, createdAt, senderName, senderRole, attachments, status } =
    message;
  const isClient = appearance === "client";

  const roleBadge = getRoleBadge(senderRole, appearance);
  const timeStr =
    createdAt instanceof Date
      ? createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      data-appearance={appearance}
      className={cn(
        "group flex w-full gap-2.5 my-1.5",
        isMe ? "justify-end pl-10" : "justify-start pr-10",
      )}
    >
      {!isMe && (
        <div className="relative shrink-0 mt-0.5">
          <div
            className={cn(
              "size-8 rounded-full border flex items-center justify-center text-xs font-bold shadow-sm",
              isClient
                ? "bg-dashboard-primary-soft border-dashboard-border text-dashboard-primary"
                : "bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600/80 text-slate-200",
            )}
          >
            {getInitials(senderName)}
          </div>
          {!isClient && (
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
          )}
        </div>
      )}

      <div
        className={cn(
          "flex flex-col max-w-[85%] sm:max-w-[75%] min-w-0",
          isMe ? "items-end" : "items-start",
        )}
      >
        {!isMe && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span
              className={cn(
                "text-[12px] font-semibold tracking-tight",
                isClient ? "text-foreground" : "text-slate-200",
              )}
            >
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

        <div
          className={cn(
            "relative text-[13px] leading-relaxed break-words shadow-sm",
            isInternal
              ? isClient
                ? "bg-dashboard-warning-soft border border-dashboard-border text-foreground rounded-xl px-3.5 py-2.5"
                : "bg-amber-950/30 border border-amber-500/40 text-amber-100 rounded-2xl px-4 py-3 shadow-amber-900/10"
              : isMe
                ? isClient
                  ? "bg-dashboard-primary text-dashboard-primary-foreground border border-dashboard-primary rounded-xl rounded-tr-sm px-3.5 py-2"
                  : "bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white border border-blue-500/30 rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-md shadow-blue-600/15"
                : isClient
                  ? "bg-[var(--dashboard-panel)] border border-dashboard-border text-foreground rounded-xl rounded-tl-sm px-3.5 py-2"
                  : "bg-slate-800/95 border border-slate-700/70 text-slate-100 rounded-2xl rounded-tl-xs px-4 py-2.5",
          )}
        >
          {isInternal && (
            <div
              className={cn(
                "flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider pb-1.5 mb-2 border-b",
                isClient
                  ? "text-dashboard-warning border-dashboard-border"
                  : "text-amber-300 border-amber-500/30",
              )}
            >
              <Lock className="size-3" />
              <span>Confidential Case Team Note · Hidden From Client</span>
            </div>
          )}

          <p className="whitespace-pre-wrap break-words">{content}</p>

          {attachments && attachments.length > 0 && (
            <div
              className={cn(
                "mt-2.5 space-y-1.5 pt-1.5 border-t",
                isClient ? "border-dashboard-border/60" : "border-white/10",
              )}
            >
              {attachments.map((att, idx) => {
                const Icon = getFileIcon(att.name);
                return (
                  <div
                    key={att.id || idx}
                    className={cn(
                      "flex items-center justify-between gap-3 p-2 rounded-xl text-xs",
                      isMe
                        ? isClient
                          ? "bg-white/10 border border-white/20"
                          : "bg-white/10 hover:bg-white/15 border border-white/15"
                        : isClient
                          ? "bg-dashboard-neutral-soft border border-dashboard-border"
                          : "bg-slate-900/60 hover:bg-slate-900/80 border border-slate-700/60",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          "size-7 rounded-lg flex items-center justify-center shrink-0",
                          isMe
                            ? "bg-white/20 text-white"
                            : isClient
                              ? "bg-dashboard-primary-soft text-dashboard-primary"
                              : "bg-blue-500/20 text-blue-400",
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-[160px] sm:max-w-[260px]">
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
                        className="p-1 hover:opacity-80 transition-opacity shrink-0"
                        aria-label={`Download ${att.name}`}
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

          <div
            className={cn(
              "flex items-center justify-end gap-1 mt-1 text-[10px]",
              isMe
                ? isClient
                  ? "text-dashboard-primary-foreground/80"
                  : "text-blue-100/75"
                : isClient
                  ? "text-muted-foreground"
                  : "text-slate-400",
            )}
          >
            <span>{timeStr}</span>
            {isMe && !isClient && status && (
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
