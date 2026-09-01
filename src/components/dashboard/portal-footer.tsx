"use client";

import * as React from "react";
import { ShieldCheck, Lock, Activity, Command, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortalFooterProps {
  portal: "admin" | "staff" | "client";
  className?: string;
}

export function PortalFooter({ portal, className }: PortalFooterProps) {
  const isStaff = portal === "staff";
  const isClient = portal === "client";
  const isLight = isStaff || isClient;

  return (
    <footer
      className={cn(
        "w-full border-t px-4 md:px-6 py-3 text-xs transition-colors select-none shrink-0 print:hidden",
        isLight
          ? "border-slate-200/80 bg-slate-50/90 text-slate-500"
          : "border-slate-800/80 bg-slate-950/80 text-slate-400",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* LEFT: Legal OS Brand & Encryption Badge */}
        <div className="flex items-center gap-3 text-[11px]">
          <span className="font-semibold tracking-tight text-foreground">LexNepal Legal OS</span>
          <span className="text-muted-foreground">•</span>
          <div className="flex items-center gap-1">
            <Lock className="size-3 text-emerald-600 dark:text-emerald-400" />
            <span>256-bit AES Encrypted</span>
          </div>
          <span className="hidden md:inline text-muted-foreground">•</span>
          <span className="hidden md:inline">
            {isClient ? "Attorney-Client Privilege Protected" : "Supreme Court Bar Compliant"}
          </span>
        </div>

        {/* CENTER: Keyboard Shortcut Guides */}
        <div className="hidden lg:flex items-center gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <kbd
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-mono border",
                isLight
                  ? "bg-white border-slate-200 text-slate-600 shadow-2xs"
                  : "bg-slate-900 border-slate-700 text-slate-300",
              )}
            >
              ⌘K
            </kbd>
            <span>Command Center</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <kbd
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-mono border",
                isLight
                  ? "bg-white border-slate-200 text-slate-600 shadow-2xs"
                  : "bg-slate-900 border-slate-700 text-slate-300",
              )}
            >
              Esc
            </kbd>
            <span>Close Modals</span>
          </div>
        </div>

        {/* RIGHT: Operational Status & System Health */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>All Systems Operational</span>
          </div>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">v2.4.0</span>
        </div>
      </div>
    </footer>
  );
}
