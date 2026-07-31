import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Label } from "@/components/ui/label.tsx";
import { User as UserIcon, AlertTriangle, Check, X, Search, Ban, Activity, Mail, Phone, CalendarDays, UserPlus, FileText, Settings, Shield, LogOut, Menu, Loader2, Globe, PenTool, Briefcase, Calendar, Receipt, Quote, LayoutDashboard, Users, UserCheck, DollarSign, BarChart3, Scale, ChevronUp, Navigation, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { NotificationBell } from "@/components/ui/notification-bell.tsx";
import { useI18n } from "@/lib/i18n-context.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";

type NavItem = { label?: string; i18nKey?: string; href?: string; icon?: any; heading?: string };

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
  { label: "Navigation & Menus", i18nKey: "nav.navigation", href: "/admin/cms/navigation", icon: Navigation },
  { label: "Practice Areas", i18nKey: "nav.practice_areas", href: "/admin/cms/practice-areas", icon: Briefcase },
  { label: "Testimonials", i18nKey: "nav.testimonials", href: "/admin/cms/testimonials", icon: Quote },
  { label: "Public Team", i18nKey: "nav.public_team", href: "/admin/cms/team", icon: Users },
  { label: "Blog Articles", i18nKey: "nav.blog_articles", href: "/admin/cms/blog", icon: PenTool },
  { label: "News & Awards", i18nKey: "nav.news_awards", href: "/admin/cms/news", icon: Newspaper },
  { label: "Careers", i18nKey: "nav.careers", href: "/admin/cms/careers", icon: Briefcase },
  { label: "Resources", i18nKey: "nav.resources", href: "/admin/cms/resources", icon: FileText },
  { label: "About Page", i18nKey: "nav.about_page", href: "/admin/cms/about", icon: FileText },
  
  { heading: "System" },
  { label: "Doc Generator", i18nKey: "nav.doc_generator", href: "/admin/document-generator", icon: FileText },
  { label: "Document Templates", i18nKey: "nav.document_templates", href: "/admin/templates", icon: FileText },
  { label: "Audit Log", i18nKey: "nav.audit_log", href: "/admin/audit", icon: Shield },
  { label: "Settings", i18nKey: "nav.settings", href: "/admin/settings", icon: Settings },
];

function AdminSidebar() {
  const location = useLocation();
  const { signout, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { t, language, setLanguage } = useI18n();

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/admin") return location.pathname === "/admin";
    if (href === "/admin/cms") return location.pathname === "/admin/cms";
    return location.pathname.startsWith(href);
  };
  const handleSignout = async () => { await signout(); navigate("/"); };

  return (
    <>
      <aside className="hidden md:flex md:w-56 flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
        <div className="px-4 py-5 border-b border-sidebar-border flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center"><Scale className="w-4 h-4 text-sidebar-primary-foreground" /></div>
          <div>
            <div className="font-serif text-sm font-bold text-sidebar-primary-foreground">Srimar Law</div>
            <div className="text-xs text-sidebar-foreground/60">{t("nav.admin_console")}</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item, idx) => {
            if (item.heading) {
              return <div key={`heading-${idx}`} className="text-xs font-semibold text-sidebar-foreground/50 mt-5 mb-2 px-3 uppercase tracking-wider">{item.heading}</div>;
            }
            const { label, i18nKey, href, icon: Icon } = item;
            return (
              <Link key={href} to={href!} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive(href!) ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}><Icon className="w-4 h-4" />{t(i18nKey!) !== i18nKey ? t(i18nKey!) : label}</Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.profile.name ?? "Admin"}</p>
                  <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.profile.email}</p>
                </div>
                <ChevronUp className="w-4 h-4 text-sidebar-foreground/50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" side="top">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/profile" className="cursor-pointer">
                  <UserIcon className="w-4 h-4 mr-2" /> Profile & Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage(language === 'en' ? 'ne' : 'en')} className="cursor-pointer">
                <Globe className="w-4 h-4 mr-2" /> Language ({language === 'en' ? 'नेपाली' : 'English'})
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" /> {t("nav.signout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="md:hidden sticky top-0 z-50 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 h-14">
        <span className="font-serif font-bold text-sidebar-primary-foreground text-sm">{t("nav.admin_console")}</span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setLanguage(language === 'en' ? 'ne' : 'en')}
            className="w-7 h-7 rounded-full bg-sidebar-accent text-[10px] font-bold text-sidebar-foreground flex items-center justify-center"
          >
            {language === 'en' ? 'ने' : 'EN'}
          </button>
          <NotificationBell />
          <button onClick={() => setOpen((v) => !v)} className="p-1 text-sidebar-foreground">{open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
        </div>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-sidebar pt-14">
          <nav className="px-4 py-4 space-y-1">
            {NAV.map((item, idx) => {
              if (item.heading) {
                return <div key={`mheading-${idx}`} className="text-xs font-semibold text-sidebar-foreground/40 mt-4 mb-1 px-3 uppercase tracking-wider">{item.heading}</div>;
              }
              const { label, i18nKey, href, icon: Icon } = item;
              if (!href || !Icon) return null;
              return (
                <Link key={href} to={href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                  isActive(href) ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground"
                )}><Icon className="w-4 h-4" />{t(i18nKey!) !== i18nKey ? t(i18nKey!) : label}</Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}

function AdminRoleGuard({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser === undefined) return;
    if (currentUser === null) return;
    if (currentUser.role !== "admin") {
      if (currentUser.role === "client") navigate("/client", { replace: true });
      else navigate("/staff", { replace: true });
    }
  }, [currentUser, navigate]);

  if (currentUser === undefined) {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (currentUser === null || currentUser.role !== "admin") return null;
  return <>{children}</>;
}

export default function AdminLayout() {
  return (
    <div className="dark min-h-screen text-foreground">
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-background"><Skeleton className="w-56 h-screen hidden md:block" /></div>
      </AuthLoading>
      <Unauthenticated>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center"><Scale className="w-6 h-6 text-primary-foreground" /></div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Admin Console</h2>
          <p className="text-muted-foreground text-sm text-center max-w-xs">Restricted access. Please sign in with admin credentials.</p>
          <SignInButton />
        </div>
      </Unauthenticated>
      <Authenticated>
        <AdminRoleGuard>
          <div className="flex h-screen overflow-hidden bg-background">
            <AdminSidebar />
            <main className="flex-1 overflow-auto bg-background"><Outlet /></main>
          </div>
        </AdminRoleGuard>
      </Authenticated>
    </div>
  );
}
