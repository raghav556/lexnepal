import {
  LayoutDashboard,
  FolderOpen,
  CalendarDays,
  FileText,
  CheckSquare,
  Users,
  Calendar,
  BookOpen,
  MessageSquare,
  UserCog,
  KanbanSquare,
  PenTool,
  Activity,
  Settings,
  Shield,
  Globe,
  Briefcase,
  Quote,
  UserCheck,
  Contact,
  BarChart3,
  Navigation,
  Newspaper,
  User as UserIcon,
  type LucideIcon,
} from "lucide-react";
import type { PortalNavItemData } from "@/components/dashboard/portal-sidebar";

// Shared source for the existing Staff/Admin shell and its search destinations.
export const STAFF_NAV: PortalNavItemData[] = [
  { label: "Dashboard", i18nKey: "nav.dashboard", href: "/staff", icon: LayoutDashboard },
  { label: "Tasks", i18nKey: "nav.tasks", href: "/staff/tasks", icon: CheckSquare },
  { label: "HR", i18nKey: "nav.hr", href: "/staff/hr", icon: UserCog },

  { heading: "Legal Practice" },
  { label: "Cases", i18nKey: "nav.cases", href: "/staff/cases", icon: FolderOpen },
  { label: "Hearings", i18nKey: "nav.hearings", href: "/staff/hearings", icon: CalendarDays },
  { label: "Documents", i18nKey: "nav.documents", href: "/staff/documents", icon: FileText },
  { label: "Research Vault", i18nKey: "nav.research", href: "/staff/research", icon: BookOpen },
  { label: "Content", href: "/staff/content", icon: PenTool },

  { heading: "Client Relations" },
  { label: "CRM", i18nKey: "nav.crm", href: "/staff/crm", icon: KanbanSquare },
  { label: "Clients", i18nKey: "nav.clients", href: "/staff/clients", icon: Users },
  { label: "Messages", i18nKey: "nav.messages", href: "/staff/messages", icon: MessageSquare },
  {
    label: "Appointments",
    i18nKey: "nav.appointments",
    href: "/staff/appointments",
    icon: Calendar,
  },
];

export interface NavItemLink {
  type: "link";
  label: string;
  i18nKey?: string;
  href: string;
  icon: LucideIcon;
}

export interface NavItemBranch {
  type: "branch";
  id: string;
  label: string;
  i18nKey?: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  items: NavItemLink[];
}

export interface NavGroupSection {
  heading: string;
  items: (NavItemLink | NavItemBranch)[];
}

export const ADMIN_NAV_TREE: NavGroupSection[] = [
  {
    heading: "Overview",
    items: [
      {
        type: "link",
        label: "Dashboard",
        i18nKey: "nav.dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
      {
        type: "link",
        label: "Advanced Analytics",
        i18nKey: "nav.analytics",
        href: "/admin/analytics",
        icon: Activity,
      },
    ],
  },
  {
    heading: "Practice & Operations",
    items: [
      {
        type: "link",
        label: "Cases",
        i18nKey: "nav.cases",
        href: "/admin/cases",
        icon: FolderOpen,
      },
      {
        type: "branch",
        id: "crm-branch",
        label: "Clients & CRM",
        icon: Contact,
        defaultOpen: true,
        items: [
          {
            type: "link",
            label: "Clients",
            i18nKey: "nav.clients",
            href: "/admin/clients",
            icon: Contact,
          },
          {
            type: "link",
            label: "CRM & Leads",
            i18nKey: "nav.crm",
            href: "/admin/crm",
            icon: BarChart3,
          },
          {
            type: "link",
            label: "Appointments",
            i18nKey: "nav.appointments",
            href: "/admin/appointments",
            icon: Calendar,
          },
        ],
      },
      {
        type: "branch",
        id: "workforce-branch",
        label: "Firm & Workforce",
        icon: Users,
        defaultOpen: false,
        items: [
          {
            type: "link",
            label: "User Directory",
            i18nKey: "nav.users",
            href: "/admin/users",
            icon: Users,
          },
          {
            type: "link",
            label: "HR & Leaves",
            i18nKey: "nav.hr",
            href: "/admin/hr",
            icon: UserCheck,
          },
        ],
      },
    ],
  },
  {
    heading: "Public CMS & Portal",
    items: [
      {
        type: "branch",
        id: "cms-pages-branch",
        label: "Website Pages",
        icon: Globe,
        defaultOpen: false,
        items: [
          {
            type: "link",
            label: "Site Settings",
            i18nKey: "nav.site_settings",
            href: "/admin/cms",
            icon: Globe,
          },
          {
            type: "link",
            label: "Homepage",
            href: "/admin/cms/homepage",
            icon: LayoutDashboard,
          },
          {
            type: "link",
            label: "Navigation & Menus",
            i18nKey: "nav.navigation",
            href: "/admin/cms/navigation",
            icon: Navigation,
          },
          {
            type: "link",
            label: "Practice Areas",
            i18nKey: "nav.practice_areas",
            href: "/admin/cms/practice-areas",
            icon: Briefcase,
          },
          {
            type: "link",
            label: "About Page",
            i18nKey: "nav.about_page",
            href: "/admin/cms/about",
            icon: FileText,
          },
          {
            type: "link",
            label: "Careers",
            i18nKey: "nav.careers",
            href: "/admin/cms/careers",
            icon: Briefcase,
          },
          {
            type: "link",
            label: "Legal & Governance",
            href: "/admin/cms/governance",
            icon: Shield,
          },
        ],
      },
      {
        type: "branch",
        id: "cms-content-branch",
        label: "Media & Content",
        icon: Newspaper,
        defaultOpen: false,
        items: [
          {
            type: "link",
            label: "Blog Articles",
            i18nKey: "nav.blog_articles",
            href: "/admin/cms/blog",
            icon: PenTool,
          },
          {
            type: "link",
            label: "News & Awards",
            i18nKey: "nav.news_awards",
            href: "/admin/cms/news",
            icon: Newspaper,
          },
          {
            type: "link",
            label: "Resources",
            i18nKey: "nav.resources",
            href: "/admin/cms/resources",
            icon: FileText,
          },
          {
            type: "link",
            label: "Testimonials",
            i18nKey: "nav.testimonials",
            href: "/admin/cms/testimonials",
            icon: Quote,
          },
          {
            type: "link",
            label: "Public Team",
            i18nKey: "nav.public_team",
            href: "/admin/cms/team",
            icon: Users,
          },
        ],
      },
    ],
  },
  {
    heading: "Legal Systems & Records",
    items: [
      {
        type: "branch",
        id: "systems-branch",
        label: "System & Governance",
        icon: Settings,
        defaultOpen: false,
        items: [
          {
            type: "link",
            label: "Doc Generator",
            i18nKey: "nav.doc_generator",
            href: "/admin/document-generator",
            icon: FileText,
          },
          {
            type: "link",
            label: "Document Templates",
            i18nKey: "nav.document_templates",
            href: "/admin/templates",
            icon: FileText,
          },
          {
            type: "link",
            label: "Audit & Security",
            i18nKey: "nav.audit_log",
            href: "/admin/audit",
            icon: Shield,
          },
          {
            type: "link",
            label: "System Settings",
            i18nKey: "nav.settings",
            href: "/admin/settings",
            icon: Settings,
          },
        ],
      },
    ],
  },
  {
    heading: "Account",
    items: [
      {
        type: "link",
        label: "Profile & Settings",
        i18nKey: "nav.profile",
        href: "/admin/profile",
        icon: UserIcon,
      },
    ],
  },
];

export function getOperationalSearchPages(portal: "staff" | "admin") {
  if (portal === "staff") {
    return [
      ...STAFF_NAV.filter((item) => item.href && item.icon).map((item) => ({
        title: item.label!,
        href: item.href!,
        icon: item.icon!,
        subtitle: "Staff workspace",
      })),
      {
        title: "Profile",
        href: "/staff/profile",
        icon: UserIcon,
        subtitle: "Account and preferences",
      },
    ];
  }
  return ADMIN_NAV_TREE.flatMap((section) =>
    section.items.flatMap((entry) =>
      (entry.type === "branch" ? entry.items : [entry]).map((item) => ({
        title: item.href.startsWith("/admin/cms") ? `CMS: ${item.label}` : item.label,
        href: item.href,
        icon: item.icon,
        subtitle: entry.type === "branch" ? `${section.heading} · ${entry.label}` : section.heading,
      })),
    ),
  );
}
