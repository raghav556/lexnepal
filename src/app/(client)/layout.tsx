"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Scale,
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  Receipt,
  FileText,
  Menu,
  X,
  Calendar,
  User as UserIcon,
  ShieldCheck,
  PenTool,
  ClipboardList,
  CalendarDays,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalRoleGuard } from "@/components/auth/PortalRoleGuard";
import { PortalAccountMenu } from "@/components/auth/PortalAccountMenu";
import { IdleSessionGuard } from "@/components/auth/IdleSessionGuard";
import { NotificationBell } from "@/components/ui/notification-bell";
import { useI18n } from "@/lib/i18n-context.tsx";
import { PortalBrandingProvider } from "@/components/dashboard";

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
  { label: "Billing", i18nKey: "nav.billing", href: "/client/billing", icon: Receipt },
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

function ClientDesktopSidebar() {
  const isActive = useIsActive();
  const { t } = useI18n();

  return (
    <aside
      className="hidden md:flex md:w-60 flex-col h-screen sticky top-0 shrink-0 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, var(--dashboard-sidebar) 0%, color-mix(in srgb, var(--dashboard-sidebar) 60%, var(--dashboard-sidebar-deep)) 40%, var(--dashboard-sidebar-deep) 100%)",
      }}
    >
      {/* Brand header */}
      <div className="px-4 py-5 border-b border-dashboard-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, var(--dashboard-sidebar-brand), var(--dashboard-primary))",
              boxShadow: "0 2px 10px var(--dashboard-sidebar-brand-glow)",
            }}
          >
            <Scale className="w-4.5 h-4.5 text-dashboard-sidebar-foreground" />
          </div>
          <div>
            <div className="font-serif text-sm font-bold text-dashboard-sidebar-foreground tracking-wide">
              Srimar Law
            </div>
            <div className="text-[11px] font-medium text-dashboard-sidebar-muted tracking-wider uppercase">
              Client Portal
            </div>
          </div>
        </div>
        <div className="text-dashboard-sidebar-muted hover:text-dashboard-sidebar-foreground transition-colors">
          <NotificationBell />
        </div>
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
          const { label, href, icon: Icon, i18nKey } = item;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive(href)
                  ? "text-dashboard-sidebar-foreground bg-dashboard-sidebar-active border border-dashboard-sidebar-active-border shadow-lg"
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
                  "w-4 h-4",
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
          profileHref="/client/profile"
          variant="dropdown"
          fallbackName="Client"
          showLanguageToggle
          darkTrigger
          className="client-sidebar-account"
        />
      </div>
    </aside>
  );
}

function ClientMobileChrome() {
  const [open, setOpen] = useState(false);
  const isActive = useIsActive();
  const pathname = usePathname();
  const { t, language, setLanguage } = useI18n();

  const [drawerPathname, setDrawerPathname] = useState(pathname);
  if (drawerPathname !== pathname) {
    setDrawerPathname(pathname);
    setOpen(false);
  }

  const bottomNav = [
    { href: "/client", icon: LayoutDashboard, label: t("nav.dashboard") },
    { href: "/client/cases", icon: FolderOpen, label: t("nav.cases") },
    { href: "/client/messages", icon: MessageSquare, label: t("nav.messages") },
    { href: "/client/billing", icon: Receipt, label: t("nav.billing") },
    { href: "/client/profile", icon: UserIcon, label: "Profile" },
  ] as const;

  return (
    <>
      <div className="md:hidden sticky top-0 z-50 bg-dashboard-panel/95 backdrop-blur border-b border-dashboard-border flex items-center justify-between px-4 h-14 shrink-0 w-full">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-dashboard-accent-foreground" />
          <span className="font-serif font-bold text-dashboard-primary text-sm">Srimar Law</span>
        </div>
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
            className="p-1 focus-visible:ring-2 focus-visible:ring-dashboard-focus"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col bg-dashboard-canvas pt-14 pb-16">
          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
            {NAV.map((item, idx) => {
              if (item.heading) {
                return (
                  <div
                    key={`mob-heading-${idx}`}
                    className="text-xs font-semibold text-muted-foreground mt-4 mb-2 px-3 uppercase tracking-wider"
                  >
                    {item.heading}
                  </div>
                );
              }
              if (!isNavLink(item)) return null;
              const { label, href, icon: Icon, i18nKey } = item;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                    isActive(href)
                      ? "bg-dashboard-primary-soft text-dashboard-primary"
                      : "text-foreground hover:bg-dashboard-panel-hover",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {(() => {
                    const translated = i18nKey ? t(i18nKey) : "";
                    return translated && translated !== i18nKey ? translated : label;
                  })()}
                </Link>
              );
            })}
          </nav>
          <PortalAccountMenu
            profileHref="/client/profile"
            variant="drawer"
            fallbackName="Client"
            showLanguageToggle
            onAction={() => setOpen(false)}
          />
        </div>
      )}

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
    </>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalBrandingProvider>
      <div className="dashboard-theme dashboard-client min-h-screen bg-dashboard-canvas">
        <PortalRoleGuard
          allowed="client"
          title="Client Portal"
          description="Please sign in to access your cases, documents, and billing information."
        >
          <IdleSessionGuard />
          <div className="flex h-screen overflow-hidden bg-dashboard-canvas">
            <ClientDesktopSidebar />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <ClientMobileChrome />
              <main className="flex-1 min-w-0 overflow-auto bg-dashboard-canvas pb-16 md:pb-0">
                {children}
              </main>
            </div>
          </div>
        </PortalRoleGuard>
      </div>
    </PortalBrandingProvider>
  );
}
