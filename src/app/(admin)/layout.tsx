"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  Activity,
  FileText,
  Settings,
  Shield,
  Menu,
  X,
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalRoleGuard } from "@/components/auth/PortalRoleGuard";
import { PortalAccountMenu } from "@/components/auth/PortalAccountMenu";
import { IdleSessionGuard } from "@/components/auth/IdleSessionGuard";
import { NotificationBell } from "@/components/ui/notification-bell";
import { useI18n } from "@/lib/i18n-context";
import { PortalBrandingProvider, PortalTopbar, PortalFooter } from "@/components/dashboard";
import { PortalFirmBrand } from "@/components/branding/firm-brand";

type NavItem = {
  label?: string;
  i18nKey?: string;
  href?: string;
  icon?: LucideIcon;
  heading?: string;
};
type NavLink = NavItem & { href: string; icon: LucideIcon };
const isNavLink = (item: NavItem): item is NavLink => Boolean(item.href && item.icon);

const NAV: NavItem[] = [
  { heading: "Overview" },
  { label: "Dashboard", i18nKey: "nav.dashboard", href: "/admin", icon: LayoutDashboard },
  {
    label: "Advanced Analytics",
    i18nKey: "nav.analytics",
    href: "/admin/analytics",
    icon: Activity,
  },

  { heading: "Firm & People" },
  {
    label: "Conflict Checker",
    i18nKey: "nav.conflict_checker",
    href: "/admin/conflict-checker",
    icon: AlertTriangle,
  },
  { label: "Users", i18nKey: "nav.users", href: "/admin/users", icon: Users },
  { label: "Clients", i18nKey: "nav.clients", href: "/admin/clients", icon: Contact },
  { label: "HR", i18nKey: "nav.hr", href: "/admin/hr", icon: UserCheck },
  { label: "CRM", i18nKey: "nav.crm", href: "/admin/crm", icon: BarChart3 },
  {
    label: "Appointments",
    i18nKey: "nav.appointments",
    href: "/admin/appointments",
    icon: Calendar,
  },

  { heading: "Public CMS" },
  { label: "Site Settings", i18nKey: "nav.site_settings", href: "/admin/cms", icon: Globe },
  { label: "Homepage", href: "/admin/cms/homepage", icon: LayoutDashboard },
  {
    label: "Navigation & Menus",
    i18nKey: "nav.navigation",
    href: "/admin/cms/navigation",
    icon: Navigation,
  },
  {
    label: "Practice Areas",
    i18nKey: "nav.practice_areas",
    href: "/admin/cms/practice-areas",
    icon: Briefcase,
  },
  {
    label: "Testimonials",
    i18nKey: "nav.testimonials",
    href: "/admin/cms/testimonials",
    icon: Quote,
  },
  { label: "Public Team", i18nKey: "nav.public_team", href: "/admin/cms/team", icon: Users },
  { label: "Blog Articles", i18nKey: "nav.blog_articles", href: "/admin/cms/blog", icon: PenTool },
  { label: "News & Awards", i18nKey: "nav.news_awards", href: "/admin/cms/news", icon: Newspaper },
  { label: "Careers", i18nKey: "nav.careers", href: "/admin/cms/careers", icon: Briefcase },
  { label: "Resources", i18nKey: "nav.resources", href: "/admin/cms/resources", icon: FileText },
  { label: "About Page", i18nKey: "nav.about_page", href: "/admin/cms/about", icon: FileText },
  { label: "Legal & Newsletter", href: "/admin/cms/governance", icon: Shield },

  { heading: "System" },
  {
    label: "Doc Generator",
    i18nKey: "nav.doc_generator",
    href: "/admin/document-generator",
    icon: FileText,
  },
  {
    label: "Document Templates",
    i18nKey: "nav.document_templates",
    href: "/admin/templates",
    icon: FileText,
  },
  { label: "Audit Log", i18nKey: "nav.audit_log", href: "/admin/audit", icon: Shield },
  { label: "Settings", i18nKey: "nav.settings", href: "/admin/settings", icon: Settings },

  { heading: "Account" },
  {
    label: "Profile & Settings",
    i18nKey: "nav.profile",
    href: "/admin/profile",
    icon: UserIcon,
  },
];

function useIsActive() {
  const pathname = usePathname();
  return (href?: string) => {
    if (!href) return false;
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/cms") return pathname === "/admin/cms";
    return pathname.startsWith(href);
  };
}

function AdminDesktopSidebar() {
  const { t } = useI18n();
  const isActive = useIsActive();

  return (
    <aside className="hidden h-full min-h-0 md:flex md:w-56 flex-col bg-gradient-to-b from-dashboard-sidebar-bg-from to-dashboard-sidebar-bg-to border-r border-dashboard-sidebar-border shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.25)]">
      {/* Brand header */}
      <div className="flex items-center justify-between gap-3 border-b border-dashboard-sidebar-border px-4 py-4">
        <PortalFirmBrand
          href="/admin"
          subtitle={t("nav.admin_console")}
          logoFit="cover"
          className="flex-1 gap-3"
          logoClassName="size-10 rounded-xl border border-dashboard-sidebar-brand-border bg-dashboard-sidebar-brand-bg shadow-[0_4px_18px_var(--dashboard-sidebar-brand-glow)]"
          fallbackClassName="size-9 border border-dashboard-sidebar-brand-border bg-dashboard-sidebar-brand-bg shadow-[0_4px_18px_var(--dashboard-sidebar-brand-glow)] ring-1 ring-inset ring-white/10"
          fallbackIconClassName="size-[18px] text-dashboard-sidebar-brand-icon"
          nameClassName="whitespace-nowrap text-[15px] leading-5 tracking-[-0.01em] text-dashboard-sidebar-foreground"
          subtitleClassName="mt-0.5 whitespace-nowrap text-[10px] font-semibold uppercase leading-4 tracking-[0.14em] text-dashboard-sidebar-muted"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {NAV.map((item, idx) => {
          if (item.heading) {
            return (
              <div
                key={`heading-${idx}`}
                className="mt-5 mb-2 flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-dashboard-sidebar-heading before:h-3 before:w-0.5 before:rounded-full before:bg-dashboard-sidebar-heading-bar"
              >
                {item.heading}
              </div>
            );
          }
          if (!isNavLink(item)) return null;
          const { label, i18nKey, href, icon: Icon } = item;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive(href)
                  ? "text-dashboard-sidebar-active-foreground bg-dashboard-sidebar-active border border-dashboard-sidebar-active-border shadow-lg"
                  : "text-dashboard-sidebar-muted hover:text-dashboard-sidebar-foreground hover:bg-dashboard-sidebar-hover border border-transparent focus-visible:ring-2 focus-visible:ring-dashboard-sidebar-focus",
              )}
              style={
                isActive(href)
                  ? {
                      boxShadow:
                        "0 2px 12px var(--dashboard-sidebar-brand-glow), inset 0 1px 0 var(--dashboard-sidebar-border)",
                    }
                  : undefined
              }
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  isActive(href) ? "text-dashboard-sidebar-active-icon" : "",
                )}
              />
              {(() => {
                const translated = i18nKey ? t(i18nKey) : "";
                return translated && translated !== i18nKey ? translated : label;
              })()}
            </Link>
          );
        })}
      </nav>

      {/* Account footer */}
      <div className="px-3 py-4 border-t border-dashboard-sidebar-border">
        <PortalAccountMenu
          profileHref="/admin/profile"
          variant="dropdown"
          fallbackName="Admin"
          showLanguageToggle
          darkTrigger
          className="admin-sidebar-account"
        />
      </div>
    </aside>
  );
}

function AdminMobileChrome() {
  const [open, setOpen] = useState(false);
  const { t, language, setLanguage } = useI18n();
  const isActive = useIsActive();
  const pathname = usePathname();

  // Collapse the drawer whenever the route changes, including browser back/forward.
  const [drawerPathname, setDrawerPathname] = useState(pathname);
  if (drawerPathname !== pathname) {
    setDrawerPathname(pathname);
    setOpen(false);
  }

  return (
    <>
      <div className="md:hidden sticky top-0 z-50 bg-dashboard-canvas-elevated/95 backdrop-blur border-b border-dashboard-border flex items-center justify-between px-4 h-14 shrink-0 w-full">
        <PortalFirmBrand
          href="/admin"
          subtitle={t("nav.admin_console")}
          logoFit="cover"
          className="max-w-[58%] gap-2"
          logoClassName="size-8 max-w-10 rounded-lg"
          fallbackClassName="size-8 bg-dashboard-primary-soft"
          fallbackIconClassName="size-4 text-dashboard-primary"
          nameClassName="text-sm text-foreground"
          subtitleClassName="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLanguage(language === "en" ? "ne" : "en")}
            className="w-7 h-7 rounded-full bg-dashboard-primary text-[10px] font-bold text-dashboard-primary-foreground flex items-center justify-center focus-visible:ring-2 focus-visible:ring-dashboard-focus"
            aria-label={`Switch language to ${language === "en" ? "Nepali" : "English"}`}
          >
            {language === "en" ? "ने" : "EN"}
          </button>
          <NotificationBell />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="p-1 text-foreground focus-visible:ring-2 focus-visible:ring-dashboard-focus"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col bg-dashboard-canvas-elevated pt-14">
          <nav
            aria-label="Mobile navigation"
            className="flex-1 space-y-1 overflow-y-auto px-4 py-4"
          >
            {NAV.map((item, idx) => {
              if (item.heading) {
                return (
                  <div
                    key={`mheading-${idx}`}
                    className="text-xs font-semibold text-muted-foreground mt-4 mb-1 px-3 uppercase tracking-wider"
                  >
                    {item.heading}
                  </div>
                );
              }
              const { label, i18nKey, href, icon: Icon } = item;
              if (!href || !Icon) return null;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                    isActive(href)
                      ? "bg-dashboard-primary-soft text-dashboard-primary"
                      : "text-dashboard-neutral hover:bg-dashboard-panel-hover hover:text-foreground",
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {(() => {
                    const translated = i18nKey ? t(i18nKey) : "";
                    return translated && translated !== i18nKey ? translated : label;
                  })()}
                </Link>
              );
            })}
          </nav>
          <PortalAccountMenu
            profileHref="/admin/profile"
            variant="drawer"
            fallbackName="Admin"
            showLanguageToggle
            onAction={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalBrandingProvider appearance="dark">
      <div className="dashboard-theme dashboard-admin dashboard-nepal dark fixed inset-0 h-[100dvh] min-h-[100dvh] overflow-hidden bg-dashboard-canvas text-foreground">
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
              <PortalTopbar portal="admin" className="hidden md:flex" />
              <div className="flex min-h-0 flex-1 min-w-0 flex-col justify-between overflow-y-auto overscroll-contain bg-dashboard-canvas">
                <main className="flex-1 min-w-0 bg-dashboard-canvas text-foreground">
                  {children}
                </main>
                <PortalFooter portal="admin" />
              </div>
            </div>
          </div>
        </PortalRoleGuard>
      </div>
    </PortalBrandingProvider>
  );
}
