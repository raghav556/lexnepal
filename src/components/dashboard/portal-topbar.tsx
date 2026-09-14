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
  const isLight = isStaff || isClient;
  const showCommandSearch = typeof onOpenCommandCenter === "function";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 w-full shrink-0 select-none items-center justify-between border-b px-4 transition-colors md:px-6",
        isLight
          ? "border-dashboard-border bg-dashboard-panel/90 text-foreground shadow-sm backdrop-blur-md"
          : "border-dashboard-border bg-dashboard-canvas-elevated/90 text-foreground shadow-sm backdrop-blur-md",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2 pr-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href}>
              {idx > 0 && (
                <ChevronRight
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              {crumb.isLast ? (
                <span
                  className="max-w-[160px] truncate font-semibold text-foreground sm:max-w-[240px]"
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="max-w-[120px] truncate text-muted-foreground transition-colors hover:text-foreground hover:underline"
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>

        <div
          className={cn(
            "ml-3 hidden items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium xl:inline-flex",
            isClient
              ? "border-dashboard-information/40 bg-dashboard-information-soft text-dashboard-information-foreground"
              : "border-dashboard-success/40 bg-dashboard-success-soft text-dashboard-success-foreground",
          )}
        >
          <span className="size-1.5 animate-pulse rounded-full bg-dashboard-success" />
          <span>{isClient ? "Secure Session" : "Live Enterprise"}</span>
        </div>
      </div>

      {showCommandSearch ? (
        <div className="mx-2 hidden max-w-md flex-1 sm:block">
          <button
            type="button"
            onClick={onOpenCommandCenter}
            className={cn(
              "group flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-1.5 text-xs shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus",
              "border-dashboard-border bg-dashboard-neutral-soft text-muted-foreground hover:border-dashboard-primary/40 hover:bg-dashboard-panel-hover hover:text-foreground",
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
            <kbd className="hidden items-center gap-0.5 rounded border border-dashboard-border bg-dashboard-panel px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground md:inline-flex">
              <Command className="size-2.5" /> K
            </kbd>
          </button>
        </div>
      ) : (
        <div className="mx-2 hidden max-w-md flex-1 sm:block" aria-hidden />
      )}

      <div className="flex shrink-0 items-center gap-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-dashboard-primary px-2.5 py-1.5 text-xs font-semibold text-dashboard-primary-foreground shadow-sm transition-all hover:bg-dashboard-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus"
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
                    <MessageSquare className="size-3.5 text-dashboard-information" /> Message Legal
                    Team
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/client/documents" className="flex items-center gap-2 text-xs">
                    <Upload className="size-3.5 text-dashboard-primary" /> Upload Document
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/client/booking" className="flex items-center gap-2 text-xs">
                    <CalendarPlus2 className="size-3.5 text-dashboard-success" /> Book Appointment
                  </Link>
                </DropdownMenuItem>
              </>
            ) : isStaff ? (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/staff/tasks" className="flex items-center gap-2 text-xs">
                    <FilePlus className="size-3.5 text-dashboard-primary" /> New Task
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/staff/cases" className="flex items-center gap-2 text-xs">
                    <FolderPlus className="size-3.5 text-dashboard-information" /> New Case Matter
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/staff/hearings" className="flex items-center gap-2 text-xs">
                    <CalendarPlus className="size-3.5 text-dashboard-warning" /> Schedule Hearing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/staff/clients" className="flex items-center gap-2 text-xs">
                    <UserPlus className="size-3.5 text-dashboard-success" /> Add Client
                  </Link>
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/admin/users" className="flex items-center gap-2 text-xs">
                    <UserPlus className="size-3.5 text-dashboard-success" /> Add Firm User
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/conflict-checker" className="flex items-center gap-2 text-xs">
                    <ShieldCheck className="size-3.5 text-dashboard-warning" /> Run Conflict Check
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/cms/homepage" className="flex items-center gap-2 text-xs">
                    <Sparkles className="size-3.5 text-dashboard-information" /> Edit Homepage CMS
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden lg:block">
          <DualDateDisplay className="rounded-lg border border-dashboard-border bg-dashboard-neutral-soft px-2.5 py-1 text-[11px] font-medium leading-tight text-muted-foreground" />
        </div>

        <div className="flex items-center">
          <NotificationBell
            triggerClassName="size-8 rounded-lg border border-dashboard-border bg-dashboard-panel text-foreground shadow-sm transition-colors hover:bg-dashboard-panel-hover"
          />
        </div>
      </div>
    </header>
  );
}
