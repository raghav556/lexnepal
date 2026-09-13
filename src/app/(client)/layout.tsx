"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  FileText,
  Calendar,
  User as UserIcon,
  ShieldCheck,
  PenTool,
  ClipboardList,
  CalendarDays,
  Bell,
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
  splitPortalNavGroups,
  PORTAL_SIDEBAR_ACTIVE_SHADOW,
  type PortalNavItemData,
} from "@/components/dashboard";
import { PortalFirmBrand } from "@/components/branding/firm-brand";

const NAV: PortalNavItemData[] = [
  { heading: "Overview" },
  { label: "Dashboard", i18nKey: "nav.dashboard", href: "/client", icon: LayoutDashboard },

  { heading: "Your Matters" },
  { label: "My Cases", i18nKey: "nav.cases", href: "/client/cases", icon: FolderOpen },
  { label: "Hearings", i18nKey: "nav.hearings", href: "/client/hearings", icon: CalendarDays },
  { label: "Checklist", i18nKey: "nav.checklist", href: "/client/checklist", icon: ClipboardList },
  { label: "Documents", i18nKey: "nav.documents", href: "/client/documents", icon: FileText },
  { label: "Messages", i18nKey: "nav.messages", href: "/client/messages", icon: MessageSquare },

  { heading: "Services" },
  { label: "Identity (KYC)", i18nKey: "nav.kyc", href: "/client/kyc", icon: ShieldCheck },
  { label: "E-Signatures", i18nKey: "nav.signatures", href: "/client/signatures", icon: PenTool },
  {
    label: "Book Appointment",
    i18nKey: "nav.book_appointment",
    href: "/client/booking",
    icon: Calendar,
  },
  {
    label: "Notifications",
    i18nKey: "nav.notifications",
    href: "/client/notifications",
    icon: Bell,
  },

  { heading: "Account" },
  {
    label: "Profile & Settings",
    i18nKey: "nav.profile",
    href: "/client/profile",
    icon: UserIcon,
  },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/client"
      ? pathname === "/client"
      : pathname === href || pathname.startsWith(`${href}/`);
}

const navGroups = splitPortalNavGroups(NAV);

const desktopItemClassName = (active: boolean) =>
  cn(
    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
    active
      ? "text-dashboard-sidebar-foreground bg-dashboard-sidebar-active border border-dashboard-sidebar-active-border shadow-lg"
      : "text-dashboard-sidebar-muted hover:text-dashboard-sidebar-foreground hover:bg-dashboard-sidebar-hover border border-transparent focus-visible:ring-2 focus-visible:ring-dashboard-sidebar-focus",
  );

const desktopIconClassName = (active: boolean) =>
  active ? "text-dashboard-sidebar-active-icon" : undefined;

const mobileItemClassName = (active: boolean) =>
  cn(
    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
    active
      ? "bg-dashboard-primary-soft text-dashboard-primary"
      : "text-foreground hover:bg-dashboard-panel-hover",
  );

function ClientDesktopSidebar() {
  const isActive = useIsActive();

  return (
    <PortalSidebar
      navAriaLabel="Portal navigation"
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
          logoClassName="size-9 max-w-12 rounded-xl"
          fallbackClassName="size-9 bg-[linear-gradient(135deg,var(--dashboard-sidebar-brand),var(--dashboard-primary))] shadow-[0_2px_10px_var(--dashboard-sidebar-brand-glow)]"
          fallbackIconClassName="size-[18px] text-dashboard-sidebar-foreground"
          nameClassName="text-sm tracking-wide text-dashboard-sidebar-foreground"
          subtitleClassName="text-[11px] font-medium uppercase tracking-wider text-dashboard-sidebar-muted"
        />
      }
      navClassName="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      footer={
        <div className="border-t border-dashboard-sidebar-border px-3 py-4">
          <PortalAccountMenu
            profileHref="/client/profile"
            variant="dropdown"
            fallbackName="Client"
            showLanguageToggle
            darkTrigger
            className="client-sidebar-account"
          />
        </div>
      }
    >
      {navGroups.map((group, groupIndex) => (
        <PortalSidebarGroup key={group.label ?? `group-${groupIndex}`} label={group.label}>
          {group.items.map(({ href, icon: Icon, label, i18nKey }) => {
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
                style={active ? PORTAL_SIDEBAR_ACTIVE_SHADOW : undefined}
              />
            );
          })}
        </PortalSidebarGroup>
      ))}
    </PortalSidebar>
  );
}

function ClientMobileChrome() {
  const { t } = useI18n();
  const isActive = useIsActive();

  const bottomNav = [
    { href: "/client", icon: LayoutDashboard, label: t("nav.dashboard") },
    { href: "/client/cases", icon: FolderOpen, label: t("nav.cases") },
    { href: "/client/messages", icon: MessageSquare, label: t("nav.messages") },
    { href: "/client/profile", icon: UserIcon, label: "Profile" },
  ] as const;

  const bottomBar = (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-dashboard-panel/95 backdrop-blur border-t border-dashboard-border flex justify-around py-2 z-30">
      {bottomNav.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "p-2 rounded-lg focus-visible:ring-2 focus-visible:ring-dashboard-focus",
            isActive(href)
              ? "bg-dashboard-primary-soft text-dashboard-primary"
              : "text-dashboard-neutral",
          )}
          aria-label={label}
        >
          <Icon className="w-5 h-5" />
        </Link>
      ))}
    </nav>
  );

  return (
    <PortalMobileNav
      navAriaLabel="Mobile navigation"
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
      langButtonClassName="focus-visible:ring-dashboard-focus"
      menuButtonClassName="focus-visible:ring-dashboard-focus"
      drawerClassName="bg-dashboard-canvas pb-16"
      headingClassName="text-xs font-semibold text-muted-foreground mt-4 mb-2 px-3 uppercase tracking-wider"
      itemClassName={mobileItemClassName}
      accountMenu={(close) => (
        <PortalAccountMenu
          profileHref="/client/profile"
          variant="drawer"
          fallbackName="Client"
          showLanguageToggle
          onAction={close}
        />
      )}
      bottomBar={bottomBar}
    />
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalBrandingProvider>
      <div className="dashboard-theme dashboard-client min-h-screen bg-dashboard-canvas">
        <PortalRoleGuard
          allowed="client"
          title="Client Portal"
          description="Please sign in to access your cases, documents, and messages."
        >
          <IdleSessionGuard />
          <div className="flex h-screen overflow-hidden bg-dashboard-canvas">
            <ClientDesktopSidebar />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <ClientMobileChrome />
              <div className="flex-1 min-w-0 overflow-y-auto flex flex-col">
                <PortalTopbar portal="client" className="hidden md:flex" />
                <main className="flex-1 min-w-0 bg-dashboard-canvas pb-16 md:pb-0">{children}</main>
                <PortalFooter portal="client" className="hidden md:block" />
              </div>
            </div>
          </div>
        </PortalRoleGuard>
      </div>
    </PortalBrandingProvider>
  );
}
