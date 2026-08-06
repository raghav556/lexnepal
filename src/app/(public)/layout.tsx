"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo, type FormEvent } from "react";
import { motion, useScroll, useSpring, AnimatePresence } from "motion/react";
import { Menu, X, Scale, Phone, Mail, ArrowRight, Facebook, Linkedin, Instagram, Youtube, Twitter, Video, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@/components/ui/signin";
import { ChatbotWidget } from "@/components/ui/ChatbotWidget";
// Removed Convex Authenticated/Unauthenticated wrappers for now, assume generic usage
import { useCmsCommands, useCmsSettings, useNavigation } from "@/client/queries/cms";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getPortalForRole, useCurrentUser } from "@/hooks/use-current-user";

type PublicNavLink = { label: string; href: string; openInNewTab?: boolean };

const NAV_LINKS: PublicNavLink[] = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about-us" },
  { label: "Practice Areas", href: "/practice-areas" },
  { label: "Our Team", href: "/lawyers" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = useCmsSettings("public");
  const headerNav = useNavigation({ location: "header" }, "public");
  const { subscribe: subscribeNewsletter } = useCmsCommands();
  const { user } = useAuth();
  const currentUser = useCurrentUser();
  const portalHref = currentUser ? getPortalForRole(currentUser.role) : "/client";
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const pathname = usePathname();

  const navLinks: PublicNavLink[] = useMemo(() => {
    const entries = (headerNav ?? []) as Array<Record<string, unknown>>;
    const active = entries.filter((l) => l.isActive !== false);
    if (active.length === 0) return NAV_LINKS;
    return active.map((l) => ({
      label: String(l.label ?? ""),
      href: String(l.url ?? "/"),
      openInNewTab: Boolean(l.openInNewTab),
    }));
  }, [headerNav]);

  const handleNewsletterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    setIsSubscribing(true);
    try {
      const result = await subscribeNewsletter(email) as { alreadySubscribed?: boolean };
      toast.success(result?.alreadySubscribed ? "You are already subscribed." : "Thanks for subscribing!");
      setNewsletterEmail("");
    } catch {
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setIsSubscribing(false);
    }
  };

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Collapse the mobile menu whenever the route changes, including browser back/forward.
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setMobileOpen(false);
  }

  // Scroll Progress Bar Logic
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-accent z-[100] origin-left shadow-[0_0_10px_rgba(212,175,55,0.8)]"
        style={{ scaleX }}
      />

      <div className="hidden md:block bg-primary text-primary-foreground py-2 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-between items-center gap-y-2">
          <div className="flex flex-wrap gap-4 sm:gap-6">
            <a href={`tel:${settings?.phone || "+97701XXXXXXX"}`} className="flex items-center gap-1.5 hover:text-accent transition-colors">
              <Phone className="w-3.5 h-3.5" /> {settings?.phone || "+977 01 XXXXXXX"}
            </a>
            <a href={`mailto:${settings?.email || "info@Srimar Law.com.np"}`} className="flex items-center gap-1.5 hover:text-accent transition-colors">
              <Mail className="w-3.5 h-3.5" /> {settings?.email || "info@Srimar Law.com.np"}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-primary-foreground/60">Office Hours: Sun-Fri 9AM-6PM</span>
            <div className="hidden lg:flex items-center gap-4">
              <div className="w-px h-4 bg-primary-foreground/20" />
              <div className="flex gap-3">
                <a href={settings?.facebookUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors"><Facebook className="w-4 h-4" /></a>
                <a href={settings?.linkedinUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors"><Linkedin className="w-4 h-4" /></a>
                <a href={settings?.twitterUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors"><Twitter className="w-4 h-4" /></a>
                <a href={settings?.instagramUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors"><Instagram className="w-4 h-4" /></a>
                <a href={settings?.youtubeUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors"><Youtube className="w-4 h-4" /></a>
                <a href={settings?.tiktokUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors"><Video className="w-4 h-4" /></a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <header className={cn(
        "sticky top-0 z-50 bg-background/95 backdrop-blur transition-all duration-300",
        scrolled ? "shadow-md border-b border-border py-2" : "border-b border-transparent py-4"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary flex items-center justify-center shadow-sm shrink-0">
                <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-serif text-lg sm:text-2xl font-bold text-primary leading-none tracking-tight truncate">Srimar Law</span>
                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider sm:tracking-widest mt-0.5 truncate">Attorneys at Law</span>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1.5 bg-muted/20 p-1.5 rounded-full border border-border/50">
              {navLinks.map((l) => {
                const isActive = pathname === l.href;
                if (l.openInNewTab || /^https?:\/\//.test(l.href)) {
                  return (
                    <a key={`${l.label}-${l.href}`} href={l.href} target="_blank" rel="noreferrer" className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 text-muted-foreground hover:text-primary hover:bg-muted/50">
                      {l.label}
                    </a>
                  );
                }
                return (
                  <Link key={`${l.label}-${l.href}`} href={l.href} className={cn("px-5 py-2 rounded-full text-sm font-medium transition-all duration-300", isActive ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-primary hover:bg-muted/50")}>
                    {l.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <Button asChild variant="outline" size="sm" className="font-medium text-foreground"><Link href={portalHref}>My Portal</Link></Button>
              ) : (
                <SignInButton />
              )}
              <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm font-medium">
                <Link href="/consultation">Book Consultation <ArrowRight className="ml-1.5 w-3.5 h-3.5" /></Link>
              </Button>
            </div>

            <button className="lg:hidden p-2" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className={cn("lg:hidden border-t border-border bg-background overflow-hidden transition-all duration-300 ease-in-out", mobileOpen ? "max-h-[min(70vh,32rem)] opacity-100 overflow-y-auto" : "max-h-0 opacity-0 border-t-0")}>
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((l) => (
              /^https?:\/\//.test(l.href) || l.openInNewTab ? (
                <a key={`m-${l.label}-${l.href}`} href={l.href} target="_blank" rel="noreferrer" className="block text-sm font-medium text-foreground hover:text-primary" onClick={() => setMobileOpen(false)}>
                  {l.label}
                </a>
              ) : (
                <Link key={`m-${l.label}-${l.href}`} href={l.href} className={cn("block text-sm font-medium transition-colors", pathname === l.href ? "text-primary" : "text-foreground hover:text-primary")} onClick={() => setMobileOpen(false)}>
                  {l.label}
                </Link>
              )
            ))}
            <div className="pt-2 flex flex-col gap-3">
              {user ? (
                <Button asChild variant="outline" size="sm" className="w-full font-medium"><Link href={portalHref}>My Portal</Link></Button>
              ) : (
                <SignInButton />
              )}
              <Button asChild size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm font-medium">
                <Link href="/consultation">Book Consultation <ArrowRight className="ml-1.5 w-3.5 h-3.5" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-w-0 pb-28 sm:pb-10">
        {children}
      </main>

      <footer className="bg-primary text-primary-foreground overflow-x-clip">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="sm:col-span-2 lg:col-span-1 min-w-0">
              <div className="flex items-center gap-2 mb-4 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <Scale className="w-4 h-4 text-accent-foreground" />
                </div>
                <span className="font-serif text-xl font-bold truncate">Srimar Law</span>
              </div>
              <p className="text-sm text-primary-foreground/70 max-w-xs mb-4 break-words [overflow-wrap:anywhere]">Nepal&apos;s premier legal practice management platform. Trusted by leading law firms across Kathmandu.</p>
              <div className="flex gap-3 flex-wrap">
                {settings?.facebookUrl && <a href={settings.facebookUrl} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-accent/20 flex items-center justify-center transition-colors"><Facebook className="w-4 h-4" /></a>}
                {settings?.linkedinUrl && <a href={settings.linkedinUrl} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-accent/20 flex items-center justify-center transition-colors"><Linkedin className="w-4 h-4" /></a>}
                {settings?.twitterUrl && <a href={settings.twitterUrl} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-accent/20 flex items-center justify-center transition-colors"><Twitter className="w-4 h-4" /></a>}
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="font-serif text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {navLinks.map((l) => (
                  <li key={`footer-${l.label}-${l.href}`}>
                    <Link href={l.href} className="text-sm text-primary-foreground/70 hover:text-accent transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0">
              <h3 className="font-serif text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-primary-foreground/70">
                {settings?.contactPhone && (
                  <li className="flex items-center gap-2 break-words [overflow-wrap:anywhere]">
                    <Phone className="w-4 h-4 shrink-0" /> {settings.contactPhone}
                  </li>
                )}
                {settings?.contactEmail && (
                  <li className="flex items-center gap-2 break-words [overflow-wrap:anywhere]">
                    <Mail className="w-4 h-4 shrink-0" /> {settings.contactEmail}
                  </li>
                )}
                <li>
                  <Link href="/consultation" className="hover:text-accent transition-colors">Book a consultation</Link>
                </li>
              </ul>
            </div>

            <div className="min-w-0">
              <h3 className="font-serif text-lg font-semibold mb-4">Newsletter</h3>
              <p className="text-sm text-primary-foreground/70 mb-3">Legal updates from our practice, a few times a year.</p>
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-2">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email address"
                  className="w-full rounded-md bg-primary-foreground/10 border border-primary-foreground/20 px-3 py-2 text-sm placeholder:text-primary-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <Button type="submit" size="sm" disabled={isSubscribing} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {isSubscribing ? "Subscribing..." : "Subscribe"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </footer>
      
      <AnimatePresence>
        {scrolled && (
          <motion.button initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.8 }} onClick={scrollToTop} className="fixed bottom-24 right-3 sm:right-6 z-40 w-10 h-10 sm:w-12 sm:h-12 bg-primary/80 backdrop-blur-md text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-accent hover:text-accent-foreground transition-all duration-300 border border-white/10 group">
            <ChevronUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      <ChatbotWidget />
    </div>
  );
}
