import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Scale, LayoutDashboard, Users, UserCheck, DollarSign, BarChart3, Settings, Shield, LogOut, Menu, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";

const NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "HR", href: "/admin/hr", icon: UserCheck },
  { label: "Finance", href: "/admin/finance", icon: DollarSign },
  { label: "CRM", href: "/admin/crm", icon: BarChart3 },
  { label: "Audit Log", href: "/admin/audit", icon: Shield },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

function AdminSidebar() {
  const location = useLocation();
  const { signout, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => href === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(href);
  const handleSignout = async () => { await signout(); navigate("/"); };

  return (
    <>
      <aside className="hidden md:flex md:w-56 flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
        <div className="px-4 py-5 border-b border-sidebar-border flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center"><Scale className="w-4 h-4 text-sidebar-primary-foreground" /></div>
          <div>
            <div className="font-serif text-sm font-bold text-sidebar-primary-foreground">LexNepal</div>
            <div className="text-xs text-sidebar-foreground/60">Admin Console</div>
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
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.profile.name ?? "Admin"}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user?.profile.email}</p>
          </div>
          <button onClick={handleSignout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/5 w-full transition-colors cursor-pointer mt-1">
            <LogOut className="w-4 h-4" />Sign Out
          </button>
        </div>
      </aside>

      <div className="md:hidden sticky top-0 z-50 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 h-14">
        <span className="font-serif font-bold text-sidebar-primary-foreground text-sm">Admin Console</span>
        <button onClick={() => setOpen((v) => !v)} className="p-1 text-sidebar-foreground">{open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
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
      <div className="dark min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (currentUser === null || currentUser.role !== "admin") return null;
  return <>{children}</>;
}

export default function AdminLayout() {
  return (
    <div className="dark min-h-screen">
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
