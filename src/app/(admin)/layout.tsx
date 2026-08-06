"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, Activity, FileText, Settings, Shield, Menu, X, Globe, PenTool, Briefcase, Calendar, Receipt, Quote, LayoutDashboard, Users, UserCheck, DollarSign, BarChart3, Scale, Navigation, Newspaper } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalRoleGuard } from "@/components/auth/PortalRoleGuard";
import { PortalAccountMenu } from "@/components/auth/PortalAccountMenu";
import { IdleSessionGuard } from "@/components/auth/IdleSessionGuard";
import { NotificationBell } from "@/components/ui/notification-bell";
import { useI18n } from "@/lib/i18n-context";

type NavItem = { label?: string; i18nKey?: string; href?: string; icon?: LucideIcon; heading?: string };
type NavLink = NavItem & { href: string; icon: LucideIcon };
const isNavLink = (item: NavItem): item is NavLink => Boolean(item.href && item.icon);

const NAV: NavItem[] = [
  { heading: "Overview" },
  { label: "Dashboard", i18nKey: "nav.dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Advanced Analytics", i18nKey: "nav.analytics", href: "/admin/analytics", icon: Activity },

  { heading: "Firm & People" },
  { label: "Conflict Checker", i18nKey: "nav.conflict_checker", href: "/admin/conflict-checker", icon: AlertTriangle },
  { label: "Users", i18nKey: "nav.users", href: "/admin/users", icon: Users },
  { label: "HR", i18nKey: "nav.hr", href: "/admin/hr", icon: UserCheck },
  { label: "CRM", i18nKey: "nav.crm", href: "/admin/crm", icon: BarChart3 },
  { label: "Appointments", i18nKey: "nav.appointments", href: "/admin/appointments", icon: Calendar },

  { heading: "Financials" },
  { label: "Finance", i18nKey: "nav.finance", href: "/admin/finance", icon: DollarSign },
  { label: "Expenses", i18nKey: "nav.expenses", href: "/admin/expenses", icon: Receipt },

  { heading: "Public CMS" },
  { label: "Site Settings", i18nKey: "nav.site_settings", href: "/admin/cms", icon: Globe },
  { label: "Homepage", href: "/admin/cms/homepage", icon: LayoutDashboard },
  { label: "Navigation & Menus", i18nKey: "nav.navigation", href: "/admin/cms/navigation", icon: Navigation },
  { label: "Practice Areas", i18nKey: "nav.practice_areas", href: "/admin/cms/practice-areas", icon: Briefcase },
  { label: "Testimonials", i18nKey: "nav.testimonials", href: "/admin/cms/testimonials", icon: Quote },
  { label: "Public Team", i18nKey: "nav.public_team", href: "/admin/cms/team", icon: Users },
  { label: "Blog Articles", i18nKey: "nav.blog_articles", href: "/admin/cms/blog", icon: PenTool },
  { label: "News & Awards", i18nKey: "nav.news_awards", href: "/admin/cms/news", icon: Newspaper },
  { label: "Careers", i18nKey: "nav.careers", href: "/admin/cms/careers", icon: Briefcase },
  { label: "Resources", i18nKey: "nav.resources", href: "/admin/cms/resources", icon: FileText },
  { label: "About Page", i18nKey: "nav.about_page", href: "/admin/cms/about", icon: FileText },
  { label: "Legal & Newsletter", href: "/admin/cms/governance", icon: Shield },

  { heading: "System" },
  { label: "Doc Generator", i18nKey: "nav.doc_generator", href: "/admin/document-generator", icon: FileText },
  { label: "Document Templates", i18nKey: "nav.document_templates", href: "/admin/templates", icon: FileText },
  { label: "Audit Log", i18nKey: "nav.audit_log", href: "/admin/audit", icon: Shield },
  { label: "Settings", i18nKey: "nav.settings", href: "/admin/settings", icon: Settings },
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
    <aside className="hidden md:flex md:w-56 flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border shrink-0">
      <div className="px-4 py-5 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center"><Scale className="w-4 h-4 text-sidebar-primary-foreground" /></div>
          <div>
            <div className="font-serif text-sm font-bold text-sidebar-primary-foreground">Srimar Law</div>
            <div className="text-xs text-sidebar-foreground/60">{t("nav.admin_console")}</div>
          </div>
        </div>
        <NotificationBell />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item, idx) => {
          if (item.heading) {
            return <div key={`heading-${idx}`} className="text-xs font-semibold text-sidebar-foreground/50 mt-5 mb-2 px-3 uppercase tracking-wider">{item.heading}</div>;
          }
          if (!isNavLink(item)) return null;
          const { label, i18nKey, href, icon: Icon } = item;
          return (
            <Link key={href} href={href} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive(href) ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}><Icon className="w-4 h-4 shrink-0" />{t(i18nKey!) !== i18nKey ? t(i18nKey!) : label}</Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-sidebar-border">
        <PortalAccountMenu
          profileHref="/admin/profile"
          variant="dropdown"
          fallbackName="Admin"
          showLanguageToggle
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
      <div className="md:hidden sticky top-0 z-50 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 h-14 shrink-0 w-full">
        <span className="font-serif font-bold text-sidebar-foreground text-sm">{t("nav.admin_console")}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'ne' : 'en')}
            className="w-7 h-7 rounded-full bg-sidebar-accent text-[10px] font-bold text-sidebar-foreground flex items-center justify-center"
          >
            {language === 'en' ? 'ने' : 'EN'}
          </button>
          <NotificationBell />
          <button type="button" onClick={() => setOpen((v) => !v)} className="p-1 text-sidebar-foreground" aria-label="Toggle menu">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col bg-sidebar pt-14">
          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
            {NAV.map((item, idx) => {
              if (item.heading) {
                return <div key={`mheading-${idx}`} className="text-xs font-semibold text-sidebar-foreground/40 mt-4 mb-1 px-3 uppercase tracking-wider">{item.heading}</div>;
              }
              const { label, i18nKey, href, icon: Icon } = item;
              if (!href || !Icon) return null;
              return (
                <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                  isActive(href) ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground"
                )}><Icon className="w-4 h-4 shrink-0" />{t(i18nKey!) !== i18nKey ? t(i18nKey!) : label}</Link>
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
    <div className="dark min-h-screen text-foreground">
      <PortalRoleGuard
        allowed="admin"
        title="Admin Console"
        description="Restricted access. Please sign in with admin credentials."
        dark
      >
        <IdleSessionGuard />
        <div className="flex h-screen overflow-hidden bg-background">
          <AdminDesktopSidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <AdminMobileChrome />
            <main className="flex-1 min-w-0 overflow-auto bg-background">
              {children}
            </main>
          </div>
        </div>
      </PortalRoleGuard>
    </div>
  );
}
