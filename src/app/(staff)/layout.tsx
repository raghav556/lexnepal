"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PortalRoleGuard } from "@/components/auth/PortalRoleGuard";
import { PortalAccountMenu } from "@/components/auth/PortalAccountMenu";
import { IdleSessionGuard } from "@/components/auth/IdleSessionGuard";
import { useI18n } from "@/lib/i18n-context";
import {
  PortalBrandingProvider,
  PortalFooter,
  PortalSidebar,
  PortalSidebarGroup,
  PortalSidebarItem,
  PortalMobileNav,
  ScrollToTop,
  PORTAL_SIDEBAR_ACTIVE_SHADOW,
  splitPortalNavGroups,
  isPortalNavLink,
} from "@/components/dashboard";
import { PortalFirmBrand } from "@/components/branding/firm-brand";
import { StaffCaseTopbar } from "@/components/cases/staff-case-topbar";

const GlobalSearchPalette = dynamic(
  () =>
    import("@/components/dashboard/global-search-palette").then(
      (module) => module.GlobalSearchPalette,
    ),
  { ssr: false },
);

import { STAFF_NAV as NAV } from "@/lib/operational-navigation";

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/staff"
      ? pathname === "/staff"
      : pathname === href || pathname.startsWith(`${href}/`);
}

const navGroups = splitPortalNavGroups(NAV);

const desktopItemClassName = (active: boolean) =>
  cn(
    "staff-nav-item group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-sidebar-focus",
    active
      ? "staff-nav-item-active border border-dashboard-sidebar-active-border bg-dashboard-sidebar-active text-dashboard-sidebar-active-foreground font-semibold shadow-sm"
      : "border border-transparent text-dashboard-sidebar-muted hover:border-dashboard-sidebar-border hover:bg-dashboard-sidebar-hover hover:text-dashboard-sidebar-foreground focus-visible:ring-2 focus-visible:ring-dashboard-sidebar-focus",
  );

const desktopIconClassName = (active: boolean) =>
  cn(
    "size-[18px] shrink-0 transition-colors",
    active
      ? "text-dashboard-sidebar-active-icon"
      : "text-dashboard-sidebar-muted group-hover:text-dashboard-sidebar-foreground",
  );

const mobileItemClassName = (active: boolean) =>
  cn(
    "flex min-h-11 items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-sidebar-focus",
    active
      ? "bg-dashboard-sidebar-active text-dashboard-sidebar-active-foreground border border-dashboard-sidebar-active-border"
      : "text-dashboard-sidebar-muted hover:bg-dashboard-sidebar-hover hover:text-dashboard-sidebar-foreground",
  );

function StaffDesktopSidebar() {
  const { t } = useI18n();
  const isActive = useIsActive();

  return (
    <PortalSidebar
      navAriaLabel="Portal navigation"
      className="md:w-[var(--dashboard-sidebar-width)] h-screen sticky top-0 bg-dashboard-sidebar text-dashboard-sidebar-foreground border-r border-dashboard-sidebar-border shrink-0 print:hidden shadow-[4px_0_24px_rgba(0,0,0,0.15)]"
      brandClassName="px-4 py-5 border-b border-dashboard-sidebar-border flex items-center justify-between"
      brand={
        <PortalFirmBrand
          href="/staff"
          subtitle={t("nav.staff_portal")}
          logoFit="cover"
          className="flex-1 gap-2.5"
          logoClassName="size-9 max-w-12 rounded-lg"
          fallbackClassName="size-9 border border-dashboard-sidebar-brand-border bg-dashboard-sidebar-brand-bg shadow-sm"
          fallbackIconClassName="size-4 text-dashboard-sidebar-brand-icon"
          nameClassName="text-base leading-tight tracking-tight text-dashboard-sidebar-foreground"
          subtitleClassName="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-dashboard-sidebar-muted"
        />
      }
      navClassName="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto sidebar-scroll-fade"
      footer={
        <>
          <div className="px-3 pb-4 pt-2 border-t border-dashboard-sidebar-border">
            <PortalAccountMenu
              profileHref="/staff/profile"
              variant="dropdown"
              fallbackName="Staff"
              showLanguageToggle
              darkTrigger
              className="staff-sidebar-account"
            />
          </div>
        </>
      }
    >
      {navGroups.map((group, groupIndex) => (
        <PortalSidebarGroup
          key={group.label ?? `group-${groupIndex}`}
          label={group.label}
          variant="divided"
          labelClassName="text-[11px] font-bold tracking-[0.14em] text-dashboard-sidebar-heading"
        >
          {group.items.map(({ href, icon: Icon, label, i18nKey }) => (
            <PortalSidebarItem
              key={href}
              href={href}
              icon={Icon}
              label={label}
              i18nKey={i18nKey}
              active={isActive(href)}
              className={desktopItemClassName(isActive(href))}
              iconClassName={desktopIconClassName(isActive(href))}
              style={isActive(href) ? PORTAL_SIDEBAR_ACTIVE_SHADOW : undefined}
            />
          ))}
        </PortalSidebarGroup>
      ))}
    </PortalSidebar>
  );
}

function StaffMobileChrome() {
  const { t } = useI18n();
  const isActive = useIsActive();

  const bottomBar = (
    <nav
      aria-label="Staff primary navigation"
      className="staff-mobile-primary md:hidden fixed bottom-0 left-0 right-0 bg-dashboard-sidebar/95 backdrop-blur border-t border-dashboard-sidebar-border flex justify-around z-30 print:hidden text-dashboard-sidebar-foreground"
    >
      {NAV.filter(isPortalNavLink)
        .slice(0, 5)
        .map(({ href, icon: Icon, label, i18nKey }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-xs leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-sidebar-focus",
              isActive(href)
                ? "bg-dashboard-sidebar-active text-dashboard-sidebar-active-foreground border border-dashboard-sidebar-active-border"
                : "text-dashboard-sidebar-muted hover:text-dashboard-sidebar-foreground",
            )}
            aria-label={i18nKey ? t(i18nKey) : label}
            aria-current={isActive(href) ? "page" : undefined}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span>{i18nKey && t(i18nKey) !== i18nKey ? t(i18nKey) : label}</span>
          </Link>
        ))}
    </nav>
  );

  return (
    <PortalMobileNav
      navAriaLabel="Staff navigation"
      drawerId="staff-mobile-drawer"
      operationalDrawer
      items={NAV}
      isActive={isActive}
      brand={
        <PortalFirmBrand
          href="/staff"
          subtitle={t("nav.staff_portal")}
          logoFit="cover"
          className="min-w-0 flex-1 gap-2"
          logoClassName="size-8 max-w-10 rounded-lg"
          fallbackClassName="size-8 bg-dashboard-sidebar-brand-bg"
          fallbackIconClassName="size-4 text-dashboard-sidebar-brand-icon"
          nameClassName="text-sm text-dashboard-sidebar-foreground"
          subtitleClassName="text-[9px] font-semibold uppercase tracking-wider text-dashboard-sidebar-muted"
        />
      }
      headerClassName="bg-dashboard-sidebar/95 border-dashboard-sidebar-border print:hidden text-dashboard-sidebar-foreground"
      langButtonClassName="focus-visible:ring-dashboard-sidebar-focus"
      menuButtonClassName="text-dashboard-sidebar-foreground focus-visible:ring-dashboard-sidebar-focus"
      drawerClassName="bg-dashboard-sidebar text-dashboard-sidebar-foreground"
      headingClassName="text-xs font-semibold text-dashboard-sidebar-heading mt-4 mb-1 px-3 uppercase tracking-wider"
      itemClassName={mobileItemClassName}
      accountMenu={(close) => (
        <PortalAccountMenu
          profileHref="/staff/profile"
          variant="drawer"
          fallbackName="Staff"
          showLanguageToggle
          darkTrigger
          onAction={close}
        />
      )}
      bottomBar={bottomBar}
    />
  );
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStaffHome = pathname === "/staff";
  const isCaseDetail = /^\/staff\/cases\/[^/]+$/.test(pathname);
  const isStaffTasks = pathname === "/staff/tasks";
  const useFlowFooter = isStaffHome || pathname === "/staff/cases" || isCaseDetail || isStaffTasks;
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const scrollTopControl = (
    <ScrollToTop
      containerRef={mainRef}
      className={
        isStaffHome
          ? "staff-home-scroll-top"
          : isStaffTasks
            ? "staff-tasks-scroll-top"
            : isCaseDetail
              ? "staff-detail-scroll-top"
              : "staff-cases-scroll-top"
      }
      behavior="auto"
    />
  );

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
    <PortalBrandingProvider appearance="light">
      <div className="dashboard-theme dashboard-staff dashboard-nepal fixed inset-0 h-[100dvh] min-h-[100dvh] overflow-hidden bg-dashboard-canvas text-foreground">
        <PortalRoleGuard
          allowed="staff"
          title="Lex Workspace"
          description="Authorized staff only. Please sign in with your firm credentials."
        >
          <IdleSessionGuard />
          <div className="flex h-full min-h-0 overflow-hidden bg-dashboard-canvas print:h-auto print:overflow-visible">
            <StaffDesktopSidebar />
            <div className="staff-shell-content flex min-h-0 flex-col flex-1 min-w-0 overflow-hidden print:overflow-visible">
              <StaffMobileChrome />
              <StaffCaseTopbar
                onOpenSearch={() => setSearchOpen(true)}
                onOpenChat={() => router.push("/staff/messages")}
                className="staff-admin-topbar hidden md:flex"
              />
              <main
                ref={mainRef}
                id="staff-main-canvas"
                tabIndex={-1}
                className="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain bg-dashboard-canvas text-foreground dashboard-main-scroll scroll-smooth"
              >
                {children}
                {useFlowFooter ? (
                  <PortalFooter
                    portal="staff"
                    className={
                      isStaffHome
                        ? "staff-home-footer"
                        : isStaffTasks
                          ? "staff-tasks-footer"
                          : isCaseDetail
                            ? "staff-detail-footer"
                            : "staff-cases-footer"
                    }
                  />
                ) : null}
                {useFlowFooter ? (
                  isCaseDetail || isStaffTasks ? (
                    <div
                      className={
                        isStaffTasks ? "staff-tasks-scroll-slot" : "staff-detail-scroll-slot"
                      }
                    >
                      {scrollTopControl}
                    </div>
                  ) : (
                    scrollTopControl
                  )
                ) : null}
              </main>
              {useFlowFooter ? null : <PortalFooter portal="staff" />}
              {useFlowFooter ? null : <ScrollToTop containerRef={mainRef} />}
            </div>
          </div>
          {searchOpen ? (
            <GlobalSearchPalette isOpen onClose={() => setSearchOpen(false)} portal="staff" />
          ) : null}
        </PortalRoleGuard>
      </div>
    </PortalBrandingProvider>
  );
}
