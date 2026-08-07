"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Scale, LayoutDashboard, FolderOpen, CalendarDays, FileText, CheckSquare, Clock, Users, Menu, X, Calendar, BookOpen, MessageSquare, UserCog, KanbanSquare, MessagesSquare, PenTool } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandCenter } from "@/components/ui/CommandCenter";
import { PortalRoleGuard } from "@/components/auth/PortalRoleGuard";
import { PortalAccountMenu } from "@/components/auth/PortalAccountMenu";
import { IdleSessionGuard } from "@/components/auth/IdleSessionGuard";
import { NotificationBell } from "@/components/ui/notification-bell";
import { useI18n } from "@/lib/i18n-context";

type NavItem = { label?: string; i18nKey?: string; href?: string; icon?: LucideIcon; heading?: string };
type NavLink = NavItem & { href: string; icon: LucideIcon };
const isNavLink = (item: NavItem): item is NavLink => Boolean(item.href && item.icon);

const NAV: NavItem[] = [
  { heading: "Workspace" },
  { label: "Dashboard", i18nKey: "nav.dashboard", href: "/staff", icon: LayoutDashboard },
  { label: "Tasks", i18nKey: "nav.tasks", href: "/staff/tasks", icon: CheckSquare },
  { label: "Time Tracker", i18nKey: "nav.time", href: "/staff/time", icon: Clock },
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
  { label: "Appointments", i18nKey: "nav.appointments", href: "/staff/appointments", icon: Calendar },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => href === "/staff" ? pathname === "/staff" : pathname.startsWith(href);
}

function StaffDesktopSidebar({ onOpenChat }: { onOpenChat: () => void }) {
  const { t } = useI18n();
  const isActive = useIsActive();

  return (
    <aside className="hidden md:flex md:w-56 flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border shrink-0 print:hidden">
      <div className="px-4 py-5 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center"><Scale className="w-4 h-4 text-sidebar-primary-foreground" /></div>
          <div>
            <div className="font-serif text-lg font-bold text-sidebar-primary-foreground leading-tight tracking-tight">{t("nav.staff_portal")}</div>
            <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 font-semibold mt-0.5">Srimar Law</div>
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
            )}><Icon className="w-4 h-4" />{t(i18nKey!) !== i18nKey ? t(i18nKey!) : label}</Link>
          );
        })}
      </nav>

      <div className="px-3 pb-2 pt-2 border-t border-sidebar-border">
        <button
          onClick={onOpenChat}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg bg-accent/15 text-accent font-medium hover:bg-accent/25 transition-colors shadow-sm"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm">Command Center</span>
        </button>
      </div>

      <div className="px-3 pb-4 pt-2 border-t border-sidebar-border">
        <PortalAccountMenu
          profileHref="/staff/profile"
          variant="dropdown"
          fallbackName="Staff"
          showLanguageToggle
        />
      </div>
    </aside>
  );
}

function StaffMobileChrome() {
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
      <div className="md:hidden sticky top-0 z-50 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 h-14 shrink-0 w-full print:hidden">
        <span className="font-serif font-bold text-sidebar-primary-foreground text-sm">{t("nav.staff_portal")}</span>
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
        <div className="md:hidden fixed inset-0 z-40 flex flex-col bg-sidebar pt-14 pb-16">
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
                )}><Icon className="w-4 h-4" />{t(i18nKey!) !== i18nKey ? t(i18nKey!) : label}</Link>
              );
            })}
          </nav>
          <PortalAccountMenu
            profileHref="/staff/profile"
            variant="drawer"
            fallbackName="Staff"
            showLanguageToggle
            onAction={() => setOpen(false)}
          />
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border flex justify-around py-2 z-30 print:hidden">
        {NAV.filter(isNavLink).slice(0, 5).map(({ href, icon: Icon }) => (
          <Link key={href} href={href} className={cn("p-2 rounded-lg", isActive(href) ? "text-sidebar-primary" : "text-sidebar-foreground/50")}><Icon className="w-5 h-5" /></Link>
        ))}
      </nav>
    </>
  );
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="dark min-h-screen text-foreground">
      <PortalRoleGuard
        allowed="staff"
        title="Lex Workspace"
        description="Authorized staff only. Please sign in with your firm credentials."
        dark
      >
        <IdleSessionGuard />
        <div className="flex h-screen overflow-hidden bg-background print:h-auto print:overflow-visible">
          <StaffDesktopSidebar onOpenChat={() => setChatOpen(true)} />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden print:overflow-visible">
            <StaffMobileChrome />
            <main className="flex-1 min-w-0 overflow-auto pb-16 md:pb-0 bg-background print:overflow-visible print:pb-0">{children}</main>
          </div>
        </div>
        <CommandCenter isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </PortalRoleGuard>
    </div>
  );
}
