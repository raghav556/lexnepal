import { Link, Outlet, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo, type FormEvent } from "react";
import { motion, useScroll, useSpring, AnimatePresence } from "motion/react";
import { Menu, X, Scale, Phone, Mail, ArrowRight, Facebook, Linkedin, Instagram, Youtube, Twitter, Video, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { ChatbotWidget } from "@/components/ui/ChatbotWidget.tsx";
import { useCmsCommands, useCmsSettings, useNavigation } from "@/client/queries/cms";
import { useAuth } from "@/hooks/use-auth.ts";
import { getPortalForRole, useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about-us" },
  { label: "Practice Areas", href: "/practice-areas" },
  { label: "Our Team", href: "/lawyers" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export default function PublicLayout() {
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
  const location = useLocation();

  const navLinks = useMemo(() => {
    const active = (headerNav || []).filter((l: any) => l.isActive !== false);
    if (active.length === 0) return NAV_LINKS;
    return active.map((l: any) => ({
      label: l.label as string,
      href: (l.url as string) || "/",
      openInNewTab: !!l.openInNewTab,
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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
      {/* Animated Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-accent z-[100] origin-left shadow-[0_0_10px_rgba(212,175,55,0.8)]"
        style={{ scaleX }}
      />

      {/* Top Bar */}
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
                <a href={settings?.facebookUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors" aria-label="Facebook"><Facebook className="w-4 h-4" /></a>
                <a href={settings?.linkedinUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors" aria-label="LinkedIn"><Linkedin className="w-4 h-4" /></a>
                <a href={settings?.twitterUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors" aria-label="Twitter"><Twitter className="w-4 h-4" /></a>
                <a href={settings?.instagramUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors" aria-label="Instagram"><Instagram className="w-4 h-4" /></a>
                <a href={settings?.youtubeUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors" aria-label="YouTube"><Youtube className="w-4 h-4" /></a>
                <a href={settings?.tiktokUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors" aria-label="TikTok"><Video className="w-4 h-4" /></a>
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
            <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
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
                const isActive = location.pathname === l.href;
                if ((l as any).openInNewTab || /^https?:\/\//.test(l.href)) {
                  return (
                    <a
                      key={`${l.label}-${l.href}`}
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 text-muted-foreground hover:text-primary hover:bg-muted/50"
                    >
                      {l.label}
                    </a>
                  );
                }
                return (
                  <Link 
                    key={`${l.label}-${l.href}`}
                    to={l.href}
                    className={cn(
                      "px-5 py-2 rounded-full text-sm font-medium transition-all duration-300",
                      isActive 
                        ? "bg-background text-primary shadow-sm" 
                        : "text-muted-foreground hover:text-primary hover:bg-muted/50"
                    )}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <Button asChild variant="outline" size="sm" className="font-medium text-foreground"><Link to={portalHref}>My Portal</Link></Button>
              ) : (
                <SignInButton />
              )}
              <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm font-medium">
                <Link to="/consultation">Book Consultation <ArrowRight className="ml-1.5 w-3.5 h-3.5" /></Link>
              </Button>
            </div>

            <button className="lg:hidden p-2" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile / tablet menu with slide animation */}
        <div className={cn(
          "lg:hidden border-t border-border bg-background overflow-hidden transition-all duration-300 ease-in-out",
          mobileOpen ? "max-h-[min(70vh,32rem)] opacity-100 overflow-y-auto" : "max-h-0 opacity-0 border-t-0"
        )}>
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((l) => (
              /^https?:\/\//.test(l.href) || (l as any).openInNewTab ? (
                <a
                  key={`m-${l.label}-${l.href}`}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm font-medium text-foreground hover:text-primary"
                  onClick={() => setMobileOpen(false)}
                >
                  {l.label}
                </a>
              ) : (
                <Link key={`m-${l.label}-${l.href}`} to={l.href} className={cn(
                  "block text-sm font-medium transition-colors",
                  location.pathname === l.href ? "text-primary" : "text-foreground hover:text-primary"
                )} onClick={() => setMobileOpen(false)}>
                  {l.label}
                </Link>
              )
            ))}
            <div className="pt-2 flex flex-col gap-3">
              {user ? (
                <Button asChild variant="outline" size="sm" className="w-full font-medium"><Link to={portalHref}>My Portal</Link></Button>
              ) : (
                <SignInButton />
              )}
              <Button asChild size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm font-medium">
                <Link to="/consultation">Book Consultation <ArrowRight className="ml-1.5 w-3.5 h-3.5" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* pb clears chat + scroll FABs; scroll-padding on html clears sticky header */}
      <main className="flex-1 min-w-0 pb-28 sm:pb-10">
        <Outlet />
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
                {settings?.facebookUrl && (
                  <a href={settings.facebookUrl} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-accent/20 flex items-center justify-center transition-colors" aria-label="Facebook">
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {settings?.linkedinUrl && (
                  <a href={settings.linkedinUrl} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-accent/20 flex items-center justify-center transition-colors" aria-label="LinkedIn">
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {settings?.twitterUrl && (
                  <a href={settings.twitterUrl} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-accent/20 flex items-center justify-center transition-colors" aria-label="Twitter">
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {settings?.instagramUrl && (
                  <a href={settings.instagramUrl} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-accent/20 flex items-center justify-center transition-colors" aria-label="Instagram">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {settings?.youtubeUrl && (
                  <a href={settings.youtubeUrl} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-accent/20 flex items-center justify-center transition-colors" aria-label="YouTube">
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
                {settings?.tiktokUrl && (
                  <a href={settings.tiktokUrl} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-accent/20 flex items-center justify-center transition-colors" aria-label="TikTok">
                    <Video className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-sm mb-3 text-accent">Practice Areas</h4>
              <ul className="space-y-1.5 text-sm text-primary-foreground/70">
                {["Corporate Law","Criminal Law","Family Law","Property Law","Immigration"].map((a) => <li key={a} className="hover:text-accent transition-colors cursor-pointer">{a}</li>)}
              </ul>
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-sm mb-3 text-accent">Quick Links</h4>
              <ul className="space-y-1.5 text-sm text-primary-foreground/70">
                {([
                  ["About Us", "/about-us"],
                  ["Our Lawyers", "/lawyers"],
                  ["Careers", "/careers"],
                  ["Resources", "/resources"],
                  ["News & Awards", "/news"],
                  ["Contact", "/contact"]
                ] as [string,string][]).map(([label,href]) => (
                  <li key={href}><Link to={href} className="hover:text-accent transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>
            <div className="sm:col-span-2 lg:col-span-1 min-w-0">
              <h4 className="font-semibold text-sm mb-3 text-accent">Stay Updated</h4>
              <p className="text-sm text-primary-foreground/60 mb-3">Get legal insights and firm updates delivered to your inbox.</p>
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2 min-w-0">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 min-w-0 rounded-lg bg-primary-foreground/10 border border-primary-foreground/20 px-3 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:border-accent/50"
                />
                <button
                  type="submit"
                  disabled={isSubscribing}
                  className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-60 shrink-0 w-full sm:w-auto"
                >
                  {isSubscribing ? "..." : "Subscribe"}
                </button>
              </form>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-8 sm:mt-10 pt-6 text-xs text-primary-foreground/50 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
            <span>&copy; {new Date().getFullYear()} Srimar Law. All rights reserved.</span>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4">
              <Link to="/privacy-policy" className="hover:text-accent transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-accent transition-colors">Terms of Service</Link>
              <span className="break-words">Reg. Nepal Bar Council | VAT: 00000000</span>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Global Public Chatbot Widget */}
      {/* Scroll To Top Button */}
      <AnimatePresence>
        {scrolled && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-24 right-3 sm:right-6 z-40 w-10 h-10 sm:w-12 sm:h-12 bg-primary/80 backdrop-blur-md text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-accent hover:text-accent-foreground transition-all duration-300 border border-white/10 group"
            aria-label="Scroll to top"
          >
            <ChevronUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      <ChatbotWidget />
    </div>
  );
}
