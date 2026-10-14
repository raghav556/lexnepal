"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePortalBranding } from "@/components/dashboard/portal-branding-context";
import { DEFAULT_PRIVACY_POLICY_URL, DEFAULT_TERMS_OF_SERVICE_URL } from "@/shared/public-routes";

interface PortalFooterProps {
  portal: "admin" | "staff" | "client";
  className?: string;
}

export function PortalFooter({ portal, className }: PortalFooterProps) {
  const isClient = portal === "client";
  const { firmName } = usePortalBranding();
  const resolvedFirmName = firmName?.trim() || "Law Firm";
  const year = new Date().getFullYear();

  if (isClient) {
    return (
      <footer
        className={cn(
          "w-full shrink-0 border-t border-dashboard-border bg-dashboard-panel/85 px-4 py-1 text-xs text-muted-foreground backdrop-blur-md transition-colors select-none print:hidden md:px-6",
          className,
        )}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1 sm:flex-row">
          <p className="text-[11px] text-muted-foreground">
            © {year} {resolvedFirmName}. All rights reserved.
          </p>
          <nav
            aria-label="Legal"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]"
          >
            <Link
              href={DEFAULT_PRIVACY_POLICY_URL}
              className="hover:text-foreground hover:underline"
            >
              Privacy Policy
            </Link>
            <Link
              href={DEFAULT_TERMS_OF_SERVICE_URL}
              className="hover:text-foreground hover:underline"
            >
              Terms of Service
            </Link>
            <Link href="/contact" className="hover:text-foreground hover:underline">
              Contact Us
            </Link>
          </nav>
        </div>
      </footer>
    );
  }

  return (
    <footer
      data-slot="operational-portal-footer"
      className={cn(
        "w-full border-t border-dashboard-border bg-dashboard-panel/85 px-4 md:px-6 py-2.5 text-xs text-muted-foreground transition-colors select-none shrink-0 backdrop-blur-md print:hidden",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        <p className="text-xs text-muted-foreground">
          © {year} {resolvedFirmName}
          <span aria-hidden className="mx-2">
            ·
          </span>
          {portal === "staff" ? "Staff workspace" : "Admin workspace"}
        </p>

        <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-dashboard-border bg-dashboard-neutral-soft text-foreground shadow-2xs">
              Ctrl/⌘ K
            </kbd>
            <span>Search</span>
          </div>
          <span className="text-muted-foreground/60">•</span>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-dashboard-border bg-dashboard-neutral-soft text-foreground shadow-2xs">
              Esc
            </kbd>
            <span>Close Modals</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
