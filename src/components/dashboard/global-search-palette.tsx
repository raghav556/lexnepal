"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ArrowRight,
  LayoutDashboard,
  Activity,
  AlertTriangle,
  Contact,
  Users,
  UserCheck,
  BarChart3,
  Calendar,
  Globe,
  Briefcase,
  FileText,
  Shield,
  PenTool,
  Newspaper,
  Quote,
  Settings,
  User as UserIcon,
  Plus,
  ExternalLink,
  Sparkles,
  Command,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCases } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";

export interface GlobalSearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  portal?: "admin" | "staff" | "client";
}

interface SearchItem {
  id: string;
  category: "pages" | "cases" | "clients" | "actions";
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: "blue" | "amber" | "emerald" | "purple" | "rose" | "slate";
  icon: LucideIcon;
  href?: string;
  onSelect?: () => void;
}

const STATIC_PAGES: Array<{
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
  keywords?: string[];
}> = [
  {
    title: "Admin Dashboard",
    subtitle: "Overview, KPIs & firm workload",
    href: "/admin",
    icon: LayoutDashboard,
    keywords: ["home", "stats", "metrics"],
  },
  {
    title: "Advanced Analytics",
    subtitle: "Firm performance, revenues & caseload",
    href: "/admin/analytics",
    icon: Activity,
    keywords: ["charts", "reports", "insights"],
  },
  {
    title: "Conflict Checker",
    subtitle: "Automated multi-party conflict scan & verification",
    href: "/admin/conflict-checker",
    icon: AlertTriangle,
    keywords: ["compliance", "ethics", "screening"],
  },
  {
    title: "Clients Directory",
    subtitle: "Individual & corporate client database",
    href: "/admin/clients",
    icon: Contact,
    keywords: ["crm", "accounts", "parties"],
  },
  {
    title: "User Directory & Access",
    subtitle: "Firm attorneys, paralegals & administrators",
    href: "/admin/users",
    icon: Users,
    keywords: ["staff", "lawyers", "roles", "permissions"],
  },
  {
    title: "HR & Leaves Management",
    subtitle: "Leave requests and attendance",
    href: "/admin/hr",
    icon: UserCheck,
    keywords: ["vacation", "sick", "workforce"],
  },
  {
    title: "CRM & Leads Pipeline",
    subtitle: "Prospective matters, conversion & intake",
    href: "/admin/crm",
    icon: BarChart3,
    keywords: ["pipeline", "prospects", "opportunities"],
  },
  {
    title: "Appointments & Schedule",
    subtitle: "Client consultations & calendar bookings",
    href: "/admin/appointments",
    icon: Calendar,
    keywords: ["meetings", "hearings", "calendar"],
  },
  {
    title: "CMS: Website Settings",
    subtitle: "Global public website configuration & branding",
    href: "/admin/cms",
    icon: Globe,
    keywords: ["seo", "header", "footer", "meta"],
  },
  {
    title: "CMS: Homepage Editor",
    subtitle: "Hero section, practice banners & public CTAs",
    href: "/admin/cms/homepage",
    icon: LayoutDashboard,
    keywords: ["landing", "frontpage"],
  },
  {
    title: "CMS: Menus & Navigation",
    subtitle: "Site header menus, footer links & dropdowns",
    href: "/admin/cms/navigation",
    icon: Settings,
    keywords: ["navbar", "links"],
  },
  {
    title: "CMS: Practice Areas",
    subtitle: "Corporate, litigation, IP & banking practice pages",
    href: "/admin/cms/practice-areas",
    icon: Briefcase,
    keywords: ["services", "legal domains"],
  },
  {
    title: "CMS: About Page",
    subtitle: "Firm history, ethos & founding leadership",
    href: "/admin/cms/about",
    icon: FileText,
    keywords: ["story", "values"],
  },
  {
    title: "CMS: Careers & Openings",
    subtitle: "Job postings & applicant intake",
    href: "/admin/cms/careers",
    icon: Briefcase,
    keywords: ["jobs", "hiring"],
  },
  {
    title: "CMS: Governance & Legal",
    subtitle: "Terms of service, privacy policy & compliance",
    href: "/admin/cms/governance",
    icon: Shield,
    keywords: ["privacy", "terms", "gdpr"],
  },
  {
    title: "CMS: Blog Articles",
    subtitle: "Legal analysis, firm articles & publications",
    href: "/admin/cms/blog",
    icon: PenTool,
    keywords: ["posts", "articles", "publishing"],
  },
  {
    title: "CMS: News & Awards",
    subtitle: "Firm press releases, recognitions & media",
    href: "/admin/cms/news",
    icon: Newspaper,
    keywords: ["press", "media", "honors"],
  },
  {
    title: "CMS: Resources & Guides",
    subtitle: "Public whitepapers, trial brief samples & acts",
    href: "/admin/cms/resources",
    icon: FileText,
    keywords: ["downloads", "docs", "laws"],
  },
  {
    title: "CMS: Client Testimonials",
    subtitle: "Public reviews, corporate endorsements & ratings",
    href: "/admin/cms/testimonials",
    icon: Quote,
    keywords: ["reviews", "social proof"],
  },
  {
    title: "CMS: Public Team Profiles",
    subtitle: "Public directory of advocates & partners",
    href: "/admin/cms/team",
    icon: Users,
    keywords: ["attorneys", "bios"],
  },
  {
    title: "Document Generator",
    subtitle: "Assemble automated court filings & agreements",
    href: "/admin/document-generator",
    icon: FileText,
    keywords: ["draft", "generate", "brief"],
  },
  {
    title: "Document Templates",
    subtitle: "Reusable legal templates with variable tags",
    href: "/admin/templates",
    icon: FileText,
    keywords: ["forms", "blueprints"],
  },
  {
    title: "Audit & Security Log",
    subtitle: "Enterprise immutable event trail & session logs",
    href: "/admin/audit",
    icon: Shield,
    keywords: ["security", "history", "compliance", "events"],
  },
  {
    title: "System Settings",
    subtitle: "Integration, database & security configuration",
    href: "/admin/settings",
    icon: Settings,
    keywords: ["config", "api", "keys"],
  },
  {
    title: "Administrator Profile",
    subtitle: "Account credentials, avatar & preferences",
    href: "/admin/profile",
    icon: UserIcon,
    keywords: ["password", "account"],
  },
];

type FilterTab = "all" | "pages" | "cases" | "clients" | "actions";

export function GlobalSearchPalette({
  isOpen,
  onClose,
  portal = "admin",
}: GlobalSearchPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<FilterTab>("all");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Live queries for cases and clients
  const casesData = useCases() || [];
  const clientsData = useClients() || [];

  // Focus input on open
  React.useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveTab("all");
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lock body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  // Build searchable items list
  const allItems = React.useMemo(() => {
    const items: SearchItem[] = [];

    // 1. Pages & Navigation
    STATIC_PAGES.forEach((page, idx) => {
      items.push({
        id: `page-${idx}`,
        category: "pages",
        title: page.title,
        subtitle: page.subtitle,
        badge: "Page",
        badgeTone: "slate",
        icon: page.icon,
        href: page.href,
        onSelect: () => {
          router.push(page.href);
          onClose();
        },
      });
    });

    // 2. Cases & Matters
    casesData.forEach((c) => {
      items.push({
        id: `case-${c._id}`,
        category: "cases",
        title: c.title || `Matter ${c.caseNumber}`,
        subtitle: `[${c.caseNumber}] • ${c.practiceArea || "General Legal"}`,
        badge: String(c.status || "active").toUpperCase(),
        badgeTone: c.status === "closed" ? "slate" : "blue",
        icon: Briefcase,
        href: `/staff/cases/${c._id}`,
        onSelect: () => {
          router.push(`/staff/cases/${c._id}`);
          onClose();
        },
      });
    });

    // 3. Clients & Contacts
    clientsData.forEach((cl) => {
      items.push({
        id: `client-${cl._id}`,
        category: "clients",
        title: cl.fullName || "Unnamed Client",
        subtitle: cl.companyName
          ? `${cl.companyName} • ${cl.email || "No email"}`
          : cl.email || cl.phone || "Direct Client",
        badge: cl.type === "corporate" ? "Corporate" : "Individual",
        badgeTone: "emerald",
        icon: Contact,
        href: "/admin/clients",
        onSelect: () => {
          router.push("/admin/clients");
          onClose();
        },
      });
    });

    // 4. Quick Actions
    const quickActions: Array<{
      title: string;
      subtitle: string;
      icon: LucideIcon;
      badge: string;
      badgeTone: "blue" | "amber" | "emerald" | "purple" | "rose" | "slate";
      action: () => void;
    }> = [
      {
        title: "Run Conflict Check",
        subtitle: "Instantly scan parties, opposing counsel & affiliates",
        icon: AlertTriangle,
        badge: "Scan",
        badgeTone: "amber",
        action: () => {
          router.push("/admin/conflict-checker");
          onClose();
        },
      },
      {
        title: "Create New Client",
        subtitle: "Onboard individual or corporate entity",
        icon: Plus,
        badge: "Create",
        badgeTone: "blue",
        action: () => {
          router.push("/admin/clients");
          onClose();
        },
      },
      {
        title: "Schedule Appointment",
        subtitle: "Book consultation, client meeting or court prep",
        icon: Calendar,
        badge: "Schedule",
        badgeTone: "emerald",
        action: () => {
          router.push("/admin/appointments");
          onClose();
        },
      },
      {
        title: "Generate Court Filing / Agreement",
        subtitle: "Draft legal document with automated clauses",
        icon: FileText,
        badge: "Generate",
        badgeTone: "purple",
        action: () => {
          router.push("/admin/document-generator");
          onClose();
        },
      },
      {
        title: "Preview Live Public Website",
        subtitle: "Open the public site in a new browser tab",
        icon: ExternalLink,
        badge: "External",
        badgeTone: "slate",
        action: () => {
          window.open("/", "_blank");
          onClose();
        },
      },
    ];

    quickActions.forEach((qa, idx) => {
      items.push({
        id: `action-${idx}`,
        category: "actions",
        title: qa.title,
        subtitle: qa.subtitle,
        badge: qa.badge,
        badgeTone: qa.badgeTone,
        icon: qa.icon,
        onSelect: qa.action,
      });
    });

    return items;
  }, [casesData, clientsData, router, onClose]);

  // Filtered items based on query & active tab
  const filteredItems = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return allItems.filter((item) => {
      if (activeTab !== "all" && item.category !== activeTab) {
        return false;
      }
      if (!q) {
        // When query is empty, show a curated high-value selection
        if (activeTab === "all") {
          return (
            item.category === "actions" ||
            item.id === "page-0" || // Dashboard
            item.id === "page-2" || // Conflict Checker
            item.id === "page-3" || // Clients
            item.id === "page-6" || // CRM
            item.id === "page-7" || // Appointments
            item.id.startsWith("case-")
          );
        }
        return true;
      }

      // Search match
      const titleMatch = item.title.toLowerCase().includes(q);
      const subtitleMatch = item.subtitle?.toLowerCase().includes(q);
      const badgeMatch = item.badge?.toLowerCase().includes(q);
      return titleMatch || subtitleMatch || badgeMatch;
    });
  }, [allItems, query, activeTab]);

  // Reset selected index when filtered results change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length, query, activeTab]);

  // Scroll active item into view
  React.useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`,
      ) as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (filteredItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filteredItems[selectedIndex];
      if (item) {
        item.onSelect?.();
      }
    }
  };

  if (!isOpen) return null;

  const toneBadgeClasses = {
    blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    amber: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    rose: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    slate: "bg-slate-700/40 text-slate-300 border-slate-600/40",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Search and Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-16 md:pt-20"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in-0 duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette Card */}
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/95 text-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Top Search Bar */}
        <div className="flex items-center gap-3 border-b border-slate-800/90 px-4 py-3.5">
          <Search className="size-5 shrink-0 text-[#487FFF]" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a page, case, client, or action to jump..."
            className="flex-1 bg-transparent text-sm font-medium text-white placeholder-slate-400 outline-none focus:outline-none"
            aria-label="Search query"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded p-1 text-slate-400 hover:text-white"
              aria-label="Clear search query"
            >
              <X className="size-4" />
            </button>
          ) : null}
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-slate-700/80 bg-slate-800/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 border-b border-slate-800/80 bg-slate-950/40 px-4 py-2 overflow-x-auto text-xs">
          {(
            [
              { id: "all", label: "All" },
              { id: "pages", label: "Pages" },
              { id: "cases", label: `Cases (${casesData.length})` },
              { id: "clients", label: `Clients (${clientsData.length})` },
              { id: "actions", label: "Actions" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-[#487FFF] text-white shadow-[0_0_12px_rgba(72,127,255,0.4)]"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 admin-sidebar-scroll max-h-[55vh]"
        >
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Search className="size-8 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No results found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                We couldn&apos;t find anything matching &quot;{query}&quot;. Try searching for a
                case number, client name, or page domain.
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  data-index={index}
                  onClick={() => item.onSelect?.()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "group flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-all duration-150",
                    isSelected
                      ? "bg-white/10 text-white shadow-sm border border-[#487FFF]/30"
                      : "text-slate-300 hover:bg-white/[0.04] border border-transparent",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                        isSelected
                          ? "border-[#487FFF]/50 bg-[#487FFF]/20 text-[#487FFF]"
                          : "border-slate-800 bg-slate-800/80 text-slate-400 group-hover:text-slate-200",
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-semibold text-slate-100">
                          {item.title}
                        </span>
                        {item.badge ? (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md border px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider",
                              toneBadgeClasses[item.badgeTone || "slate"],
                            )}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                      {item.subtitle ? (
                        <p className="truncate text-xs text-slate-400 mt-0.5">{item.subtitle}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5 text-xs text-slate-400">
                    {isSelected ? (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-[#487FFF]">
                        <span>Select</span>
                        <ArrowRight className="size-3" />
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/60 px-4 py-2.5 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-700/80 bg-slate-800 px-1 py-0.5 font-mono text-[10px] text-slate-300">
                ↑
              </kbd>
              <kbd className="rounded border border-slate-700/80 bg-slate-800 px-1 py-0.5 font-mono text-[10px] text-slate-300">
                ↓
              </kbd>
              <span className="ml-0.5">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-700/80 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                ↵
              </kbd>
              <span className="ml-0.5">Open</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Sparkles className="size-3 text-[#487FFF]" />
            <span>Omni Search &amp; Command Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
}
