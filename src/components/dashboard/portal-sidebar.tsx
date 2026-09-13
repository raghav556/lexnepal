"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";

/**
 * Shared desktop/mobile navigation-entry shape used by all three portal layouts.
 * Presentation primitives render what they are given; role wrappers own the
 * navigation content, active-route rules, and per-portal class prescriptions.
 */
export interface PortalNavItemData {
  label?: string;
  i18nKey?: string;
  href?: string;
  icon?: LucideIcon;
  heading?: string;
}

export type PortalNavLinkData = PortalNavItemData & { href: string; icon: LucideIcon };

export function isPortalNavLink(item: PortalNavItemData): item is PortalNavLinkData {
  return Boolean(item.href && item.icon);
}

export interface PortalNavGroup {
  /** Heading label; the leading group may be unlabeled. */
  label?: string;
  items: PortalNavLinkData[];
}

/** Split a flat NAV array (headings inline) into heading + items groups. */
export function splitPortalNavGroups(items: PortalNavItemData[]): PortalNavGroup[] {
  const groups: PortalNavGroup[] = [];
  for (const item of items) {
    if (item.heading !== undefined) {
      groups.push({ label: item.heading, items: [] });
      continue;
    }
    if (!isPortalNavLink(item)) continue;
    if (groups.length === 0) groups.push({ items: [] });
    groups[groups.length - 1].items.push(item);
  }
  return groups;
}

/** Shared active-item glow used by the admin and client desktop sidebars. */
export const PORTAL_SIDEBAR_ACTIVE_SHADOW: React.CSSProperties = {
  boxShadow:
    "0 2px 12px var(--dashboard-sidebar-brand-glow), inset 0 1px 0 var(--dashboard-sidebar-border)",
};

export interface PortalSidebarProps {
  /** Brand header node (rendered inside the bordered header region). */
  brand?: React.ReactNode;
  /** Navigation content: PortalSidebarGroup / PortalSidebarItem tree. */
  children?: React.ReactNode;
  /** Footer slot (account menu, portal-specific actions). */
  footer?: React.ReactNode;
  /** Portal-specific aside classes (background, width, borders, print). */
  className?: string;
  /** Portal-specific aside inline styles (e.g. client gradient). */
  style?: React.CSSProperties;
  brandClassName?: string;
  navClassName?: string;
  navAriaLabel?: string;
}

/**
 * Desktop sidebar chrome. Owns only the responsive visibility skeleton;
 * all visual classes arrive via props so each portal keeps its look.
 */
export function PortalSidebar({
  brand,
  children,
  footer,
  className,
  style,
  brandClassName,
  navClassName,
  navAriaLabel,
}: PortalSidebarProps) {
  return (
    <aside className={cn("hidden md:flex flex-col", className)} style={style}>
      {brand ? <div className={brandClassName}>{brand}</div> : null}
      <nav aria-label={navAriaLabel} className={navClassName}>
        {children}
      </nav>
      {footer}
    </aside>
  );
}

export interface PortalSidebarGroupProps {
  label?: React.ReactNode;
  children?: React.ReactNode;
  /**
   * "default": shared admin/client heading style.
   * "divided": staff heading style with a top separator.
   */
  variant?: "default" | "divided";
}

/** Renders a fragment so nav spacing utilities keep working across items. */
export function PortalSidebarGroup({
  label,
  children,
  variant = "default",
}: PortalSidebarGroupProps) {
  return (
    <>
      {label !== undefined && label !== null ? (
        variant === "divided" ? (
          <div className="mt-5 mb-2 flex items-center gap-2 border-t border-dashboard-sidebar-border px-3 pt-3 text-[11px] font-semibold uppercase tracking-wider text-dashboard-sidebar-heading">
            <span
              aria-hidden
              className="h-2.5 w-0.5 rounded-full bg-dashboard-sidebar-heading-bar"
            />
            {label}
          </div>
        ) : (
          <div className="mt-5 mb-2 flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-dashboard-sidebar-heading before:h-3 before:w-0.5 before:rounded-full before:bg-dashboard-sidebar-heading-bar">
            {label}
          </div>
        )
      ) : null}
      {children}
    </>
  );
}

export interface PortalSidebarItemProps {
  href: string;
  icon: LucideIcon;
  label?: string;
  i18nKey?: string;
  /** Computed by the role wrapper with its own active-route rule. */
  active: boolean;
  onNavigate?: () => void;
  /** Full visual class string (base + active/inactive state) from the wrapper. */
  className?: string;
  iconClassName?: string;
  /** Optional inline style from the wrapper (e.g. active glow shadow). */
  style?: React.CSSProperties;
}

/**
 * Navigation link semantics: link rendering, i18n label resolution, icon slot,
 * and aria-current. Colors and spacing stay in the wrapper prescriptions.
 */
export function PortalSidebarItem({
  href,
  icon: Icon,
  label,
  i18nKey,
  active,
  onNavigate,
  className,
  iconClassName,
  style,
}: PortalSidebarItemProps) {
  const { t } = useI18n();
  const resolvedLabel = i18nKey
    ? t(i18nKey) !== i18nKey
      ? t(i18nKey)
      : (label ?? "")
    : (label ?? "");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={className}
      style={style}
    >
      <Icon className={cn("w-4 h-4", iconClassName)} aria-hidden />
      {resolvedLabel}
    </Link>
  );
}
