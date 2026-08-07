"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo, type FormEvent } from "react";
import { motion, useScroll, useSpring, AnimatePresence } from "motion/react";
import {
  Menu,
  X,
  Scale,
  Phone,
  Mail,
  ArrowRight,
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  Twitter,
  Video,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeaderAuth } from "@/components/auth/PublicHeaderAuth";
import { ChatbotWidget } from "@/components/ui/ChatbotWidget";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { useCmsCommands, useCmsSettings } from "@/client/queries/cms";
import { queryKeys } from "@/client/queries/query-keys";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type PublicNavEntry = Record<string, unknown>;
type PublicNavLink = { label: string; href: string; openInNewTab?: boolean };

function NavSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div
      className="inline-flex items-center gap-1 p-1 rounded-full border border-border/50 bg-muted/20"
      aria-busy="true"
      aria-label="Loading navigation"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-8 w-14 xl:w-16 rounded-full bg-muted/60 animate-pulse" />
      ))}
    </div>
  );
}

const navLinkClass =
  "px-2.5 xl:px-3 2xl:px-3.5 py-1.5 rounded-full text-xs xl:text-[13px] 2xl:text-sm font-medium transition-all duration-300 whitespace-nowrap";

function mapCmsNav(entries: PublicNavEntry[]): PublicNavLink[] {
  return entries
    .filter((l) => l.isActive !== false)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .map((l) => ({
      label: String(l.label ?? ""),
      href: String(l.url ?? "/"),
      openInNewTab: Boolean(l.openInNewTab),
    }));
}

function usePublicNav(location: "header" | "footer_col_1" | "footer_col_2", initial?: PublicNavEntry[]) {
  return useQuery({
    queryKey: queryKeys.cms.collection("public", "navigation", { location }),
    queryFn: ({ signal }) =>
      apiClient.request<PublicNavEntry[]>("/api/v1/public/cms/navigation", {
        query: { location },
        signal,
      }),
    initialData: initial,
    staleTime: 60_000,
    retry: 2,
  });
}

function FooterNavList({ links }: { links: PublicNavLink[] }) {
  if (!links.length) {
    return <li className="text-sm text-primary-foreground/50">No links yet</li>;
  }
  return (
    <>
      {links.map((l) => (
        <li key={`footer-${l.label}-${l.href}`}>
          {l.openInNewTab || /^https?:\/\//.test(l.href) ? (
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary-foreground/70 hover:text-accent transition-colors"
            >
              {l.label}
            </a>
          ) : (
            <Link
              href={l.href}
              className="text-sm text-primary-foreground/70 hover:text-accent transition-colors"
            >
              {l.label}
            </Link>
          )}
        </li>
      ))}
    </>
  );
}

const COOKIE_KEY = "lexnepal_cookie_consent";

export function PublicLayoutShell({
  children,
  initialHeaderNav,
  initialFooterCol1 = [],
  initialFooterCol2 = [],
}: {
  children: React.ReactNode;
  initialHeaderNav: PublicNavEntry[];
  initialFooterCol1?: PublicNavEntry[];
  initialFooterCol2?: PublicNavEntry[];
}) {
  const settings = useCmsSettings("public");
  const { data: headerNav } = usePublicNav("header", initialHeaderNav);
  const { data: footerCol1Nav } = usePublicNav("footer_col_1", initialFooterCol1);
  const { data: footerCol2Nav } = usePublicNav("footer_col_2", initialFooterCol2);
  const { subscribe: subscribeNewsletter } = useCmsCommands();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [cookieDismissed, setCookieDismissed] = useState(true);
  const pathname = usePathname();

  const firmName = String(settings?.firmName || "Srimar Law");
  const tagline = String(settings?.tagline || "Attorneys at Law");
  const logoUrl = typeof settings?.logoUrl === "string" ? settings.logoUrl : "";
  const businessHours = String(settings?.businessHoursText || "Office Hours: Sun-Fri 9AM-6PM");
  const footerTitle1 = String(settings?.footerCol1Title || "Quick Links");
  const footerTitle2 = String(settings?.footerCol2Title || "Explore");

  const navLinks = useMemo(() => mapCmsNav(headerNav ?? []), [headerNav]);
  const footer1Links = useMemo(() => mapCmsNav(footerCol1Nav ?? []), [footerCol1Nav]);
  const footer2Links = useMemo(() => mapCmsNav(footerCol2Nav ?? []), [footerCol2Nav]);
  const showNavSkeleton = navLinks.length === 0;

  const gaId =
    typeof settings?.googleAnalyticsId === "string" &&
    /^G-[A-Z0-9]+$/i.test(settings.googleAnalyticsId.trim())
      ? settings.googleAnalyticsId.trim()
      : null;
  const pixelId =
    typeof settings?.facebookPixelId === "string" &&
    /^\d{5,20}$/.test(settings.facebookPixelId.trim())
      ? settings.facebookPixelId.trim()
      : null;

  useEffect(() => {
    try {
      setCookieDismissed(localStorage.getItem(COOKIE_KEY) === "1");
    } catch {
      setCookieDismissed(false);
    }
  }, []);

  const handleNewsletterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    setIsSubscribing(true);
    try {
      const result = (await subscribeNewsletter(email)) as { alreadySubscribed?: boolean };
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

  const [menuPathname, setMenuPathname] = useState(pathname);
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const dismissCookie = () => {
    try {
      localStorage.setItem(COOKIE_KEY, "1");
    } catch {
      /* ignore */
    }
    setCookieDismissed(true);
  };

  if (settings?.maintenanceModeEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-lg text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
            <Scale className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground">{firmName}</h1>
          <p className="text-muted-foreground">
            {String(
              settings.maintenanceMessage ||
                "Our website is temporarily unavailable for maintenance. Please check back soon.",
            )}
          </p>
          <Button asChild variant="outline">
            <Link href="/sign-in">Staff sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-clip">
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');
          `}</Script>
        </>
      )}
      {pixelId && (
        <Script id="fb-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${pixelId}');fbq('track','PageView');
        `}</Script>
      )}

      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-accent z-[100] origin-left shadow-[0_0_10px_rgba(212,175,55,0.8)]"
        style={{ scaleX }}
      />

      {settings?.announcementVisible && settings?.announcementText && (
        <div className="bg-accent text-accent-foreground text-sm py-2 px-4 text-center">
          {settings.announcementLink ? (
            <a href={String(settings.announcementLink)} className="underline-offset-2 hover:underline">
              {String(settings.announcementText)}
            </a>
          ) : (
            <span>{String(settings.announcementText)}</span>
          )}
        </div>
      )}

      <div className="hidden md:block bg-primary text-primary-foreground py-2 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-between items-center gap-y-2">
          <div className="flex flex-wrap gap-4 sm:gap-6">
            <a
              href={`tel:${settings?.phone || "+97701XXXXXXX"}`}
              className="flex items-center gap-1.5 hover:text-accent transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> {settings?.phone || "+977 01 XXXXXXX"}
            </a>
            <a
              href={`mailto:${settings?.email || "info@Srimar Law.com.np"}`}
              className="flex items-center gap-1.5 hover:text-accent transition-colors"
            >
              <Mail className="w-3.5 h-3.5" /> {settings?.email || "info@Srimar Law.com.np"}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-primary-foreground/60">{businessHours}</span>
            <div className="hidden lg:flex items-center gap-4">
              <div className="w-px h-4 bg-primary-foreground/20" />
              <div className="flex gap-3">
                <a href={settings?.facebookUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
                <a href={settings?.linkedinUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors">
                  <Linkedin className="w-4 h-4" />
                </a>
                <a href={settings?.twitterUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href={settings?.instagramUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href={settings?.youtubeUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors">
                  <Youtube className="w-4 h-4" />
                </a>
                <a href={settings?.tiktokUrl || "#"} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors">
                  <Video className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-50 bg-background/95 backdrop-blur transition-all duration-300",
          scrolled ? "shadow-md border-b border-border py-2" : "border-b border-transparent py-4",
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-3 sm:gap-4 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0 max-w-[10.5rem] sm:max-w-[12rem]"
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={firmName} className="h-9 sm:h-10 w-auto object-contain shrink-0" />
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary flex items-center justify-center shadow-sm shrink-0">
                  <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                </div>
              )}
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="font-serif text-base sm:text-xl xl:text-2xl font-bold text-primary tracking-tight truncate">
                  {firmName}
                </span>
                <span className="hidden xl:block text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5 truncate">
                  {tagline}
                </span>
              </div>
            </Link>

            <div className="hidden xl:flex flex-1 items-center justify-center min-w-0 px-4 2xl:px-8">
              {showNavSkeleton ? (
                <NavSkeleton />
              ) : (
                <nav
                  className="inline-flex items-center gap-0.5 p-1 rounded-full border border-border/50 bg-muted/20 max-w-full"
                  aria-label="Main navigation"
                >
                  {navLinks.map((l) => {
                    const isActive = pathname === l.href;
                    if (l.openInNewTab || /^https?:\/\//.test(l.href)) {
                      return (
                        <a
                          key={`${l.label}-${l.href}`}
                          href={l.href}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(navLinkClass, "text-muted-foreground hover:text-primary hover:bg-muted/50")}
                        >
                          {l.label}
                        </a>
                      );
                    }
                    return (
                      <Link
                        key={`${l.label}-${l.href}`}
                        href={l.href}
                        className={cn(
                          navLinkClass,
                          isActive
                            ? "bg-background text-primary shadow-sm"
                            : "text-muted-foreground hover:text-primary hover:bg-muted/50",
                        )}
                      >
                        {l.label}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>

            <div className="hidden md:flex items-center gap-2 lg:gap-3 shrink-0 ml-auto xl:ml-0">
              <PublicHeaderAuth />
              <Button
                asChild
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm font-medium shrink-0 text-xs xl:text-sm px-3 xl:px-4"
              >
                <Link href="/consultation">
                  <span className="hidden 2xl:inline">Book Consultation</span>
                  <span className="2xl:hidden">Book Now</span>
                  <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>

            <button
              type="button"
              className="xl:hidden p-2 shrink-0 ml-auto md:ml-0"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div
          className={cn(
            "xl:hidden border-t border-border bg-background overflow-hidden transition-all duration-300",
            mobileOpen ? "max-h-[70vh] opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="px-4 py-4 space-y-3 overflow-y-auto max-h-[70vh]">
            {showNavSkeleton ? (
              <div className="space-y-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-5 w-32 rounded bg-muted/60 animate-pulse" />
                ))}
              </div>
            ) : (
              navLinks.map((l) =>
                /^https?:\/\//.test(l.href) || l.openInNewTab ? (
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
                  <Link
                    key={`m-${l.label}-${l.href}`}
                    href={l.href}
                    className={cn(
                      "block text-sm font-medium transition-colors",
                      pathname === l.href ? "text-primary" : "text-foreground hover:text-primary",
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    {l.label}
                  </Link>
                ),
              )
            )}
            <div className="pt-2 flex flex-col gap-3">
              <PublicHeaderAuth mobile />
              <Button
                asChild
                size="sm"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm font-medium"
              >
                <Link href="/consultation">
                  Book Consultation <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-w-0 pb-28 sm:pb-10">{children}</main>

      <footer className="bg-primary text-primary-foreground overflow-x-clip">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="sm:col-span-2 lg:col-span-1 min-w-0">
              <div className="flex items-center gap-2 mb-4 min-w-0">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={firmName} className="h-8 w-auto object-contain shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <Scale className="w-4 h-4 text-accent-foreground" />
                  </div>
                )}
                <span className="font-serif text-xl font-bold truncate">{firmName}</span>
              </div>
              <p className="text-sm text-primary-foreground/70 max-w-xs mb-4 break-words [overflow-wrap:anywhere]">
                {tagline ||
                  "Nepal's premier legal practice. Trusted advocates across Kathmandu."}
              </p>
              <div className="flex gap-3 flex-wrap">
                {settings?.facebookUrl && (
                  <a
                    href={settings.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-accent/20 flex items-center justify-center transition-colors"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {settings?.linkedinUrl && (
                  <a
                    href={settings.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-accent/20 flex items-center justify-center transition-colors"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {settings?.twitterUrl && (
                  <a
                    href={settings.twitterUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-accent/20 flex items-center justify-center transition-colors"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="font-serif text-lg font-semibold mb-4">{footerTitle1}</h3>
              <ul className="space-y-2">
                <FooterNavList links={footer1Links} />
              </ul>
            </div>

            <div className="min-w-0">
              <h3 className="font-serif text-lg font-semibold mb-4">{footerTitle2}</h3>
              <ul className="space-y-2">
                <FooterNavList links={footer2Links} />
              </ul>
            </div>

            <div className="min-w-0 space-y-6">
              <div>
                <h3 className="font-serif text-lg font-semibold mb-4">Contact</h3>
                <ul className="space-y-2 text-sm text-primary-foreground/70">
                  {settings?.phone && (
                    <li className="flex items-center gap-2 break-words [overflow-wrap:anywhere]">
                      <Phone className="w-4 h-4 shrink-0" /> {settings.phone}
                    </li>
                  )}
                  {settings?.email && (
                    <li className="flex items-center gap-2 break-words [overflow-wrap:anywhere]">
                      <Mail className="w-4 h-4 shrink-0" /> {settings.email}
                    </li>
                  )}
                  {settings?.emergencyPhone && (
                    <li className="break-words [overflow-wrap:anywhere]">
                      Emergency: {String(settings.emergencyPhone)}
                      {settings.emergencyText ? ` — ${String(settings.emergencyText)}` : ""}
                    </li>
                  )}
                  <li>
                    <Link href="/consultation" className="hover:text-accent transition-colors">
                      Book a consultation
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold mb-3">Newsletter</h3>
                <p className="text-sm text-primary-foreground/70 mb-3">
                  Legal updates from our practice, a few times a year.
                </p>
                <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-2">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-label="Email address"
                    className="w-full rounded-md bg-primary-foreground/10 border border-primary-foreground/20 px-3 py-2 text-sm placeholder:text-primary-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubscribing}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    {isSubscribing ? "Subscribing..." : "Subscribe"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {settings?.cookieConsentEnabled && !cookieDismissed && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 rounded-lg border border-border bg-background shadow-lg p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            We use cookies to improve your experience on this site. See our{" "}
            <Link href={String(settings.privacyPolicyUrl || "/privacy")} className="underline">
              privacy policy
            </Link>
            .
          </p>
          <Button size="sm" onClick={dismissCookie} className="w-full sm:w-auto">
            Accept
          </Button>
        </div>
      )}

      <AnimatePresence>
        {scrolled && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-24 right-3 sm:right-6 z-40 w-10 h-10 sm:w-12 sm:h-12 bg-primary/80 backdrop-blur-md text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-accent hover:text-accent-foreground transition-all duration-300 border border-white/10 group"
          >
            <ChevronUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      <ChatbotWidget />
    </div>
  );
}
