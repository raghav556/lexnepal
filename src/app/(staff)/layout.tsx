"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

import { STAFF_NAV as NAV, isStaffNavActive } from "@/lib/operational-navigation";

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => isStaffNavActive(pathname, href);
}

const navGroups = splitPortalNavGroups(NAV);

// A portaled hint stays outside the independently scrolling rail. The link's
// existing translated text remains its accessible name in every responsive mode.
function StaffRailHint({ label, children }: { label: string; children: React.ReactNode }) {
  const [top, setTop] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => { if (timer.current) clearTimeout(timer.current); };
  const close = () => { cancel(); timer.current = setTimeout(() => setTop(null), 150); };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (top === null) return;
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") setTop(null); };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [top]);
  const show = (element: HTMLElement) => {
    cancel();
    const rect = element.getBoundingClientRect();
    setTop(Math.min(window.innerHeight - 24, Math.max(24, rect.top + rect.height / 2)));
  };
  const root = top === null ? null : document.querySelector(".dashboard-staff");
  return <div className="staff-navigation-hint" onPointerEnter={(event) => show(event.currentTarget)}
    onPointerLeave={close} onFocusCapture={(event) => show(event.currentTarget)} onBlurCapture={close}>
    {children}
    {root && createPortal(<span role="tooltip" className="staff-navigation-tooltip" style={{ top: top! }}
      onPointerEnter={cancel} onPointerLeave={close}>{label}</span>, root)}
  </div>;
}

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
    "staff-nav-item flex min-h-11 items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-sidebar-focus",
    active
      ? "staff-nav-item-active bg-dashboard-sidebar-active text-dashboard-sidebar-active-foreground border border-dashboard-sidebar-active-border"
      : "text-dashboard-sidebar-muted hover:bg-dashboard-sidebar-hover hover:text-dashboard-sidebar-foreground",
  );

function StaffDesktopSidebar() {
  const { t } = useI18n();
  const isActive = useIsActive();

  return (
    <PortalSidebar
      navAriaLabel="Portal navigation"
      className="staff-navigation-sidebar md:w-[var(--dashboard-sidebar-width)] h-screen sticky top-0 bg-dashboard-sidebar text-dashboard-sidebar-foreground border-r border-dashboard-sidebar-border shrink-0 print:hidden shadow-[4px_0_24px_rgba(0,0,0,0.15)]"
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
          <div className="staff-navigation-account px-3 pb-4 pt-2 border-t border-dashboard-sidebar-border">
            <StaffRailHint label="Account">
            <PortalAccountMenu
              profileHref="/staff/profile"
              variant="dropdown"
              fallbackName="Staff"
              showLanguageToggle
              darkTrigger
              className="staff-sidebar-account"
            />
            </StaffRailHint>
          </div>
        </>
      }
    >
      {navGroups.map((group, groupIndex) => (
        <PortalSidebarGroup
          key={group.label ?? `group-${groupIndex}`}
          label={group.label}
          variant="divided"
          labelClassName="staff-navigation-group-label text-[11px] font-bold tracking-[0.14em] text-dashboard-sidebar-heading"
        >
          {group.items.map(({ href, icon: Icon, label, i18nKey }) => (
            <StaffRailHint key={href} label={i18nKey && t(i18nKey) !== i18nKey ? t(i18nKey) : label ?? ""}>
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
            </StaffRailHint>
          ))}
        </PortalSidebarGroup>
      ))}
    </PortalSidebar>
  );
}

function StaffMobileChrome() {
  const { t } = useI18n();
  const isActive = useIsActive();

  return (
    <PortalMobileNav
      navAriaLabel="Staff navigation"
      drawerId="staff-mobile-drawer"
      operationalDrawer
      operationalDrawerBrand={<PortalFirmBrand href="/staff" subtitle={t("nav.staff_portal")} className="min-w-0 gap-2" logoClassName="size-9" fallbackClassName="size-9" nameClassName="text-base text-dashboard-sidebar-foreground" subtitleClassName="text-[10px] text-dashboard-sidebar-muted" />}
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
      drawerClassName="staff-navigation-drawer bg-dashboard-sidebar text-dashboard-sidebar-foreground"
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
    />
  );
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
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
              <div
                className="staff-shell-canvas relative flex-1 min-h-0 min-w-0"
                onClickCapture={(event) => {
                  if (
                    event.target instanceof Element &&
                    event.target.closest(".staff-scroll-top")
                  ) {
                    mainRef.current?.focus({ preventScroll: true });
                  }
                }}
              >
                <main
                  ref={mainRef}
                  id="staff-main-canvas"
                  tabIndex={-1}
                  className="relative h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain bg-dashboard-canvas text-foreground dashboard-main-scroll scroll-smooth"
                >
                  {children}
                </main>
                <ScrollToTop
                  key={pathname}
                  containerRef={mainRef}
                  className="staff-scroll-top"
                  behavior="auto"
                />
              </div>
              <PortalFooter portal="staff" className="staff-shell-footer" />
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
