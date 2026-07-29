import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Scale, LayoutDashboard, FolderOpen, CalendarDays, FileText, CheckSquare, Clock, Users, LogOut, Menu, X, Bell, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth.ts";
import { useCurrentUser, STAFF_ROLES } from "@/hooks/use-current-user.ts";

const NAV = [
  { label: "Dashboard", href: "/staff", icon: LayoutDashboard },
  { label: "Cases", href: "/staff/cases", icon: FolderOpen },
  { label: "Hearings", href: "/staff/hearings", icon: CalendarDays },
  { label: "Documents", href: "/staff/documents", icon: FileText },
  { label: "Tasks", href: "/staff/tasks", icon: CheckSquare },
  { label: "Time Tracker", href: "/staff/time", icon: Clock },
  { label: "Clients", href: "/staff/clients", icon: Users },
];

function StaffSidebar() {
  const location = useLocation();
  const { signout, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => href === "/staff" ? location.pathname === "/staff" : location.pathname.startsWith(href);
  const handleSignout = async () => { await signout(); navigate("/"); };

  return (
    <>
      <aside className="hidden md:flex md:w-56 flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
        <div className="px-4 py-5 border-b border-sidebar-border flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center"><Scale className="w-4 h-4 text-sidebar-primary-foreground" /></div>
          <div>
            <div className="font-serif text-sm font-bold text-sidebar-primary-foreground">LexNepal</div>
            <div className="text-xs text-sidebar-foreground/60">Staff Portal</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link key={href} to={href} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive(href) ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}><Icon className="w-4 h-4" />{label}</Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.profile.name ?? "Staff"}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user?.profile.email}</p>
          </div>
          <button onClick={handleSignout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/5 w-full transition-colors cursor-pointer mt-1">
            <LogOut className="w-4 h-4" />Sign Out
          </button>
        </div>
      </aside>

      <div className="md:hidden sticky top-0 z-50 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2"><Scale className="w-5 h-5 text-sidebar-primary-foreground" /><span className="font-serif font-bold text-sidebar-primary-foreground text-sm">Staff Portal</span></div>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-sidebar-foreground/60" />
          <button onClick={() => setOpen((v) => !v)} className="p-1 text-sidebar-foreground">{open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
        </div>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-sidebar pt-14">
          <nav className="px-4 py-4 space-y-1">
            {NAV.map(({ label, href, icon: Icon }) => (
              <Link key={href} to={href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                isActive(href) ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground"
              )}><Icon className="w-4 h-4" />{label}</Link>
            ))}
          </nav>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border flex justify-around py-2 z-30">
        {NAV.slice(0, 5).map(({ href, icon: Icon }) => (
          <Link key={href} to={href} className={cn("p-2 rounded-lg", isActive(href) ? "text-sidebar-primary" : "text-sidebar-foreground/50")}><Icon className="w-5 h-5" /></Link>
        ))}
      </nav>
    </>
  );
}

function StaffRoleGuard({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser === undefined) return;
    if (currentUser === null) return;
    if (!STAFF_ROLES.includes(currentUser.role)) {
      if (currentUser.role === "admin") navigate("/admin", { replace: true });
      else navigate("/client", { replace: true });
    }
  }, [currentUser, navigate]);

  if (currentUser === undefined) {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (currentUser === null || !STAFF_ROLES.includes(currentUser.role)) return null;
  return <>{children}</>;
}

export default function StaffLayout() {
  return (
    <div className="dark min-h-screen">
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-background"><Skeleton className="w-56 h-screen hidden md:block" /></div>
      </AuthLoading>
      <Unauthenticated>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center"><Scale className="w-6 h-6 text-primary-foreground" /></div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Staff Portal</h2>
          <p className="text-muted-foreground text-sm text-center max-w-xs">Authorized staff only. Please sign in with your firm credentials.</p>
          <SignInButton />
        </div>
      </Unauthenticated>
      <Authenticated>
        <StaffRoleGuard>
          <div className="flex h-screen overflow-hidden bg-background">
            <StaffSidebar />
            <main className="flex-1 overflow-auto pb-16 md:pb-0 bg-background"><Outlet /></main>
          </div>
        </StaffRoleGuard>
      </Authenticated>
    </div>
  );
}
