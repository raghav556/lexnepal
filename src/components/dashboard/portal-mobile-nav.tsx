"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/ui/notification-bell";
import { useI18n } from "@/lib/i18n-context";
import { ClientMobileDrawer } from "@/components/dashboard/client-mobile-drawer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  isPortalNavLink,
  PortalNavItemData,
  PortalSidebarItem,
} from "@/components/dashboard/portal-sidebar";

export type PortalMobileNavControls = {
  open: boolean;
  openMenu: () => void;
  closeMenu: () => void;
};

export interface PortalMobileNavProps {
  /** Brand node rendered in the sticky mobile header. */
  brand: React.ReactNode;
  /** Flat NAV entries; headings render as section labels. */
  items: PortalNavItemData[];
  /** Wrapper-owned active-route rule (kept role-specific on purpose). */
  isActive: (href: string) => boolean;
  /** Render-prop receiving close(), for the drawer account menu. */
  accountMenu?: (close: () => void) => React.ReactNode;
  /**
   * Optional role-owned bottom bar. A render-prop exposes drawer controls
   * for the existing Client More action.
   */
  bottomBar?: React.ReactNode | ((controls: PortalMobileNavControls) => React.ReactNode);
  /** Portal-specific class prescriptions. */
  headerClassName?: string;
  langButtonClassName?: string;
  menuButtonClassName?: string;
  drawerClassName?: string;
  headingClassName?: string;
  /** Full item class string; called with the item's active state. */
  itemClassName?: (active: boolean) => string;
  navAriaLabel?: string;
  drawerId?: string;
  /** Client-only opt-in for the frozen Client drawer. */
  clientModalDrawer?: boolean;
  /** Staff/Admin opt-in; leaves the frozen Client drawer path unchanged. */
  operationalDrawer?: boolean;
  /** Role-owned hierarchy rendered inside the existing navigation region. */
  renderNavigation?: (close: () => void) => React.ReactNode;
}

/**
 * Mobile shell chrome: sticky header (brand, language toggle, notifications,
 * hamburger), drawer navigation, and an optional bottom bar.
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
  drawerId = "portal-mobile-drawer",
  clientModalDrawer = false,
  operationalDrawer = false,
  renderNavigation,
}: PortalMobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { language, setLanguage } = useI18n();

  // Collapse the drawer whenever the route changes, including browser back/forward.
  const [drawerPathname, setDrawerPathname] = useState(pathname);
  if (drawerPathname !== pathname) {
    setDrawerPathname(pathname);
    setOpen(false);
  }

  const close = () => setOpen(false);
  const openMenu = () => setOpen(true);
  const controls: PortalMobileNavControls = { open, openMenu, closeMenu: close };

  useEffect(() => {
    if (!open || clientModalDrawer || operationalDrawer) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, clientModalDrawer, operationalDrawer]);

  useEffect(() => {
    if (!clientModalDrawer) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [clientModalDrawer]);

  useEffect(() => {
    if (!operationalDrawer) return;
    const desktop = window.matchMedia("(min-width: 48rem)");
    const closeOnDesktop = () => {
      if (!desktop.matches) return;
      setOpen(false);
      if (open) {
        window.requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>(
              ".dashboard-theme:is(.dashboard-staff, .dashboard-admin) main",
            )
            ?.focus();
        });
      }
    };
    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [operationalDrawer, open]);

  // Let the existing shell search shortcut take over without two focus owners.
  useEffect(() => {
    if (!operationalDrawer || !open) return;
    const onSearchShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") setOpen(false);
    };
    document.addEventListener("keydown", onSearchShortcut);
    return () => document.removeEventListener("keydown", onSearchShortcut);
  }, [operationalDrawer, open]);

  const drawerContent = open ? (
    <>
      <nav aria-label={navAriaLabel} className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {renderNavigation
          ? renderNavigation(close)
          : items.map((item, idx) => {
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
    </>
  ) : null;

  return (
    <>
      <div
        className={cn(
          "md:hidden sticky top-0 z-50 flex h-[var(--dashboard-topbar-height)] w-full shrink-0 items-center justify-between border-b px-4 backdrop-blur",
          headerClassName,
          operationalDrawer && "portal-operational-header",
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
              operationalDrawer &&
                "size-11 shrink-0 bg-dashboard-neutral-soft text-xs text-dashboard-neutral-foreground focus-visible:ring-dashboard-focus",
            )}
            aria-label={`Switch language to ${language === "en" ? "Nepali" : "English"}`}
          >
            {language === "en" ? "ने" : "EN"}
          </button>
          <NotificationBell
            triggerClassName={
              operationalDrawer
                ? "size-11 shrink-0 text-inherit focus-visible:ring-2 focus-visible:ring-dashboard-focus"
                : undefined
            }
            iconClassName={operationalDrawer ? "text-current group-hover:text-current" : undefined}
          />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "p-1 focus-visible:ring-2",
              menuButtonClassName,
              operationalDrawer && "size-11 shrink-0",
            )}
            aria-label={
              operationalDrawer ? `${open ? "Close" : "Open"} ${navAriaLabel}` : "Toggle menu"
            }
            aria-expanded={open}
            aria-controls={drawerId}
            aria-haspopup={clientModalDrawer || operationalDrawer ? "dialog" : undefined}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {clientModalDrawer ? (
        <ClientMobileDrawer
          open={open}
          onOpenChange={setOpen}
          id={drawerId}
          className={drawerClassName}
        >
          {drawerContent}
        </ClientMobileDrawer>
      ) : operationalDrawer ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            id={drawerId}
            aria-labelledby={`${drawerId}-title`}
            className={cn("portal-operational-drawer", drawerClassName)}
          >
            <DialogTitle id={`${drawerId}-title`} className="portal-operational-drawer-title">
              {navAriaLabel}
            </DialogTitle>
            <div className="portal-operational-drawer-scroll">{drawerContent}</div>
          </DialogContent>
        </Dialog>
      ) : open ? (
        <div
          id={drawerId}
          className={cn(
            "md:hidden fixed inset-0 z-40 flex flex-col pt-[var(--dashboard-topbar-height)]",
            drawerClassName,
          )}
        >
          {drawerContent}
        </div>
      ) : null}

      {typeof bottomBar === "function" ? bottomBar(controls) : bottomBar}
    </>
  );
}
