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
  LogOut,
  Menu,
  X,
  Calendar,
  User as UserIcon,
  ChevronUp,
  ShieldCheck,
  PenTool,
  ClipboardList,
  CalendarDays,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { PortalRoleGuard } from "@/components/auth/PortalRoleGuard";
import { NotificationBell } from "@/components/ui/notification-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n-context.tsx";

type NavItem = { label?: string; i18nKey?: string; href?: string; icon?: LucideIcon; heading?: string };
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
  { label: "Book Appointment", i18nKey: "nav.book_appointment", href: "/client/booking", icon: Calendar },
  { label: "Notifications", i18nKey: "nav.notifications", href: "/client/notifications", icon: Bell },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/client" ? pathname === "/client" : pathname === href || pathname.startsWith(`${href}/`);
}

function ClientDesktopSidebar() {
  const { signout, user } = useAuth();
  const isActive = useIsActive();
  const { t } = useI18n();
  const handleSignout = async () => {
    await signout();
  };

  return (
    <aside className="hidden md:flex md:w-60 flex-col h-screen sticky top-0 bg-card border-r border-border shrink-0">
      <div className="px-4 py-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Scale className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-serif text-sm font-bold text-primary">Srimar Law</div>
            <div className="text-xs text-muted-foreground">Client Portal</div>
          </div>
        </div>
        <NotificationBell />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item, idx) => {
          if (item.heading) {
            return (
              <div
                key={`heading-${idx}`}
                className="text-xs font-semibold text-muted-foreground mt-5 mb-2 px-3 uppercase tracking-wider"
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
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive(href)
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
            >
              <Icon className="w-4 h-4" />
              {i18nKey ? t(i18nKey) : label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-xs font-medium text-foreground truncate">
                  {user?.profile.name ?? "Client"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.profile.email}</p>
              </div>
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" side="top">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/client/profile" className="cursor-pointer">
                <UserIcon className="w-4 h-4 mr-2" /> Profile & Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignout}
              className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

function ClientMobileChrome() {
  const [open, setOpen] = useState(false);
  const { signout } = useAuth();
  const isActive = useIsActive();
  const pathname = usePathname();
  const { t } = useI18n();

  const [drawerPathname, setDrawerPathname] = useState(pathname);
  if (drawerPathname !== pathname) {
    setDrawerPathname(pathname);
    setOpen(false);
  }

  const handleSignout = async () => {
    await signout();
  };

  const bottomNav = [
    { href: "/client", icon: LayoutDashboard, label: t("nav.dashboard") },
    { href: "/client/cases", icon: FolderOpen, label: t("nav.cases") },
    { href: "/client/messages", icon: MessageSquare, label: t("nav.messages") },
    { href: "/client/billing", icon: Receipt, label: t("nav.billing") },
    { href: "/client/profile", icon: UserIcon, label: "Profile" },
  ] as const;

  return (
    <>
      <div className="md:hidden sticky top-0 z-50 bg-card border-b border-border flex items-center justify-between px-4 h-14 shrink-0 w-full">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary" />
          <span className="font-serif font-bold text-primary text-sm">Srimar Law</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button type="button" onClick={() => setOpen((v) => !v)} className="p-1" aria-label="Toggle menu">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-background pt-14">
          <nav className="px-4 py-4 space-y-1 h-[calc(100dvh-3.5rem)] overflow-y-auto">
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
                    isActive(href) ? "bg-accent/10 text-accent" : "text-foreground",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {i18nKey ? t(i18nKey) : label}
                </Link>
              );
            })}
            <Link
              href="/client/profile"
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                isActive("/client/profile") ? "bg-accent/10 text-accent" : "text-foreground",
              )}
            >
              <UserIcon className="w-4 h-4" /> Profile & Settings
            </Link>
            <button
              onClick={handleSignout}
              className="flex items-center gap-3 px-3 py-3 text-sm text-destructive w-full cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </nav>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-30">
        {bottomNav.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn("p-2 rounded-lg", isActive(href) ? "text-accent" : "text-muted-foreground")}
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
    <div className="min-h-screen">
      <PortalRoleGuard
        allowed="client"
        title="Client Portal"
        description="Please sign in to access your cases, documents, and billing information."
      >
        <div className="flex h-screen overflow-hidden">
          <ClientDesktopSidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <ClientMobileChrome />
            <main className="flex-1 min-w-0 overflow-auto pb-16 md:pb-0">{children}</main>
          </div>
        </div>
      </PortalRoleGuard>
    </div>
  );
}
