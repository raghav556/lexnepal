"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  CalendarDays,
  FileText,
  CheckSquare,
  Users,
  Calendar,
  BookOpen,
  MessageSquare,
  UserCog,
  KanbanSquare,
  MessagesSquare,
  PenTool,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalRoleGuard } from "@/components/auth/PortalRoleGuard";
import { PortalAccountMenu } from "@/components/auth/PortalAccountMenu";
import { IdleSessionGuard } from "@/components/auth/IdleSessionGuard";
import { useI18n } from "@/lib/i18n-context";
import {
  PortalBrandingProvider,
  PortalTopbar,
  PortalFooter,
  PortalSidebar,
  PortalSidebarGroup,
  PortalSidebarItem,
  PortalMobileNav,
  ScrollToTop,
  PORTAL_SIDEBAR_ACTIVE_SHADOW,
  splitPortalNavGroups,
  isPortalNavLink,
  type PortalNavItemData,
} from "@/components/dashboard";
import { PortalFirmBrand } from "@/components/branding/firm-brand";

const CommandCenter = dynamic(
  () => import("@/components/ui/CommandCenter").then((module) => module.CommandCenter),
  { ssr: false },
);
const GlobalSearchPalette = dynamic(
  () =>
    import("@/components/dashboard/global-search-palette").then(
      (module) => module.GlobalSearchPalette,
    ),
  { ssr: false },
);

const NAV: PortalNavItemData[] = [
  { label: "Dashboard", i18nKey: "nav.dashboard", href: "/staff", icon: LayoutDashboard },
  { label: "Tasks", i18nKey: "nav.tasks", href: "/staff/tasks", icon: CheckSquare },
  { label: "HR", i18nKey: "nav.hr", href: "/staff/hr", icon: UserCog },

  { heading: "Legal Practice" },
  { label: "Cases", i18nKey: "nav.cases", href: "/staff/cases", icon: FolderOpen },
  { label: "Hearings", i18nKey: "nav.hearings", href: "/staff/hearings", icon: CalendarDays },
  { label: "Documents", i18nKey: "nav.documents", href: "/staff/documents", icon: FileText },
  { label: "Research Vault", i18nKey: "nav.research", href: "/staff/research", icon: BookOpen },
  { label: "Content", href: "/staff/content", icon: PenTool },

  { heading: "Client Relations" },
  { label: "CRM", i18nKey: "nav.crm", href: "/staff/crm", icon: KanbanSquare },
  { label: "Clients", i18nKey: "nav.clients", href: "/staff/clients", icon: Users },
  { label: "Messages", i18nKey: "nav.messages", href: "/staff/messages", icon: MessageSquare },
  { label: "Team Chat", i18nKey: "nav.team_chat", href: "/staff/team-chat", icon: MessagesSquare },
  {
    label: "Appointments",
    i18nKey: "nav.appointments",
    href: "/staff/appointments",
    icon: Calendar,
  },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/staff" ? pathname === "/staff" : pathname.startsWith(href));
}

const navGroups = splitPortalNavGroups(NAV);

const desktopItemClassName = (active: boolean) =>
  cn(
    "staff-nav-item group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all relative",
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
    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
    active
      ? "bg-dashboard-sidebar-active text-dashboard-sidebar-active-foreground border border-dashboard-sidebar-active-border"
      : "text-dashboard-sidebar-muted hover:bg-dashboard-sidebar-hover hover:text-dashboard-sidebar-foreground",
  );

function StaffDesktopSidebar({ onOpenChat }: { onOpenChat: () => void }) {
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
          <div className="px-3 pb-2 pt-2.5 border-t border-dashboard-sidebar-border">
            <button
              onClick={onOpenChat}
              className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border border-dashboard-sidebar-border bg-dashboard-sidebar-hover hover:border-dashboard-sidebar-active-border hover:bg-dashboard-sidebar-active text-dashboard-sidebar-muted hover:text-dashboard-sidebar-active-foreground font-medium transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-dashboard-sidebar-focus"
            >
              <MessageSquare className="size-[18px] text-dashboard-sidebar-active-icon shrink-0 transition-transform group-hover:scale-110" />
              <span className="text-[13.5px]">Command Center</span>
            </button>
          </div>

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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-dashboard-sidebar/95 backdrop-blur border-t border-dashboard-sidebar-border flex justify-around py-2 z-30 print:hidden text-dashboard-sidebar-foreground">
      {NAV.filter(isPortalNavLink)
        .slice(0, 5)
        .map(({ href, icon: Icon, label, i18nKey }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "p-2 rounded-lg focus-visible:ring-2 focus-visible:ring-dashboard-sidebar-focus",
              isActive(href)
                ? "bg-dashboard-sidebar-active text-dashboard-sidebar-active-icon border border-dashboard-sidebar-active-border"
                : "text-dashboard-sidebar-muted hover:text-dashboard-sidebar-foreground",
            )}
            aria-label={i18nKey ? t(i18nKey) : label}
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
          href="/staff"
          subtitle={t("nav.staff_portal")}
          logoFit="cover"
          className="max-w-[58%] gap-2"
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
      drawerClassName="bg-dashboard-sidebar text-dashboard-sidebar-foreground pb-16"
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
    <PortalBrandingProvider appearance="light">
      <div className="dashboard-theme dashboard-staff dashboard-nepal min-h-screen bg-dashboard-canvas text-foreground">
        <PortalRoleGuard
          allowed="staff"
          title="Lex Workspace"
          description="Authorized staff only. Please sign in with your firm credentials."
        >
          <IdleSessionGuard />
          <div className="flex h-screen overflow-hidden bg-dashboard-canvas print:h-auto print:overflow-visible">
            <StaffDesktopSidebar onOpenChat={() => setChatOpen(true)} />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden print:overflow-visible">
              <StaffMobileChrome />
              <PortalTopbar
                portal="staff"
                onOpenSearch={() => setSearchOpen(true)}
                onOpenChat={() => setChatOpen(true)}
                onOpenCommandCenter={() => setChatOpen(true)}
                className="hidden md:flex"
              />
              <main
                ref={mainRef}
                id="staff-main-canvas"
                className="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain bg-dashboard-canvas text-foreground dashboard-main-scroll scroll-smooth flex flex-col justify-between"
              >
                <div className="flex-1 min-w-0">{children}</div>
                <PortalFooter portal="staff" />
              </main>
              <ScrollToTop containerRef={mainRef} />
            </div>
          </div>
          {searchOpen ? (
            <GlobalSearchPalette isOpen onClose={() => setSearchOpen(false)} portal="staff" />
          ) : null}
          {chatOpen ? <CommandCenter isOpen onClose={() => setChatOpen(false)} /> : null}
        </PortalRoleGuard>
      </div>
    </PortalBrandingProvider>
  );
}
