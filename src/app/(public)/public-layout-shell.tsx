"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import { motion, useScroll, useSpring, AnimatePresence } from "motion/react";
import {
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  Twitter,
  Video,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeaderAuth } from "@/components/auth/PublicHeaderAuth";
import { ChatbotWidget } from "@/components/ui/ChatbotWidget";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { useCmsCommands } from "@/client/queries/cms";
import {
  PublicCmsSettingsProvider,
  usePublicCmsSettings,
} from "@/client/queries/public-cms-settings";
import { queryKeys } from "@/client/queries/query-keys";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DEFAULT_PRIMARY_CTA_HREF,
  DEFAULT_PRIMARY_CTA_LABEL,
  DEFAULT_PRIMARY_CTA_SHORT_LABEL,
  DEFAULT_PRIVACY_POLICY_URL,
  DEFAULT_TERMS_OF_SERVICE_URL,
} from "@/shared/public-routes";
import { isPracticeAreasNavRoot } from "@/shared/practice-areas-visibility";
import { usePracticeAreas } from "@/client/queries/cms";
import { FirmBrand } from "@/components/branding/firm-brand";

export type PublicNavEntry = Record<string, unknown>;
type PublicNavLink = {
  label: string;
  href: string;
  openInNewTab?: boolean;
  children?: PublicNavLink[];
};

function NavSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div
      className="inline-flex items-center gap-0.5 sm:gap-1 p-1 rounded-full border border-border/50 bg-muted/20 max-w-full"
      aria-busy="true"
      aria-label="Loading navigation"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-7 w-12 lg:w-14 xl:w-16 rounded-full bg-muted/60 animate-pulse shrink-0"
        />
      ))}
    </div>
  );
}

/** Compact on tablet/laptop (md+), roomier on xl/2xl — inline nav from md (768px). */
const navLinkClass =
  "px-2 lg:px-2.5 xl:px-3 2xl:px-3.5 py-1.5 rounded-full text-[11px] lg:text-xs xl:text-[13px] 2xl:text-sm font-medium transition-all duration-300 whitespace-nowrap shrink-0";

function entryId(entry: PublicNavEntry): string {
  return String(entry.id ?? entry._id ?? "");
}

function toLeafLink(entry: PublicNavEntry): PublicNavLink {
  return {
    label: String(entry.label ?? ""),
    href: String(entry.url ?? "/"),
    openInNewTab: Boolean(entry.openInNewTab),
  };
}

/** Build top-level links with optional dropdown children; orphans are dropped. */
function mapCmsNav(entries: PublicNavEntry[]): PublicNavLink[] {
  const active = entries.filter((l) => l.isActive !== false);
  const byId = new Map(active.map((l) => [entryId(l), l]));
  const childrenOf = new Map<string, PublicNavEntry[]>();

  for (const entry of active) {
    const parentId = entry.parentId ? String(entry.parentId) : "";
    if (!parentId || !byId.has(parentId)) continue;
    const list = childrenOf.get(parentId) ?? [];
    list.push(entry);
    childrenOf.set(parentId, list);
  }

  return active
    .filter((e) => !e.parentId)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .map((e) => {
      const kids = (childrenOf.get(entryId(e)) ?? [])
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
        .map(toLeafLink);
      const link = toLeafLink(e);
      return kids.length > 0 ? { ...link, children: kids } : link;
    });
}

function isExternalHref(href: string, openInNewTab?: boolean) {
  return openInNewTab || /^https?:\/\//.test(href);
}

function isPlaceholderHref(href: string) {
  return !href || href === "#";
}

function usePublicNav(
  location: "header" | "footer_col_1" | "footer_col_2",
  initial?: PublicNavEntry[],
) {
  return useQuery({
    queryKey: queryKeys.cms.collection("public", "navigation", { location }),
    queryFn: ({ signal }) =>
      apiClient.request<PublicNavEntry[]>("/api/v1/public/cms/navigation", {
        query: { location },
        signal,
      }),
    placeholderData: initial,
    staleTime: 0,
    refetchOnMount: "always" as const,
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
          {isExternalHref(l.href, l.openInNewTab) ? (
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

function DesktopNavItem({ link, pathname }: { link: PublicNavLink; pathname: string }) {
  const children = link.children ?? [];
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => () => clearCloseTimer(), []);
  useEffect(() => {
    const timeout = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (children.length === 0) {
    if (isExternalHref(link.href, link.openInNewTab)) {
      return (
        <a
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className={cn(navLinkClass, "text-muted-foreground hover:text-primary hover:bg-muted/50")}
        >
          {link.label}
        </a>
      );
    }
    const isActive = pathname === link.href;
    return (
      <Link
        href={link.href}
        className={cn(
          navLinkClass,
          isActive
            ? "bg-background text-primary shadow-sm"
            : "text-muted-foreground hover:text-primary hover:bg-muted/50",
        )}
      >
        {link.label}
      </Link>
    );
  }

  const childActive = children.some(
    (c) => pathname === c.href || pathname.startsWith(`${c.href}/`),
  );
  const triggerActive = childActive || (!isPlaceholderHref(link.href) && pathname === link.href);
  const triggerClass = cn(
    navLinkClass,
    "inline-flex items-center gap-1",
    triggerActive || open
      ? "bg-background text-primary shadow-sm"
      : "text-muted-foreground hover:text-primary hover:bg-muted/50",
  );
  const isMega = children.length >= 4;
  const placeholder = isPlaceholderHref(link.href);

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => {
        clearCloseTimer();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      {placeholder || isExternalHref(link.href, link.openInNewTab) ? (
        <button
          type="button"
          className={triggerClass}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {link.label}
          <ChevronDown
            className={cn("w-3.5 h-3.5 opacity-70 transition-transform", open && "rotate-180")}
          />
        </button>
      ) : (
        <Link
          href={link.href}
          className={triggerClass}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={(e) => {
            // First click opens the menu; second click (or chevron intent) navigates.
            if (!open) {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          {link.label}
          <ChevronDown
            className={cn("w-3.5 h-3.5 opacity-70 transition-transform", open && "rotate-180")}
          />
        </Link>
      )}
      <div
        role="menu"
        className={cn(
          "absolute left-1/2 -translate-x-1/2 top-full pt-2 z-[60] transition-opacity duration-150",
          open
            ? "visible opacity-100 pointer-events-auto"
            : "invisible opacity-0 pointer-events-none",
          isMega ? "min-w-[18rem]" : "min-w-[11rem]",
        )}
      >
        <div
          className={cn(
            "rounded-xl border border-border bg-background shadow-xl py-2",
            isMega && "grid grid-cols-2 gap-x-1 p-2 min-w-[22rem]",
          )}
        >
          {children.map((child) =>
            isExternalHref(child.href, child.openInNewTab) ? (
              <a
                key={`${child.label}-${child.href}`}
                role="menuitem"
                href={child.href}
                target="_blank"
                rel="noreferrer"
                className="block px-3 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-md whitespace-nowrap"
                onClick={() => setOpen(false)}
              >
                {child.label}
              </a>
            ) : (
              <Link
                key={`${child.label}-${child.href}`}
                role="menuitem"
                href={child.href}
                className={cn(
                  "block px-3 py-2 text-sm whitespace-nowrap rounded-md hover:bg-muted/50",
                  pathname === child.href || pathname.startsWith(`${child.href}/`)
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-primary",
                )}
                onClick={() => setOpen(false)}
              >
                {child.label}
              </Link>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function MobileNavItem({
  link,
  pathname,
  onNavigate,
}: {
  link: PublicNavLink;
  pathname: string;
  onNavigate: () => void;
}) {
  const children = link.children ?? [];
  const [open, setOpen] = useState(false);

  if (children.length === 0) {
    if (isExternalHref(link.href, link.openInNewTab)) {
      return (
        <a
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="block text-sm font-medium text-foreground hover:text-primary"
          onClick={onNavigate}
        >
          {link.label}
        </a>
      );
    }
    return (
      <Link
        href={link.href}
        className={cn(
          "block text-sm font-medium transition-colors",
          pathname === link.href ? "text-primary" : "text-foreground hover:text-primary",
        )}
        onClick={onNavigate}
      >
        {link.label}
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-medium text-foreground hover:text-primary"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{link.label}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="pl-3 space-y-1 border-l border-border ml-1">
          {!isPlaceholderHref(link.href) &&
            (isExternalHref(link.href, link.openInNewTab) ? (
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="block text-sm text-muted-foreground hover:text-primary py-1"
                onClick={onNavigate}
              >
                {link.label} overview
              </a>
            ) : (
              <Link
                href={link.href}
                className={cn(
                  "block text-sm py-1",
                  pathname === link.href
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary",
                )}
                onClick={onNavigate}
              >
                {link.label} overview
              </Link>
            ))}
          {children.map((child) =>
            isExternalHref(child.href, child.openInNewTab) ? (
              <a
                key={`m-${child.label}-${child.href}`}
                href={child.href}
                target="_blank"
                rel="noreferrer"
                className="block text-sm text-muted-foreground hover:text-primary py-1"
                onClick={onNavigate}
              >
                {child.label}
              </a>
            ) : (
              <Link
                key={`m-${child.label}-${child.href}`}
                href={child.href}
                className={cn(
                  "block text-sm py-1",
                  pathname === child.href
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary",
                )}
                onClick={onNavigate}
              >
                {child.label}
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}

const COOKIE_KEY = "lexnepal_cookie_consent";

export function PublicLayoutShell({
  children,
  initialHeaderNav,
  initialFooterCol1 = [],
  initialFooterCol2 = [],
  initialSettings = {},
}: {
  children: React.ReactNode;
  initialHeaderNav: PublicNavEntry[];
  initialFooterCol1?: PublicNavEntry[];
  initialFooterCol2?: PublicNavEntry[];
  initialSettings?: Record<string, unknown>;
}) {
  return (
    <PublicCmsSettingsProvider initialSettings={initialSettings}>
      <PublicLayoutShellInner
        initialHeaderNav={initialHeaderNav}
        initialFooterCol1={initialFooterCol1}
        initialFooterCol2={initialFooterCol2}
      >
        {children}
      </PublicLayoutShellInner>
    </PublicCmsSettingsProvider>
  );
}

function PublicLayoutShellInner({
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
  const settings = usePublicCmsSettings();
  const { data: headerNav } = usePublicNav("header", initialHeaderNav);
  const { data: footerCol1Nav } = usePublicNav("footer_col_1", initialFooterCol1);
  const { data: footerCol2Nav } = usePublicNav("footer_col_2", initialFooterCol2);
  const practiceAreasLive = usePracticeAreas({ isActive: true }, "public");
  const { subscribe: subscribeNewsletter } = useCmsCommands();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [cookieDismissed, setCookieDismissed] = useState(true);
  const pathname = usePathname();

  const firmName = String(settings?.firmName ?? "");
  const tagline = String(settings?.tagline ?? "");
  const logoUrl = typeof settings?.logoUrl === "string" ? settings.logoUrl : "";
  const businessHours = String(settings?.businessHoursText || "Office Hours: Sun-Fri 9AM-6PM");
  const footerTitle1 = String(settings?.footerCol1Title || "Quick Links");
  const footerTitle2 = String(settings?.footerCol2Title || "Explore");

  const navLinks = useMemo(() => {
    const base = mapCmsNav(headerNav ?? []);
    const paChildren: PublicNavLink[] = [...(practiceAreasLive ?? [])]
      .sort(
        (
          a: { displayOrder?: number; title?: string },
          b: { displayOrder?: number; title?: string },
        ) =>
          (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
          String(a.title ?? "").localeCompare(String(b.title ?? "")),
      )
      .map((pa: { title?: string; slug?: string }) => ({
        label: String(pa.title ?? ""),
        href: `/practice-areas/${String(pa.slug ?? "")}`,
      }))
      .filter((c) => c.label && c.href !== "/practice-areas/");
    if (paChildren.length > 0) {
      paChildren.push({ label: "View all practice areas", href: "/practice-areas" });
    }
    return base.map((link) =>
      isPracticeAreasNavRoot(link)
        ? { ...link, children: paChildren.length > 0 ? paChildren : undefined }
        : link,
    );
  }, [headerNav, practiceAreasLive]);
  const footer1Links = useMemo(() => mapCmsNav(footerCol1Nav ?? []), [footerCol1Nav]);
  const footer2Links = useMemo(() => mapCmsNav(footerCol2Nav ?? []), [footerCol2Nav]);
  const showNavSkeleton = navLinks.length === 0;

  const ctaLabel = String(settings?.primaryCtaLabel || DEFAULT_PRIMARY_CTA_LABEL);
  const ctaShortLabel = String(settings?.primaryCtaShortLabel || DEFAULT_PRIMARY_CTA_SHORT_LABEL);
  const ctaHref = String(settings?.primaryCtaHref || DEFAULT_PRIMARY_CTA_HREF);
  const privacyHref = String(settings?.privacyPolicyUrl || DEFAULT_PRIVACY_POLICY_URL);
  const termsHref = String(settings?.termsOfServiceUrl || DEFAULT_TERMS_OF_SERVICE_URL);

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
    const timeout = window.setTimeout(() => {
      try {
        setCookieDismissed(localStorage.getItem(COOKIE_KEY) === "1");
      } catch {
        setCookieDismissed(false);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
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
      toast.success(
        result?.alreadySubscribed ? "You are already subscribed." : "Thanks for subscribing!",
      );
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

  // Close mobile drawer when the header has room for inline nav (~tablet+).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const closeIfDesktop = () => {
      if (mq.matches) setMobileOpen(false);
    };
    closeIfDesktop();
    mq.addEventListener("change", closeIfDesktop);
    return () => mq.removeEventListener("change", closeIfDesktop);
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
          <FirmBrand
            firmName={firmName}
            logoUrl={logoUrl}
            logoFit="cover"
            showName={false}
            className="justify-center"
            logoClassName="size-20 rounded-2xl border border-border bg-background shadow-lg"
            fallbackClassName="size-12 bg-primary"
            fallbackIconClassName="size-6 text-primary-foreground"
          />
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
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
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
            <a
              href={String(settings.announcementLink)}
              className="underline-offset-2 hover:underline"
            >
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
              href={settings?.phone ? `tel:${settings.phone}` : undefined}
              className="flex items-center gap-1.5 hover:text-accent transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> {String(settings?.phone ?? "")}
            </a>
            <a
              href={settings?.email ? `mailto:${settings.email}` : undefined}
              className="flex items-center gap-1.5 hover:text-accent transition-colors"
            >
              <Mail className="w-3.5 h-3.5" /> {String(settings?.email ?? "")}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-primary-foreground/60">{businessHours}</span>
            <div className="hidden lg:flex items-center gap-4">
              <div className="w-px h-4 bg-primary-foreground/20" />
              <div className="flex gap-3">
                <a
                  href={settings?.facebookUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-accent transition-colors"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href={settings?.linkedinUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-accent transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href={settings?.twitterUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-accent transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href={settings?.instagramUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-accent transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href={settings?.youtubeUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-accent transition-colors"
                >
                  <Youtube className="w-4 h-4" />
                </a>
                <a
                  href={settings?.tiktokUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-accent transition-colors"
                >
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
          <div className="flex items-center h-14 sm:h-16 gap-2 sm:gap-3 min-w-0">
            <FirmBrand
              href="/"
              firmName={firmName}
              logoUrl={logoUrl}
              subtitle={tagline}
              logoFit="cover"
              className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0 max-w-[52%] sm:max-w-[14rem] md:max-w-[12rem] lg:max-w-[14rem] xl:max-w-[18rem] 2xl:max-w-[20rem]"
              logoClassName="size-9 rounded-lg border border-border/70 bg-background shadow-sm md:size-10 xl:size-11"
              fallbackClassName="size-8 bg-primary shadow-sm sm:size-9 md:size-8 lg:size-9 xl:size-10"
              fallbackIconClassName="size-4 text-primary-foreground sm:size-5"
              nameClassName="text-sm tracking-tight text-primary sm:text-base md:text-sm lg:text-base xl:text-xl 2xl:text-2xl"
              subtitleClassName="mt-0.5 hidden text-[9px] font-medium uppercase tracking-wider text-muted-foreground xl:block sm:text-[10px]"
            />

            {/*
              Inline nav from md (768px). Covers Windows-scaled laptops
              (e.g. 1366 CSS px @ 150% scale ≈ 910px — below old lg/xl cutoffs).
            */}
            <div className="hidden md:flex flex-1 items-center justify-center min-w-0 px-1 lg:px-2 xl:px-4">
              {showNavSkeleton ? (
                <NavSkeleton />
              ) : (
                <nav
                  className="inline-flex items-center gap-0.5 p-1 rounded-full border border-border/50 bg-muted/20 max-w-full overflow-visible flex-wrap justify-center"
                  aria-label="Main navigation"
                >
                  {navLinks.map((l) => (
                    <DesktopNavItem key={`${l.label}-${l.href}`} link={l} pathname={pathname} />
                  ))}
                </nav>
              )}
            </div>

            <div className="hidden md:flex items-center gap-1.5 lg:gap-2 xl:gap-3 shrink-0">
              <PublicHeaderAuth />
              <Button
                asChild
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm font-medium shrink-0 text-xs xl:text-sm px-2.5 lg:px-3 xl:px-4"
              >
                <Link href={ctaHref}>
                  <span className="hidden xl:inline">{ctaLabel}</span>
                  <span className="xl:hidden">{ctaShortLabel}</span>
                  <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>

            <button
              type="button"
              className="md:hidden p-2 shrink-0 ml-auto"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div
          className={cn(
            "md:hidden border-t border-border bg-background overflow-hidden transition-all duration-300",
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
              navLinks.map((l) => (
                <MobileNavItem
                  key={`m-${l.label}-${l.href}`}
                  link={l}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))
            )}
            <div className="pt-2 flex flex-col gap-3">
              <PublicHeaderAuth mobile />
              <Button
                asChild
                size="sm"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm font-medium"
              >
                <Link href={ctaHref}>
                  {ctaLabel} <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
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
              <FirmBrand
                href="/"
                firmName={firmName}
                logoUrl={logoUrl}
                logoFit="cover"
                className="mb-4 gap-2"
                logoClassName="size-10 rounded-lg border border-primary-foreground/20 bg-primary-foreground/5"
                fallbackClassName="size-8 bg-accent"
                fallbackIconClassName="size-4 text-accent-foreground"
                nameClassName="text-xl text-primary-foreground"
              />
              <p className="text-sm text-primary-foreground/70 max-w-xs mb-4 break-words [overflow-wrap:anywhere]">
                {tagline}
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
                {settings?.instagramUrl && (
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-accent/20 flex items-center justify-center transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {settings?.youtubeUrl && (
                  <a
                    href={settings.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-accent/20 flex items-center justify-center transition-colors"
                  >
                    <Youtube className="w-4 h-4" />
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
                  {settings?.address && (
                    <li className="flex items-start gap-2 break-words [overflow-wrap:anywhere]">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" /> {String(settings.address)}
                    </li>
                  )}
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
                    className="w-full rounded-md bg-primary-foreground/10 border border-primary-foreground/20 px-3 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/70 focus:outline-none focus:ring-2 focus:ring-accent"
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

          <div className="mt-8 pt-6 border-t border-primary-foreground/10 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs text-primary-foreground/60">
            <span>
              © {new Date().getFullYear()} {firmName || "Law Firm"}. All rights reserved.
            </span>
            <div className="flex flex-wrap gap-4">
              <Link href={privacyHref} className="hover:text-accent transition-colors">
                Privacy Policy
              </Link>
              <Link href={termsHref} className="hover:text-accent transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {settings?.cookieConsentEnabled && !cookieDismissed && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 rounded-lg border border-border bg-background shadow-lg p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            We use cookies to improve your experience on this site. See our{" "}
            <Link href={privacyHref} className="underline">
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
