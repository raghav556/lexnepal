"use client";

import * as React from "react";
import { ShieldCheck, Lock, Activity, Command, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortalFooterProps {
  portal: "admin" | "staff" | "client";
  className?: string;
}

export function PortalFooter({ portal, className }: PortalFooterProps) {
  const isClient = portal === "client";

  return (
    <footer
      className={cn(
        "w-full border-t border-dashboard-border bg-dashboard-panel/85 px-4 md:px-6 py-2.5 text-xs text-muted-foreground transition-colors select-none shrink-0 backdrop-blur-md print:hidden",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* LEFT: Legal OS Brand & Encryption Badge */}
        <div className="flex items-center gap-3 text-[11px]">
          <span className="font-semibold tracking-tight text-foreground">LexNepal Legal OS</span>
          <span className="text-muted-foreground/60">•</span>
          <div className="flex items-center gap-1.5">
            <Lock className="size-3 text-emerald-600 dark:text-emerald-400" />
            <span>256-bit AES Encrypted</span>
          </div>
          <span className="hidden md:inline text-muted-foreground/60">•</span>
          <span className="hidden md:inline">
            {isClient ? "Attorney-Client Privilege Protected" : "Supreme Court Bar Compliant"}
          </span>
        </div>

        {/* CENTER: Keyboard Shortcut Guides */}
        <div className="hidden lg:flex items-center gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-dashboard-border bg-dashboard-neutral-soft text-foreground shadow-2xs">
              ⌘K
            </kbd>
            <span>Command Center</span>
          </div>
          <span className="text-muted-foreground/60">•</span>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-dashboard-border bg-dashboard-neutral-soft text-foreground shadow-2xs">
              Esc
            </kbd>
            <span>Close Modals</span>
          </div>
        </div>

        {/* RIGHT: Operational Status & System Health */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />
            <span>All Systems Operational</span>
          </div>
          <span className="text-muted-foreground/60">•</span>
          <span className="text-muted-foreground font-mono text-[10px]">v2.4.0</span>
        </div>
      </div>
    </footer>
  );
}
