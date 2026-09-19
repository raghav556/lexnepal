"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  FileText,
  Calendar,
  User as UserIcon,
  ShieldCheck,
  PenTool,
  Bell,
  Headphones,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalRoleGuard } from "@/components/auth/PortalRoleGuard";
import { PortalAccountMenu } from "@/components/auth/PortalAccountMenu";
import { IdleSessionGuard } from "@/components/auth/IdleSessionGuard";
import { useI18n } from "@/lib/i18n-context.tsx";
import {
  PortalBrandingProvider,
  PortalTopbar,
  PortalFooter,
  PortalSidebar,
  PortalSidebarGroup,
  PortalSidebarItem,
  PortalMobileNav,
  type PortalNavItemData,
} from "@/components/dashboard";
import { PortalFirmBrand } from "@/components/branding/firm-brand";
import {
  CLIENT_DESKTOP_NAV,
  CLIENT_DESKTOP_PRIMARY,
  CLIENT_DESKTOP_SECONDARY,
  CLIENT_MOBILE_PRIMARY,
  isClientDesktopNavActive,
  resolveClientMobileNav,
} from "@/lib/client-shell-nav";

const GlobalSearchPalette = dynamic(
  () =>
    import("@/components/dashboard/global-search-palette").then(
      (module) => module.GlobalSearchPalette,
    ),
  { ssr: false },
);

const CLIENT_NAV_ICONS: Record<string, LucideIcon> = {
  "/client": LayoutDashboard,
  "/client/cases": FolderOpen,
  "/client/documents": FileText,
  "/client/messages": MessageSquare,
  "/client/booking": Calendar,
  "/client/kyc": ShieldCheck,
  "/client/signatures": PenTool,
  "/client/notifications": Bell,
  "/client/profile": UserIcon,
};

const CLIENT_MOBILE_ICONS: Record<string, LucideIcon> = {
  home: LayoutDashboard,
  matters: FolderOpen,
  documents: FileText,
  messages: MessageSquare,
};

const NAV: PortalNavItemData[] = CLIENT_DESKTOP_NAV.map((item) => ({
  label: item.label,
  i18nKey: item.i18nKey,
  href: item.href,
  icon: CLIENT_NAV_ICONS[item.href],
}));

function useClientPathname() {
  return usePathname() ?? "/client";
}

const desktopItemClassName = (active: boolean) =>
  cn(
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-[var(--dashboard-duration-normal)] focus-visible:ring-2 focus-visible:ring-dashboard-sidebar-focus",
    active
      ? "border border-dashboard-sidebar-active-border bg-dashboard-sidebar-active text-dashboard-sidebar-active-foreground"
      : "border border-transparent text-dashboard-sidebar-muted hover:bg-dashboard-sidebar-hover hover:text-dashboard-sidebar-foreground",
  );

const desktopIconClassName = (active: boolean) =>
  cn("size-5", active ? "text-dashboard-sidebar-active-icon" : undefined);

const mobileItemClassName = (active: boolean) =>
  cn(
    "flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium",
    active
      ? "bg-dashboard-primary-soft text-dashboard-primary"
      : "text-foreground hover:bg-dashboard-panel-hover",
  );

function ClientSupportModule() {
  const { t } = useI18n();
  return (
    <div className="mt-auto min-h-[13.75rem] border-t border-dashboard-sidebar-border px-3 pb-5 pt-4">
      <div className="rounded-xl border border-dashboard-sidebar-border bg-dashboard-sidebar-hover px-3 py-3">
        <div className="flex items-start gap-2.5">
          <Headphones className="mt-0.5 size-4 shrink-0 text-dashboard-sidebar-brand" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-dashboard-sidebar-foreground">
              {t("client.support_title")}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-dashboard-sidebar-muted">
              {t("client.support_body")}
            </p>
          </div>
        </div>
        <Link
          href="/client/messages"
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-dashboard-sidebar-active px-3 text-xs font-semibold text-dashboard-sidebar-active-foreground transition-colors duration-[var(--dashboard-duration-normal)] hover:bg-dashboard-sidebar-hover focus-visible:ring-2 focus-visible:ring-dashboard-sidebar-focus"
        >
          {t("client.support_action")}
        </Link>
      </div>
      <p className="mt-3 text-center text-[11px] italic text-dashboard-sidebar-brand">
        {t("client.support_quote")}
      </p>
    </div>
  );
}

function ClientDesktopSidebar() {
  const pathname = useClientPathname();
  const isActive = (href: string) => isClientDesktopNavActive(pathname, href);

  return (
    <PortalSidebar
      navAriaLabel="Client portal navigation"
      className="md:w-[var(--dashboard-sidebar-width)] h-screen sticky top-0 shrink-0 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, var(--dashboard-sidebar) 0%, color-mix(in srgb, var(--dashboard-sidebar) 60%, var(--dashboard-sidebar-deep)) 40%, var(--dashboard-sidebar-deep) 100%)",
      }}
      brandClassName="px-4 py-5 border-b border-dashboard-sidebar-border flex items-center justify-between"
      brand={
        <PortalFirmBrand
          href="/client"
          subtitle="Client Portal"
          logoFit="cover"
          className="flex-1 gap-2.5"
          logoClassName="size-10 max-w-[2.75rem] rounded-xl"
          fallbackClassName="size-9 bg-[linear-gradient(135deg,var(--dashboard-sidebar-brand),var(--dashboard-primary))]"
          fallbackIconClassName="size-[18px] text-dashboard-sidebar-foreground"
          nameClassName="text-sm tracking-wide text-dashboard-sidebar-foreground"
          subtitleClassName="text-[11px] font-medium uppercase tracking-wider text-dashboard-sidebar-muted"
        />
      }
      navClassName="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto [scrollbar-width:thin] [-ms-overflow-style:auto]"
      footer={<ClientSupportModule />}
    >
      <PortalSidebarGroup>
        {CLIENT_DESKTOP_PRIMARY.map(({ href, label, i18nKey }) => {
          const Icon = CLIENT_NAV_ICONS[href];
          const active = isActive(href);
          return (
            <PortalSidebarItem
              key={href}
              href={href}
              icon={Icon}
              label={label}
              i18nKey={i18nKey}
              active={active}
              className={desktopItemClassName(active)}
              iconClassName={desktopIconClassName(active)}
            />
          );
        })}
      </PortalSidebarGroup>
      <div className="mx-3 my-3 border-t border-dashboard-sidebar-border" role="separator" />
      <PortalSidebarGroup>
        {CLIENT_DESKTOP_SECONDARY.map(({ href, label, i18nKey }) => {
          const Icon = CLIENT_NAV_ICONS[href];
          const active = isActive(href);
          return (
            <PortalSidebarItem
              key={href}
              href={href}
              icon={Icon}
              label={label}
              i18nKey={i18nKey}
              active={active}
              className={desktopItemClassName(active)}
              iconClassName={desktopIconClassName(active)}
            />
          );
        })}
      </PortalSidebarGroup>
    </PortalSidebar>
  );
}

function ClientMobileChrome() {
  const { t } = useI18n();
  const pathname = useClientPathname();
  const isActive = (href: string) => isClientDesktopNavActive(pathname, href);
  const mobileActive = resolveClientMobileNav(pathname);

  return (
    <PortalMobileNav
      navAriaLabel="Client mobile navigation"
      drawerId="client-mobile-drawer"
      items={NAV}
      isActive={isActive}
      brand={
        <PortalFirmBrand
          href="/client"
          subtitle="Client Portal"
          logoFit="cover"
          className="max-w-[58%] gap-2"
          logoClassName="size-8 max-w-10 rounded-lg"
          fallbackClassName="size-8 bg-dashboard-primary-soft"
          fallbackIconClassName="size-4 text-dashboard-primary"
          nameClassName="text-sm text-dashboard-primary"
          subtitleClassName="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
        />
      }
      headerClassName="bg-dashboard-panel/95 border-dashboard-border"
      langButtonClassName="h-11 w-11 focus-visible:ring-dashboard-focus"
      menuButtonClassName="min-h-11 min-w-11 p-2.5 focus-visible:ring-dashboard-focus"
      drawerClassName="bg-dashboard-canvas pb-20"
      headingClassName="text-xs font-semibold text-muted-foreground mt-4 mb-2 px-3 uppercase tracking-wider"
      itemClassName={mobileItemClassName}
      accountMenu={(close) => (
        <PortalAccountMenu
          profileHref="/client/profile"
          variant="drawer"
          fallbackName="Client"
          showLanguageToggle
          darkTrigger={false}
          profileLabel={t("nav.client_profile")}
          identityCaption="Client"
          onAction={close}
        />
      )}
      bottomBar={({ open, openMenu }) => (
        <nav
          aria-label="Client primary navigation"
          className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-dashboard-border bg-dashboard-panel/95 px-1 py-1 backdrop-blur md:hidden"
        >
          {CLIENT_MOBILE_PRIMARY.map(({ id, href, label, i18nKey }) => {
            const Icon = CLIENT_MOBILE_ICONS[id];
            const active = mobileActive === id;
            const text = t(i18nKey) !== i18nKey ? t(i18nKey) : label;
            return (
              <Link
                key={id}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium leading-tight focus-visible:ring-2 focus-visible:ring-dashboard-focus",
                  active
                    ? "bg-dashboard-primary-soft text-dashboard-primary"
                    : "text-dashboard-neutral",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="max-w-full truncate">{text}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={openMenu}
            aria-label={t("nav.more")}
            aria-expanded={open}
            aria-controls="client-mobile-drawer"
            className={cn(
              "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium leading-tight focus-visible:ring-2 focus-visible:ring-dashboard-focus",
              mobileActive === "more" || open
                ? "bg-dashboard-primary-soft text-dashboard-primary"
                : "text-dashboard-neutral",
            )}
          >
            <MoreHorizontal className="size-5 shrink-0" aria-hidden />
            <span className="max-w-full truncate">{t("nav.more")}</span>
          </button>
        </nav>
      )}
    />
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <PortalBrandingProvider applyPalette={false}>
      <div className="dashboard-theme dashboard-client min-h-screen bg-dashboard-canvas">
        <PortalRoleGuard
          allowed="client"
          title="Client Portal"
          description="Please sign in to access your cases, documents, and messages."
        >
          <IdleSessionGuard />
          <div className="flex h-screen overflow-hidden bg-dashboard-canvas">
            <ClientDesktopSidebar />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <ClientMobileChrome />
              <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
                <PortalTopbar
                  portal="client"
                  className="hidden md:flex"
                  onOpenSearch={() => setSearchOpen(true)}
                  accountSlot={
                    <PortalAccountMenu
                      profileHref="/client/profile"
                      variant="dropdown"
                      placement="topbar"
                      fallbackName="Client"
                      showLanguageToggle
                      darkTrigger={false}
                      profileLabel="Profile"
                      identityCaption="Client"
                    />
                  }
                />
                <main className="min-w-0 flex-1 bg-dashboard-canvas pb-20 md:pb-0">{children}</main>
                <PortalFooter portal="client" className="hidden md:block" />
              </div>
            </div>
          </div>
          {searchOpen ? (
            <GlobalSearchPalette isOpen onClose={() => setSearchOpen(false)} portal="client" />
          ) : null}
        </PortalRoleGuard>
      </div>
    </PortalBrandingProvider>
  );
}
