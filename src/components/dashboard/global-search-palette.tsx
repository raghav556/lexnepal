"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ArrowRight,
  LayoutDashboard,
  Contact,
  Calendar,
  Briefcase,
  FileText,
  Shield,
  PenTool,
  User as UserIcon,
  Plus,
  ExternalLink,
  Sparkles,
  Command,
  MessageSquare,
  Bell,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCases, useClientCases } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { isLifecycleClosed } from "@/shared/contracts/case-status";
import { CASE_LIFECYCLE_LABELS, toLifecycleStatus } from "@/shared/contracts/case-ui";
import { CLIENT_SEARCH_PAGES } from "@/lib/client-shell-nav";
import { getOperationalSearchPages } from "@/lib/operational-navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import styles from "./global-search-palette.module.css";

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

type FilterTab = "all" | "pages" | "cases" | "clients" | "actions";

const CLIENT_PAGE_ICONS: Record<string, LucideIcon> = {
  "/client": LayoutDashboard,
  "/client/cases": Briefcase,
  "/client/documents": FileText,
  "/client/messages": MessageSquare,
  "/client/booking": Calendar,
  "/client/kyc": Shield,
  "/client/signatures": PenTool,
  "/client/notifications": Bell,
  "/client/profile": UserIcon,
  "/client/hearings": Calendar,
  "/client/checklist": ClipboardList,
};

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
  const resultsId = React.useId();

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );
  const isClientPortal = portal === "client";
  const casesData = useCases() || [];
  const clientCasesData = useClientCases() || [];
  const clientsData = useClients({ enabled: !isClientPortal }) || [];

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
    if (isOpen && isClientPortal) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen, isClientPortal]);

  // Build searchable items list
  const allItems = React.useMemo(() => {
    const items: SearchItem[] = [];

    if (isClientPortal) {
      CLIENT_SEARCH_PAGES.forEach((page, idx) => {
        items.push({
          id: `page-${idx}`,
          category: "pages",
          title: page.title,
          subtitle: page.subtitle,
          badge: "Page",
          badgeTone: "slate",
          icon: CLIENT_PAGE_ICONS[page.href] ?? LayoutDashboard,
          href: page.href,
          onSelect: () => {
            router.push(page.href);
            onClose();
          },
        });
      });

      clientCasesData.forEach((c) => {
        const href = `/client/cases/${c._id}`;
        items.push({
          id: `case-${c._id}`,
          category: "cases",
          title: c.title || `Matter ${c.caseNumber}`,
          subtitle: `[${c.caseNumber}] • ${c.practiceArea || "General Legal"}`,
          badge: CASE_LIFECYCLE_LABELS[toLifecycleStatus(c.status)].toUpperCase(),
          badgeTone: isLifecycleClosed(c.status) ? "slate" : "blue",
          icon: Briefcase,
          href,
          onSelect: () => {
            router.push(href);
            onClose();
          },
        });
      });

      const clientActions: Array<{
        title: string;
        subtitle: string;
        icon: LucideIcon;
        href: string;
      }> = [
        {
          title: "Message Legal Team",
          subtitle: "Send a message about your matter",
          icon: MessageSquare,
          href: "/client/messages",
        },
        {
          title: "Book Appointment",
          subtitle: "Request a consultation with your legal team",
          icon: Calendar,
          href: "/client/booking",
        },
        {
          title: "View Documents",
          subtitle: "Open files shared with you",
          icon: FileText,
          href: "/client/documents",
        },
      ];
      clientActions.forEach((action, idx) => {
        items.push({
          id: `action-${idx}`,
          category: "actions",
          title: action.title,
          subtitle: action.subtitle,
          badge: "Go",
          badgeTone: "blue",
          icon: action.icon,
          href: action.href,
          onSelect: () => {
            router.push(action.href);
            onClose();
          },
        });
      });

      return items;
    }

    // 1. Pages & Navigation
    getOperationalSearchPages(portal).forEach((page, idx) => {
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
    const caseBasePath = portal === "admin" ? "/admin/cases" : "/staff/cases";
    casesData.forEach((c) => {
      const href = `${caseBasePath}/${c._id}`;
      items.push({
        id: `case-${c._id}`,
        category: "cases",
        title: c.title || `Matter ${c.caseNumber}`,
        subtitle: `[${c.caseNumber}] • ${c.practiceArea || "General Legal"}`,
        badge: CASE_LIFECYCLE_LABELS[toLifecycleStatus(c.status)].toUpperCase(),
        badgeTone: isLifecycleClosed(c.status) ? "slate" : "blue",
        icon: Briefcase,
        href,
        onSelect: () => {
          router.push(href);
          onClose();
        },
      });
    });

    // 3. Clients & Contacts
    const clientBasePath = portal === "admin" ? "/admin/clients" : "/staff/clients";
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
        href: clientBasePath,
        onSelect: () => {
          router.push(clientBasePath);
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
        title: "Create New Client",
        subtitle: "Onboard individual or corporate entity",
        icon: Plus,
        badge: "Create",
        badgeTone: "blue",
        action: () => {
          router.push(clientBasePath);
          onClose();
        },
      },
      {
        title: "Create New Case",
        subtitle: `Open a matter in the ${portal === "staff" ? "Staff" : "Admin"} Case workspace`,
        icon: Briefcase,
        badge: "Create",
        badgeTone: "blue",
        action: () => {
          router.push(portal === "staff" ? "/staff/cases?create=1" : "/admin/cases?create=1");
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
          router.push(portal === "staff" ? "/staff/appointments" : "/admin/appointments");
          onClose();
        },
      },
      ...(portal === "admin"
        ? [
            {
              title: "Generate Court Filing / Agreement",
              subtitle: "Draft legal document with automated clauses",
              icon: FileText,
              badge: "Generate",
              badgeTone: "purple" as const,
              action: () => {
                router.push("/admin/document-generator");
                onClose();
              },
            },
          ]
        : []),
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
  }, [casesData, clientCasesData, clientsData, isClientPortal, router, onClose, portal]);

  // Filtered items based on query & active tab
  const filteredItems = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return allItems.filter((item) => {
      if (activeTab !== "all" && item.category !== activeTab) {
        return false;
      }
      if (!q) {
        if (isClientPortal) {
          return activeTab === "all"
            ? item.category === "pages" || item.category === "actions"
            : true;
        }
        // When query is empty, show a curated high-value selection
        if (activeTab === "all") {
          return (
            item.category === "actions" ||
            item.href === `/${portal}` ||
            ["cases", "clients", "crm", "appointments"].some(
              (page) => item.href === `/${portal}/${page}`,
            ) ||
            item.id.startsWith("case-")
          );
        }
        return true;
      }

      const pageKeywords =
        isClientPortal && item.href
          ? (CLIENT_SEARCH_PAGES.find((page) => page.href === item.href)?.keywords ?? [])
          : [];
      const keywordMatch = pageKeywords.some(
        (keyword) => keyword.includes(q) || q.includes(keyword),
      );
      const titleMatch = item.title.toLowerCase().includes(q);
      const subtitleMatch = item.subtitle?.toLowerCase().includes(q);
      const badgeMatch = item.badge?.toLowerCase().includes(q);
      return titleMatch || subtitleMatch || badgeMatch || keywordMatch;
    });
  }, [allItems, query, activeTab, isClientPortal]);

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
    } else if (e.key === "Enter" && (isClientPortal || e.target === inputRef.current)) {
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

  const card = (
    <div
      data-search-part="card"
      className={cn(
        !isClientPortal && styles.operational,
        "relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/95 text-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-200",
      )}
    >
      {/* Top Search Bar */}
      <div
        data-search-part="bar"
        className="flex items-center gap-3 border-b border-slate-800/90 px-4 py-3.5"
      >
        <Search className="size-5 shrink-0 text-[#487FFF]" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            isClientPortal
              ? "Search your matters, documents or messages…"
              : "Type a page, case, client, or action to jump..."
          }
          className="flex-1 bg-transparent text-sm font-medium text-white placeholder-slate-400 outline-none focus:outline-none"
          aria-label="Search query"
          role={isClientPortal ? undefined : "combobox"}
          aria-autocomplete={isClientPortal ? undefined : "list"}
          aria-expanded={isClientPortal ? undefined : isOpen}
          aria-controls={isClientPortal ? undefined : resultsId}
          aria-activedescendant={
            isClientPortal || !filteredItems.length ? undefined : `${resultsId}-${selectedIndex}`
          }
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
      <div
        data-search-part="filters"
        className="flex items-center gap-1.5 border-b border-slate-800/80 bg-slate-950/40 px-4 py-2 overflow-x-auto text-xs"
      >
        {(isClientPortal
          ? ([
              { id: "all", label: "All" },
              { id: "pages", label: "Pages" },
              { id: "cases", label: `Matters (${clientCasesData.length})` },
              { id: "actions", label: "Actions" },
            ] as const)
          : ([
              { id: "all", label: "All" },
              { id: "pages", label: "Pages" },
              { id: "cases", label: `Cases (${casesData.length})` },
              { id: "clients", label: `Clients (${clientsData.length})` },
              { id: "actions", label: "Actions" },
            ] as const)
        ).map((tab) => (
          <button
            key={tab.id}
            aria-pressed={isClientPortal ? undefined : activeTab === tab.id}
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
        id={isClientPortal ? undefined : resultsId}
        role={isClientPortal ? undefined : "listbox"}
        aria-label={isClientPortal ? undefined : "Search results"}
        className="flex-1 overflow-y-auto p-2 space-y-1 admin-sidebar-scroll max-h-[55vh]"
      >
        {filteredItems.length === 0 ? (
          <div
            data-search-part="empty"
            className="flex flex-col items-center justify-center py-12 text-center text-slate-400"
          >
            <Search className="size-8 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No results found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              We couldn&apos;t find anything matching &quot;{query}&quot;. Try searching for a case
              number, client name, or page domain.
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
                id={isClientPortal ? undefined : `${resultsId}-${index}`}
                role={isClientPortal ? undefined : "option"}
                aria-selected={isClientPortal ? undefined : isSelected}
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
                    data-search-part="icon"
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
                      <span
                        data-search-part="title"
                        className="truncate text-[13.5px] font-semibold text-slate-100"
                      >
                        {item.title}
                      </span>
                      {item.badge ? (
                        <span
                          data-search-part="badge"
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
                      <p
                        data-search-part="subtitle"
                        className="truncate text-xs text-slate-400 mt-0.5"
                      >
                        {item.subtitle}
                      </p>
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
      <div
        data-search-part="footer"
        className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/60 px-4 py-2.5 text-[11px] text-slate-400"
      >
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
  );

  const palette = (
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

      {card}
    </div>
  );

  if (isClientPortal) return palette;
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-label="Global Search and Command Palette"
        onKeyDown={handleKeyDown}
        className={cn(card.props.className, styles.dialog)}
      >
        {card.props.children}
      </DialogContent>
    </Dialog>
  );
}
