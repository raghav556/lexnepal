"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
import { CommandCenter } from "@/components/ui/CommandCenter";
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
  splitPortalNavGroups,
  isPortalNavLink,
  type PortalNavItemData,
} from "@/components/dashboard";
import { PortalFirmBrand } from "@/components/branding/firm-brand";

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
    "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
    active
      ? "border border-dashboard-sidebar-active-border bg-dashboard-sidebar-active text-dashboard-sidebar-active-foreground font-semibold shadow-sm"
      : "border border-transparent text-dashboard-sidebar-muted hover:border-dashboard-sidebar-border hover:bg-dashboard-sidebar-hover hover:text-dashboard-sidebar-foreground focus-visible:ring-2 focus-visible:ring-dashboard-sidebar-focus",
  );

const desktopIconClassName = (active: boolean) =>
  cn(
    "shrink-0 transition-colors",
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
      navClassName="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto"
      footer={
        <>
          <div className="px-3 pb-2 pt-2 border-t border-dashboard-sidebar-border">
            <button
              onClick={onOpenChat}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg border border-dashboard-sidebar-border bg-dashboard-sidebar-hover hover:border-dashboard-sidebar-active-border hover:bg-dashboard-sidebar-active text-dashboard-sidebar-muted hover:text-dashboard-sidebar-active-foreground font-medium transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-dashboard-sidebar-focus"
            >
              <MessageSquare className="w-4 h-4 text-dashboard-sidebar-active-icon shrink-0" />
              <span className="text-sm">Command Center</span>
            </button>
          </div>

          <div className="px-3 pb-4 pt-2 border-t border-dashboard-sidebar-border">
            <PortalAccountMenu
              profileHref="/staff/profile"
              variant="dropdown"
              fallbackName="Staff"
              showLanguageToggle
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
          onAction={close}
        />
      )}
      bottomBar={bottomBar}
    />
  );
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);

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
                onOpenCommandCenter={() => setChatOpen(true)}
                className="hidden md:flex"
              />
              <div className="flex-1 min-w-0 overflow-y-auto flex flex-col justify-between">
                <main className="flex-1 min-w-0 bg-dashboard-canvas print:overflow-visible">
                  {children}
                </main>
                <PortalFooter portal="staff" />
              </div>
            </div>
          </div>
          <CommandCenter isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </PortalRoleGuard>
      </div>
    </PortalBrandingProvider>
  );
}
