"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CommandCenter } from "@/components/ui/CommandCenter";
import { PortalRoleGuard } from "@/components/auth/PortalRoleGuard";
import { PortalAccountMenu } from "@/components/auth/PortalAccountMenu";
import { IdleSessionGuard } from "@/components/auth/IdleSessionGuard";
import { useI18n } from "@/lib/i18n-context";
import { useAppointments, useLeads } from "@/client/queries/crm";
import { useLeaveRequests } from "@/client/queries/hr";
import {
  PortalBrandingProvider,
  PortalTopbar,
  PortalFooter,
  PortalSidebar,
  PortalSidebarGroup,
  PortalSidebarItem,
  PortalSidebarTreeBranch,
  PortalMobileNav,
  ScrollToTop,
  GlobalSearchPalette,
  PORTAL_SIDEBAR_ACTIVE_SHADOW,
} from "@/components/dashboard";
import { PortalFirmBrand } from "@/components/branding/firm-brand";

import { ADMIN_NAV_TREE } from "@/lib/operational-navigation";

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/cms") return pathname === "/admin/cms";
    return pathname === href || pathname.startsWith(`${href}/`);
  };
}

const desktopItemClassName = (active: boolean) =>
  cn(
    "group relative flex min-h-11 items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-[13.5px] font-medium leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-sidebar-focus",
    active
      ? "text-dashboard-sidebar-active-foreground font-semibold bg-dashboard-sidebar-active border border-dashboard-sidebar-active-border"
      : "text-dashboard-sidebar-muted hover:text-dashboard-sidebar-foreground hover:bg-dashboard-sidebar-hover border border-transparent",
  );

const desktopSubItemClassName = (active: boolean) =>
  cn(
    "group relative flex min-h-11 items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-sidebar-focus",
    active
      ? "text-dashboard-sidebar-active-foreground font-semibold bg-dashboard-sidebar-active border border-dashboard-sidebar-active-border"
      : "text-dashboard-sidebar-muted hover:text-dashboard-sidebar-foreground hover:bg-dashboard-sidebar-hover border border-transparent",
  );

const desktopIconClassName = (active: boolean) =>
  active
    ? "size-[18px] text-dashboard-sidebar-active-icon"
    : "size-[18px] text-dashboard-sidebar-muted group-hover:text-dashboard-sidebar-foreground transition-colors";

const desktopSubIconClassName = (active: boolean) =>
  active
    ? "size-4 text-dashboard-sidebar-active-icon"
    : "size-4 text-dashboard-sidebar-muted group-hover:text-dashboard-sidebar-foreground transition-colors";

const mobileItemClassName = (active: boolean) =>
  cn(
    "flex min-h-11 items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-sidebar-focus",
    active
      ? "bg-dashboard-sidebar-active text-dashboard-sidebar-active-foreground"
      : "text-dashboard-sidebar-muted hover:bg-dashboard-sidebar-hover hover:text-dashboard-sidebar-foreground",
  );

function AdminDesktopSidebar() {
  const { t } = useI18n();
  const isActive = useIsActive();
  const appointmentsResult = useAppointments({});
  const pendingLeavesResult = useLeaveRequests({ status: "pending" });
  const leadsResult = useLeads();

  const appointmentsCount = appointmentsResult?.data?.length ?? 0;
  const pendingLeavesCount = pendingLeavesResult?.length ?? 0;
  const leadsCount = leadsResult?.data?.length ?? 0;

  const getItemBadge = (href: string) => {
    if (href === "/admin/appointments" && appointmentsCount > 0) {
      return (
        <span className="inline-flex items-center rounded-full bg-dashboard-information/20 border border-dashboard-information/30 px-2 py-0.5 text-[11px] font-bold text-dashboard-information">
          {appointmentsCount}
        </span>
      );
    }
    if (href === "/admin/hr" && pendingLeavesCount > 0) {
      return (
        <span className="inline-flex items-center rounded-full bg-dashboard-warning/20 border border-dashboard-warning/30 px-2 py-0.5 text-[11px] font-bold text-dashboard-warning">
          {pendingLeavesCount}
        </span>
      );
    }
    if (href === "/admin/crm" && leadsCount > 0) {
      return (
        <span className="inline-flex items-center rounded-full bg-dashboard-success/20 border border-dashboard-success/30 px-2 py-0.5 text-[11px] font-bold text-dashboard-success">
          {leadsCount}
        </span>
      );
    }
    return undefined;
  };

  const getBranchBadge = (branchId: string) => {
    if (branchId === "crm-branch") {
      const total = appointmentsCount + leadsCount;
      if (total > 0) {
        return (
          <span className="inline-flex items-center rounded-full bg-dashboard-information/20 border border-dashboard-information/30 px-2 py-0.5 text-[10px] font-bold text-dashboard-information">
            {total}
          </span>
        );
      }
    }
    if (branchId === "workforce-branch" && pendingLeavesCount > 0) {
      return (
        <span className="inline-flex items-center rounded-full bg-dashboard-warning/20 border border-dashboard-warning/30 px-2 py-0.5 text-[10px] font-bold text-dashboard-warning">
          {pendingLeavesCount}
        </span>
      );
    }
    return undefined;
  };

  return (
    <PortalSidebar
      navAriaLabel="Portal navigation"
      className="h-full min-h-0 md:w-[var(--dashboard-sidebar-width)] bg-gradient-to-b from-dashboard-sidebar-bg-from to-dashboard-sidebar-bg-to border-r border-dashboard-sidebar-border shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.25)]"
      brandClassName="flex items-center justify-between gap-3 border-b border-dashboard-sidebar-border px-4 py-4"
      brand={
        <PortalFirmBrand
          href="/admin"
          subtitle={t("nav.admin_console")}
          logoFit="cover"
          className="flex-1 gap-3"
          logoClassName="size-10 rounded-xl border border-dashboard-sidebar-brand-border bg-dashboard-sidebar-brand-bg shadow-[0_4px_18px_var(--dashboard-sidebar-brand-glow)]"
          fallbackClassName="size-10 border border-dashboard-sidebar-brand-border bg-dashboard-sidebar-brand-bg shadow-[0_4px_18px_var(--dashboard-sidebar-brand-glow)]"
          nameClassName="whitespace-nowrap text-[15px] leading-5 font-semibold tracking-[-0.01em] text-dashboard-sidebar-foreground"
          subtitleClassName="mt-0.5 whitespace-nowrap text-[10px] font-semibold uppercase leading-4 tracking-[0.14em] text-dashboard-sidebar-muted"
        />
      }
      navClassName="flex-1 px-3 py-4 space-y-1 overflow-y-auto admin-sidebar-scroll"
      footer={
        <div className="sticky bottom-0 border-t border-dashboard-sidebar-border bg-dashboard-sidebar-deep/90 px-3 py-3.5 backdrop-blur-md">
          <PortalAccountMenu
            profileHref="/admin/profile"
            variant="dropdown"
            fallbackName="Admin"
            darkTrigger
            className="admin-sidebar-account"
          />
        </div>
      }
    >
      {ADMIN_NAV_TREE.map((section) => (
        <PortalSidebarGroup
          key={section.heading}
          label={section.heading}
          labelClassName="text-[12px] font-bold tracking-[0.1em] text-dashboard-sidebar-muted"
        >
          {section.items.map((item) => {
            if (item.type === "link") {
              const active = isActive(item.href);
              return (
                <PortalSidebarItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  i18nKey={item.i18nKey}
                  active={active}
                  badge={getItemBadge(item.href)}
                  className={desktopItemClassName(active)}
                  iconClassName={desktopIconClassName(active)}
                  style={active ? PORTAL_SIDEBAR_ACTIVE_SHADOW : undefined}
                />
              );
            }

            // Branch item (collapsible tree node)
            const branchActive = item.items.some((subItem) => isActive(subItem.href));
            return (
              <PortalSidebarTreeBranch
                key={item.id}
                id={item.id}
                label={item.label}
                icon={item.icon}
                active={branchActive}
                defaultOpen={item.defaultOpen || branchActive}
                badge={getBranchBadge(item.id)}
              >
                {item.items.map((subItem) => {
                  const subActive = isActive(subItem.href);
                  return (
                    <PortalSidebarItem
                      key={subItem.href}
                      href={subItem.href}
                      icon={subItem.icon}
                      label={subItem.label}
                      i18nKey={subItem.i18nKey}
                      active={subActive}
                      badge={getItemBadge(subItem.href)}
                      className={desktopSubItemClassName(subActive)}
                      iconClassName={desktopSubIconClassName(subActive)}
                      style={subActive ? PORTAL_SIDEBAR_ACTIVE_SHADOW : undefined}
                    />
                  );
                })}
              </PortalSidebarTreeBranch>
            );
          })}
        </PortalSidebarGroup>
      ))}
    </PortalSidebar>
  );
}

function AdminMobileChrome() {
  const { t } = useI18n();
  const isActive = useIsActive();

  return (
    <PortalMobileNav
      navAriaLabel="Admin navigation"
      drawerId="admin-mobile-drawer"
      operationalDrawer
      items={[]}
      isActive={isActive}
      renderNavigation={(close) =>
        ADMIN_NAV_TREE.map((section) => (
          <PortalSidebarGroup
            key={section.heading}
            label={section.heading}
            labelClassName="text-xs text-dashboard-sidebar-muted"
          >
            {section.items.map((item) =>
              item.type === "link" ? (
                <PortalSidebarItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  i18nKey={item.i18nKey}
                  active={isActive(item.href)}
                  className={mobileItemClassName(isActive(item.href))}
                  onNavigate={close}
                />
              ) : (
                <PortalSidebarTreeBranch
                  key={item.id}
                  id={`mobile-${item.id}`}
                  label={item.label}
                  icon={item.icon}
                  active={item.items.some((child) => isActive(child.href))}
                  defaultOpen={item.defaultOpen}
                >
                  {item.items.map((child) => (
                    <PortalSidebarItem
                      key={child.href}
                      href={child.href}
                      icon={child.icon}
                      label={child.label}
                      i18nKey={child.i18nKey}
                      active={isActive(child.href)}
                      className={mobileItemClassName(isActive(child.href))}
                      onNavigate={close}
                    />
                  ))}
                </PortalSidebarTreeBranch>
              ),
            )}
          </PortalSidebarGroup>
        ))
      }
      brand={
        <PortalFirmBrand
          href="/admin"
          subtitle={t("nav.admin_console")}
          logoFit="cover"
          className="min-w-0 flex-1 gap-2"
          logoClassName="size-8 max-w-10 rounded-lg"
          fallbackClassName="size-8"
          nameClassName="text-sm text-foreground"
          subtitleClassName="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
        />
      }
      headerClassName="bg-dashboard-canvas-elevated/95 border-dashboard-border"
      langButtonClassName="focus-visible:ring-dashboard-focus"
      menuButtonClassName="text-foreground focus-visible:ring-dashboard-focus"
      drawerClassName="bg-dashboard-sidebar text-dashboard-sidebar-foreground"
      accountMenu={(close) => (
        <PortalAccountMenu
          profileHref="/admin/profile"
          variant="drawer"
          fallbackName="Admin"
          darkTrigger
          onAction={close}
        />
      )}
    />
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <PortalBrandingProvider appearance="dark">
      <div className="dashboard-theme dashboard-admin dashboard-nepal fixed inset-0 h-[100dvh] min-h-[100dvh] overflow-hidden bg-dashboard-canvas text-foreground">
        <PortalRoleGuard
          allowed="admin"
          title="Admin Console"
          description="Restricted access. Please sign in with admin credentials."
          dark
        >
          <IdleSessionGuard />
          <div className="flex h-full min-h-0 overflow-hidden bg-dashboard-canvas">
            <AdminDesktopSidebar />
            <div className="flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden bg-dashboard-canvas">
              <AdminMobileChrome />
              <PortalTopbar
                portal="admin"
                onOpenSearch={() => setSearchOpen(true)}
                onOpenChat={() => setChatOpen(true)}
                className="staff-admin-topbar hidden md:flex"
              />
              <main
                ref={mainRef}
                id="admin-main-canvas"
                tabIndex={-1}
                className="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain bg-dashboard-canvas text-foreground dashboard-main-scroll scroll-smooth"
              >
                {children}
              </main>
              <PortalFooter portal="admin" />
              <ScrollToTop containerRef={mainRef} />
            </div>
          </div>
          <GlobalSearchPalette
            isOpen={searchOpen}
            onClose={() => setSearchOpen(false)}
            portal="admin"
          />
          <CommandCenter isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </PortalRoleGuard>
      </div>
    </PortalBrandingProvider>
  );
}
