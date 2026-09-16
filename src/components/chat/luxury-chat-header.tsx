"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Lock,
  Globe,
  X,
  Briefcase,
  User,
  ShieldCheck,
} from "lucide-react";
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
}: LuxuryChatHeaderProps) {
  const isOnline = presence === "online" || presence === "Active now";

  return (
    <div
      className={cn(
        "p-3.5 px-4 bg-slate-900/95 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 select-none",
        className,
      )}
    >
      {/* Left section: back button & identity */}
      <div className="flex items-center gap-3 min-w-0">
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 -ml-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors md:hidden shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </button>
        )}

        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="size-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shadow-inner">
            {type === "matter" ? (
              <Briefcase className="size-4 text-blue-400" />
            ) : (
              <User className="size-4 text-indigo-400" />
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

        {/* Title & Metadata */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100 truncate tracking-tight font-serif">
              {title}
            </h3>
            {badge && (
              <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
            {subtitle}
            {presence && (
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

      {/* Right section: Stream toggle (for matters) & action links */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Stream switcher pill */}
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

        {/* External Link */}
        {externalLink && (
          <Link
            href={externalLink}
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800/60 rounded-xl transition-colors hidden sm:flex items-center gap-1 text-xs font-medium"
            title={externalLinkLabel}
          >
            <ExternalLink className="size-3.5" />
          </Link>
        )}

        {/* Close Button (if inside drawer) */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
            aria-label="Close chat"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
