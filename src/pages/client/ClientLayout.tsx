import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Scale, LayoutDashboard, FolderOpen, MessageSquare, Receipt, FileText, Bell, LogOut, Menu, X, Loader2, Calendar, User as UserIcon, ChevronUp, Globe, ShieldCheck, PenTool } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { NotificationBell } from "@/components/ui/notification-bell.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";

type NavItem = { label?: string; i18nKey?: string; href?: string; icon?: any; heading?: string };

const NAV: NavItem[] = [
  { heading: "Overview" },
  { label: "Dashboard", i18nKey: "nav.dashboard", href: "/client", icon: LayoutDashboard },
  
  { heading: "Your Matters" },
  { label: "My Cases", i18nKey: "nav.cases", href: "/client/cases", icon: FolderOpen },
  { label: "Documents", i18nKey: "nav.documents", href: "/client/documents", icon: FileText },
  { label: "Messages", i18nKey: "nav.messages", href: "/client/messages", icon: MessageSquare },
  
  { heading: "Services" },
  { label: "Identity (KYC)", i18nKey: "nav.kyc", href: "/client/kyc", icon: ShieldCheck },
  { label: "E-Signatures", i18nKey: "nav.signatures", href: "/client/signatures", icon: PenTool },
  { label: "Billing", i18nKey: "nav.billing", href: "/client/billing", icon: Receipt },
  { label: "Book Appointment", i18nKey: "nav.book_appointment", href: "/client/booking", icon: Calendar },
];

function ClientSidebar() {
  const location = useLocation();
  const { signout, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const t = (key: string) => key;
  const isActive = (href: string) => location.pathname === href;

  const handleSignout = async () => { await signout(); navigate("/"); };

  return (
    <>
      <aside className="hidden md:flex md:w-60 flex-col h-screen sticky top-0 bg-card border-r border-border">
        <div className="px-4 py-5 border-b border-border flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><Scale className="w-4 h-4 text-primary-foreground" /></div>
          <div>
            <div className="font-serif text-sm font-bold text-primary">Srimar Law</div>
            <div className="text-xs text-muted-foreground">Client Portal</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item, idx) => {
            if (item.heading) {
              return <div key={`heading-${idx}`} className="text-xs font-semibold text-muted-foreground mt-5 mb-2 px-3 uppercase tracking-wider">{item.heading}</div>;
            }
            const { label, href, icon: Icon } = item;
            return (
              <Link key={href} to={href!} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive(href!) ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}><Icon className="w-4 h-4" />{label}</Link>
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
                  <p className="text-xs font-medium text-foreground truncate">{user?.profile.name ?? "Client"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.profile.email}</p>
                </div>
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" side="top">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/client/profile" className="cursor-pointer">
                  <UserIcon className="w-4 h-4 mr-2" /> Profile & Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="md:hidden sticky top-0 z-50 bg-card border-b border-border flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2"><Scale className="w-5 h-5 text-primary" /><span className="font-serif font-bold text-primary text-sm">Srimar Law</span></div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={() => setOpen((v) => !v)} className="p-1">{open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
        </div>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-background pt-14">
          <nav className="px-4 py-4 space-y-1">
            {NAV.map((item, idx) => {
              if (item.heading) {
                return <div key={`mob-heading-${idx}`} className="text-xs font-semibold text-muted-foreground mt-4 mb-2 px-3 uppercase tracking-wider">{item.heading}</div>;
              }
              const { label, href, icon: Icon } = item;
              return (
                <Link key={href} to={href!} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                  location.pathname === href ? "bg-accent/10 text-accent" : "text-foreground"
                )}><Icon className="w-4 h-4" />{label}</Link>
              );
            })}
            <button onClick={handleSignout} className="flex items-center gap-3 px-3 py-3 text-sm text-destructive w-full cursor-pointer">
              <LogOut className="w-4 h-4" />Sign Out
            </button>
          </nav>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-30">
        {NAV.filter(item => !item.heading).map(({ href, icon: Icon }) => (
          <Link key={href} to={href!} className={cn("p-2 rounded-lg", location.pathname === href ? "text-accent" : "text-muted-foreground")}>
            <Icon className="w-5 h-5" />
          </Link>
        ))}
      </nav>
    </>
  );
}

function ClientRoleGuard({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser === undefined) return;
    if (currentUser === null) return;
    if (currentUser.role !== "client") {
      if (currentUser.role === "admin") navigate("/admin", { replace: true });
      else navigate("/staff", { replace: true });
    }
  }, [currentUser, navigate]);

  if (currentUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (currentUser === null || currentUser.role !== "client") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background flex-col gap-4">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Redirecting to your portal…</p>
      </div>
    );
  }
  return <>{children}</>;
}

export default function ClientLayout() {
  return (
    <div className="min-h-screen">
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">
          <Skeleton className="w-60 h-screen hidden md:block" />
          <div className="flex-1 p-8 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /></div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center"><Scale className="w-6 h-6 text-primary-foreground" /></div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Client Portal</h2>
          <p className="text-muted-foreground text-sm text-center max-w-xs">Please sign in to access your cases, documents, and billing information.</p>
          <SignInButton />
        </div>
      </Unauthenticated>
      <Authenticated>
        <ClientRoleGuard>
          <div className="flex h-screen overflow-hidden">
            <ClientSidebar />
            <main className="flex-1 overflow-auto pb-16 md:pb-0"><Outlet /></main>
          </div>
        </ClientRoleGuard>
      </Authenticated>
    </div>
  );
}
