"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  ChevronRight,
  Search,
  Plus,
  Command,
  FilePlus,
  FolderPlus,
  CalendarPlus,
  UserPlus,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  Upload,
  CalendarPlus2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";
import { NotificationBell } from "@/components/ui/notification-bell";
import { DualDateDisplay } from "@/components/dashboard/dual-date-display";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PortalTopbarProps {
  portal: "admin" | "staff" | "client";
  onOpenCommandCenter?: () => void;
  className?: string;
}

// Map path segments to human-readable labels and i18n keys
const SEGMENT_LABELS: Record<string, { label: string; i18nKey?: string }> = {
  admin: { label: "Admin Console", i18nKey: "nav.admin_console" },
  staff: { label: "Workspace", i18nKey: "nav.workspace" },
  client: { label: "Client Portal", i18nKey: "nav.client_portal" },
  cases: { label: "Cases", i18nKey: "nav.cases" },
  tasks: { label: "Tasks", i18nKey: "nav.tasks" },
  hearings: { label: "Hearings", i18nKey: "nav.hearings" },
  documents: { label: "Documents", i18nKey: "nav.documents" },
  research: { label: "Research Vault", i18nKey: "nav.research" },
  content: { label: "Content", i18nKey: "nav.content" },
  crm: { label: "CRM Pipeline", i18nKey: "nav.crm" },
  clients: { label: "Clients", i18nKey: "nav.clients" },
  messages: { label: "Messages", i18nKey: "nav.messages" },
  "team-chat": { label: "Team Chat", i18nKey: "nav.team_chat" },
  appointments: { label: "Appointments", i18nKey: "nav.appointments" },
  hr: { label: "People & HR", i18nKey: "nav.hr" },
  profile: { label: "Profile & Settings", i18nKey: "nav.profile" },
  analytics: { label: "Analytics", i18nKey: "nav.analytics" },
  "conflict-checker": { label: "Conflict Checker", i18nKey: "nav.conflict_checker" },
  users: { label: "Users", i18nKey: "nav.users" },
  cms: { label: "Public CMS", i18nKey: "nav.cms" },
  homepage: { label: "Homepage Editor" },
  navigation: { label: "Navigation" },
  "practice-areas": { label: "Practice Areas" },
  testimonials: { label: "Testimonials" },
  team: { label: "Public Team" },
  blog: { label: "Blog Articles" },
  news: { label: "News & Awards" },
  careers: { label: "Careers" },
  resources: { label: "Resources" },
  about: { label: "About Page" },
  governance: { label: "Governance" },
  "document-generator": { label: "Doc Generator" },
  templates: { label: "Document Templates" },
  audit: { label: "Audit Log" },
  settings: { label: "Settings", i18nKey: "nav.settings" },
  booking: { label: "Book Appointment", i18nKey: "nav.book_appointment" },
  kyc: { label: "Identity (KYC)", i18nKey: "nav.kyc" },
  signatures: { label: "E-Signatures", i18nKey: "nav.signatures" },
  checklist: { label: "Checklist", i18nKey: "nav.checklist" },
  notifications: { label: "Notifications", i18nKey: "nav.notifications" },
};

export function PortalTopbar({ portal, onOpenCommandCenter, className }: PortalTopbarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  // Compute dynamic breadcrumbs from URL
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/");
    const meta = SEGMENT_LABELS[segment] || { label: segment.replace(/-/g, " ") };
    const label = meta.i18nKey && t(meta.i18nKey) !== meta.i18nKey ? t(meta.i18nKey) : meta.label;
    const isLast = index === pathSegments.length - 1;
    return { segment, href, label, isLast };
  });

  const isStaff = portal === "staff";
  const isClient = portal === "client";
  // Client uses light styling similar to staff but with indigo accent
  const isLight = isStaff || isClient;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b px-4 md:px-6 transition-colors select-none shrink-0",
        isLight
          ? "border-slate-200/80 bg-white/90 backdrop-blur-md text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
          : "border-slate-800/80 bg-slate-900/90 backdrop-blur-md text-slate-100 shadow-[0_1px_8px_rgba(0,0,0,0.25)]",
        className,
      )}
    >
      {/* LEFT: Dynamic Breadcrumbs Navigation */}
      <div className="flex items-center gap-2 min-w-0 pr-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href}>
              {idx > 0 && (
                <ChevronRight
                  className={cn("size-3.5 shrink-0", isLight ? "text-slate-400" : "text-slate-600")}
                  aria-hidden="true"
                />
              )}
              {crumb.isLast ? (
                <span
                  className={cn(
                    "font-semibold truncate max-w-[160px] sm:max-w-[240px]",
                    isLight ? "text-slate-900" : "text-white",
                  )}
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className={cn(
                    "transition-colors hover:underline truncate max-w-[120px]",
                    isLight
                      ? "text-slate-500 hover:text-slate-900"
                      : "text-slate-400 hover:text-slate-200",
                  )}
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Live system pill */}
        <div
          className={cn(
            "hidden xl:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ml-3",
            isClient
              ? "bg-indigo-50 border-indigo-200/80 text-indigo-700"
              : isStaff
                ? "bg-emerald-50 border-emerald-200/80 text-emerald-700"
                : "bg-emerald-950/60 border-emerald-800/80 text-emerald-400",
          )}
        >
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{isClient ? "Secure Session" : "Live Enterprise"}</span>
        </div>
      </div>

      {/* CENTER / SEARCH: Global Command Palette Trigger */}
      <div className="flex-1 max-w-md mx-2 hidden sm:block">
        <button
          type="button"
          onClick={onOpenCommandCenter}
          className={cn(
            "w-full flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl border text-xs transition-all shadow-2xs group focus:outline-none focus:ring-2",
            isLight
              ? "bg-slate-50/90 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-500 hover:text-slate-800 focus:ring-purple-500/20"
              : "bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-400 hover:text-slate-200 focus:ring-emerald-500/20",
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="size-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
            <span className="truncate">
              {isClient
                ? "Search your cases, documents, messages…"
                : "Search cases, clients, documents, tasks…"}
            </span>
          </div>
          <kbd
            className={cn(
              "hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono border",
              isLight
                ? "bg-white border-slate-200 text-slate-500 shadow-2xs"
                : "bg-slate-900 border-slate-700 text-slate-400",
            )}
          >
            <Command className="size-2.5" /> K
          </kbd>
        </button>
      </div>

      {/* RIGHT: Quick Actions + Today Date + Notification Center */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Quick Create Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-all focus:outline-none focus:ring-2",
                isClient
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500/30"
                  : isStaff
                    ? "bg-purple-700 hover:bg-purple-800 text-white focus:ring-purple-500/30"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500/30",
              )}
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">{isClient ? "Quick Action" : "Create"}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Quick Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isClient ? (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/client/messages" className="flex items-center gap-2 text-xs">
                    <MessageSquare className="size-3.5 text-indigo-600" /> Message Legal Team
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/client/documents" className="flex items-center gap-2 text-xs">
                    <Upload className="size-3.5 text-blue-600" /> Upload Document
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/client/booking" className="flex items-center gap-2 text-xs">
                    <CalendarPlus2 className="size-3.5 text-teal-600" /> Book Appointment
                  </Link>
                </DropdownMenuItem>
              </>
            ) : isStaff ? (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/staff/tasks" className="flex items-center gap-2 text-xs">
                    <FilePlus className="size-3.5 text-purple-600" /> New Task
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/staff/cases" className="flex items-center gap-2 text-xs">
                    <FolderPlus className="size-3.5 text-blue-600" /> New Case Matter
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/staff/hearings" className="flex items-center gap-2 text-xs">
                    <CalendarPlus className="size-3.5 text-amber-600" /> Schedule Hearing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/staff/clients" className="flex items-center gap-2 text-xs">
                    <UserPlus className="size-3.5 text-emerald-600" /> Add Client
                  </Link>
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/admin/users" className="flex items-center gap-2 text-xs">
                    <UserPlus className="size-3.5 text-emerald-500" /> Add Firm User
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/conflict-checker" className="flex items-center gap-2 text-xs">
                    <ShieldCheck className="size-3.5 text-amber-500" /> Run Conflict Check
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/cms/homepage" className="flex items-center gap-2 text-xs">
                    <Sparkles className="size-3.5 text-blue-500" /> Edit Homepage CMS
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date Display (AD / BS) */}
        <div className="hidden lg:block">
          <DualDateDisplay
            className={cn(
              "px-2.5 py-1 rounded-lg border text-[11px] font-medium leading-tight",
              isLight
                ? "bg-slate-50/80 border-slate-200 text-slate-600"
                : "bg-slate-800/60 border-slate-700/80 text-slate-300",
            )}
          />
        </div>

        {/* Notification Bell */}
        <div className="flex items-center">
          <NotificationBell
            triggerClassName={cn(
              "size-8 rounded-lg border transition-colors",
              isLight
                ? "border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs"
                : "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200",
            )}
          />
        </div>
      </div>
    </header>
  );
}
