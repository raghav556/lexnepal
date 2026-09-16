"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, type LucideIcon } from "lucide-react";
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
  badge?: React.ReactNode;
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
  collapsible?: boolean;
  defaultOpen?: boolean;
  labelClassName?: string;
}

/** Renders a fragment or collapsible block for nav groups. */
export function PortalSidebarGroup({
  label,
  children,
  variant = "default",
  collapsible = false,
  defaultOpen = true,
  labelClassName,
}: PortalSidebarGroupProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="space-y-0.5">
      {label !== undefined && label !== null ? (
        collapsible ? (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={cn(
              "mt-4 mb-1.5 flex w-full items-center justify-between px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.12em] text-dashboard-sidebar-heading transition-colors hover:text-dashboard-sidebar-foreground group",
              labelClassName,
            )}
          >
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-0.5 rounded-full bg-dashboard-sidebar-heading-bar/80 transition-transform group-hover:scale-y-125" />
              {label}
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 text-dashboard-sidebar-chevron transition-transform duration-200",
                !isOpen && "-rotate-90",
              )}
            />
          </button>
        ) : variant === "divided" ? (
          <div
            className={cn(
              "mt-5 mb-2 flex items-center gap-2 border-t border-dashboard-sidebar-border px-3 pt-3 text-xs font-semibold uppercase tracking-wider text-dashboard-sidebar-heading",
              labelClassName,
            )}
          >
            <span
              aria-hidden
              className="h-2.5 w-0.5 rounded-full bg-dashboard-sidebar-heading-bar"
            />
            {label}
          </div>
        ) : (
          <div
            className={cn(
              "mt-4 mb-1.5 flex items-center gap-1.5 px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.12em] text-dashboard-sidebar-heading",
              labelClassName,
            )}
          >
            <span
              aria-hidden
              className="h-2.5 w-0.5 rounded-full bg-dashboard-sidebar-heading-bar/80"
            />
            {label}
          </div>
        )
      ) : null}
      {collapsible ? (isOpen ? children : null) : children}
    </div>
  );
}

export interface PortalSidebarTreeBranchProps {
  label: React.ReactNode;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  active?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  buttonClassName?: string;
  childrenClassName?: string;
  id?: string;
}

/**
 * Collapsible branch node inside a sidebar tree.
 * Owns expand/collapse state, rotating chevron, active highlight, and branch connector rail.
 */
export function PortalSidebarTreeBranch({
  label,
  icon: Icon,
  badge,
  active = false,
  defaultOpen = false,
  children,
  className,
  buttonClassName,
  childrenClassName,
  id,
}: PortalSidebarTreeBranchProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen || active);

  React.useEffect(() => {
    if (active) {
      setIsOpen(true);
    }
  }, [active]);

  return (
    <div className={cn("space-y-1", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={id}
        className={cn(
          "group flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-all duration-200",
          active
            ? "text-white bg-white/[0.07] font-semibold"
            : "text-slate-300 hover:text-white hover:bg-white/[0.04]",
          buttonClassName,
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5 truncate">
          {Icon ? (
            <Icon
              className={cn(
                "size-[18px] shrink-0 transition-colors",
                active ? "text-[#487FFF]" : "text-slate-400 group-hover:text-slate-200",
              )}
              aria-hidden
            />
          ) : null}
          <span className="truncate">{label}</span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {badge}
          <ChevronDown
            className={cn(
              "size-3.5 text-slate-400 transition-transform duration-200 group-hover:text-slate-200",
              !isOpen && "-rotate-90",
            )}
            aria-hidden
          />
        </span>
      </button>

      {isOpen ? (
        <div
          id={id}
          className={cn("tree-branch-rail ml-3 pl-3.5 space-y-1 py-0.5", childrenClassName)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export interface PortalSidebarItemProps {
  href: string;
  icon: LucideIcon;
  label?: string;
  i18nKey?: string;
  /** Computed by the role wrapper with its own active-route rule. */
  active: boolean;
  badge?: React.ReactNode;
  onNavigate?: () => void;
  /** Full visual class string (base + active/inactive state) from the wrapper. */
  className?: string;
  iconClassName?: string;
  /** Optional inline style from the wrapper (e.g. active glow shadow). */
  style?: React.CSSProperties;
}

/**
 * Navigation link semantics: link rendering, i18n label resolution, icon slot,
 * optional badge, and aria-current. Colors and spacing stay in the wrapper prescriptions.
 */
export function PortalSidebarItem({
  href,
  icon: Icon,
  label,
  i18nKey,
  active,
  badge,
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
      <span className="flex min-w-0 items-center gap-2.5 truncate">
        <Icon className={cn("size-4 shrink-0", iconClassName)} aria-hidden />
        <span className="truncate">{resolvedLabel}</span>
      </span>
      {badge ? <span className="shrink-0">{badge}</span> : null}
    </Link>
  );
}
