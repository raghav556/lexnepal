"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Activity,
  FileText,
  FolderOpen,
  Settings,
  Shield,
  Globe,
  PenTool,
  Briefcase,
  Calendar,
  Quote,
  LayoutDashboard,
  Users,
  UserCheck,
  Contact,
  BarChart3,
  Navigation,
  Newspaper,
  User as UserIcon,
  type LucideIcon,
} from "lucide-react";
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
  type PortalNavItemData,
} from "@/components/dashboard";
import { PortalFirmBrand } from "@/components/branding/firm-brand";

export interface NavItemLink {
  type: "link";
  label: string;
  i18nKey?: string;
  href: string;
  icon: LucideIcon;
}

export interface NavItemBranch {
  type: "branch";
  id: string;
  label: string;
  i18nKey?: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  items: NavItemLink[];
}

export interface NavGroupSection {
  heading: string;
  items: (NavItemLink | NavItemBranch)[];
}

const ADMIN_NAV_TREE: NavGroupSection[] = [
  {
    heading: "Overview",
    items: [
      {
        type: "link",
        label: "Dashboard",
        i18nKey: "nav.dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
      {
        type: "link",
        label: "Advanced Analytics",
        i18nKey: "nav.analytics",
        href: "/admin/analytics",
        icon: Activity,
      },
    ],
  },
  {
    heading: "Practice & Operations",
    items: [
      {
        type: "link",
        label: "Cases",
        i18nKey: "nav.cases",
        href: "/admin/cases",
        icon: FolderOpen,
      },
      {
        type: "branch",
        id: "crm-branch",
        label: "Clients & CRM",
        icon: Contact,
        defaultOpen: true,
        items: [
          {
            type: "link",
            label: "Clients",
            i18nKey: "nav.clients",
            href: "/admin/clients",
            icon: Contact,
          },
          {
            type: "link",
            label: "CRM & Leads",
            i18nKey: "nav.crm",
            href: "/admin/crm",
            icon: BarChart3,
          },
          {
            type: "link",
            label: "Appointments",
            i18nKey: "nav.appointments",
            href: "/admin/appointments",
            icon: Calendar,
          },
        ],
      },
      {
        type: "branch",
        id: "workforce-branch",
        label: "Firm & Workforce",
        icon: Users,
        defaultOpen: false,
        items: [
          {
            type: "link",
            label: "User Directory",
            i18nKey: "nav.users",
            href: "/admin/users",
            icon: Users,
          },
          {
            type: "link",
            label: "HR & Leaves",
            i18nKey: "nav.hr",
            href: "/admin/hr",
            icon: UserCheck,
          },
        ],
      },
    ],
  },
  {
    heading: "Public CMS & Portal",
    items: [
      {
        type: "branch",
        id: "cms-pages-branch",
        label: "Website Pages",
        icon: Globe,
        defaultOpen: false,
        items: [
          {
            type: "link",
            label: "Site Settings",
            i18nKey: "nav.site_settings",
            href: "/admin/cms",
            icon: Globe,
          },
          {
            type: "link",
            label: "Homepage",
            href: "/admin/cms/homepage",
            icon: LayoutDashboard,
          },
          {
            type: "link",
            label: "Navigation & Menus",
            i18nKey: "nav.navigation",
            href: "/admin/cms/navigation",
            icon: Navigation,
          },
          {
            type: "link",
            label: "Practice Areas",
            i18nKey: "nav.practice_areas",
            href: "/admin/cms/practice-areas",
            icon: Briefcase,
          },
          {
            type: "link",
            label: "About Page",
            i18nKey: "nav.about_page",
            href: "/admin/cms/about",
            icon: FileText,
          },
          {
            type: "link",
            label: "Careers",
            i18nKey: "nav.careers",
            href: "/admin/cms/careers",
            icon: Briefcase,
          },
          {
            type: "link",
            label: "Legal & Governance",
            href: "/admin/cms/governance",
            icon: Shield,
          },
        ],
      },
      {
        type: "branch",
        id: "cms-content-branch",
        label: "Media & Content",
        icon: Newspaper,
        defaultOpen: false,
        items: [
          {
            type: "link",
            label: "Blog Articles",
            i18nKey: "nav.blog_articles",
            href: "/admin/cms/blog",
            icon: PenTool,
          },
          {
            type: "link",
            label: "News & Awards",
            i18nKey: "nav.news_awards",
            href: "/admin/cms/news",
            icon: Newspaper,
          },
          {
            type: "link",
            label: "Resources",
            i18nKey: "nav.resources",
            href: "/admin/cms/resources",
            icon: FileText,
          },
          {
            type: "link",
            label: "Testimonials",
            i18nKey: "nav.testimonials",
            href: "/admin/cms/testimonials",
            icon: Quote,
          },
          {
            type: "link",
            label: "Public Team",
            i18nKey: "nav.public_team",
            href: "/admin/cms/team",
            icon: Users,
          },
        ],
      },
    ],
  },
  {
    heading: "Legal Systems & Records",
    items: [
      {
        type: "branch",
        id: "systems-branch",
        label: "System & Governance",
        icon: Settings,
        defaultOpen: false,
        items: [
          {
            type: "link",
            label: "Doc Generator",
            i18nKey: "nav.doc_generator",
            href: "/admin/document-generator",
            icon: FileText,
          },
          {
            type: "link",
            label: "Document Templates",
            i18nKey: "nav.document_templates",
            href: "/admin/templates",
            icon: FileText,
          },
          {
            type: "link",
            label: "Audit & Security",
            i18nKey: "nav.audit_log",
            href: "/admin/audit",
            icon: Shield,
          },
          {
            type: "link",
            label: "System Settings",
            i18nKey: "nav.settings",
            href: "/admin/settings",
            icon: Settings,
          },
        ],
      },
    ],
  },
  {
    heading: "Account",
    items: [
      {
        type: "link",
        label: "Profile & Settings",
        i18nKey: "nav.profile",
        href: "/admin/profile",
        icon: UserIcon,
      },
    ],
  },
];

function flattenNavTree(tree: NavGroupSection[]): PortalNavItemData[] {
  const result: PortalNavItemData[] = [];
  for (const group of tree) {
    result.push({ heading: group.heading });
    for (const item of group.items) {
      if (item.type === "link") {
        result.push({
          label: item.label,
          i18nKey: item.i18nKey,
          href: item.href,
          icon: item.icon,
        });
      } else if (item.type === "branch") {
        for (const subItem of item.items) {
          result.push({
            label: subItem.label,
            i18nKey: subItem.i18nKey,
            href: subItem.href,
            icon: subItem.icon,
          });
        }
      }
    }
  }
  return result;
}

const FLAT_MOBILE_NAV = flattenNavTree(ADMIN_NAV_TREE);

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/cms") return pathname === "/admin/cms";
    return pathname.startsWith(href);
  };
}

const desktopItemClassName = (active: boolean) =>
  cn(
    "group relative flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-[13.5px] font-medium leading-5 transition-all duration-200",
    active
      ? "text-white font-semibold bg-white/10 border border-blue-500/35 shadow-[0_0_16px_-2px_rgba(72,127,255,0.35)] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-[#487FFF] before:shadow-[0_0_10px_#487FFF]"
      : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent focus-visible:ring-2 focus-visible:ring-[#487FFF]",
  );

const desktopSubItemClassName = (active: boolean) =>
  cn(
    "group relative flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium leading-5 transition-all duration-200",
    active
      ? "text-white font-semibold bg-white/10 border border-blue-500/35 shadow-[0_0_12px_-2px_rgba(72,127,255,0.3)] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-r-full before:bg-[#487FFF]"
      : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent focus-visible:ring-2 focus-visible:ring-[#487FFF]",
  );

const desktopIconClassName = (active: boolean) =>
  active
    ? "size-[18px] text-[#487FFF] drop-shadow-[0_0_8px_rgba(72,127,255,0.7)]"
    : "size-[18px] text-slate-400 group-hover:text-slate-200 transition-colors";

const desktopSubIconClassName = (active: boolean) =>
  active
    ? "size-4 text-[#487FFF] drop-shadow-[0_0_6px_rgba(72,127,255,0.7)]"
    : "size-4 text-slate-400 group-hover:text-slate-200 transition-colors";

const mobileItemClassName = (active: boolean) =>
  cn(
    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
    active
      ? "bg-dashboard-primary-soft text-dashboard-primary"
      : "text-dashboard-neutral hover:bg-dashboard-panel-hover hover:text-foreground",
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
        <span className="inline-flex items-center rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[11px] font-bold text-blue-300">
          {appointmentsCount}
        </span>
      );
    }
    if (href === "/admin/hr" && pendingLeavesCount > 0) {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-300">
          {pendingLeavesCount}
        </span>
      );
    }
    if (href === "/admin/crm" && leadsCount > 0) {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
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
          <span className="inline-flex items-center rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-300">
            {total}
          </span>
        );
      }
    }
    if (branchId === "workforce-branch" && pendingLeavesCount > 0) {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
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
            showLanguageToggle
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
          labelClassName="text-[12px] font-bold tracking-[0.1em] text-slate-400"
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
      navAriaLabel="Mobile navigation"
      items={FLAT_MOBILE_NAV}
      isActive={isActive}
      brand={
        <PortalFirmBrand
          href="/admin"
          subtitle={t("nav.admin_console")}
          logoFit="cover"
          className="max-w-[58%] gap-2"
          logoClassName="size-8 max-w-10 rounded-lg"
          fallbackClassName="size-8"
          nameClassName="text-sm text-foreground"
          subtitleClassName="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
        />
      }
      headerClassName="bg-dashboard-canvas-elevated/95 border-dashboard-border"
      langButtonClassName="focus-visible:ring-dashboard-focus"
      menuButtonClassName="text-foreground focus-visible:ring-dashboard-focus"
      drawerClassName="bg-dashboard-canvas-elevated"
      headingClassName="text-xs font-semibold text-muted-foreground mt-4 mb-1 px-3 uppercase tracking-wider"
      itemClassName={mobileItemClassName}
      accountMenu={(close) => (
        <PortalAccountMenu
          profileHref="/admin/profile"
          variant="drawer"
          fallbackName="Admin"
          showLanguageToggle
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
                className="hidden md:flex"
              />
              <main
                ref={mainRef}
                id="admin-main-canvas"
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
