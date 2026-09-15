"use client";

import * as React from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/ui/notification-bell";
import { useI18n } from "@/lib/i18n-context";
import {
  isPortalNavLink,
  PortalNavItemData,
  PortalSidebarItem,
} from "@/components/dashboard/portal-sidebar";

export interface PortalMobileNavProps {
  /** Brand node rendered in the sticky mobile header. */
  brand: React.ReactNode;
  /** Flat NAV entries; headings render as section labels. */
  items: PortalNavItemData[];
  /** Wrapper-owned active-route rule (kept role-specific on purpose). */
  isActive: (href: string) => boolean;
  /** Render-prop receiving close(), for the drawer account menu. */
  accountMenu?: (close: () => void) => React.ReactNode;
  /** Optional fixed bottom bar node (staff/client render their own). */
  bottomBar?: React.ReactNode;
  /** Portal-specific class prescriptions. */
  headerClassName?: string;
  langButtonClassName?: string;
  menuButtonClassName?: string;
  drawerClassName?: string;
  headingClassName?: string;
  /** Full item class string; called with the item's active state. */
  itemClassName?: (active: boolean) => string;
  navAriaLabel?: string;
}

/**
 * Mobile shell chrome: sticky header (brand, language toggle, notifications,
 * hamburger), full-screen drawer navigation, and an optional bottom bar.
 * Open state and route-change collapse live here; visuals arrive via props.
 */
export function PortalMobileNav({
  brand,
  items,
  isActive,
  accountMenu,
  bottomBar,
  headerClassName,
  langButtonClassName,
  menuButtonClassName,
  drawerClassName,
  headingClassName,
  itemClassName,
  navAriaLabel = "Mobile navigation",
}: PortalMobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t, language, setLanguage } = useI18n();

  // Collapse the drawer whenever the route changes, including browser back/forward.
  const [drawerPathname, setDrawerPathname] = useState(pathname);
  if (drawerPathname !== pathname) {
    setDrawerPathname(pathname);
    setOpen(false);
  }

  const close = () => setOpen(false);

  return (
    <>
      <div
        className={cn(
          "md:hidden sticky top-0 z-50 flex h-[var(--dashboard-topbar-height)] w-full shrink-0 items-center justify-between border-b px-4 backdrop-blur",
          headerClassName,
        )}
      >
        {brand}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLanguage(language === "en" ? "ne" : "en")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full bg-dashboard-primary text-[10px] font-bold text-dashboard-primary-foreground focus-visible:ring-2",
              langButtonClassName,
            )}
            aria-label={`Switch language to ${language === "en" ? "Nepali" : "English"}`}
          >
            {language === "en" ? "ने" : "EN"}
          </button>
          <NotificationBell />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn("p-1 focus-visible:ring-2", menuButtonClassName)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          className={cn(
            "md:hidden fixed inset-0 z-40 flex flex-col pt-[var(--dashboard-topbar-height)]",
            drawerClassName,
          )}
        >
          <nav aria-label={navAriaLabel} className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
            {items.map((item, idx) => {
              if (item.heading !== undefined) {
                return (
                  <div key={`heading-${idx}`} className={headingClassName}>
                    {item.heading}
                  </div>
                );
              }
              if (!isPortalNavLink(item)) return null;
              const { href, icon, label, i18nKey } = item;
              return (
                <PortalSidebarItem
                  key={href}
                  href={href}
                  icon={icon}
                  label={label}
                  i18nKey={i18nKey}
                  active={isActive(href)}
                  onNavigate={close}
                  className={itemClassName?.(isActive(href))}
                />
              );
            })}
          </nav>
          {accountMenu?.(close)}
        </div>
      )}

      {bottomBar}
    </>
  );
}
