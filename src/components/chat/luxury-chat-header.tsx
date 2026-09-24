"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Lock, Globe, X, Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils.ts";

export interface LuxuryChatHeaderProps {
  type: "matter" | "dm";
  title: string;
  subtitle?: string;
  badge?: string;
  avatarUrl?: string | null;
  presence?: "online" | "offline" | "away" | string;
  stream?: "client" | "team" | "all";
  onStreamChange?: (stream: "client" | "team") => void;
  externalLink?: string;
  externalLinkLabel?: string;
  showBack?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  className?: string;
  appearance?: "default" | "client";
}

export function LuxuryChatHeader({
  type,
  title,
  subtitle,
  badge,
  presence,
  stream,
  onStreamChange,
  externalLink,
  externalLinkLabel = "Open full",
  showBack,
  onBack,
  onClose,
  className,
  appearance = "default",
}: LuxuryChatHeaderProps) {
  const isOnline = presence === "online" || presence === "Active now";
  const isClient = appearance === "client";

  return (
    <div
      data-appearance={appearance}
      className={cn(
        "p-3.5 px-4 border-b flex items-center justify-between gap-3 shrink-0 select-none",
        isClient
          ? "bg-[var(--dashboard-panel)] border-dashboard-border"
          : "bg-slate-900/95 border-slate-800/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            className={cn(
              "p-1.5 -ml-1 rounded-lg transition-colors md:hidden shrink-0",
              isClient
                ? "text-muted-foreground hover:text-foreground hover:bg-dashboard-neutral-soft"
                : "text-slate-400 hover:text-white hover:bg-slate-800",
            )}
            aria-label="Back to conversations"
          >
            <ArrowLeft className="size-4" />
          </button>
        )}

        <div className="relative shrink-0">
          <div
            className={cn(
              "size-9 rounded-xl border flex items-center justify-center font-bold text-xs shadow-inner",
              isClient
                ? "bg-dashboard-primary-soft border-dashboard-border text-dashboard-primary"
                : "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-slate-300",
            )}
          >
            {type === "matter" ? (
              <Briefcase
                className={cn("size-4", isClient ? "text-dashboard-primary" : "text-blue-400")}
              />
            ) : (
              <User
                className={cn("size-4", isClient ? "text-dashboard-primary" : "text-indigo-400")}
              />
            )}
          </div>
          {type === "dm" && !isClient && (
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-slate-900",
                isOnline ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" : "bg-slate-600",
              )}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "text-sm font-semibold truncate tracking-tight font-serif",
                isClient ? "text-foreground" : "text-slate-100",
              )}
            >
              {title}
            </h3>
            {badge && (
              <span
                className={cn(
                  "shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border",
                  isClient
                    ? "bg-dashboard-primary-soft text-dashboard-primary border-dashboard-border"
                    : "bg-blue-500/15 text-blue-300 border-blue-500/30",
                )}
              >
                {badge}
              </span>
            )}
          </div>
          <p
            className={cn(
              "text-[11px] truncate flex items-center gap-1.5 mt-0.5",
              isClient ? "text-muted-foreground" : "text-slate-400",
            )}
          >
            {subtitle}
            {presence && !isClient && (
              <>
                <span className="size-1 rounded-full bg-slate-600" />
                <span className={cn(isOnline ? "text-emerald-400 font-medium" : "text-slate-400")}>
                  {presence}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {type === "matter" && onStreamChange && stream && (
          <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
            <button
              type="button"
              onClick={() => onStreamChange("client")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                stream === "client"
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              <Globe className="size-3" /> Client
            </button>
            <button
              type="button"
              onClick={() => onStreamChange("team")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                stream === "team"
                  ? "bg-amber-600 text-white shadow-xs font-semibold"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              <Lock className="size-3" /> Case Team
            </button>
          </div>
        )}

        {externalLink && (
          <Link
            href={externalLink}
            onClick={onClose}
            className={cn(
              "p-2 rounded-xl transition-colors hidden sm:inline-flex items-center gap-1 text-xs font-medium",
              isClient
                ? "text-dashboard-primary hover:bg-dashboard-primary-soft"
                : "text-slate-400 hover:text-blue-400 hover:bg-slate-800/60",
            )}
            title={externalLinkLabel}
            aria-label={externalLinkLabel}
          >
            <ExternalLink className="size-3.5" />
            {isClient ? <span className="hidden lg:inline">{externalLinkLabel}</span> : null}
          </Link>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "p-2 rounded-xl transition-colors",
              isClient
                ? "text-muted-foreground hover:text-foreground hover:bg-dashboard-neutral-soft"
                : "text-slate-400 hover:text-white hover:bg-slate-800/80",
            )}
            aria-label="Close chat"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
