import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, Scale } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Authenticated, Unauthenticated } from "convex/react";
import { cn } from "@/lib/utils.ts";

const NAV_LINKS = [
  { label: "Practice Areas", href: "/practice-areas" },
  { label: "Our Lawyers", href: "/our-lawyers" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Scale className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-serif text-xl font-bold text-primary">LexNepal</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} to={l.href}
                  className={cn("text-sm font-medium transition-colors hover:text-primary",
                    location.pathname === l.href ? "text-primary" : "text-muted-foreground"
                  )}
                >{l.label}</Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Authenticated>
                <Button asChild variant="secondary" size="sm"><Link to="/client">My Portal</Link></Button>
              </Authenticated>
              <Unauthenticated><SignInButton /></Unauthenticated>
              <Button asChild size="sm"><Link to="/consultation">Book Consultation</Link></Button>
            </div>

            <button className="md:hidden p-2" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} to={l.href} className="block text-sm font-medium text-foreground" onClick={() => setMobileOpen(false)}>
                {l.label}
              </Link>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <Authenticated>
                <Button asChild variant="secondary" size="sm" className="w-full"><Link to="/client">My Portal</Link></Button>
              </Authenticated>
              <Unauthenticated><SignInButton /></Unauthenticated>
              <Button asChild size="sm" className="w-full"><Link to="/consultation">Book Consultation</Link></Button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                  <Scale className="w-4 h-4 text-accent-foreground" />
                </div>
                <span className="font-serif text-xl font-bold">LexNepal</span>
              </div>
              <p className="text-sm text-primary-foreground/70 max-w-xs">Nepal's premier legal practice management platform. Trusted by leading law firms across Kathmandu.</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3 text-accent">Practice Areas</h4>
              <ul className="space-y-1 text-sm text-primary-foreground/70">
                {["Corporate Law","Criminal Law","Family Law","Property Law","Immigration"].map((a) => <li key={a}>{a}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3 text-accent">Quick Links</h4>
              <ul className="space-y-1 text-sm text-primary-foreground/70">
                {([["Book Consultation","/consultation"],["Our Lawyers","/our-lawyers"],["Contact","/contact"]] as [string,string][]).map(([label,href]) => (
                  <li key={href}><Link to={href} className="hover:text-accent transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-xs text-primary-foreground/50 flex flex-col sm:flex-row justify-between gap-2">
            <span>&copy; {new Date().getFullYear()} LexNepal. All rights reserved.</span>
            <span>Reg. Nepal Bar Council | VAT: 00000000</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
