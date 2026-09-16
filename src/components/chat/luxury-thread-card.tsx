"use client";

import React from "react";
import { Briefcase, User, Lock, Globe } from "lucide-react";
import { cn } from "@/lib/utils.ts";

export interface LuxuryThreadCardProps {
  id: string;
  type: "matter" | "dm";
  title: string;
  subtitle?: string;
  badge?: string;
  lastMessageSnippet?: string;
  timestamp?: string | Date | null;
  unreadCount?: number;
  isSelected?: boolean;
  isOnline?: boolean;
  onClick: () => void;
  className?: string;
}

function formatRelativeTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";

  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function LuxuryThreadCard({
  id,
  type,
  title,
  subtitle,
  badge,
  lastMessageSnippet,
  timestamp,
  unreadCount = 0,
  isSelected = false,
  isOnline = false,
  onClick,
  className,
}: LuxuryThreadCardProps) {
  const timeStr = formatRelativeTime(timestamp);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left p-3 rounded-2xl border transition-all duration-150 flex items-start gap-3 select-none",
        isSelected
          ? "bg-blue-600/15 border-blue-500/50 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/20"
          : "bg-slate-900/40 hover:bg-slate-800/70 border-slate-800/70 hover:border-slate-700/80",
        className,
      )}
    >
      {/* Active Indicator Bar */}
      {isSelected && (
        <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
      )}

      {/* Avatar */}
      <div className="relative shrink-0 mt-0.5">
        <div
          className={cn(
            "size-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-inner transition-colors",
            isSelected
              ? "bg-blue-600/25 border border-blue-500/40 text-blue-300"
              : "bg-slate-800 border border-slate-700/80 text-slate-300 group-hover:border-slate-600",
          )}
        >
          {type === "matter" ? (
            <Briefcase className="size-4.5 text-blue-400" />
          ) : (
            <span>{getInitials(title)}</span>
          )}
        </div>
        {type === "dm" && (
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-slate-900",
              isOnline ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" : "bg-slate-600",
            )}
          />
        )}
      </div>

      {/* Text details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1.5 mb-0.5">
          <p
            className={cn(
              "text-xs font-semibold truncate transition-colors",
              isSelected ? "text-white" : "text-slate-200 group-hover:text-white",
            )}
          >
            {title}
          </p>
          {timeStr && (
            <span
              className={cn(
                "text-[10px] shrink-0 font-medium",
                unreadCount > 0 ? "text-blue-400 font-bold" : "text-slate-500",
              )}
            >
              {timeStr}
            </span>
          )}
        </div>

        {/* Subtitle / Matter Badge */}
        <div className="flex items-center gap-1.5 mb-1">
          {badge && (
            <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0">
              {badge}
            </span>
          )}
          {subtitle && <span className="text-[10.5px] text-slate-400 truncate">{subtitle}</span>}
        </div>

        {/* Last message snippet & unread pill */}
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-[11px] truncate leading-tight",
              unreadCount > 0
                ? "text-slate-200 font-semibold"
                : "text-slate-400 group-hover:text-slate-300",
            )}
          >
            {lastMessageSnippet || "No messages yet"}
          </p>
          {unreadCount > 0 && (
            <span className="shrink-0 size-4.5 rounded-full bg-blue-500 text-white font-bold text-[10px] flex items-center justify-center shadow-[0_0_8px_rgba(59,130,246,0.6)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
